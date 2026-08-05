# Doc Kit — playbook

The reusable **PLAN → SYNC → BUILD-LOOP → AUDIT → LAND** machinery that ports each Trust AI
release into `docs.provar.dev`. It is a direct adaptation of the trust-ai-app **UI Build Kit**
(`$APP_ROOT/docs/eng/ui-build-kit/`, §0) for Mintlify documentation. Read this first; it is the
map. Every skill and agent below reads back to one of the model docs this file points at.

We ship a release every 1–2 weeks. Doc Kit exists so that catching the docs up is an
autonomous, rigorous loop — not a heroic manual sprint — and so the docs stay beautiful,
accurate, and interactive without bloating.

## The five phases

| Phase | Skill | What it does |
|---|---|---|
| PLAN | `/doc-plan` | **Interactive.** Derive the doc **surfaces** a release needs (pages to create/update), map each to a Diataxis type, decompose into waves, set the **demo budget**, compose the ticket roster. Persist the plan as Linear documents. |
| SYNC | `/doc-linear-sync` | Idempotent. Turn the approved plan into Linear tickets: page tickets, demo-asset tickets, per-page audit parents + round-1 dimension audits, wave-convergence gates. |
| BUILD | `/doc-release-loop` → `doc-orchestrator-prompt.md` | Preflight + launch the autonomous loop. The orchestrator polls Linear, dispatches subagents, reconciles PRs, runs multi-round audit convergence. |
| AUDIT | `/doc-validate` | Read-only audit primitive. **Seven** dimensions (§5), each checked against the **shipped app**. Runs inside the loop (one dimension per ticket) and by hand (all seven + report). |
| LAND | `/doc-land-release` | The rigorous gate the release worktrunk passes through onto `main`, then the **version-transition** archive, then a reflection that feeds the harness forward. |

## §0. Path resolution — never hardcode a checkout

Doc Kit runs on whoever's machine is driving the loop. **No skill, agent, or runbook may hardcode
an absolute path or an author's branch prefix.** Resolve these once, at the start of a run, and
refer to them by name everywhere else:

| Var | Resolution |
|---|---|
| `DOCS_ROOT` | `git rev-parse --show-toplevel` from inside the docs repo |
| `APP_ROOT` | `$TRUSTAI_APP_ROOT`, else the first existing of `$DOCS_ROOT/../trustai-app`, `$DOCS_ROOT/../trust-ai-app`, `~/Developer/trust-ai-app` |
| `WORKTREE_DIR` | `$TRUSTAI_WORKTREES`, else `$(dirname "$APP_ROOT")/.doc-audit-worktrees` |
| `BRANCH_PREFIX` | `$DOC_BRANCH_PREFIX`, else derived from `git config user.email` — **fails loudly if neither resolves** |
| `PROTOTYPE_DIR` | `$PADDINGTON_DIR` — **optional**. Unset ⇒ Tier-3 prototype embeds are unavailable and the demo budget plans Tier-1/2 only (§3) |

```bash
DOCS_ROOT=$(git rev-parse --show-toplevel)
APP_ROOT="${TRUSTAI_APP_ROOT:-}"
if [ -z "$APP_ROOT" ]; then
  for _c in "$DOCS_ROOT/../trustai-app" "$DOCS_ROOT/../trust-ai-app" "$HOME/Developer/trust-ai-app"; do
    [ -d "$_c/.git" ] && APP_ROOT=$(cd "$_c" && pwd) && break
  done
fi
[ -n "$APP_ROOT" ] || { echo "APP_ROOT unresolved — set TRUSTAI_APP_ROOT"; exit 1; }
WORKTREE_DIR="${TRUSTAI_WORKTREES:-$(dirname "$APP_ROOT")/.doc-audit-worktrees}"
BRANCH_PREFIX="${DOC_BRANCH_PREFIX:-$(git config user.email | cut -d@ -f1 | tr -d '.')}"
[ -n "$BRANCH_PREFIX" ] || { echo "BRANCH_PREFIX unresolved — set DOC_BRANCH_PREFIX or git config user.email"; exit 1; }
PROTOTYPE_DIR="${PADDINGTON_DIR:-}"   # optional
```

The `BRANCH_PREFIX` guard is not paranoia: git identity is configured **per-repo** on some
machines, so a fresh docs clone has no `user.email` and the naive derivation silently yields an
empty prefix — every branch then lands as `/dev-<ID>-<slug>`.

**Branch convention:** `$BRANCH_PREFIX/dev-<ID>-<slug>`, matching the org-wide
`<user>/<linear-ticket>-<slug>` rule.

## §1. The source-of-truth hierarchy — the one conceptual seam

The UI Build Kit's axiom is "the shipped UI must match the design prototype (`docs/design/_source`)."
**Doc Kit inverts this.** A doc's job is to describe **what actually shipped**, so the prototype
is only a design reference. Authority order, highest first:

1. **The shipped app.** trust-ai-app running on the release tag. The `accuracy` audit *drives the
   real app* and any doc claim the app contradicts is a blocker. This is the analog of "render
   the prototype" — except here we render the truth, not the design.
2. **The release notes + ADRs** (`$APP_ROOT/docs/decisions/` — 17+ ADRs are canonical for the
   *why*; the GitHub release notes are canonical for *what changed*).
3. **The OpenAPI snapshot** (`api-reference/openapi.json`, pinned per version) — reference truth.
4. **The Paddington v7 prototype** (`$PROTOTYPE_DIR`, §0) — design reference only, and **optional**:
   when it is unset the kit simply has no Tier-3 prototype source and plans around that. It is the
   source for **interactive demo embeds** (§3), never for a behavioral claim. When the prototype and
   the shipped app disagree, the app wins and the doc describes the app.

**Empowerment.** The goal is not "every ticket closed" — it is **"every page describes the
shipped app correctly, completely, and legibly, and renders clean."** Tickets are a means. When
a ticket body and the shipped app disagree, the app wins and the ticket is wrong — re-scope it.

## §2. Diataxis is the page-type system

The UI kit derives *archetypes* (repeating layouts) and *primitives* (shared components). Doc
Kit's analog:

- **Page types = the four Diataxis quadrants.** Every surface maps to one or more of: **concept**
  (explanation — `concepts/`), **tutorial** (learning-oriented — `tutorials/`), **how-to**
  (task-oriented — `how-to/`), **reference** (information — `api-reference/`, `glossary`).
- **Shared "primitives" = reusable doc components + conventions.** The Mintlify component
  vocabulary (`<Frame>`, `<Tabs>`, `<Steps>`, `<Accordion>`, `<Cards>`, `<Info>`/`<Warning>`),
  the screenshot/GIF naming convention (`{concept}-{surface}-{variant}.{ext}` → `/images`), the
  demo-embed pattern (§3), and the writing standards in `AGENTS.md` + `CONTRIBUTING.md`. Net-new
  shared components (a reusable demo wrapper, a new callout pattern) become a `doc-primitive`
  ticket built once, in Wave 0, before pages compose it.

## §3. The interactive-demo strategy — rich, not bloated

Stakeholder-facing docs earn interactivity, but unbounded interactivity bloats the site. Doc Kit
runs a **three-tier ladder under a hard budget**. Full detail + the wiring recipes live in
`demo-tooling.md`; the rule that governs the plan:

> **Demo budget (enforced in `/doc-plan`): each surface gets AT MOST ONE Tier-2 or Tier-3
> artifact, for its single headline flow. Everything else is Tier-1.**

This is the analog of the UI kit's "suppression list" — the discipline that keeps signal clean.

| Tier | What | Tooling (all already in the repo or OSS) |
|---|---|---|
| **1 — Native rich** | `<Frame>` screenshots + GIFs, `<Tabs>`/`<Steps>`/`<Accordion>`/`<Cards>`, callouts | `captures/` (Playwright → `/images`, 2× DPI) |
| **2 — Animated walkthrough** | Rendered MP4/GIF with click-spotlight + zoom-on-component | `pipeline/` (Remotion) — agent-drivable; the weight is one media file, not MDX |
| **3 — Embedded live prototype** | Sanitized self-contained HTML embedded via `<iframe>`/`<Frame>` so stakeholders click through | Port `Paddington v2 Library.html` (floating-chat + QA-flow demos, already self-contained) and `agent_autoplay.jsx` (self-playing E2E). `rrweb` is the future path for replaying the *real* app. |

Tier-3 is reserved for 2–3 core features per release (this release: the floating chat, the
autoplay agent walkthrough, the HITL approval cards). A Tier-3 embed is a **design reference**
(§1 rung 4) — the surrounding prose must still describe the *shipped* behavior, and the embed is
labeled as an interactive prototype, not the live product.

## §4. The build loop, in one paragraph

The orchestrator (`doc-orchestrator-prompt.md`) owns **zero state outside Linear**. Each cycle it
health-checks (Linear MCP + `gh` + `mint`), reconciles open/merged PRs (the **Mintlify preview
build** is the CI signal; `mint broken-links` is the fast gate), polls Linear for dispatchable
tickets, dispatches subagents by label (page → `doc-writer-agent`, demo → `doc-demo-agent`, audit
→ `doc-audit-agent`), does the Linear bookkeeping the subagents can't, and runs multi-round blind
audit convergence per surface. If `/loop` crashes, re-run it — state recovers from Linear. The
branch/merge model is `release-worktrunk-model.md`: page PRs target `worktrunk/docs-<release-slug>`
under the fast gate; the release lands once via `worktrunk → main` (`/doc-land-release`).

## §5. The seven audit dimensions

Defined precisely in `doc-qa-taxonomy.md`. Where the UI kit audits
structure/style/responsive/interaction/content, Doc Kit audits:

1. **accuracy** — does every claim on the page match the shipped app? (drive the real app; §1)
2. **completeness** — does the page cover everything the release shipped for this surface? (vs
   release notes + ADRs; a missing capability is a gap)
3. **links** — `mint broken-links` clean; internal anchors and cross-references resolve.
4. **render** — `mint dev` renders the page with no MDX/component errors; every `<Frame>`, embed,
   and image resolves.
5. **responsive** — `mint dev` at 1440 / 768 / 375 px shows no horizontal overflow; prose wraps,
   tables scroll in-container, and every demo embed reflows (chat/rail/cards stack, never clip). Docs
   are read on phones and docked half-windows, so responsive is a first-class concern, not polish.
6. **style** — conformance to `AGENTS.md` + `CONTRIBUTING.md`: active voice, second person,
   sentence-case headings, bold for UI elements, code formatting for paths/commands, consistent
   terminology. The "Built for Humans" sniff test: no raw JSON, bare UUIDs, or `snake_case` in
   rendered prose. **All copy — labels, captions, demo fixtures — is deliberate and specific, never
   generic boilerplate slop.**
7. **freshness** — screenshots/GIFs/demos reflect the *current* UI, not a stale capture. Compare
   the asset's capture commit against the surface's last-changed commit in trust-ai-app.

Multi-round, blind, bounded at 3 rounds, Linear-resident state — identical mechanics to the UI
kit's `surface-audit-parent` model.

## §6. Supervision — autonomous, not unattended

The loop runs itself, but at **wave boundaries** the human: opens `mint dev`, reads a few pages,
files `doc-gap` tickets for anything that reads wrong or looks stale. Do NOT pause the loop for a
single broken-link failure or a scope call the orchestrator can make from the release notes. Do
step in for a genuine product-intent ambiguity the release notes don't resolve — file a
`doc-clarification` (the analog of `design-clarification`).

## §7. What lives where

- **Prose/planning narrative → Linear documents** (the plan is a Linear document, never committed).
- **The pages → the docs repo** (`concepts/`, `tutorials/`, `how-to/`, `api-reference/`).
- **Tickets → Linear**, in the **active docs-alignment project** on the DEV team. Each catch-up
  cycle gets its own project; `/doc-plan` names the one it persisted to and every downstream skill
  reads it from there. (The original charter project, "Doc Driven Development"
  `110bcc83-c4f1-4a4b-be41-db756ee9d6af`, was canceled 2026-07-15 — history, not a destination.)
- **The release↔worktrunk link → the milestone description** (`Worktrunk:` line; `release-worktrunk-model.md`).
- **Interactive demo assets → `/images` (Tier 1–2) or a sanitized static asset (Tier 3)**; the
  prototype source stays outside the repo (`$PROTOTYPE_DIR`), never committed raw.

## §8. Reuse — what already exists, do not rebuild

| Need | Use |
|---|---|
| Screenshots / GIFs | `captures/` — `cd captures && pnpm capture:<surface>`; output to `/images` |
| Animated walkthroughs | `pipeline/` — `cd pipeline && pnpm render` / `pnpm render:gif` |
| Version archive on land | `docs-plan/runbooks/version-transition.md` (folded into `/doc-land-release`) |
| Local preview / link check | `npx mintlify dev --port 3333` ; `mint broken-links` |
| Archive tab pattern | the `docs.json` `navigation.tabs[]` + `.mintignore` `v2026.*/` convention |
| Ticket tracking | the active docs-alignment Linear project + DEV team (§7) |
| Loop discipline | branch `$BRANCH_PREFIX/dev-NNNN-slug` (§0); **never `--delete-branch` on merge** (Mintlify preview race); isolated worktree per concurrent agent; skipped Mintlify previews → local-merge validation gate (see `/doc-release-align` operational lessons) |
| Release-notes → impact map + mechanical port | `/doc-release-align` (front half of PLAN; harvested from the v2026.06.30.1 loop) |
| OpenAPI re-pin + sanitization | `/doc-openapi-sanitize` → `docs-plan/doc-kit/openapi-sanitize.py` |
| Vocabulary law enforcement | `/doc-terminology-guard` (landing gate + post-rename sweep) |
| Media/marker debt ledger + burn-down | `/doc-capture-pass` (CAPTURE-PENDING / ACCURACY-AUDIT-PENDING) |
| Link/anchor/redirect/label hygiene | `doc-gardener-agent` (restructure checklist + standing sweep) |
