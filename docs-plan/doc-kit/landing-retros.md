# Doc Kit — landing retros

Newest first. One entry per release landed on `main` via `/doc-land-release`.

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
