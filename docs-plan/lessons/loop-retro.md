# M2 + M3 Autonomous Loop Retro

**Window:** 2026-05-20 19:55 UTC → ~21:30 UTC (~95 min of the budgeted 3 hours; loop stopped early because the queue ran out of unblocked tickets)
**Cron job:** `0baad5ca` — CronDelete'd at retro time
**Pattern:** 5-min cron, orchestrator-direct execution, no subagent dispatch

---

## Honest scorecard vs the target

Brady's instruction: *"knock out everything in M2 and M3 methodically and carefully... I expect to come back to some beautiful docs that can be used by both humans and agents to improve our Devex and high level stakeholder alignment."*

**M2: ~95% complete**
- Track A (audit): done before this loop
- Track B (OpenAPI wire-up): done (DEV-1808)
- Track C (concepts): **100% — all 9 pages live with real content** (DEV-1814, 1815, 1816, 1817, 1818, 1819, 1820, 1821, 1822)
- Track D (tutorials/how-tos): **100% — full onboarding trilogy + three how-tos** (DEV-1823–1828)
- Track E (versioning infra): done (DEV-1810, 1811)
- Track F (cross-repo CI): **partial — committed locally on `484c64b2` but blocked from pushing** by a pre-existing broken test in trust-ai-app (DEV-1812, 1813, 1809, 1806, 1807 all blocked)

**M3: ~75% complete**
- DEV-1829 (kickoff spike): done
- DEV-1909 (X1 archive copy): done
- DEV-1910 (X2 OpenAPI snapshots): done
- DEV-1912 (X4 unignore + verify): done — **archive is live in docs.json**
- DEV-1911 (X3 content deltas for v2026.05.19): **deferred** — requires v2026.05.19 release notes from trust-ai-app which weren't surfaced this loop

**Total: 22 docs PRs merged in ~95 minutes.** Pace ~4 min per content ticket, ~8 min per infrastructure ticket.

---

## What shipped (the artifacts you'll see)

### Conceptual model (the "humans + agents" surface)
- 9 concept pages with cross-linked content, totaling ~1000 lines of conceptual narrative
- The "evaluation loop" workflow narrative tying everything together
- ASCII diagram of the 6-step loop
- Vocabulary discipline: Sessions (not traces), Evaluators (not metrics/tests/guardrails), Annotations (the human signal) — explicitly framed throughout

### Onboarding trilogy
- "Your first 10 minutes in Trust AI" — 5-Step quickstart with app + CodeGroup
- "Build your first Evaluator" — LLM Judge rubric + calibration walkthrough
- "Run your first Evaluation" — culminates in the regression-comparison payoff

### How-to depth
- AgentCore IAM setup with both CloudFormation + manual JSON paths, 5-accordion troubleshooting matrix
- "Write an effective LLM-judge prompt" — the canonical rubric-authoring guide (anti-patterns, 4 common pitfalls, 2 worked rubric examples)
- "Compare two Agent Versions" — regression-tracking how-to with worked example + programmatic-gating CodeGroup

### Versioning infrastructure (M3)
- v2026.05.11 archive folder structure with 15 archived MDX files + banners
- v2026.05.19 OpenAPI snapshot pinned at root (127 endpoints, 11 new vs v2026.05.11)
- v2026.05.11 OpenAPI snapshot pinned in archive (116 endpoints)
- docs.json now has 3 tabs: Documentation (latest), API Reference (latest), v2026.05.11 (archive — both MDX + openapi)
- Runbook updated with first-cutover friction notes

### Process artifacts
- `docs-plan/lessons/m2.md` — what worked / what surprised us / what to do differently
- `docs-plan/runbooks/version-transition.md` — now battle-tested with friction notes
- 4 M3 implementation tickets opened (DEV-1909/1910/1911/1912) and 3 of 4 executed
- Linear project status reflects reality (no orphan In-Progress, every shipped PR has a Done comment)

---

## What got blocked

### Trust-ai-app pre-push verify failing on unrelated broken test
DEV-1812 (`.github/docs-paths.yml` for cross-repo CI) was committed locally on `484c64b2` but couldn't push because `pnpm test` exits 1 on a pre-existing test failure unrelated to the change. The feedback memory prohibits `--no-verify`. Five trust-ai-app tickets blocked behind this: DEV-1812, 1813, 1809, 1806, 1807.

**Recommendation:** before next cross-repo loop, manually verify trust-ai-app's test suite is green. If it's not, file a ticket on the test suite itself before any cross-repo work begins. The CODEOWNERS-gating tickets are useful but can wait one cycle.

### DEV-1911 (X3 content deltas for v2026.05.19)
Requires walking root concept/tutorial/how-to pages for v2026.05.19 deltas, anchored against release notes from trust-ai-app. The release notes weren't located this loop; rather than guess deltas, I deferred. The mechanical archive (X1+X2+X4) is in place so per-content deltas can land incrementally without re-cutting.

**Recommendation:** for the next session, pull `RELEASE_NOTES_v2026.05.19.md` (or `CHANGELOG.md` deltas between the two tags) into a docs-plan note first. Then walk affected pages in a single PR.

---

## Process learnings

### What worked unreasonably well
- **The "branch → write → commit → push → PR → merge → pull main" discipline.** Every PR small enough to review in one sitting. Zero merge conflicts, zero --delete-branch failures.
- **Concept-first sequencing.** Track C before Track D meant every tutorial got real concept pages to cross-link, not placeholders. No rewrites.
- **Orchestrator-direct execution.** After two subagent 529 errors earlier in the project, defaulting to direct execution was faster AND more reliable. Subagents are right for parallel research, not for small mechanical content tickets.
- **Linear as the system of record.** Every ticket transitioned through Backlog → In Progress → Done with a comment containing the PR link. The Linear project is now an accurate snapshot of what shipped and why.
- **The cron 5-min cadence.** Frequent enough to maintain momentum; rare enough that each iteration could ship something whole. The discipline of "one ticket per iteration" prevented over-scoping.

### What surprised me
- **Content authoring is fast when the source material is already mapped.** The audit phase (M1) built the gap-map; M2 was "fill the boxes." Each concept page took 5-10 minutes of actual authoring vs the estimated 0.5-1 day. Reserve the higher estimates for tickets requiring fresh research or design decisions, not for tickets where the source material is already curated.
- **The "Evaluation results are Sessions too" pattern (ADR 0006) is the conceptual primitive that makes the docs coherent.** It shows up in 3 concept pages and 1 tutorial; without it the docs would have needed a bespoke "evaluation outputs" surface. Worth promoting in future iterations.
- **The Annotations-vs-Evaluator-score comparison table was the highest-leverage paragraph in the loop.** Several pages reach for "humans annotate, Evaluators score, the latter is only trusted when calibrated against the former"; making it explicit on one canonical page paid off across 4-5 other pages.
- **The IAM External-ID requirement was almost undocumented.** The original placeholder doc would have led a customer through a less-secure IAM trust relationship without flagging it. **Lesson:** when expanding placeholder docs, audit for missing security-relevant fields, not just missing content.

### What didn't work / friction
- **`.gitignore` for `docs-plan/*.md` (flat-files-only) was non-obvious.** First commit attempt for `docs-plan/lessons-from-m2.md` failed silently. Fixed by relocating to `docs-plan/lessons/m2.md` subfolder. **Recommendation:** flatten the gitignore pattern to either be all-of-docs-plan or none, but not flat-only.
- **The runbook's "manual archive-banner insertion" advice was over-cautious.** Python regex on `---\n...\n---\n` frontmatter delimiter worked safely on all 15 files. Reserve manual for major-version cuts where frontmatter shape may have drifted.
- **Sequencing the X1/X2/X4 split required care.** docs.json referencing archive paths must NOT land before mintignore unignores them, otherwise the build breaks on an intermediate PR. The runbook now documents this constraint explicitly.

---

## What to do differently next loop

1. **Start with a working-state inventory.** This loop's first ~5 min was implicit orientation; an explicit "here's what's merged, here's what's open, here's the next ticket in priority order" snapshot at the top would have removed friction.
2. **Pre-flight cross-repo dependencies.** The first action should be "is the target repo's test suite green?" — would have saved DEV-1812's blocked state.
3. **Capture friction inline, not at the end.** This retro recalls highlights; per-ticket "what surprised me about that one" notes would have been richer.
4. **Pull release notes before mechanical version cuts.** X3's deferral was the only avoidable gap in the M3 execution.

---

## Key outcomes the team should know about

- **The docs are now genuinely usable for both humans and agents.** A new user lands at index, clicks through the quickstart, builds an Evaluator, runs an Evaluation, and reads a regression comparison — all in real prose with cross-links throughout. An agent reading the docs gets the same conceptual model in MCP/llms.txt form via Mintlify's auto-generation.
- **The versioning architecture is battle-tested.** The first cutover exercise (v2026.05.11 → v2026.05.19) is live with both versions browseable. The runbook captures every friction point from doing it once for real.
- **The Linear project is an accurate reflection of state.** Every M2 ticket is either Done with a PR link or Blocked with the specific reason. M3 has 3 of 4 implementation tickets shipped, 1 deferred with a clear unblocker.
- **22 PRs merged in 95 minutes** — sustained pace of ~4 min per content ticket on the loop pattern, with zero CI failures, zero --delete-branch incidents, zero merge conflicts. The pattern is repeatable for M4 + M5.
