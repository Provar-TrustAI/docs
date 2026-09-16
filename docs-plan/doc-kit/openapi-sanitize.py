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
  - Sanitize free text -- "description", "summary" and "title" values only, never keys, enum
    values, examples or $refs. Internal route references, the "Paddington" codename, citations of
    internal docs and source files, and machine-local paths are removed or reworded to plain
    prose. NEVER rename wire-format keys or enum values: renaming them would misdocument the API
    (emit_paddington_sessions and authored_via: paddington are the field's and the value's real
    names and stay).
  - Stamp info.version; print a diff report (added/removed paths vs the current pin).
  - Hard gate: refuse to write if /paddington/ or /v1/internal survive anywhere, or if the
    codename survives outside a wire key or an enum literal.
"""
import argparse, json, re, sys

# --- free-text sanitization ------------------------------------------------
# Applied to these keys only. Keys, enum values, examples and $refs are wire truth.
FREE_TEXT_KEYS = ("description", "summary", "title")

_ROUTE = re.compile(r"(:class:`)?(POST |GET )?/paddington/[^\s`]*`?")

_DOC = r"(?:AGENTS|CONTRIBUTING)\.md"
_SRC = r"(?:[\w.-]+/)*[\w.-]+\.(?:py|tsx?|jsx?|md|ya?ml|json)"
# A citation: an internal doc or a source path, optionally backtick-wrapped, optionally with a
# line range, a quoted section name, or a trailing ``symbol``.
_CITE = (r"`{0,2}(?:" + _DOC + r"|" + _SRC + r")(?::\d+(?:-\d+)?)?`{0,2}"
         r"(?:\s*(?:§|section)?\s*\"[^\"]{1,80}\")?(?:\s*``[^`]{1,60}``)?")
_LED_CITE = re.compile(r",?\s*(?:[-–—]+\s*)?\b(?:see|per|at|in|e\.g\.)\s+" + _CITE, re.I)
_DASH_CITE = re.compile(r"\s*[-–—]+\s*" + _CITE)
_PAREN_CITE = re.compile(r"\s*\(\s*(?:(?:see|per|e\.g\.)\s+)?" + _CITE + r"\s*\)", re.I)
_PAREN_CITE_PROSE = re.compile(r"\(\s*" + _CITE + r"\s*:\s*")
_BARE_DOC = re.compile(r"`{0,2}" + _DOC + r"`{0,2}(?:\s*(?:§|section)?\s*\"[^\"]{1,80}\")?")
_BARE_DESIGN = re.compile(r"`{0,2}docs/" + r"[\w./-]+(?::\d+(?:-\d+)?)?`{0,2}")
_BARE_SRC = re.compile(r"`{0,2}" + _SRC + r"(?::\d+(?:-\d+)?)?`{0,2}")
_LOCAL_PATH = re.compile(r"\s*`{0,2}(?:/Users|/home|/private/tmp|/var/folders|[A-Z]:\\\\)"
                         r"[\w./\\-]*`{0,2}")

# The codename. Reader-visible prose says "the Trust Agent". A preceding determiner keeps its own
# article ("every Paddington turn" -> "every Trust Agent turn"), an attributive use after a
# preposition takes none ("across Paddington turns" -> "across Trust Agent turns"), and a label
# ("title") never takes one.
_CODENAME_PAREN = re.compile(r"\s*\((?:[^()]{0,120})paddington(?:[^()]{0,120})\)", re.I)
# An env/config identifier that carries the codename is internal deployment vocabulary, not a
# wire key (those are lower case and stay verbatim -- anything else trips the hard gate below).
_CODENAME_ENV = re.compile(r"`{0,2}\b[A-Z0-9_]*PADDINGTON[A-Z0-9_]*\b`{0,2}")
_PREP = r"across|for|per|during|through|from|by|with|of|in|on|between|over"
_CODENAME = re.compile(rf"\b(?:(?P<prep>{_PREP})\s+)?"
                       r"(?:(?P<det>the|a|an|its|our|every|each|any|one|this|that)\s+)?"
                       r"paddington(?P<poss>'s)?\b(?P<noun>(?=\s+[a-z]))?", re.I)


def _codename_sub(m, article):
    prep, det, poss = m.group("prep") or "", m.group("det") or "", m.group("poss") or ""
    attributive = m.group("noun") is not None and not poss
    lead = f"{prep} " if prep else ""
    if det:
        lead += f"{det} "
    elif not (prep and attributive):
        lead += article
    return f"{lead}Trust Agent{poss}"


def clean_text(s, key):
    """Reword one free-text string. Returns the cleaned string."""
    out = s
    if "/paddington/" in out:
        out = _ROUTE.sub("the corresponding in-app endpoint", out)
    out = _CODENAME_PAREN.sub("", out)
    out = _CODENAME_ENV.sub("the configured setting", out)
    # internal doc + source-file citations, then anything left of them, then machine-local paths
    out = _PAREN_CITE.sub("", out)
    out = _LED_CITE.sub("", out)
    out = _PAREN_CITE_PROSE.sub("(", out)
    out = _DASH_CITE.sub("", out)
    out = _BARE_DOC.sub("the house style", out)
    out = _BARE_DESIGN.sub("the design notes", out)
    out = _BARE_SRC.sub("the service code", out)
    out = _LOCAL_PATH.sub("", out)
    out = _CODENAME.sub(lambda m: _codename_sub(m, "" if key == "title" else "the "), out)
    # tidy what the removals left behind (spaces/tabs only -- never reflow a description)
    out = re.sub(r"[ \t]*\(\s*\)", "", out)
    out = re.sub(r"\([ \t]+", "(", out)
    out = re.sub(r"[ \t]*,[ \t]*\)", ")", out)
    return out


def clean(obj, key=None):
    """Walk the spec, rewording FREE_TEXT_KEYS values only. Returns the rewrite count."""
    n = 0
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and k in FREE_TEXT_KEYS:
                cleaned = clean_text(v, k)
                if cleaned != v:
                    obj[k] = cleaned
                    n += 1
            else:
                n += clean(v, k)
    elif isinstance(obj, list):
        for v in obj:
            n += clean(v, key)
    return n


def codename_leaks(node, ptr="", in_enum=False):
    """Every surviving 'paddington' that is NOT a key or an enum/const literal."""
    out = []
    if isinstance(node, dict):
        for k, v in node.items():
            out += codename_leaks(v, f"{ptr}/{k}", in_enum=k in ("enum", "const"))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            out += codename_leaks(v, f"{ptr}/{i}", in_enum)
    elif isinstance(node, str) and not in_enum and "paddington" in node.lower():
        out.append((ptr, node[:120].replace("\n", " ")))
    return out


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

    reworded = clean(spec)

    spec.setdefault("info", {})["version"] = args.version
    out = json.dumps(spec, indent=1)

    # hard content-boundary gate
    leaks = [w for w in ["/paddington/", "/v1/internal"] if w in out]
    if leaks:
        sys.exit(f"FATAL: sanitized spec still contains {leaks} — inspect before publishing")
    survivors = codename_leaks(spec)
    if survivors:
        for ptr, text in survivors:
            print(f"  LEAK {ptr}\n       {text}", file=sys.stderr)
        sys.exit(f"FATAL: the codename survives in {len(survivors)} free-text value(s) — "
                 "it is only allowed as a wire key or an enum literal")

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
