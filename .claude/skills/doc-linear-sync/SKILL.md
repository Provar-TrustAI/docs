---
name: doc-linear-sync
description: Create and reconcile Linear tickets from an approved Doc Kit release plan — labels, wave milestones, blockedBy relations, per-page audit parents, and round-1 dimension audits. Idempotent; re-run whenever the plan changes.
user-invocable: true
---

# /doc-linear-sync

Turn an approved release doc plan into Linear tickets. Run after `/doc-plan`; re-run any time the
plan changes — this skill reconciles, it does not duplicate. Read `docs-plan/doc-kit/00-playbook.md`
first.

## Inputs

- The plan documents on the **Doc Driven Development** project (produced by `/doc-plan`).
- The Linear project UUID: `110bcc83-c4f1-4a4b-be41-db756ee9d6af`.

## Steps

1. **Read the plan** from the project's documents (`mcp__linear__list_documents` /
   `get_document`). It is scoped to one release and names its slug → worktrunk (see `/doc-plan`);
   note the `MILESTONE` and the `worktrunk/docs-<slug>` name.

2. **Reconcile milestones** — ensure one Linear milestone per wave (`mcp__linear__list_milestones` /
   `save_milestone`). Ensure the release `MILESTONE` exists and **write a `Worktrunk:
   worktrunk/docs-<slug>` line into its description** (match-then-update; never duplicate the line on
   re-run). Linear milestones have no branch field, so this line is the durable branch↔release link
   the loop and `/doc-land-release` read back. The slug is the kebab-case of the version tag (see
   `release-worktrunk-model.md`).

3. **Reconcile the plan's tickets.** For each ticket the plan lists (`doc-page`, `doc-primitive`,
   `doc-demo`, `wave-convergence`):
   - Match an existing ticket by title/slug; create if absent (`mcp__linear__save_issue`).
   - Set the label and the wave milestone — **every ticket gets a milestone**; a milestone-less
     ticket slips the orchestrator's convergence enumeration.
   - For a `doc-page` ticket, set the body from `templates/page-ticket-spec.md` (including the
     **claim-map** from `templates/claim-map.md`). For a `doc-demo` ticket, use
     `templates/demo-asset-spec.md`.

4. **Auto-create the round-1 dimension audits.** For every page (and every `doc-primitive`) in the
   plan, create **seven `doc-audit` tickets** — one per dimension (`accuracy`, `completeness`, `links`,
   `render`, `responsive`, `style`, `freshness`). Emit all seven here regardless of what the plan lists: this is the
   structural guarantee that no dimension is silently skipped. Title each `[<page>] <dimension> audit
   · R1` (round-1 suffix mandatory — the orchestrator reads round from the title), set `Dimension:
   <dimension>` in the body, set the page's wave milestone. Body is NEUTRAL — never inject any "look
   for this" hints. Rounds 2 and 3 are filed later by the orchestrator
   (`doc-orchestrator-prompt.md` §6a), not by this skill.

5. **Auto-create the per-page audit parents.** For every page (and every `doc-primitive`), create one
   `doc-audit-parent` ticket titled `[<page>] audit — multi-round`. Set the wave milestone. Body
   carries the empty `## Audit rounds` checklist the orchestrator maintains:

   ```
   ## Audit rounds (orchestrator-maintained — do not edit by hand)

   - [ ] Round 1 — not yet dispatched (waiting on the page's doc-page ticket to close).
   - [ ] Round 2 — not yet started.
   - [ ] Round 3 — not yet started.

   Convergence: pending.
   ```

   For every wave, create one `cross-surface-audit-parent` ticket titled `[wave-<N>] cross-surface
   audit — multi-round` with the same body shape (its round tickets carry `Dimension: cross-surface`).

6. **Wire dependencies.**
   - From the plan: `blockedBy` relations (how-to → its concept; replica/related page → leader;
     `doc-demo` ← the page that hard-references it; wave N → wave N-1).
   - Each round-1 `doc-audit` ticket is `blockedBy` what it renders — a page's seven dim audits are
     `blockedBy` that `doc-page` ticket (and any hard-referenced `doc-demo`). An audit with no blocker
     would dispatch on cycle 1 and audit a page that doesn't exist yet.
   - Each round-1 `doc-audit` ticket `Blocks` its `doc-audit-parent`.

7. **Wire convergence gates.** Each `wave-convergence` ticket is `blockedBy` every in-wave **parent**
   — `doc-audit-parent` per page + per `doc-primitive` + the wave's `cross-surface-audit-parent` +
   every `doc-page`, `doc-primitive`, and `doc-demo` ticket. The gate does NOT block on individual
   round dim tickets — the parents subsume them.

8. **Report.** Print a per-wave count: tickets created / updated / unchanged, audit parents created,
   round-1 dim audits auto-created, milestones, gates wired.

## Rules

- Idempotent — never create a duplicate; match-then-update. The `Worktrunk:` line is reconciled in
  place, never appended twice.
- Pass the project **UUID**, never the URL slug, to `list_issues` — the slug returns empty silently.
- Tickets live in Linear; the plan stays a Linear document; the pages + demo assets live in the repo.
  The branch↔release link lives in the milestone description (`Worktrunk:` line) — see
  `release-worktrunk-model.md`.
