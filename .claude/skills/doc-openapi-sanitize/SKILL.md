---
name: doc-openapi-sanitize
description: Re-export the published API Reference spec from a trust-ai-app release tag and sanitize it per the content boundary — strip internal/preview routes, prune orphaned schemas, keep wire-format keys, stamp the version, archive the old pin, and report the path diff. Use at every release landing ("re-pin the OpenAPI", "update the API reference spec"), or as step 4 of /doc-release-align.
user-invocable: true
---

# /doc-openapi-sanitize — the spec re-pin, owned by a script

`AGENTS.md` promises the published spec is "re-exported from the release tag and sanitized at every
landing." Before this skill, nothing owned that promise: `c725c24` did it by hand (4,352-line diff,
36 internal paths stripped), the v2026.06.30.1 loop did it by hand again. A manual step that large
eventually gets skipped or done inconsistently — so the policy lives in
`docs-plan/doc-kit/openapi-sanitize.py` and this skill is its operating procedure.

## Procedure

1. **Source of truth**: the committed spec snapshot at the release tag, read from the pinned
   worktree (`<worktree>/services/api/openapi.json`) — never from the app clone's main, never from
   a running dev server. (The separate gateway spec `services/gateway/openapi.json` is
   service-internal + TDM preview; it stays unpublished.)
2. **Decide the flag-gated excludes.** Check the tag's backend gates (`services/api/src/main.py`,
   `core/config.py`): any route family mounted only behind a gate that defaults OFF in production
   is excluded via `--extra-exclude` (v2026.06.30.1: `^/v1/scenarios/\{[^}]+\}/test-data`).
   Preview features are documented as preview in prose, not surfaced as GA endpoints.
3. **Run it** from the docs repo root, archiving the outgoing pin beside the existing archives:
   ```bash
   python3 docs-plan/doc-kit/openapi-sanitize.py \
     --source ~/Developer/trust-ai-worktrees/docs-audit-<TAG>/services/api/openapi.json \
     --version <TAG-without-v> \
     --archive-current api-reference/archive/v<OLD_VERSION>.json \
     --extra-exclude '<flag-gated-path-regex>'
   ```
4. **Read the report, then gate:**
   - The script hard-fails if `/paddington/` or `/v1/internal` survive anywhere in the output.
   - Eyeball the Added/Removed path lists against the release notes — a removed path should have a
     "retired/deleted" story (e.g. `/v1/projects/{id}/members` → Access Center grants); an added
     family should match a shipped track. Surprises are findings, not noise.
   - `mint broken-links` must stay clean; `docs.json`'s `openapi` pointer does not change (the pin
     is in the file content, not the path).
5. **Ship**: one PR containing the new pin + the archive file. Commit body carries the path-count
   diff and what was stripped. The `docs-<OLD_VERSION>` git tag must already exist on main (cut by
   `/doc-release-align` step 3.1 or by hand) before this merges.

## Policy notes (keep in sync with `AGENTS.md`)

- **Wire-format keys are never renamed.** `emit_paddington_sessions` is the field's real name;
  renaming it in docs would misdocument the API. Humanized `title`s are the reader-facing layer.
  Only free-text descriptions get internal-route references reworded.
- `/v1/ready` and non-`/v1/` roots stay unpublished (matches every prior pin).
- Orphaned-component pruning is safety, not cosmetics: internal-only schemas frequently carry
  internal vocabulary in their descriptions.
