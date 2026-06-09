# Template — `doc-page` ticket body

The body of a `doc-page` ticket is the writing agent's **full brief**. It must be complete and
unambiguous: the agent builds from this alone (the wave plan is extra context, the body is canonical).
Fill every section. The claim-map is non-negotiable — it is what makes the page verifiable.

```md
## Surface
<the product surface this page documents, e.g. "Trust Agent — floating chat shells">

## Page
- **Path:** <e.g. concepts/trust-agent.mdx>  (create | update)
- **Diataxis type:** <concept | tutorial | how-to | reference>
- **Title / frontmatter:** <the page title + any frontmatter the page needs>
- **Nav:** <where it slots in docs.json — group + position; note if docs.json needs an entry>

## Source of truth (read these BEFORE writing — in this order)
- Shipped app: <route(s) on APP_CAPTURE_URL to drive, e.g. /projects/:id/agent>
- Release notes section: <the v… release-notes heading this surface lives under>
- ADRs: <trust-ai-app/docs/decisions/NNNN-*.md that pin the why>
- OpenAPI (reference pages only): <the api-reference path/fields in scope>
- Prototype (demo embeds only): <PROTOTYPE_DIR file, if this page embeds a Tier-3 demo>

## Claim map  (per templates/claim-map.md — EVERY factual/behavioral claim, each verifiable)
| # | Claim the page will make | How to verify against the shipped app |
|---|---|---|
| 1 | <e.g. "the chat persists across navigation"> | <drive: open chat, navigate away, return — thread intact> |
| 2 | <e.g. "the composer is bottom-anchored in full view"> | <drive: load /projects/:id/agent, observe composer position> |
| … | | |

## Demo budget for this page
- **Tier:** <1 | 2 | 3>  (at most one Tier-2/Tier-3 artifact — see demo-tooling.md)
- **Artifact:** <the specific flow + source: a captures/ script, a pipeline/ render, or a sanitized
  prototype embed>  — if Tier 2/3, this page is blockedBy the matching doc-demo ticket OR references
  the agreed asset path: <path under /images or /demos>

## Acceptance
- [ ] Every claim in the claim-map is verified against the shipped app and written correctly.
- [ ] Covers everything the release shipped for this surface (completeness vs the release-notes section).
- [ ] Renders clean in `mint dev`; `mint broken-links` green for this file.
- [ ] Conforms to AGENTS.md + CONTRIBUTING.md (active voice, 2nd person, sentence-case headings, bold
      UI elements, code-formatted paths/commands); passes the Built-for-Humans sniff test.
- [ ] All embedded assets exist and reflect the current UI.
- [ ] <page-specific acceptance items>

## Intentional divergence (the audit's suppression list — what is NOT a gap)
- <e.g. "documents the recommended connect path only, not every advanced toggle">

## Out of scope
- <what this page deliberately does not cover; link to the page that does>

## Files to touch
- <the MDX path(s); docs.json if a nav entry is needed; /images if assets land here>
```

## Notes for the author (the writing agent)

- **Drive the app before you write.** Verify each claim-map row against the shipped app on
  `APP_CAPTURE_URL`. A claim you couldn't verify goes in your final report — do not ship it silently.
- **The app wins over the prototype.** If the prototype shows X and the app does Y, document Y.
- **Diataxis sets the bar:** a tutorial must run end-to-end; a how-to's steps must be in the order the
  task requires; a reference must be complete; a concept must be correct and fit the domain model.
- **Reuse the existing voice.** Match the surrounding pages' density, heading style, and component use.
