# Template — the wave plan

The wave plan sequences a release's documentation into ordered waves. It is a **Linear project
document** (never committed to the repo). `/doc-linear-sync` reads it to create tickets, milestones,
and dependencies. Its summary names the release, slug, and worktrunk so the branch↔release link can
be recorded.

```md
# Doc wave plan — <release tag>

## Summary
- **Release:** <tag, e.g. v2026.06.09.1>
- **Slug:** <kebab, e.g. docs-v2026-06-09-1>
- **Worktrunk:** worktrunk/docs-<slug>
- **Surfaces (from /doc-plan):** <Trust Agent · Scenarios & Playground · Multi-tenancy & infra · …>
- **Demo budget:** <the per-surface tier table — at most one Tier-2/Tier-3 per surface>

## Sequencing rules (non-negotiable)
- Wave 0 = net-new shared doc primitives + the demo-tooling scaffold.
- Concept before how-to/tutorial that references it (blockedBy).
- A page that hard-embeds a Tier-2/3 demo is blockedBy that doc-demo ticket.
- Each wave ends with a wave-convergence gate.

## Wave 0 — primitives + scaffold
| Ticket | Label | Path / artifact | blockedBy |
|---|---|---|---|
| <reusable demo wrapper / new callout convention> | doc-primitive | <path> | — |
| <demos/ scaffold + .mintignore check> | doc-primitive | demos/ | — |
| Wave 0 convergence | wave-convergence | — | all of Wave 0 |

## Wave 1 — <surface> concepts
| Ticket | Label | Path / artifact | Diataxis | Demo tier | blockedBy |
|---|---|---|---|---|---|
| <Trust Agent concept> | doc-page | concepts/trust-agent.mdx | concept | T1 | — |
| <floating-chat demo embed> | doc-demo | demos/floating-chat.html | — | T3 | — |
| Wave 1 convergence | wave-convergence | — | — | — | all Wave 1 pages + their audit parents + cross-surface |

## Wave 2 — <surface> how-to / tutorials
| Ticket | Label | Path / artifact | Diataxis | Demo tier | blockedBy |
|---|---|---|---|---|---|
| <connect / use how-to> | doc-page | how-to/<…>.mdx | how-to | T1 | concepts/<…> (Wave 1) |
| <flagship tutorial> | doc-page | tutorials/<…>.mdx | tutorial | T2 | concepts/<…> (Wave 1) |
| Wave 2 convergence | wave-convergence | — | — | — | all Wave 2 + audit parents + cross-surface |

## Wave N — reference + changelog/glossary
| Ticket | Label | Path / artifact | Diataxis | blockedBy |
|---|---|---|---|---|
| <reference updates> | doc-page | api-reference/<…> | reference | — |
| <changelog entry> | doc-page | changelog.mdx | reference | all surface pages |
| <glossary terms> | doc-page | glossary.mdx | reference | — |
| Wave N convergence | wave-convergence | — | — | all Wave N + audit parents |
```

## Notes

- **Audit tickets are NOT enumerated here.** `/doc-linear-sync` auto-creates the seven `doc-audit`
  dimensions + the `doc-audit-parent` per page, and the `cross-surface-audit-parent` per wave. Listing
  them in the plan would duplicate; the structural guarantee lives in the sync skill.
- **A surface usually spans waves** (concept in Wave 1, how-to/tutorial in Wave 2) — that's the
  concept-first sequencing the prior loop validated (`docs-plan/lessons/`).
- **Multi-tenancy & infra** is reference/admin-shaped — lighter, fewer pages, no Tier-2/3 demo.
- Keep the plan honest about the demo budget — it's the line item the human signs off on.
