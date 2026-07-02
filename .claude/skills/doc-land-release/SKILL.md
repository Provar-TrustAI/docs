---
name: doc-land-release
description: Land a completed release's documentation worktrunk on main through the rigorous gate — take stock, confirm every page's audits converged, full broken-links + production-preview render, final accuracy+completeness sweep, merge-commit, then archive the prior version via the version-transition runbook, then a reflection that feeds the harness forward. The one place main is the target.
user-invocable: true
---

# /doc-land-release

The deliberate gate a `worktrunk/docs-<release-slug>` passes through to land on `main`. A release is
the atomic unit of integration to `main` — main only ever receives a complete, audited, rendering
docset, one per release. This is the **only** Doc Kit skill where `main` is the target; every other
skill forks from and merges into `$TRUNK`. Read `release-worktrunk-model.md` first.

**This gate COMPOSES the kit's audit dimensions; it owns none of their logic.** Each concern has one
owner (`doc-qa-taxonomy.md`): claim correctness → `doc-validate accuracy`; coverage → `doc-validate
completeness`; link integrity → `doc-validate links`; build health → `doc-validate render`; writing
standards → `doc-validate style`; asset currency → `doc-validate freshness`. The gate's own job is
only: take stock → confirm those owners passed → land (merge-commit) → archive the prior version →
reflect. If you find yourself writing audit logic here, stop and delegate to `/doc-validate`.

## Resolve `TRUNK`

`TRUNK = worktrunk/docs-<release-slug>` — read it off the `Worktrunk:` line in the Linear release
milestone description (`/doc-linear-sync` wrote it there). `MILESTONE` is that milestone. The landing
PR is `$TRUNK → main`. `git fetch origin` before anything so every diff/log reads current remote.

## 1. Take stock

- `git diff main...$TRUNK --stat` then read `git diff main...$TRUNK` — the full surface of doc change
  the release delivers. You are about to vouch for all of it landing on `main` as one unit.
- **Summarise what the release documents** in plain product terms — the surfaces, pages, and demos it
  adds/updates. This is the spine of the landing PR body, the `changelog.mdx` entry, and the retro.
  The Built-for-Humans sniff test applies to this copy too.
- **Confirm every release ticket is `Done` and merged on `$TRUNK`.** Enumerate the milestone's
  tickets (`list_issues` per non-terminal state, filter to `MILESTONE` client-side — the
  convergence enumeration in `doc-orchestrator-prompt.md` §6a is the model). Every in-release ticket
  must be terminal except non-blocking `human-review-fyi` / `doc-clarification`. For each `Done`
  ticket, confirm its commit is on `$TRUNK`. A phantom-Done ticket (marked Done, work not on the
  trunk) is a **stop** — reconcile before landing.

If anything is non-terminal or unmerged, the release is not converged. STOP — finish the loop.

## 2. Confirm audit convergence — every page, every dimension

The bar is **not "pages exist"** — it is **every page's six dimensions converged** (`doc-audit-parent`
Done) plus each wave's `cross-surface-audit` converged. Read each `doc-audit-parent` for the release
milestone: every one must show `Convergence: <clean / converged>`, not `pending` or `ESCALATED`. An
`ESCALATED` parent (capped at 3 rounds with gaps still appearing) is a **stop** — resolve it with the
human before landing; it means the page still has unverified or wrong claims.

## 3. Full broken-links + production-preview render on the `$TRUNK → main` PR

Open the landing PR: `gh pr create --base main --head $TRUNK`. Body: the step-1 summary, the
per-page convergence map, the ticket roster. Title `<release tag> docs: land worktrunk/docs-<slug>`.

- This PR triggers the **full Mintlify production preview build** + `mint broken-links` across the
  *whole* docset — the first time the entire release meets the full site as one unit (page PRs only
  checked their own files). It must be **green end to end**.
- A failure here is a real cross-page integration defect the per-file checks couldn't see (a
  cross-reference between two pages that each merged fine, a nav entry in `docs.json` pointing at a
  moved page). Fix it on the trunk (dispatch a `doc-gap` or patch directly) and let the preview
  rebuild. Do NOT `--admin`-merge or bypass the preview gate.
- If the PR base is behind `main`, **merge `main` into `$TRUNK`** (`git checkout $TRUNK && git merge
  origin/main`) — do not rebase the trunk (it carries first-class page commits). Push and re-run.

## 4. Final accuracy + completeness sweep (compose the owners)

The whole-release confirmation against the shipped app. Compose the kit-native owners one last time —
do not re-run their logic by hand:

- **Claim correctness → `/doc-validate accuracy`** on every page the release added/changed, driving
  the shipped app on `APP_CAPTURE_URL`. The per-page loop ran during the build; this is the final
  whole-release pass against the app on the release tag.
- **Coverage → `/doc-validate completeness`** — confirm the release's headline capabilities (from the
  release notes) each have a home in the docs. A capability the release shipped with no page is a
  near-miss; file the page onto the trunk and re-confirm before landing.
- Any **blocker** finding (a wrong claim, a missing mandatory capability, a broken link, a failed
  build, a sniff-test failure, a screenshot of a removed surface) gates the landing — file it, fix on
  the trunk, re-run that owner. `major`/`minor` deferrals are recorded in the PR body + retro, never
  silently dropped.

## 5. Land — merge-commit, NOT squash

```bash
gh pr merge <num> --merge          # NEVER --delete-branch (Mintlify previews race the deletion)
```

- **`--merge`, never `--squash`.** Page PRs merged onto the trunk (one tidy commit each); the release
  preserves those onto `main` so `git log main` shows every page's commit + the merge commit — the
  release's doc history stays legible and bisectable.
- **Do NOT pass `--delete-branch`** — let GitHub auto-prune the worktrunk after the preview settles
  (memory: Mintlify preview race). After the merge: confirm `git log origin/main` shows the merge +
  page commits; transition `MILESTONE` to complete in Linear; tear down the `mint dev` audit worktree.

## 6. Archive the prior version (the version-transition runbook)

A landed release advances `docs.provar.dev` to the new version and archives the prior one under
`v<old>/`. **Run `docs-plan/runbooks/version-transition.md` end to end** — it is the source of truth
for this step; do not re-derive it. The shape (substitute `<OLD>` = the version currently at root,
`<NEW>` = `RELEASE_TAG`):

1. Branch `bradyhunt/dev-NNN-version-transition-<NEW>` off fresh `main`.
2. `cp -r concepts how-to tutorials v<OLD>/` (NOT `index/glossary/changelog` — version-agnostic;
   NOT `api-reference/openapi.json` — handled in step 4).
3. Insert the `<Info>` archive banner into every `v<OLD>/**/*.mdx` (the python-regex bulk-insert in
   the runbook's friction notes is proven for minor cuts).
4. Refresh root `api-reference/openapi.json` from the NEW tag and copy the OLD tag's snapshot into
   `v<OLD>/api-reference/openapi.json` (both via `gh api '…/openapi.json?ref=<TAG>'`).
5. Update `changelog.mdx` with the new `<Update>` block (from the release notes).
6. Scope the `.mintignore` `v2026.*/` line so the now-populated `v<OLD>/` renders.
7. Verify locally (`npx mintlify dev --port 3333`): root renders NEW, `/v<OLD>/…` renders with the
   banner, the archived API pins to the OLD tag, no 404s on `index.mdx` Card hrefs.
8. Split across PRs per the runbook's friction note (files → OpenAPI → docs.json tab + mintignore) to
   avoid broken intermediate states. **Never `--delete-branch`.**

Capture any new friction back into the runbook (step 10 of the runbook). The archive is part of the
landing, not a separate task — a release isn't landed until the prior version is browseable under
`v<old>/`.

## 7. Reflection — leave the harness stronger

Every landing ends with a structured reflection so the loop improves each release instead of
relearning the same lessons.

**Aggregate this landing's failure-shaped signal:** the release's `harness-fault` / stale-base /
remediation events (scan tickets + PR comments); the **completeness near-misses** (capabilities that
almost shipped undocumented); the **accuracy near-misses** (a wrong claim the final pass caught that
every prior round missed; an `ESCALATED` audit parent).

**Append a dated entry to `docs-plan/doc-kit/landing-retros.md`** (newest first; create with a
one-line header if missing):

```
## <YYYY-MM-DD> — <release tag> docs (worktrunk/docs-<slug> → main)

**Documented:** <one-paragraph product summary from step 1>
**Convergence map:** <page → rounds-to-converge; any ESCALATED + how resolved>
**Harness events:** <harness-fault / stale-base / remediation counts + the notable ones>
**Near-misses:** <what almost shipped wrong/undocumented, and what caught it>
**Propagated:** <the rule(s) fed back into the harness, file + one-line what/why — or "none">
```

**Propagate every insight that is a rule** — a log entry alone doesn't improve the loop; the rule
lands in the harness so the next release inherits it:

- A recurring stale-base / sequencing fault → sharpen `doc-orchestrator-prompt.md` §1a or the
  playbook's failure-mode notes.
- A completeness gap a page ticket should have caught itself → tighten `templates/page-ticket-spec.md`
  or `templates/claim-map.md` (e.g. "every release-notes headline capability gets a claim").
- A model-level rule (a new gate ordering, a new invariant) → amend `release-worktrunk-model.md`.
- A class of defect the preflight could catch → add a check to `/doc-release-loop` §1.

Record what you propagated in the **Propagated** field. A clean landing is the exception — if it
genuinely surfaced no rule, write "none this landing."

## Rules

- **`main` is the target only here.** Every other Doc Kit skill forks from / merges into `$TRUNK`.
- **Merge-commit, never squash** — the release preserves page history on `main`.
- **Never `--admin` / bypass the preview gate.** A red landing PR is a real cross-page defect.
- **Never `--delete-branch`** — Mintlify previews race the deletion.
- **Walk the gate in order.** Audit convergence (2) and the final sweep (4) are preconditions for the
  merge (5); the archive (6) is part of the landing, not optional.
- **Always reflect, and always archive.** A landing that skips either is incomplete.
