# Release worktrunk model — the source of truth for Doc Kit's branch/merge/preview model

This is the single source of truth for how a release's documentation accumulates and lands. Every
Doc Kit skill and agent that forks a branch, sets a PR base, or rebases reads back to this file.

## The one seam: `TRUNK`

`TRUNK` is the integration base the loop forks from and merges into. It has exactly two values:

- **`main`** — the default. An ad-hoc, single-page doc build behaves exactly as the prior 5-min loop
  did (`docs-plan/loop-state.md`): branch off `main`, PR into `main`, merge. Fully backward-compatible.
- **`worktrunk/docs-<release-slug>`** — release mode. The release's pages accumulate here and land on
  `main` exactly once.

`<release-slug>` is the lowercase kebab-case of the trust-ai-app release tag:
`v2026.06.09.1` → `docs-v2026-06-09-1` → branch `worktrunk/docs-v2026-06-09-1`.

`main` is the landing target **only** in `/doc-land-release`. Everywhere else, "the integration base"
means `$TRUNK`.

## The branch↔release link

Linear milestones have no branch field. So `/doc-linear-sync` writes a `Worktrunk:
worktrunk/docs-<slug>` line into the **release milestone's description**. The loop and
`/doc-land-release` read it back from there. It is reconciled in place on re-run, never duplicated.

## Two-tier gating (Mintlify preview is the CI)

Docs have no e2e suite — the **Mintlify preview build** is the CI signal, and `mint broken-links` is
the fast lane. Two tiers:

| Tier | PR | Gate | Merge |
|---|---|---|---|
| **Page PR** | `bradyhunt/dev-<ID>-<slug> → worktrunk/docs-<slug>` | fast: `mint broken-links` on the touched files + a clean Mintlify preview build for the branch | `gh pr merge --auto --merge` (no `--delete-branch`) |
| **Landing PR** | `worktrunk/docs-<slug> → main` | full: whole-site `mint broken-links` + full Mintlify **production** preview + final accuracy/completeness sweep | `gh pr merge --merge` (merge-commit, preserves page history) |

The landing PR is the first time the *whole* release meets the full site as one unit. A failure there
is a real cross-page defect (a cross-reference between two independently-merged pages, a `docs.json`
nav entry pointing at a moved page) — fix on the trunk, never `--admin` past it.

## Merge style — and why

- **Page PRs → `--merge` (merge, not squash) into the worktrunk.** Each page is one tidy commit;
  keeping them as distinct commits on the trunk preserves per-page history.
- **Landing PR → `--merge` (merge-commit) into `main`.** `git log main` after landing shows every
  page's commit + the merge commit — the release's doc history is legible and bisectable on `main`,
  not collapsed into one opaque squash.
- **Never `--delete-branch` on any merge.** Mintlify preview builds race the branch deletion and fail
  (memory: `feedback_no_delete_branch_on_merge`). Let GitHub auto-prune.

## Why a worktrunk for docs at all

Without it, every page PR targets `main` and a half-documented release is live on `docs.provar.dev`
mid-build — stakeholders see pages that reference surfaces other pages haven't covered yet, and the
cross-surface audit has no stable base. The worktrunk lets the whole release converge (all pages
written, all six audit dimensions clean per page, cross-surface consistent) before a single atomic
landing flips `docs.provar.dev` to the new version and archives the old one. The release is the unit
of integration to `main`, exactly as a milestone is in the UI Build Kit.

## Invariants

1. `main` receives a release only through `/doc-land-release`, only as a merge-commit, only after
   audit convergence + the full gate.
2. Every ad-hoc build (`TRUNK = main`) is unaffected by all of the above — it's the old loop.
3. The `Worktrunk:` line in the milestone description is the only durable branch↔release record.
4. No `--delete-branch`, ever.
