#!/usr/bin/env python3
"""Re-export + sanitize the published OpenAPI spec from a trust-ai-app release tag.

Usage:
  python3 docs-plan/doc-kit/openapi-sanitize.py \
      --source <path-to-tag-worktree>/services/api/openapi.json \
      --version 2026.06.30.1 \
      [--archive-current api-reference/archive/v<OLD>.json] \
      [--extra-exclude '^/v1/scenarios/\\{[^}]+\\}/test-data']

Owns the AGENTS.md promise that the spec is "sanitized at every landing" (first done by hand in
c725c24, 4352-line diff; codified after the v2026.06.30.1 loop repeated it by hand).

Policy (keep in sync with AGENTS.md content boundaries):
  - Drop every path not under /v1/, all /v1/internal/*, and /v1/ready. (/paddington/* falls out
    of the /v1/ rule; kept explicit in the report.)
  - Drop flag-gated preview paths passed via --extra-exclude (e.g. TDM test-data routes while the
    backend gate defaults off in production).
  - Prune components no longer transitively referenced from the kept paths.
  - Reword description strings that reference internal routes; NEVER rename wire-format keys or
    field names (renaming them would misdocument the API — emit_paddington_sessions stays, with
    its humanized title).
  - Stamp info.version; print a diff report (added/removed paths vs the current pin).
"""
import argparse, json, re, sys

def refs_in(obj, acc):
    if isinstance(obj, dict):
        r = obj.get("$ref")
        if isinstance(r, str) and r.startswith("#/components/"):
            acc.add(r)
        for v in obj.values():
            refs_in(v, acc)
    elif isinstance(obj, list):
        for v in obj:
            refs_in(v, acc)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="raw spec at the release tag (pinned worktree)")
    ap.add_argument("--version", required=True, help="value for info.version, e.g. 2026.06.30.1")
    ap.add_argument("--target", default="api-reference/openapi.json")
    ap.add_argument("--archive-current", default=None,
                    help="copy the current target to this path before overwriting")
    ap.add_argument("--extra-exclude", action="append", default=[],
                    help="regex of additional path(s) to drop (repeatable; flag-gated previews)")
    args = ap.parse_args()

    spec = json.load(open(args.source))
    extra = [re.compile(p) for p in args.extra_exclude]

    def keep(p):
        if not p.startswith("/v1/"):
            return False
        if p.startswith("/v1/internal") or p == "/v1/ready":
            return False
        return not any(rx.search(p) for rx in extra)

    dropped = sorted(p for p in spec["paths"] if not keep(p))
    spec["paths"] = {p: v for p, v in spec["paths"].items() if keep(p)}

    # prune unreferenced components (transitive closure; securitySchemes always kept)
    live = set(); refs_in({"paths": spec["paths"]}, live)
    while True:
        new = set(live)
        for r in live:
            _, _, section, name = r.split("/")
            node = spec.get("components", {}).get(section, {}).get(name)
            if node is not None:
                refs_in(node, new)
        if new == live:
            break
        live = new
    comps = spec.get("components", {})
    pruned = 0
    for section in list(comps):
        if isinstance(comps[section], dict) and section != "securitySchemes":
            before = len(comps[section])
            comps[section] = {k: v for k, v in comps[section].items()
                              if f"#/components/{section}/{k}" in live}
            pruned += before - len(comps[section])

    # reword internal-route references in human-readable strings only (never keys)
    def clean(obj):
        n = 0
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str) and "/paddington/" in v:
                    obj[k] = re.sub(r"(:class:`)?(POST |GET )?/paddington/[^\s`]*`?",
                                    "the corresponding in-app endpoint", v)
                    n += 1
                else:
                    n += clean(v)
        elif isinstance(obj, list):
            for v in obj:
                n += clean(v)
        return n
    reworded = clean(spec)

    spec.setdefault("info", {})["version"] = args.version
    out = json.dumps(spec, indent=1)

    # hard content-boundary gate
    leaks = [w for w in ["/paddington/", "/v1/internal"] if w in out]
    if leaks:
        sys.exit(f"FATAL: sanitized spec still contains {leaks} — inspect before publishing")

    try:
        cur = json.load(open(args.target))
        cur_paths = set(cur["paths"])
    except FileNotFoundError:
        cur, cur_paths = None, set()
    if args.archive_current and cur is not None:
        open(args.archive_current, "w").write(json.dumps(cur, indent=1))
    open(args.target, "w").write(out)

    new_paths = set(spec["paths"])
    print(f"version: {args.version}")
    print(f"paths: {len(cur_paths)} -> {len(new_paths)} "
          f"(+{len(new_paths - cur_paths)} / -{len(cur_paths - new_paths)})")
    print(f"dropped at export ({len(dropped)}):"); [print(f"  {p}") for p in dropped]
    print(f"components pruned: {pruned}; descriptions reworded: {reworded}")
    if cur_paths:
        for p in sorted(new_paths - cur_paths): print(f"  A {p}")
        for p in sorted(cur_paths - new_paths): print(f"  R {p}")

if __name__ == "__main__":
    main()
