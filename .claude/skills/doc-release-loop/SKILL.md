---
name: doc-release-loop
description: Run the BUILD-phase preflight, fill the doc orchestrator prompt's CONFIG block, and start the autonomous documentation build loop on /loop. Adapts the UI Build Kit's ui-build-loop for Mintlify docs.
user-invocable: true
---

# /doc-release-loop

Start the BUILD phase of a release's documentation. Runs a preflight (hardening the things that
stall the loop), fills the orchestrator CONFIG, and launches the loop. Read
`docs-plan/doc-kit/00-playbook.md` §4 and `doc-orchestrator-prompt.md` first.

## Integration base — `TRUNK`

The loop forks every ticket from, and merges every ticket into, an integration base named `TRUNK`.
It **defaults to `main`** (ad-hoc single-page builds behave exactly as the prior loop did — fully
backward-compatible). For a **release-driven build**, set `TRUNK` to `worktrunk/docs-<release-slug>`.
The whole release lands on `main` exactly once, via `/doc-land-release`. See
`release-worktrunk-model.md` — the single source of truth.

## 1. Preflight — verify before launch

Most loop stalls trace to infrastructure, not content. Verify ALL of:

- [ ] **Linear MCP** — `mcp__linear__list_issues` with the cycle's project UUID (the one `/doc-plan`
  named; never the URL slug) returns tickets, not an empty list. An empty list means you passed the
  slug, used a stale project, or auth expired — reauthenticate.
- [ ] **GitHub auth** — `gh auth status` clean; branch permissions let the loop open and auto-merge
  PRs on `Provar-TrustAI/docs`.
- [ ] **Mintlify preview** — the repo's Mintlify dashboard builds previews on PRs and they go green
  end-to-end (`mint broken-links` is the fast gate). A trivial PR can build + merge.
- [ ] **Tickets exist** — `/doc-linear-sync` has run; the project has `doc-page` / `doc-primitive`
  tickets in `Todo` under the release milestone.
- [ ] **Resolve `TRUNK`** — default `TRUNK = main`. **Release mode:** set `MILESTONE` to the release
  milestone, derive its slug (kebab-case of the version tag, e.g. `v2026.06.09.1` →
  `docs-v2026-06-09-1`), and create/checkout the worktrunk off `origin/main`:
  `git fetch origin && git checkout -B worktrunk/docs-<slug> origin/main && git push -u origin
  worktrunk/docs-<slug>` (idempotent — if it already exists upstream, check out + fast-forward). Set
  `TRUNK = worktrunk/docs-<slug>`.
- [ ] **`mint dev` audit instance** — stand up one long-lived `mint dev` serving `origin/$TRUNK` so
  `render`/`links` audits observe the in-progress release, not `main`. Create a worktree tracking
  `origin/$TRUNK`, run `npx mintlify dev --port 3333` in it. The orchestrator refreshes this instance
  (`git reset --hard origin/$TRUNK` + restart) and reuses it for every render/links audit. Record its
  URL (`MINT_DEV_URL`, default `http://localhost:3333`).
- [ ] **App capture instance** — confirm trust-ai-app is running on `RELEASE_TAG` and reachable
  (`APP_CAPTURE_URL`, default `http://localhost:3000`). This is the **source of truth** the
  `accuracy`/`completeness`/`freshness` audits drive and `captures/` screenshots against. If it's not
  up on the release tag, say so and stop — without it every accuracy audit silently degrades to
  reading the prototype, which is only a design reference (`00-playbook.md` §1). Do NOT start or stop
  the user's app stack yourself.
- [ ] **Prototype reference (optional)** — if `$PADDINGTON_DIR` is set and on disk, record it as
  `PROTOTYPE_DIR` for CONFIG; it is the source for `doc-demo` tickets that embed a sanitized
  Tier-3 demo. **If it is unset, this is not a failure** — note "Tier-3 prototype embeds
  unavailable" and confirm the plan's demo budget only calls for Tier-1/2 artifacts plus any
  Tier-3 embeds already published from this repo. A `doc-demo` ticket that needs a prototype we
  don't have is a scope error to raise, not a reason to stop the loop.

If any check fails, fix it BEFORE starting the loop.

## 2. Fill the orchestrator CONFIG

Open `docs-plan/doc-kit/doc-orchestrator-prompt.md`. Fill the `CONFIG` block: `RELEASE_TAG`,
`RELEASE_SLUG`, `TRUNK`, `MILESTONE`, `WAVE_MILESTONES`, `MINT_DEV_URL`, `APP_CAPTURE_URL`,
`PROTOTYPE_DIR`, `CADENCE`. (`LINEAR_PROJECT_UUID`, `LINEAR_PROJECT_NAME`, and `BRANCH_PREFIX` are
pre-filled.) The loop reads `TRUNK` everywhere it forks a branch, sets a PR base, rebases a stale
base, or refreshes the `mint dev` instance.

## 3. Launch

Start the loop: `/loop <CADENCE> <the orchestrator prompt with the CONFIG filled in>`. 5m default.

In release mode, page PRs (`→ worktrunk/docs-**`) get the fast gate (`mint broken-links` + a clean
Mintlify preview) and merge-merge; the release lands once via the `worktrunk → main` PR under the
full gate. **Landing is not part of this loop** — when the release's tickets are all Done and merged
on `$TRUNK` and audits have converged, land it with `/doc-land-release` (the rigorous gate:
broken-links, production-preview render, final accuracy+completeness audit, merge to `main`, archive
the prior version, then reflection).

## 4. Supervise

Autonomous but not unattended (`00-playbook.md` §6). At wave boundaries: open `mint dev`, read a few
pages, file `doc-gap` / `doc-clarification` tickets for anything that reads wrong or looks stale. Do
NOT pause the loop for a single broken-link failure or a scope call the orchestrator can make from
the release notes.

## Rules

- Never launch on a failing preflight — especially with the app capture instance down, or audits
  degrade to reading the prototype instead of the shipped app.
- The orchestrator owns the build; your job is the preflight and wave-boundary review.
- `TRUNK` defaults to `main` — a non-release build needs no `TRUNK`/`MILESTONE`. Only release mode
  points `TRUNK` at a `worktrunk/docs-<slug>` branch, and only `/doc-land-release` targets `main`.
- **Never `--delete-branch` on merge** — Mintlify previews race the deletion.
