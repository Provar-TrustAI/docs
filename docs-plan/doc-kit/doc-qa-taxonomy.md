# Doc QA taxonomy — the seven audit dimensions

Defines the audit dimensions `doc-validate` checks and `/doc-land-release` composes. Where the UI
Build Kit audits structure/style/responsive/interaction/content against a design prototype, Doc Kit
audits the seven below against the **shipped app** (`00-playbook.md` §1). Each dimension has one owner
(`/doc-validate <dimension>`); no skill re-implements another's logic.

## The dimensions

| Dimension | Question | Oracle | Owner |
|---|---|---|---|
| **accuracy** | Does every claim match the shipped app? | the running app on the release tag | `doc-validate accuracy` |
| **completeness** | Does the page cover everything the release shipped for this surface? | release notes + ADRs | `doc-validate completeness` |
| **links** | Do all internal links + anchors resolve? | `mint broken-links` | `doc-validate links` |
| **render** | Does the page build clean in Mintlify with all assets? | `mint dev` | `doc-validate render` |
| **responsive** | Does the page + its embeds reflow across viewport widths with no horizontal overflow? | `mint dev` at 1440 / 768 / 375 px | `doc-validate responsive` |
| **style** | Does it conform to the writing standards? | `AGENTS.md` + `CONTRIBUTING.md` | `doc-validate style` |
| **freshness** | Do screenshots/GIFs/demos reflect the current UI? | asset capture commit vs surface commit | `doc-validate freshness` |
| *cross-surface* | Are terminology + cross-links consistent across a wave's pages? | the wave's page set | `doc-validate cross-surface` (wave-level) |

**accuracy is the load-bearing dimension.** It is the doc analog of "render the prototype and diff" —
except the oracle is the running product, because a doc's job is to describe what shipped, not what
was designed. A claim that matches the *prototype* but not the *app* is a finding; the app always wins.

## Severity tiers

- **blocker** — a wrong claim a reader would act on; a missing mandatory step/endpoint/capability; a
  page that fails the Mintlify build; a broken internal link; a "Built for Humans" sniff-test failure
  (raw JSON / bare UUID / `snake_case` in rendered prose); a screenshot of a surface that no longer
  exists. Blockers gate the landing.
- **major** — incomplete-but-not-wrong; a stale-but-recognizable screenshot; terminology drift; a
  how-to step out of order; a supra-threshold omission. Recorded in the PR body + retro; not silently
  dropped.
- **minor** — polish: an awkward sentence, a non-sentence-case heading, a missing `code` format.

## Suppression list — what is NOT a finding

- A different **mock-data value** in a screenshot (the value isn't a claim; the *flow* and *fields*
  are). A different flow or a missing field IS a finding.
- Anything the page's ticket marks **Intentional divergence** (e.g. "we document the recommended path,
  not every toggle" — the analog of the UI kit's "Design intent — NOT drift").
- Geometry/rendering nits that don't affect comprehension.
- A claim the page deliberately defers to another page (and links to), where that page covers it.

## Convergence

A page converges when its most recent **full round** (all seven dimensions) files zero `doc-gap`
children. Multi-round, blind, bounded at 3 (`doc-orchestrator-prompt.md` §6a). A round that fixes the
prior round's gaps but finds new ones is NOT converged. Three rounds with gaps still appearing
escalates to `human-review-fyi` — that means the framing is wrong (claim-map incomplete, surface
mis-read), not the page.

## Why seven

The UI kit's five dimensions all compare rendered surfaces. Docs add two more. **freshness** — because
a doc has a failure mode a UI doesn't: it can be complete and accurate today but go stale tomorrow when
the app changes underneath it; it is the guard against a screenshot quietly becoming a lie, and why the
loop is a *recurring* release cadence that re-audits against each new shipped state. **responsive** —
because a docs page is read on every device (a laptop, a phone, a docked half-window), so an embed or
table that overflows a narrow viewport is broken for a real reader; the UI kit can assume one controlled
app shell, the docs cannot.
