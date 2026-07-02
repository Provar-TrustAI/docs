---
name: doc-validate
description: Audit a documentation page against the shipped app across seven dimensions — accuracy, completeness, links, render, responsive, style, freshness. Drives the real app to verify every claim, renders the page in mint dev across viewport widths, runs broken-links, and checks writing-standard conformance. Use when asked to "validate a doc page", "check doc accuracy", "audit the docs", or when dispatched on a doc-audit ticket.
user-invocable: true
---

# /doc-validate — doc page audit

Audit a documentation page against the **shipped app** — not by re-reading the prose for vibes, but
by treating the page as a set of **verifiable claims** and checking each against the app that
actually shipped, the release notes, the rendered Mintlify build, and the writing standards.

## Why this method

A page can read beautifully and be wrong, stale, or broken. The shipped app encodes the truth; the
release notes encode what changed; `mint dev` + `broken-links` encode whether it builds. So the
detector **drives the app, renders the page, and runs the tooling** — it does not trust the prose.
This is the doc analog of the UI kit's "render the prototype and diff" — except here the oracle is
the **running product** (`00-playbook.md` §1), because a doc's job is to describe what shipped.

It is **read-only**. Output is findings, never edits. A human invocation runs all seven dimensions and
prints a report; an autonomous `doc-audit` ticket names exactly one dimension — audit only that.

## Inputs

- **A target** — one page (`concepts/*.mdx`, `tutorials/*.mdx`, `how-to/*.mdx`, `api-reference/…`).
- **The dimension(s)** — one of `accuracy` / `completeness` / `links` / `render` / `responsive` /
  `style` / `freshness` for a ticket; all seven for a human run. (`cross-surface` is a wave-level variant — see
  the orchestrator.)
- **The shipped app** — trust-ai-app running on the release tag (`APP_CAPTURE_URL`, default
  `http://localhost:3000`). The orchestrator supplies it. Do NOT start or stop the user's stack.
- **The `mint dev` instance** — serving `origin/$TRUNK` (`MINT_DEV_URL`, default
  `http://localhost:3333`), for the render/links dimensions.

## Prerequisites

- The shipped app is reachable on the release tag. If it is not up, say so and stop — do not audit
  `accuracy`/`completeness`/`freshness` against the prototype; the prototype is a design reference
  only and will produce false "matches."
- `mint dev` is serving the page (for `render`/`links`).
- Playwright, to drive the app and read rendered DOM/computed state where a claim needs it.

## Procedure

### 1. Ground in the target

Read the page's source MDX and its **claim-map** (the `## Claim map` section the page's `doc-page`
ticket carries, per `templates/claim-map.md`): every factual/behavioral claim the page makes. Read
the surface's source ADRs (`trust-ai-app/docs/decisions/`) and the relevant section of the release
notes. Note the page's **Diataxis type** — it sets the bar (a tutorial must be *runnable* end to
end; a reference must be *complete*; a concept must be *correct*).

### 2. Audit your dimension(s)

**`accuracy`** — does every claim match the shipped app? Work **claim by claim** down the claim-map.
For each claim, resolve it against the app on `APP_CAPTURE_URL` — navigate to the surface, drive the
flow, read the rendered state. A claim the app contradicts is a finding; a claim that matches the
*prototype* but not the *app* is still a finding (the app wins, `00-playbook.md` §1). Quote the page's
exact words and the app's actual behavior. UI-element names, button labels, route paths, keyboard
shortcuts, default-on/off states, and ordering are all claims — verify them literally.

**`completeness`** — does the page cover everything the release shipped for this surface? Diff the
release notes' surface section + the ADRs against the page's coverage. A capability the release added
and the page omits is a gap (severity by how central it is). For a **reference** page, every shipped
endpoint/field/option must appear. For a **how-to**, every step the task actually requires must be
present and in order.

**`links`** — run `mint broken-links` and check this page's results: every internal link resolves,
every cross-reference anchor exists, no link points at an archived/old-version path by accident.
Report each broken link with its target.

**`render`** — load the page in `mint dev` (`MINT_DEV_URL`). It must compile with no MDX error and no
missing component. Every `<Frame>` image resolves (not a broken-image icon), every embed/iframe loads,
every `<Tabs>`/`<Steps>`/`<Accordion>` renders. A page that errors the Mintlify build is a blocker.

**`responsive`** — load the page in `mint dev` at **1440 / 768 / 375 px**. There must be NO horizontal
overflow / scrollbar at any width: prose wraps, wide tables scroll inside their own container (not the
page), images scale, `<Tabs>`/`<Steps>`/`<Cards>` reflow, and **every interactive demo embed reflows**
(its chat / rail / cards stack instead of clipping). A demo, table, or block that clips or forces a
horizontal scrollbar at 375 px is a finding — report the width and the offending element.

**`style`** — conformance to `AGENTS.md` + `CONTRIBUTING.md`: active voice, second person ("you"),
sentence-case headings, **bold** for UI elements, `code` formatting for paths/commands/filenames,
consistent terminology (no synonym-drift for the same concept). Run the **"Built for Humans" sniff
test**: no raw JSON, bare UUIDs, or `snake_case` identifiers in rendered prose — any is a blocker.
Report the exact line and the rule it breaks.

**`freshness`** — every screenshot / GIF / demo reflects the *current* UI. For each `<Frame>` asset
the page embeds, find its capture provenance (the `captures/` script + the commit it was generated
on) and compare to the surface's last-changed commit in trust-ai-app. An asset captured before a
surface-changing commit is **stale** — a finding with the asset path and the diverging commits. Drive
the app and eyeball the asset against the live surface where provenance is ambiguous.

### 3. Severity and tolerance — keep the signal clean

Tier every finding:

- **blocker** — a wrong claim a reader would act on; a missing mandatory step/endpoint; a page that
  fails the Mintlify build; a broken internal link; a sniff-test failure; a screenshot of a surface
  that no longer exists.
- **major** — an incomplete-but-not-wrong section, a stale-but-recognizable screenshot, a
  terminology inconsistency, a how-to step out of order.
- **minor** — polish: a slightly awkward sentence, a non-sentence-case heading, a missing code-format.

Suppress noise: a different *mock-data value* in a screenshot is not a finding (the value isn't a
claim); a different *flow* or a *missing field* is. Anything the page's ticket marks **Intentional
divergence** (e.g. "we document the recommended path, not every toggle") is not a finding.

### 4. Report each discrepancy as a finding

One finding per discrepancy:

- **Target + claim/anchor** — `concepts/sessions.mdx` · claim "annotations save on blur".
- **Dimension** — which of the seven.
- **Measured** — page says X (quote it), app does Y (describe what you drove): "page: 'press Enter to
  save'; app: edits commit on blur, Enter does nothing".
- **Evidence** — the app behavior you observed (route + interaction), the `broken-links` line, the
  render error, or the asset's stale commit.
- **Authority** — the ADR, the release-notes section, the writing-standard rule, or the app route.
- **Severity** — blocker / major / minor.
- **Fix** — concrete: the exact corrected sentence, the missing step, the link target, the
  re-capture command (`cd captures && pnpm capture:<surface>`).

## What NOT to do

- Do **not** edit the page — this skill files findings, it does not fix them.
- Do **not** start or stop the app or `mint dev`.
- Do **not** audit `accuracy`/`completeness`/`freshness` against the prototype — it is a design
  reference, not the shipped product. If the app isn't up, stop and say so.
- Do **not** report a claim you did not actually verify against the app. A claim you read but did not
  drive is not an audit.
- Do **not** flag items the page's ticket marks **Intentional divergence**, or a mock-data value
  difference in a screenshot.
