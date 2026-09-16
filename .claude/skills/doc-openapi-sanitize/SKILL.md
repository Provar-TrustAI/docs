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
   is excluded via `--extra-exclude` (v2026.06.30.1: `^/v1/scenarios/\{[^}]+\}/test-data`;
   v2026.09.09.2: project snapshots, the OTLP receiver and the AgentCore pull-sync
   spike). Preview features are documented as preview in prose, not surfaced as GA endpoints.
   Verify each gate at the tag yourself — a default in `core/config.py` is evidence of a default,
   nothing more, and a withdrawal of a path published today needs sign-off and a line in the PR.
   The exclude list follows the feature's **confirmed deployment posture**, not the config default
   alone: confirm with the deployment owner before withdrawing a family, because a gate that
   defaults OFF may still be enabled in production (DEV-9126 re-published the two
   `autopilot-runs` families DEV-9093 had excluded on the strength of `autopilot_enabled = False`).
3. **Run it** from the docs repo root, archiving the outgoing pin beside the existing archives:
   ```bash
   python3 docs-plan/doc-kit/openapi-sanitize.py \
     --source "$WORKTREE_DIR/docs-audit-<TAG>/services/api/openapi.json" \
     --version <TAG-without-v> \
     --archive-current api-reference/archive/v<OLD_VERSION>.json \
     --extra-exclude '<flag-gated-path-regex>'
   ```
4. **Read the report, then gate:**
   - The script hard-fails if `/paddington/` or `/v1/internal` survive anywhere in the output, or
     if the codename survives outside a wire key or an enum literal.
   - Eyeball the Added/Removed path lists against the release notes — a removed path should have a
     "retired/deleted" story (e.g. `/v1/projects/{id}/members` → Access Center grants); an added
     family should match a shipped track. Surprises are findings, not noise.
   - `mint broken-links` must stay clean; `docs.json`'s `openapi` pointer does not change (the pin
     is in the file content, not the path).
5. **Ship**: one PR containing the new pin + the archive file. Commit body carries the path-count
   diff and what was stripped. The `docs-<OLD_VERSION>` git tag must already exist on main (cut by
   `/doc-release-align` step 3.1 or by hand) before this merges.

## Policy notes (keep in sync with `AGENTS.md`)

- **Wire-format keys and enum values are never renamed.** `emit_paddington_sessions` is the
  field's real name and `authored_via: paddington` is a value the API actually accepts; renaming
  either would misdocument the API. They are the only places the codename may survive a run.
- **Free text is sanitized; wire truth is not.** Rewriting is confined to `description`, `summary`
  and `title` values — never keys, enum values, examples or `$ref`s. Inside those three:
  - an internal route reference becomes "the corresponding in-app endpoint";
  - "Paddington" becomes **the Trust Agent** (a `title` is a label, so it takes no article), and a
    `PADDINGTON_*` env or config name becomes "the configured setting";
  - citations of internal docs and source files (`AGENTS.md`, `docs/…`, `*.py`, `*.ts`,
    `services/…`) and machine-local paths are dropped, or reworded to plain prose where the
    sentence still needs a subject.
  A `title` is reader-visible, so it is sanitized like any other prose: `AGENTS.md` calls the
  shipped "Paddington Message" humanisation a product defect, and the pin must not reproduce it.
- **When the codename gate fires, read the pointer it prints.** A new leak is either an app-side
  docstring to fix upstream or a sanitization rule to extend — never a path to `--extra-exclude`
  out of the reference.
- `/v1/ready` and non-`/v1/` roots stay unpublished (matches every prior pin).
- Orphaned-component pruning is safety, not cosmetics: internal-only schemas frequently carry
  internal vocabulary in their descriptions.
