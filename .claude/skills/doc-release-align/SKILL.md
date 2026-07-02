---
name: doc-release-align
description: Port a trust-ai-app release into a verified, page-by-page doc-impact map — pin a worktree at the release tag, ingest the GitHub release notes, fan out track mappers + page auditors, then ship the mechanical follow-through (changelog entry, OpenAPI re-pin via /doc-openapi-sanitize, terminology authority update). Use when a new app release has shipped and the docs need to catch up ("align the docs with vX", "port the release", "the docs are N releases behind"), or as the mechanical front half of /doc-plan.
user-invocable: true
---

# /doc-release-align — release notes → verified doc-impact map → alignment PRs

The mechanical, non-interactive front half of catching the docs up to a shipped release. `/doc-plan`
decides *what a release deserves* (surfaces, waves, demo budget) interactively; this skill answers
the prior question — **what did the release actually change, and which pages does that make wrong?**
— and ships the follow-through nobody should have to think about (changelog entry, OpenAPI re-pin,
terminology authority).

## Why this exists (history evidence)

The two costliest fix classes in this repo's history both start as an un-ported release delta:

- **Accuracy drift** — `ceb3342` deleted 189 lines of fabricated MCP auth flow that a verified
  release port would never have written.
- **Terminology drift** — `30942c1` swept Datasets→Scenarios across 24 files months late; the
  v2026.06.30.1 loop found our own `AGENTS.md` mandating retired vocabulary ("Scenario set",
  "never invent /v1/scenarios") that steered every subsequent edit wrong.
- **Ritual debt** — four separate ad-hoc changelog-porting commits; one deferred a full release
  because "release notes weren't surfaced this loop" (loop-retro DEV-1911).

## Non-negotiable ground rules

1. **Pin the truth first.** The local app clone's `main` is AHEAD of the release. Create a
   read-only worktree at the tag and audit only there:
   ```bash
   git -C ~/Developer/trust-ai-app worktree add --detach \
     ~/Developer/trust-ai-worktrees/docs-audit-<TAG> <TAG>
   ```
   Remove it when the run ends. Never verify a claim against the clone's main.
2. **Release notes are canonical for WHAT changed; the worktree is canonical for exact labels,
   routes, and flag defaults.** When they disagree, the worktree wins and the disagreement is
   itself a finding (v2026.06.30.1: release notes said the TDM preview flag shipped default-on;
   `flags.ts` at the tag said default-off).
3. **Flag-gated ≙ preview.** Anything mounted behind a flag that defaults off in production is
   marked `flag_gated: true` in the impact map and may only be documented hedged as preview —
   or omitted. Never GA-voiced.
4. **Docs may be MULTIPLE releases behind.** Diff from the docs' last-aligned version (top entry
   of `changelog.mdx`), not just the latest tag. Pull every intervening release's notes.

## The pipeline

### 1. Establish the delta

- Docs' last-aligned version: top `<Update>` label in `changelog.mdx`.
- App tags since: `git -C ~/Developer/trust-ai-app tag --sort=-creatordate`.
- Pull each intervening release's notes: `gh release view <TAG> --json body -q .body` (run in the
  app repo). Save to the session scratchpad — they seed every downstream prompt.
- Pin the worktree at the NEWEST tag (rule 1).

### 2. Fan out the impact map (Workflow, parallel)

Two independent directions plus one option, all against the pinned worktree + notes:

- **Track mappers** (~1 per release-note macro-track): read the track's sections across all
  intervening releases, verify surface details in the worktree (labels, routes, tab names, flag
  gates), read the docs pages the track touches, return structured
  `{shipped_facts[{fact, evidence, flag_gated}], doc_impacts[{page|NEW:path, change, priority P0–P2}],
  terminology[]}`. P0 = a reader-visible claim that is now actively wrong.
- **Page auditors** (1 per existing page): treat the page as claims; check each against worktree +
  notes; return `{verdict: ok|minor|stale|badly_stale, stale_claims[{claim, truth, evidence}],
  missing_coverage[]}`. Screenshots flag as stale only when the depicted surface structurally
  changed per the notes.
- Include `AGENTS.md` itself as an audited "page" — the terminology authority drifts too, and a
  stale authority corrupts every downstream edit.

Persist the combined map to the scratchpad (it is the completeness oracle `/doc-validate` audits
against later) and summarize the P0s + scope decisions in the plan/tracking issue.

### 3. Ship the mechanical follow-through, in this order

Each is its own small PR (fast Mintlify preview signal, easy revert); merge before the page waves
so writers inherit a correct foundation:

1. **Archive tag** — `git tag docs-<OLD_VERSION> && git push origin docs-<OLD_VERSION>` on main
   *before anything merges* (rolling-site convention; see `docs-plan/versioning/README.md`).
2. **`AGENTS.md` terminology authority** — apply the map's `terminology[]` findings. This PR goes
   FIRST among content changes; every writer reads this file.
3. **`changelog.mdx`** — one `<Update>` entry per intervening release, house style, newest-first,
   preview features labeled and hedged. If an old entry states something a later release reversed,
   append an italic *(Superseded in vX: …)* pointer — never rewrite history. Update
   `snippets/latest-release.mdx` if the repo has one; sweep now-stale "(coming soon)" banners.
4. **OpenAPI re-pin** — invoke `/doc-openapi-sanitize` (archives the old spec, re-exports from the
   tag, sanitizes, reports the diff).

### 4. Hand off

The impact map drives the page-rewrite waves (dispatch `doc-writer-agent`s — one page, one PR,
isolated worktree, `mint broken-links` gated, writers never merge) and scopes NEW pages. Record
explicit scope decisions — *"no page for X this release because Y"* — in the plan; an undecided
gap is debt, a decided one is a boundary.

## Operational lessons (v2026.06.30.1 loop — hard-won, follow them)

- **Every concurrent writer/fixer gets its own git worktree — including ad-hoc single-agent
  dispatches.** Two fixers sharing the main checkout raced on branches mid-commit (both recovered,
  but only by luck and care). Workflow-dispatched agents with `isolation: worktree` never hit this.
- **Mintlify skips preview builds under concurrent-branch load** ("skipping" check state). The
  substitute gate: merge the candidate branch(es) onto `origin/main` in a *detached* temp worktree,
  run `mint broken-links` there, then merge on GitHub. Never merge a skipped-preview PR unvalidated,
  and never run that validation inside the main checkout.
- **Dispatch big waves via Workflow, not loose Agent calls** — when a mid-wave rate limit killed 9
  of 17 writers, `resumeFromRunId` replayed the 8 cached successes free and re-ran only the dead
  ones. Loose agents have no such resume.
- **Cross-check writer flags against sibling pages before merging.** The two systemic errors this
  loop (Pass^K "default 2", agent-evaluates-sessions) were each caught because one writer's
  code-verified flag contradicted three sibling pages — both errors originated in the
  orchestrator's own wave briefs, sourced from release-note prose instead of tagged code.
- **Two fresh-eyes cross-surface auditors after the waves merge** (concepts coherence + task-page
  journey coherence) found 28 real findings that per-page verification could not see. Budget for
  this pass; it is where parallel-writing's seams show.

## Outputs

- Scratchpad: `impact-tracks.json`, `impact-pages.json`, the release-notes files.
- Merged PRs: archive tag, AGENTS.md, changelog, OpenAPI re-pin.
- A tracking issue (Doc Driven Development project) with findings + scope decisions + PR links.
