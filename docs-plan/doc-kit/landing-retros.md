# Doc Kit — landing retros

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
