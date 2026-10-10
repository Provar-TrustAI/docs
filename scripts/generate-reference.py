#!/usr/bin/env python3
"""Prepare one approved reference candidate; never publish or change site navigation."""

import argparse
import copy
import hashlib
import importlib.util
import json
import os
import re
from pathlib import Path
import tempfile

DOCS_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_APPROVAL = DOCS_ROOT / "scripts/reference-allowlist.json"
INPUTS = {"openapi": "services/api/openapi.json", "tools": "services/api/tests/mcp/tool_list.json"}
METHODS = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}

module_spec = importlib.util.spec_from_file_location("reference_sanitizer", DOCS_ROOT / "docs-plan/doc-kit/openapi-sanitize.py")
sanitizer = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(sanitizer)


def selection(actual, selected, excluded):
    if len(actual) != len(set(actual)) or len(selected) != len(set(selected)) or len(excluded) != len(set(excluded)):
        raise ValueError("duplicate_inventory")
    if set(selected) & set(excluded) or set(actual) != set(selected) | set(excluded):
        raise ValueError("unapproved_inventory")
    return set(selected)


def pointer(document, reference):
    if not reference.startswith("#/"):
        raise ValueError("external_reference")
    node = document
    try:
        for part in reference[2:].split("/"):
            key = part.replace("~1", "/").replace("~0", "~")
            node = node[int(key)] if isinstance(node, list) else node[key]
    except (KeyError, IndexError, ValueError, TypeError):
        raise ValueError("missing_reference") from None
    return node


def check_content(document):
    def visit(value):
        if isinstance(value, dict):
            if value.get("x-internal") or value.get("x-private"):
                raise ValueError("private_content")
            for key, item in value.items():
                if key == "$ref":
                    if not isinstance(item, str):
                        raise ValueError("invalid_reference")
                    pointer(document, item)
                visit(item)
        elif isinstance(value, list):
            for item in value:
                visit(item)
    visit(document)
    rendered = json.dumps(document)
    if any(marker in rendered for marker in ("/paddington/", "/v1/internal", "/Users/", "/home/", "/private/tmp/", "/var/folders/")):
        raise ValueError("private_content")
    scan = copy.deepcopy(document)
    def wire_identifiers(value):
        if isinstance(value, dict):
            properties = value.get("properties", {})
            required = value.get("required")
            if isinstance(properties, dict) and isinstance(required, list) and all(isinstance(name, str) and name in properties for name in required):
                # Required names refer to wire keys, rather than reader-visible prose.
                value.pop("required")
            discriminator = value.get("discriminator")
            if isinstance(discriminator, dict) and discriminator.get("propertyName") in properties:
                discriminator.pop("propertyName")
            for item in value.values():
                wire_identifiers(item)
        elif isinstance(value, list):
            for item in value:
                wire_identifiers(item)
    wire_identifiers(scan)
    if sanitizer.codename_leaks(scan):
        raise ValueError("private_content")


def sanitize_provider_prose(document):
    """Apply docs house vocabulary to candidate prose without changing wire values."""
    if isinstance(document, dict):
        for key, value in document.items():
            if key in {"example", "examples", "default", "enum", "const"}:
                continue
            if key in {"description", "summary", "title"} and isinstance(value, str):
                value = re.sub(r"\bWorkOS(?:\s+AuthKit)?\b", "your workspace's SSO identity provider", value, flags=re.IGNORECASE)
                document[key] = re.sub(r"\bAuthKit\b", "sign-in", value, flags=re.IGNORECASE)
            else:
                sanitize_provider_prose(value)
    elif isinstance(document, list):
        for value in document:
            sanitize_provider_prose(value)


def build_reference(spec, tools, approval):
    spec, tools = copy.deepcopy(spec), copy.deepcopy(tools)
    if not isinstance(spec, dict) or not isinstance(spec.get("paths"), dict) or not isinstance(tools, list):
        raise ValueError("invalid_artifact")
    operations = []
    for item in spec["paths"].values():
        for method, operation in item.items():
            if method in METHODS:
                if not isinstance(operation, dict) or not isinstance(operation.get("operationId"), str):
                    raise ValueError("invalid_operation")
                operations.append(operation["operationId"])
    chosen = selection(operations, approval["operations"], approval.get("excluded_operations", []))
    paths = {}
    for path, item in spec["paths"].items():
        kept = {method: operation for method, operation in item.items() if method in METHODS and operation["operationId"] in chosen}
        if kept:
            if not path.startswith("/v1/") or path.startswith("/v1/internal") or path == "/v1/ready":
                raise ValueError("private_route")
            paths[path] = {**{key: value for key, value in item.items() if key not in METHODS}, **kept}
    spec["paths"] = paths
    live = set()
    sanitizer.refs_in({"paths": paths}, live)
    # Security requirements name schemes without a $ref.
    for path in paths.values():
        for method, operation in path.items():
            if method in METHODS:
                for security in operation.get("security", spec.get("security", [])):
                    live.update(f"#/components/securitySchemes/{name}" for name in security)
    while True:
        found = set(live)
        for reference in live:
            sanitizer.refs_in(pointer(spec, reference), found)
        if found == live:
            break
        live = found
    components = spec.get("components", {})
    spec["components"] = {section: {name: value for name, value in members.items() if f"#/components/{section}/{name}" in live}
                          for section, members in components.items()}
    names = []
    for tool in tools:
        if not isinstance(tool, dict) or not isinstance(tool.get("name"), str) or not isinstance(tool.get("inputSchema"), dict):
            raise ValueError("invalid_tool")
        names.append(tool["name"])
    approved_tools = selection(names, approval["tools"], approval.get("excluded_tools", []))
    tools = [tool for tool in tools if tool["name"] in approved_tools]
    sanitizer.clean(spec)
    sanitize_provider_prose(spec)
    check_content(spec)
    for tool in tools:
        sanitizer.clean(tool)
        sanitize_provider_prose(tool)
        # JSON Schema references are relative to each schema, not the tool envelope.
        for field in ("inputSchema", "outputSchema"):
            if field in tool:
                check_content(tool[field])
        check_content({key: value for key, value in tool.items() if key not in {"inputSchema", "outputSchema"}})
    return {"source_revision": approval["source_revision"], "openapi": spec, "mcp_tools": tools}


def source_file(root, relative):
    if any(path.is_symlink() for path in (root, *root.parents)):
        raise ValueError("symlink_input")
    root = root.resolve(strict=True)
    path = root
    for part in Path(relative).parts:
        path = path / part
        if path.is_symlink():
            raise ValueError("symlink_input")
    if not path.resolve(strict=True).is_relative_to(root):
        raise ValueError("outside_source_root")
    return path


def candidate_path(output):
    root = DOCS_ROOT.resolve(strict=True)
    output = output.absolute()
    if not output.is_relative_to(root / "dist/reference-candidate") or output.suffix != ".json":
        raise ValueError("outside_candidate_root")
    for path in (output, *output.parents):
        if path == root:
            break
        if path.is_symlink():
            raise ValueError("symlink_output")
    if not output.resolve().is_relative_to(root / "dist/reference-candidate"):
        raise ValueError("outside_candidate_root")
    return output


def generate(source_root, output, approval_path=DEFAULT_APPROVAL):
    output = candidate_path(Path(output))
    if Path(approval_path).is_symlink():
        raise ValueError("symlink_approval")
    approval = json.loads(Path(approval_path).read_text(encoding="utf-8"))
    if len(approval["source_revision"]) != 40 or any(c not in "0123456789abcdef" for c in approval["source_revision"]):
        raise ValueError("invalid_source_revision")
    artifacts = {}
    for name, relative in INPUTS.items():
        raw = source_file(Path(source_root), relative).read_bytes()
        if hashlib.sha256(raw).hexdigest() != approval[f"{name}_sha256"]:
            raise ValueError("source_hash_mismatch")
        artifacts[name] = json.loads(raw)
    rendered = json.dumps(build_reference(artifacts["openapi"], artifacts["tools"], approval), sort_keys=True, indent=2) + "\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent, delete=False) as staged:
            temporary = Path(staged.name)
            staged.write(rendered)
            staged.flush()
            os.fsync(staged.fileno())
        os.replace(temporary, output)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=DOCS_ROOT / "dist/reference-candidate/reference.json")
    args = parser.parse_args(argv)
    try:
        generate(args.source_root, args.output)
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(1, f"reference candidate refused: {type(error).__name__}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
