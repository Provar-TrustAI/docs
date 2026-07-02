---
name: doc-plan
description: Interactively plan a release's documentation — derive the doc surfaces a release needs, map each to a Diataxis type, decompose into waves, set the interactive-demo budget, compose the ticket roster, and persist the plan as Linear project documents. Use when starting documentation for a new Trust AI release.
user-invocable: true
---

# /doc-plan

Drive the PLAN phase of a release's documentation. Read `docs-plan/doc-kit/00-playbook.md` first.
This skill is **interactive** — stop and get the human's call on every judgment point (surface
boundaries, Diataxis mapping, the demo budget, wave sequencing). Planning is the highest-leverage
phase; the judgment is the point. Do not steamroll to a finished plan.

**A plan is scoped to one release.** A release is the atomic unit of integration to `main` — its
pages accumulate onto one integration branch, `worktrunk/docs-<release-slug>`, that lands on
`main` exactly once via `/doc-land-release`. Emit the release slug (lowercase kebab-case of the
version tag, e.g. `v2026.06.09.1` → `docs-v2026-06-09-1`) and its worktrunk name in the plan
summary so `/doc-linear-sync` can record the branch↔release link. See
`docs-plan/doc-kit/release-worktrunk-model.md`.

## Prerequisites

- A release exists with notes (`gh release view <tag> --repo Provar-TrustAI/trustai-app`).
- A Linear project for docs exists — **Doc Driven Development** (`110bcc83-c4f1-4a4b-be41-db756ee9d6af`).
- Read access to the shipped app source (`trust-ai-app/docs/decisions/` ADRs, the running app).

## Steps

### 1. Release intake

Read the release notes end-to-end (`gh release view <tag> --repo Provar-TrustAI/trustai-app`).
Pull the canonical *why* from the ADRs it references (`trust-ai-app/docs/decisions/`). List every
**user-facing surface or capability** the release adds or changes — this is the raw material. Note
which are customer-facing (concept/tutorial/how-to shaped) versus admin/ops-facing
(reference-shaped). The release notes + ADRs + the **shipped app** are the source of truth
(`00-playbook.md` §1); the Paddington prototype is a design reference only.

### 2. Concept audit — what's already documented vs. what the release changed

For each surface, check the current docs (`concepts/`, `tutorials/`, `how-to/`, `api-reference/`):
does a page exist, and is it now **stale, incomplete, or missing**? This produces the
create-vs-update verdict per surface. (The prior audit memos in `docs-plan/audit/` and
`docs-plan/spike-concept-audit.md` are the model for this pass; reuse their shape.)

**Present the surface list + verdicts to the human and get sign-off before decomposing.**

### 3. Derive doc surfaces + map to Diataxis

For each surface, decide which Diataxis page-type(s) it needs (`00-playbook.md` §2):

- **concept** (`concepts/`) — explanation of what it is and how it fits the model.
- **tutorial** (`tutorials/`) — a learning-oriented end-to-end walkthrough.
- **how-to** (`how-to/`) — a task-oriented recipe.
- **reference** (`api-reference/`, `glossary`, `changelog`) — information lookup.

Inventory the shared doc **primitives** the pages compose from (Mintlify components, the demo-embed
wrapper, callout conventions). Mark which exist and which are net-new — net-new ones become
`doc-primitive` tickets in Wave 0.

### 4. Set the demo budget (the bloat guard)

For each surface, decide its interactive-demo tier under the budget rule (`00-playbook.md` §3,
`demo-tooling.md`): **at most ONE Tier-2/Tier-3 artifact per surface, for its headline flow;
everything else is Tier-1.** Record, per surface: the tier, the specific flow, and the source
(a `captures/` script, a `pipeline/` render, or a Paddington prototype demo to sanitize+embed).

**Present the demo budget to the human and get sign-off** — this is where bloat is prevented.

### 5. Decompose into waves

Build the wave plan from `templates/wave-plan.md`. Sequencing rules — non-negotiable:

- **Wave 0** is shared doc primitives (net-new components/conventions) + the demo-tooling scaffold.
- **Concept before how-to/tutorial** — a how-to that references a concept is `blockedBy` the
  concept page (the prior loop learned concept-first sequencing works; `docs-plan/lessons/`).
- **Demo assets are `blockedBy` the page** they embed into (or run in parallel and the page
  references the agreed asset path).
- Each wave ends with a `wave-convergence` gate.

### 6. Compose the ticket roster

Deliberately force validation and self-reflection into the roster:

- One `doc-page` ticket per page (create or update), body written from `templates/page-ticket-spec.md`
  — the body must be a complete, unambiguous brief, **including a `claim-map`** (`templates/claim-map.md`):
  every factual/behavioral claim the page will make, each to be verified against the shipped app.
- One `doc-demo` ticket per budgeted Tier-2/Tier-3 artifact, body from `templates/demo-asset-spec.md`.
- The six `doc-audit` dimensions per page + one `cross-surface-audit` per wave (auto-created by
  `/doc-linear-sync`, not enumerated by hand here).

**Grill the plan with the human** before persisting: where are the risks, where could the loop get
blocked, is every claim verifiable against the app, is the demo budget honest? Iterate.

### 7. Persist to Linear

- Save the doc PRD, the surface→Diataxis map, the demo budget, and the wave plan as **documents on
  the Doc Driven Development project** (`mcp__linear__save_document`). The Linear project is the PRD.
- The wave plan's summary names the release, its slug, and the `worktrunk/docs-<slug>` branch.
  `/doc-linear-sync` reads that to write the `Worktrunk:` line onto the release milestone.
- Do NOT commit any planning narrative to the repo — only the pages and demo assets live in code.

### 8. Hand off

When the plan is approved, tell the human to run `/doc-linear-sync` to create the tickets, then
`/doc-release-loop` to start the build.

## Rules

- Interactive — pause for human judgment at steps 2, 4, and 6.
- **The shipped app is the source of truth** (`00-playbook.md` §1); the prototype is a design
  reference. Every page claim must be verifiable against the app — that is what the claim-map forces.
- The demo budget is a hard cap — rich docs, not bloated docs.
- Planning narrative → Linear documents. Pages → the repo. Tickets → Linear (via `/doc-linear-sync`).
