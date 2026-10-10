"""Independent reference-export contract examples; no live API or publication."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
REVISION = "44db56ef9afbe7986110cccdae474c1ae99b7e0b"


def load_generator():
    spec = importlib.util.spec_from_file_location("reference_generator", ROOT / "scripts/generate-reference.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def example():
    schema = {
        "type": "object", "additionalProperties": False,
        "required": ["emit_paddington_sessions", "mode"],
        "properties": {
            "emit_paddington_sessions": {"type": "boolean"},
            "mode": {"type": "string", "enum": ["paddington", "manual"], "minLength": 1, "maxLength": 120},
            "count": {"type": "integer", "minimum": 1, "maximum": 365},
            "child": {"$ref": "#/components/schemas/Child"},
        },
    }
    spec = {
        "openapi": "3.1.0", "info": {"title": "TrustAI", "version": "candidate"},
        "paths": {
            "/v1/widgets": {"post": {
                "operationId": "createWidget", "description": "Paddington creates widgets (see AGENTS.md).",
                "requestBody": {"required": True, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Widget"}}}},
                "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Child"}}}}},
            }},
            "/v1/private-settings": {"get": {"operationId": "privateSettings", "responses": {"200": {"description": "Private", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/PrivateCredentials"}}}}}}},
            "/v1/internal/operator": {"get": {"operationId": "internalOperator", "responses": {"200": {"description": "Operator"}}}},
        },
        "components": {"schemas": {
            "Widget": schema,
            "Child": {"type": "object", "properties": {"parent": {"$ref": "#/components/schemas/Widget"}, "choice": {"const": "paddington"}}},
            "PrivateCredentials": {"type": "object", "properties": {"private_token": {"type": "string"}}, "example": {"private_token": "PRIVATE-CANARY-EXAMPLE"}},
        }},
    }
    tools = [
        {"name": "trustai_create_widget", "description": "Paddington creates widgets.", "inputSchema": copy.deepcopy(schema),
         "outputSchema": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}}}},
        {"name": "trustai_private_settings", "description": "Private data", "inputSchema": {"type": "object"}},
    ]
    # Tool schemas use their own local definitions, independent of OpenAPI components.
    tools[0]["inputSchema"]["properties"]["child"] = {"$ref": "#/$defs/Child"}
    tools[0]["inputSchema"]["$defs"] = {"Child": {"type": "string", "pattern": "^[a-z]+$"}}
    approval = {"source_revision": REVISION, "operations": ["createWidget"], "tools": ["trustai_create_widget"], "excluded_operations": ["privateSettings", "internalOperator"], "excluded_tools": ["trustai_private_settings"]}
    return spec, tools, approval


class ReferenceContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.generator = load_generator()

    def test_public_wire_contract_is_preserved_and_private_orphans_are_absent(self):
        spec, tools, approval = example()
        before = copy.deepcopy((spec, tools, approval))
        result = self.generator.build_reference(spec, tools, approval)
        self.assertEqual(result["source_revision"], REVISION)
        public = result["openapi"]
        self.assertEqual(set(public["paths"]), {"/v1/widgets"})
        self.assertEqual(set(public["components"]["schemas"]), {"Widget", "Child"})
        self.assertEqual(public["components"]["schemas"]["Widget"], {
            "type": "object", "additionalProperties": False, "required": ["emit_paddington_sessions", "mode"],
            "properties": {"emit_paddington_sessions": {"type": "boolean"},
                "mode": {"type": "string", "enum": ["paddington", "manual"], "minLength": 1, "maxLength": 120},
                "count": {"type": "integer", "minimum": 1, "maximum": 365},
                "child": {"$ref": "#/components/schemas/Child"}},
        })
        self.assertEqual(public["components"]["schemas"]["Child"]["properties"], {
            "parent": {"$ref": "#/components/schemas/Widget"}, "choice": {"const": "paddington"}})
        self.assertEqual([tool["name"] for tool in result["mcp_tools"]], ["trustai_create_widget"])
        self.assertEqual(result["mcp_tools"][0]["inputSchema"]["$defs"], {"Child": {"type": "string", "pattern": "^[a-z]+$"}})
        self.assertEqual(result["mcp_tools"][0]["inputSchema"]["properties"]["mode"]["enum"], ["paddington", "manual"])
        self.assertEqual(public["paths"]["/v1/widgets"]["post"]["description"], "the Trust Agent creates widgets.")
        self.assertEqual(result["mcp_tools"][0]["description"], "the Trust Agent creates widgets.")
        self.assertNotIn("private_token", json.dumps(result))
        self.assertNotIn("PRIVATE-CANARY-EXAMPLE", json.dumps(result))
        self.assertEqual((spec, tools, approval), before, "preparing a candidate must not alter its reference input")

    def test_provider_prose_uses_house_words_without_rewriting_wire_values(self):
        spec, tools, approval = example()
        operation = spec["paths"]["/v1/widgets"]["post"]
        operation["description"] = "WorkOS AuthKit verifies your identity. AuthKit session stays private."
        operation["summary"] = "Sign in with WorkOS"
        spec["components"]["schemas"]["WorkOS"] = {"type": "string", "enum": ["WorkOS", "AuthKit"], "const": "AuthKit", "example": "WorkOS"}
        properties = spec["components"]["schemas"]["Widget"]["properties"]
        properties["WorkOS"] = {"$ref": "#/components/schemas/WorkOS"}
        properties["structured"] = {"type": "object", "example": {"description": "WorkOS", "summary": "AuthKit"}, "examples": [{"title": "AuthKit"}], "default": {"description": "WorkOS AuthKit"}, "const": {"title": "WorkOS"}}
        tools[0]["description"] = "WorkOS verifies your identity."
        tools[0]["inputSchema"]["properties"]["AuthKit"] = {"type": "string", "enum": ["WorkOS", "AuthKit"], "example": "AuthKit"}
        result = self.generator.build_reference(spec, tools, approval)
        public = result["openapi"]
        self.assertEqual(public["paths"]["/v1/widgets"]["post"]["description"], "your workspace's SSO identity provider verifies your identity. sign-in session stays private.")
        self.assertEqual(public["paths"]["/v1/widgets"]["post"]["summary"], "Sign in with your workspace's SSO identity provider")
        self.assertEqual(public["components"]["schemas"]["WorkOS"], {"type": "string", "enum": ["WorkOS", "AuthKit"], "const": "AuthKit", "example": "WorkOS"})
        self.assertEqual(public["components"]["schemas"]["Widget"]["properties"]["WorkOS"], {"$ref": "#/components/schemas/WorkOS"})
        self.assertEqual(public["components"]["schemas"]["Widget"]["properties"]["structured"], {"type": "object", "example": {"description": "WorkOS", "summary": "AuthKit"}, "examples": [{"title": "AuthKit"}], "default": {"description": "WorkOS AuthKit"}, "const": {"title": "WorkOS"}})
        self.assertEqual(result["mcp_tools"][0]["description"], "your workspace's SSO identity provider verifies your identity.")
        self.assertEqual(result["mcp_tools"][0]["inputSchema"]["properties"]["AuthKit"], {"type": "string", "enum": ["WorkOS", "AuthKit"], "example": "AuthKit"})

    def test_unknown_and_internal_approved_surfaces_fail_closed(self):
        for field, value in (("operations", "unknownOperation"), ("operations", "internalOperator"), ("tools", "trustai_unknown_tool")):
            with self.subTest(field=field, value=value):
                spec, tools, approval = example()
                approval[field] = [value]
                if value == "internalOperator":
                    approval["excluded_operations"] = ["createWidget", "privateSettings"]
                with self.assertRaises(ValueError):
                    self.generator.build_reference(spec, tools, approval)

    def test_invalid_or_nonlocal_refs_are_refused(self):
        for ref in ("https://private.example/schema.json", "../private.json#/secret", "#/components/schemas/Missing", "#/components/schemas/Widget/extra", "#/components/schemas/~2bad"):
            with self.subTest(ref=ref):
                spec, tools, approval = example()
                spec["components"]["schemas"]["Widget"]["properties"]["child"] = {"$ref": ref}
                with self.assertRaises(ValueError):
                    self.generator.build_reference(spec, tools, approval)

    def test_new_unreviewed_inventory_is_refused(self):
        for surface in ("REST", "tool"):
            with self.subTest(surface=surface):
                spec, tools, approval = example()
                if surface == "REST":
                    spec["paths"]["/v1/new-secret"] = {"get": {"operationId": "newUnreviewed", "responses": {"200": {"description": "Private"}}}}
                else:
                    tools.append({"name": "trustai_new_secret", "description": "Private", "inputSchema": {"type": "object"}})
                with self.assertRaises(ValueError):
                    self.generator.build_reference(spec, tools, approval)

    def generate(self, source, output, approval):
        with patch.object(self.generator, "DOCS_ROOT", approval.parent):
            return self.generator.generate(source, output, approval)

    def test_approved_private_fields_and_unsanitized_examples_are_refused(self):
        for unsafe in ({"x-private": True}, {"example": {"private": "/Users/operator/private-token"}}, {"example": "Paddington private token"}):
            with self.subTest(unsafe=unsafe):
                spec, tools, approval = example()
                spec["components"]["schemas"]["Widget"]["properties"]["confidential"] = {"type": "string", **unsafe}
                with self.assertRaises(ValueError):
                    self.generator.build_reference(spec, tools, approval)

    def test_tool_schema_missing_and_external_refs_are_refused(self):
        for reference in ("#/$defs/Missing", "https://private.example/schema.json", "#/$defs/~2bad"):
            with self.subTest(reference=reference):
                spec, tools, approval = example()
                tools[0]["inputSchema"]["properties"]["child"] = {"$ref": reference}
                with self.assertRaises(ValueError):
                    self.generator.build_reference(spec, tools, approval)

    def test_symlink_ancestor_source_root_and_output_parent_are_refused(self):
        for surface in ("source", "output"):
            with self.subTest(surface=surface), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                source, approval = self.source_fixture(root)
                output = root / "dist/reference-candidate/candidate.json"
                output.parent.mkdir(parents=True, exist_ok=True)
                if surface == "source":
                    link = root / "linked-parent"
                    link.symlink_to(root, target_is_directory=True)
                    source = link / "source"
                else:
                    real = root / "outside-output"
                    real.mkdir()
                    output.parent.rmdir()
                    output.parent.symlink_to(real, target_is_directory=True)
                with self.assertRaisesRegex(ValueError, "symlink"):
                    self.generate(source, output, approval)
                self.assertFalse(output.exists())

    def source_fixture(self, root):
        source = root / "source"
        spec, tools, approval = example()
        for relative, data, key in (("services/api/openapi.json", spec, "openapi_sha256"), ("services/api/tests/mcp/tool_list.json", tools, "tools_sha256")):
            path = source / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            payload = (json.dumps(data) + "\n").encode()
            path.write_bytes(payload)
            approval[key] = hashlib.sha256(payload).hexdigest()
        approved = root / "approval.json"
        approved.write_text(json.dumps(approval))
        return source, approved

    def test_generation_is_deterministic_and_failure_preserves_previous_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            source, approval = self.source_fixture(root)
            private_file = source / "services/api/private-customer-records.json"
            private_file.write_text('{"private_token": "PRIVATE-FILE-CANARY-T261"}')
            output = root / "dist/reference-candidate/candidate.json"
            output.parent.mkdir(parents=True, exist_ok=True)
            self.generate(source, output, approval)
            first = output.read_bytes()
            self.assertNotIn(b"PRIVATE-FILE-CANARY-T261", first)
            self.assertNotIn(b"private_token", first)
            self.generate(source, output, approval)
            self.assertEqual(output.read_bytes(), first)
            spec_path = source / "services/api/openapi.json"
            spec_path.write_text(spec_path.read_text() + " ")
            with self.assertRaises(ValueError):
                self.generate(source, output, approval)
            self.assertEqual(output.read_bytes(), first)

    def test_failed_atomic_replace_preserves_previous_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            source, approval = self.source_fixture(root)
            output = root / "dist/reference-candidate/candidate.json"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(b"previous approved bytes\n")
            with patch.object(self.generator.os, "replace", side_effect=OSError("controlled disk failure")):
                with self.assertRaises(OSError):
                    self.generate(source, output, approval)
            self.assertEqual(output.read_bytes(), b"previous approved bytes\n")

    def test_output_outside_candidate_root_is_refused_without_overwrite(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            source, approval = self.source_fixture(root)
            for output in (root / "api-reference/openapi.json", root / "docs.json", root / "dist/reference-candidate/../escaped.json"):
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(b"untouched private reference")
                with self.assertRaises(ValueError):
                    self.generate(source, output, approval)
                self.assertEqual(output.read_bytes(), b"untouched private reference")

    def test_symlink_source_root_input_and_output_are_refused(self):
        for place in ("root", "input", "output"):
            with self.subTest(place=place), tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary).resolve()
                source, approval = self.source_fixture(root)
                output = root / "dist/reference-candidate/candidate.json"
                output.parent.mkdir(parents=True, exist_ok=True)
                outside = root / "outside.json"
                outside.write_bytes(b"private outside bytes")
                if place == "root":
                    link = root / "linked-source"
                    link.symlink_to(source, target_is_directory=True)
                    source = link
                elif place == "input":
                    path = source / "services/api/openapi.json"
                    path.unlink()
                    path.symlink_to(outside)
                else:
                    output.symlink_to(outside)
                with self.assertRaisesRegex(ValueError, "symlink"):
                    self.generate(source, output, approval)
                self.assertEqual(outside.read_bytes(), b"private outside bytes")
                self.assertFalse(output.exists() and place != "output")


if __name__ == "__main__":
    unittest.main()
