# Template — the claim map

The claim map is Doc Kit's analog of the UI Build Kit's **anchor map**. Where the anchor map lists
every element to resolve on both the prototype and the build, the claim map lists **every factual or
behavioral claim a page makes** and how to verify each against the **shipped app**. It is what makes
an `accuracy` audit exhaustive (every claim accounted for), deterministic (the same flow driven each
time), and dedup-able (findings share a claim number).

A page without a claim map cannot be accuracy-audited rigorously — the auditor would be re-reading
prose for vibes. So `/doc-plan` writes one into every `doc-page` ticket, and `/doc-validate accuracy`
walks it row by row.

## What counts as a claim

Anything a reader could **act on or be misled by**:

- A behavior ("annotations save on blur", "the chat persists across navigation").
- A UI fact (a button label, a menu name, a route path, a keyboard shortcut, a default on/off state).
- An ordering ("the side rail shows Plan, then Context, then Outputs").
- A capability boundary ("you can simulate against a persona+goal at evaluation time").
- A reference fact (an endpoint, a field name/type, a required parameter, an enum value).

A **mock-data value** is NOT a claim (the value in a screenshot is illustrative). The *flow* and the
*fields* are claims.

## The format

```md
## Claim map
| # | Claim | Verify against shipped app | Authority |
|---|---|---|---|
| 1 | The Trust Agent is the default at /projects/:id/agent (no flag) | Load the route on a fresh project; confirm the new agent renders with no ?v2/?agui/?legacy | release notes "Trust Agent, now default"; ADR <n> |
| 2 | Approving a write actually executes it | Drive an approval card → Approve → confirm the write lands (re-query the record) | release notes "approved writes that execute" |
| 3 | The composer is bottom-anchored in full view | Load full view; observe composer at viewport bottom | release notes "composer bottom-anchored" |
| … | | | |
```

- **#** — stable id; findings reference it (`concepts/trust-agent.mdx · claim 2`).
- **Claim** — the page's assertion, in the page's own words where possible.
- **Verify against shipped app** — the concrete drive: the route + the interaction + the observable
  outcome. "Drive X, observe Y" — not "check that it works."
- **Authority** — where the claim's truth is pinned: the release-notes section, an ADR, the OpenAPI
  field, or "the app's observed behavior" when the app itself is the only authority.

## How the audit uses it

`/doc-validate accuracy` resolves every row against the app on `APP_CAPTURE_URL`:

- The app **contradicts** the claim → a finding (quote the page, describe the app behavior).
- The claim matches the **prototype** but not the **app** → still a finding; the app wins
  (`00-playbook.md` §1).
- The claim is **unverifiable** (the flow can't be driven, the surface is gated) → not a silent pass;
  the auditor reports it and the orchestrator files a `doc-clarification`.

## Maintenance

When a `doc-gap` corrects a claim, the claim map row is updated in the page ticket so the next round
re-verifies the corrected claim — the map is the durable record of what the page asserts and how to
check it, release after release. A claim that has no verification path is a claim that should not be
in the docs.
