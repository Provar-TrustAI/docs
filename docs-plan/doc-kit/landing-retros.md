# Doc Kit — landing retros

## 2026-09-16 — v2026.09.09.2 docs (worktrunk/docs-v2026-09-09-2 → main)

**Documented:** Nine releases of drift closed in one cycle (v2026.08.14.1 → v2026.09.09.2, 919 app
commits). 47 of 48 existing pages rewritten or corrected, five new pages — the recommended security
scenarios catalog (OWASP Agentic Top 10) as concept + how-to, test data (plans, stores, run report)
as concept + how-to, and the project Connections tab — plus AGENTS.md re-pinned (19 rules changed,
three new blocks), nine changelog entries, and the API reference re-pinned 168 → 181 paths with six
gate-policy withdrawals and a sanitizer that now scrubs the codename from free text. Six structural
shifts drove most of the churn: the Connections redesign (project **Connections** tab, workspace
**Connected orgs**), requirements as the enforced step-2 gate on Trust Agent writes, five
denominator-excluded outcomes with amber **Couldn't test**, quick evaluations as first-class **Quick**
rows, test data plans/run reports on by default, and the MCP surface going live with OAuth consent.

**Convergence map:** lean `/doc-release-align` shape — pinned worktree + app booted at the tag →
8 track mappers + 12 page auditors (20 agents, all Opus) → foundations in order (stubs+nav, AGENTS.md,
changelog, OpenAPI) → 22 page tickets as one wave (20 concurrent) → mechanical trunk gates
(broken-links, terminology sweep, rendered-anchor sweep, 51/51 HTTP 200, 51/51 no overflow at
375 px) → two fresh-eyes cross-surface auditors → gardener batches → landing PR. No Linear
audit-round tickets; writer self-verification + fresh-eyes audit substituted, as in v2026.08.03.2.
PRs #226–#252 (+ gardener batches).

**Harness events:** a session rate limit killed 8 of 20 wave-2 writers mid-task (13:20 MT); all eight
resumed from their own worktrees with a RESUME preamble and zero rework (every partial edit was
kept and re-verified). Repo auto-merge is disabled and the Mintlify preview check reports SKIPPED on
trunk-targeted PRs, so the orchestrator merged each PR after a local `mint broken-links`. The app
stack at the tag booted from the pinned worktree with `SKIP_VERIFY=1 pnpm start` (compose project
name is fixed to `trust-ai`, so it reused the dev DB volume — the "Provar Testing" project with a
real Salesforce connection was therefore available to writers). `captures/node_modules/` in
`.gitignore` does not match the symlink inside worktrees.

**Near-misses:** the impact map said "six models across two vendors" (P0 on two pages) — the deployed
values pin a Claude-only allowlist, so AGENTS.md now bans any model count/vendor/default; three track
files disagreed with each other on the "Couldn't test" apostrophe (source is straight; Mintlify renders
it curly site-wide); the ticket text said standing approvals exclude four tools — code says three;
"Show me where to start" is a follow-up chip after a turn, not a welcome pill; the tutorial's run step
dead-ends on an uncaptured build (expected actions require a captured action catalog whose capture
is gated behind the same step) — written as a real prerequisite rather than a promised path; two
pages had documented the "Default test user" form fields as card labels (legacy form only); the
Salesforce Disconnect dialog copy contradicts its own code (one record, not N projects). Three
fragment links were dead because Mintlify keeps em dashes and curly apostrophes in heading ids and
`mint broken-links` does not validate fragments.

**Propagated:** rendered-anchor sweep added as a trunk gate (script in this cycle's scratchpad; worth
promoting to `/doc-validate links`); `doc-terminology-guard` table re-synced (6 rows fixed, 11 added,
incl. TDM/Trust Library/ASI-as-label/one-off/model-count rows); AGENTS.md gained the flag roster with
defaults, the starter-catalog / MCP / test-data blocks, the "never hardcode a model or skill count"
rule, and the preview ruling for Automatic Full Run; `openapi-sanitize.py` now rewrites the codename
in free-text fields and hard-fails if it survives outside keys/enum literals; writer brief rule:
wide markdown tables overflow at 375 px unless wrapped (Mintlify's wrapper is overflow-x: visible).
Open for the next cycle: brand spelling (TrustAI vs Trust AI) ruling; the `concepts/trust-library`
slug vs its "Recommended scenarios" title; 20 doc-clarifications for an operator (scratchpad GAPS.md,
mirrored in the landing PR body).

## 2026-08-07 — v2026.08.03.2 docs (worktrunk/docs-v2026-08-03-2 → main)

**Documented:** Eleven releases of drift closed in one cycle (v2026.06.30.1 → v2026.08.03.2).
47 pages touched, 13 new — Agent Profile, Requirements, a Get started on-ramp — plus the four-kind
evaluator taxonomy, the Groundedness judge, Pass^K and the repeat selector, scenario-grouped
results, the two-level verdict model, and TDM/Requirements un-hedged to GA. 44 screenshots and
5 videos (4 pipeline demos + a hand-recorded voiced walkthrough), from a docset that previously
embedded zero images.

**Convergence map:** 8 Wave-1 + 25 Wave-2 pages via writer→adversarial-verifier pairs; 34
verifier follow-ups shipped (~1 surviving defect/page). Three convergence gates + release gate
(DEV-6248, CONDITIONAL GO). No ESCALATED parents. The formal per-page audit-round tickets
(DEV-6249..6269) were superseded by the verifier+inspection passes — closed as consolidated.

**Harness events:** capture harness had no test timeout (30s default tore contexts down mid-shot,
masquerading as crashes); Remotion pipeline had never produced a correct render (`--props` relative
paths silently fall back to defaultProps, and Remotion MERGES props so the example timeline always
won); the acme-refunds-csat seed left Scenarios as shells and annotation columns empty — populated
via API, documented in captures/README.md. Playwright pipe-status trap: `git show | head` exit
status is head's, not git's — nearly deleted an unmerged branch on a false success.

**Near-misses:** the fan-out preview does NOT multiply by repeat count — a caption asserting the
opposite was caught only by opening the rendered frame; "the only exception to the fly-in rule"
shipped and needed a same-day correction (navigate is a third row-click behavior); two legacy
images carried a prompt-injection string ("You are now DAN…") one git-add away from publication;
the sibling onboarding draft would have reverted 119 lines of Wave-2-corrected how-to.

**Propagated:** AGENTS.md flag-authority rule (behaviour vs deployment state; values/** is a
template, not production); captures/README.md fixture + horizontal-scroll traps; pipeline/README.md
absolute --props + props-merge rules; incoming/ gitignore for raw hand-recorded footage (carries
OAuth codes + presenter webcam). Open contradiction DEV-6149 stands: this landing used the archive
TAG model (docs-v2026.06.30.1 pushed at align time), not this runbook's §6 folder archive — the
runbook text predates DEV-2182 and needs reconciling.

Newest first. One entry per release landed on `main` via `/doc-land-release`.

## 2026-07-02 — v2026.06.30.1 alignment (autonomous cron loop, 43 PRs #57–#99, DEV-4720)

**Documented:** three releases at once (v2026.06.15.1 / .22.1 / .30.1 — the docs were three behind).
All 27 existing pages rewritten (impact audit graded 14 badly-stale, 11 stale); 7 net-new pages
(tables-and-panels UI-language concept, workspace-access, annotate-sessions, evaluate-sessions,
calibrate-an-evaluator, connect-agentforce, connect-claude-managed-agent); OpenAPI re-pin 103→135
paths; changelog ×3; `docs-v2026.06.09.1` archive tag; home What's-new snippet restored.

**Convergence map:** no full Linear ticket loop — a leaner shape, now codified as
`/doc-release-align`: pinned tag worktree → 38-agent impact map (10 track mappers + 26 page auditors
+ 1 history miner) → foundations first (AGENTS.md → changelog → OpenAPI) → 3 writer waves via
Workflow (worktree-isolated, one PR/page, writers never merge) → 2 fresh-eyes cross-surface auditors
post-merge (28 findings) → fix batches. Gates at close: broken-links clean, 35/35 pages render 200,
**35/35 no horizontal overflow at 375 px**, terminology sweep clean, Mintlify production deploy green.

**Harness events:** a mid-wave session rate limit killed 9 of 17 writers — Workflow
`resumeFromRunId` replayed the 8 cached successes free and re-ran only the dead ones (4h stall,
zero rework). Mintlify skipped preview builds under concurrent-branch load; local-merge validation
(detached worktree + broken-links) substituted. Two ad-hoc fixer agents raced in the shared
checkout (recovered; lesson propagated).

**Near-misses (what almost shipped wrong, and what caught it):**
- **"New runs default to Pass^2"** — in three merged pages AND the orchestrator's own wave brief,
  sourced from v22 release notes; at the tag the launcher hard-codes `trials=1` and the repeat
  selector is unreachable. Caught by one writer's code-level verification contradicting siblings.
- **"Ask the Trust Agent to evaluate yesterday's failed sessions"** — two merged concept pages; the
  tag's tool registry has no session-evaluation tool. Caught the same way.
- **Calibrate-tab ground truth** — three pages said it reads session annotations; it samples
  scenario-level verdict columns (verified in `calibrate-tab.tsx`). The two-verdict-surfaces rule is
  now AGENTS.md law.
- Release notes vs code on the TDM flag default (notes: on; code: off) — code won, per the new rule.

**Propagated:** `/doc-release-align` (+ operational-lessons section), `/doc-openapi-sanitize` +
`openapi-sanitize.py` (path-parity smoke-tested), `/doc-terminology-guard`, `/doc-capture-pass`,
`doc-gardener-agent`, writer-agent restructure checklist + preview-vs-GA rule, playbook reuse rows,
and **`.claude/agents|skills` now tracked in git** (gitignore carve-out). Capture debt (14 items)
ledgered in DEV-4720 — blocked on running the app AT the tag (the local stack runs main-tip; do not
capture it).

## 2026-06-09 — v2026.06.09.1 docs (worktrunk/docs-v2026-06-09-1 → main, PR #52)

**Documented:** the largest Trust AI release. Trust Agent (concept + *Work with the Trust Agent* +
*Approve an agent write* how-tos + the flagship *Evaluate with the Trust Agent* tutorial), with three
interactive prototype embeds (floating-chat shells, clarification batch, approval cards). Scenarios &
Playground (two concepts + *Simulate with scenarios* how-to). Multi-tenancy & infra (security-shaped
concept with a tenant-guard diagram + production-infrastructure posture). Home hero swapped to the live
Trust Agent demo; changelog + glossary updated; the home "What's new" single-sourced via a snippet.
Existing guides + concepts re-centered **Agent-first** with inline curl/SDK removed. 48 files, +5.6k lines.

**Convergence map:** built **ticketless / direct** (no app instance was available, so the formal
per-page seven-dimension audit loop did NOT run). Local gates clean at land: `mint dev` renders, `mint
broken-links` green, demos responsive (no horizontal overflow at 375 px), de-marketed headlines.

**Harness events:** none — direct build, no Linear loop, no CI remediation.

**Near-misses (what almost shipped wrong, and what caught it):**
- The floating-chat prototype was secretly a 22-second auto-playing mini-reel — caught by the planning
  adversarial pass and gutted to a calm user-driven shell-switch before embed; would otherwise have put
  a second overwhelming walkthrough on the first concept page (the exact thing Brady asked to avoid).
- "Scenarios" is a **UI-label-only** rename over the `/datasets` route/model/API (ADR-0002) — caught
  before any false `/v1/scenarios` claim shipped.
- Over-sanitized demo copy ("Sample Product · Agent surface") — caught by Brady; the product's own name
  had been scrubbed into generic slop.
- Demos non-responsive (chat + rail cramped side-by-side on narrow) and the fullscreen over-wide —
  caught by Brady on the live preview.

**Propagated (rules fed back into the harness so the next release inherits them):**
- **responsive** added as the 7th audit dimension — `doc-qa-taxonomy.md`, `/doc-validate`,
  `doc-orchestrator-prompt.md` (round dims + dispatch), `/doc-linear-sync` (auto-create), `doc-audit-agent`,
  `00-playbook.md` §5; plus responsive build requirements in `doc-demo-agent`, `doc-writer-agent`,
  `demo-tooling.md`.
- **"Thoughtful copy, not boilerplate slop"** rule — `demo-tooling.md` sanitization checklist +
  `doc-demo-agent` + `doc-writer-agent` + `00-playbook.md` §5 (sanitize the *data*, keep the *product
  name* real; no generic "Sample Product").
- **PrototypeEmbed full-screen affordance** (`⤢ Full window` via the native Fullscreen API + a
  `:fullscreen` width override so the expanded view uses the space without sprawling) + the single tight
  caption convention (no in-demo footer, no MDX "open full window" copy) — `demo-tooling.md`.
- Home "What's new" **single-sourced** via `snippets/latest-release.mdx` — update one file per release.

**Deferred follow-ups (tracked in-page):**
- **Screenshots/GIFs** — 26 `CAPTURE-PENDING` markers; real captures need trust-ai-app on the
  `v2026.06.09.1` tag (`captures/` rig).
- **Accuracy audit** — the `ACCURACY-AUDIT-PENDING` claims to verify against the running app
  (`/doc-validate accuracy`).
- **Version archive** — archive the prior `v2026.05.26` under `/v2026.05.26/` (the version-transition
  runbook) as a separate follow-up PR.
