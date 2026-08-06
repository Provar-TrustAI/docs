# Trust AI Docs Screenshot Captures

Playwright scripts that drive the Trust AI app and capture 2× DPI screenshots into `../images/`,
ready for Mintlify embedding.

## Setup

```bash
cd captures
pnpm install
npx playwright install chromium     # required once; the browser is not vendored
```

## Prerequisites

The app must be running **on the release tag the docs describe**, not on `main` — auditing or
capturing against a newer build reintroduces exactly the drift the docs cycle exists to fix.

```bash
git -C <trustai-app> worktree add ../trustai-app-<TAG> <TAG>
cd ../trustai-app-<TAG> && cp .env.example .env && pnpm install && pnpm start
pnpm seed acme-refunds-csat
```

Default target is `http://localhost:3000`. Override the API base with `TRUSTAI_API_URL`.

## Usage

```bash
pnpm capture:all          # everything
pnpm capture:sessions     # the two annotation surfaces
pnpm capture:scenarios
pnpm capture:evaluations
pnpm capture:evaluators
pnpm capture:sidebar
pnpm capture:playground       # needs the stub agent below
pnpm capture:trust-agent      # slow: drives real agent turns, see below
pnpm capture:agent-tutorial   # slower, and it writes — see below
```

## One surface needs a connected agent, not just a seed

Every other capture reads data. The **Playground** drives it: the save-as-scenario
action only unlocks after a real user turn *and* a real agent reply, and History only
lists runs that produced turns. `acme-refunds-csat` connects no runnable agent, so
`playground-surfaces.ts` cannot capture anything on a bare seed.

`fixtures/refunds-concierge-stub.mjs` is that agent. It speaks the
`conversational_http` connector's AG-UI SSE dialect, so the product drives it down the
same path it drives a customer's HTTP agent down — nothing about the Playground is
faked, only the far end of the connection. It emits a route decision and a tool call
per turn, so transcripts carry the "Routed to" / "Tool used" peek.

```bash
node fixtures/refunds-concierge-stub.mjs      # serves :8397
```

Register it once per stack as a connection named **Refunds Concierge** — the exact
`curl` is in that file's header. `base_url` must be `http://host.docker.internal:8397`:
the API and gateway run in Docker, where `localhost` is not your machine.

## Two captures drive the product instead of screenshotting it

`scripts/trust-agent-surface.ts` is the odd one out. The Trust Agent's transcript,
tool-call cards, side rail and permission cards do not exist until a real conversation
produces them, so that script sends prompts and waits for turns. Consequences:

- **It is slow and not byte-reproducible.** A turn is upstream model time (20-120s) and
  the agent's wording differs between runs. Budget minutes, and re-run if a reply comes
  back badly worded.
- **`settle()` is not enough.** A network-idle agent surface is usually one that has not
  started streaming. Use that script's `waitForTurn()`, which waits for the typing
  indicator to appear *and* go away.
- **Never reuse a chat from the Recent chats rail.** It is capped at five entries and
  other sessions push yours off it, so "click the chat I made" silently clicks somebody
  else's. Each test starts its own chat.
- **Clean up what a previous run created.** The write capture asks the agent to create a
  named evaluator. Run it twice without deleting the first one and the agent correctly
  refuses with a question card instead of a write gate — a valid, useless screenshot.
  `dropEvaluator()` handles it.

`scripts/agent-tutorial.ts` goes further still: it drives the whole tutorial flow — the
clarify-first question card, the plan on the rail, a write's permission gate, the object
table of what the run built — by sending the tutorial's own brief and then answering and
approving its way through the conversation. So on top of everything above:

- **It really mutates the target project.** It edits evaluators, generates scenarios, and
  starts evaluations. Point it at a demo project only.
- **It is skipped unless `DRIVE=1`**, so `pnpm capture:all` never spends ten minutes of
  model calls, or writes to a project, by accident. Its Welcome-surface shot is an
  ordinary capture and always runs.
- **It waits on structure, never on a phrase** — a pending HITL card, a plan list in the
  rail, a multi-record tool-call card — because the wording differs every run.

## Two traps this harness is built around

**Every surface is project-scoped.** Real routes are `/projects/:id/sessions`, never `/sessions`.
Use `gotoSurface(page, "sessions", marker)` from `lib/helpers.ts` — it discovers a project id at
runtime from `/v1/projects` rather than hardcoding one, because seeds change.

**A wrong route does not fail.** `apps/web` is a Vite SPA behind an nginx fallback, so *every* path
returns 200 with the index shell. A script pointed at a dead route screenshots an empty app and
reports success. Before this rebuild, all five scripts targeted top-level routes that do not exist
and had been silently broken for months. `gotoSurface` asserts a surface-specific marker rendered,
and says so explicitly when it did not.

## Always `settle()` before screenshotting

A passing selector is not a ready surface. The first rebuild of this harness captured Sessions
mid-load: a skeleton row satisfied `table tbody tr`, the test passed, and the screenshot showed a
spinner over an empty table reading "0 sessions" while the nav said 10.

`settle()` waits for network idle, for spinners to disappear, and briefly for layout to stop
shifting. `assertTableHasRows(page, n)` additionally proves the table holds real rows.

## The fixture is not self-sufficient — populate it first

`acme-refunds-csat` seeds sessions richly and everything else thinly. Before a
capture pass, populate what your surface needs through the API:

- **Personas** — the seed creates none. `POST /v1/projects/:id/personas`.
- **Scenarios** — 9 of 10 seed as empty shells (`name: null`). PATCH
  `/v1/scenarios/:id` with a name, goal, persona_ids and tags, or every
  Scenarios screenshot reads "Add name…".
- **Annotation values** — the columns exist but hold nothing. PUT
  `/v1/sessions/:id/annotations/{verdict,severity,reviewer_note}`.
- **Scenario verdicts** — PUT `/v1/scenarios/:id/annotations/verdict`.

A screenshot of an unpopulated surface is technically valid and useless. This
has now wasted three separate capture attempts.

## Watch for horizontal scroll

Showing extra columns pushes a wide table into horizontal scroll, and the shot
silently loses its leftmost column — usually the id a reader needs to orient.
Hide the columns your fixture has no data for, then assert `scrollLeft === 0`
before shooting. `scripts/sessions-annotations.ts` does both.

## Never target a row by its index

A row position is not a record. `sessions-annotations.ts` used to click
`tbody tr` nth(1) because row two carried a verdict on the seed of the day; new
simulator runs then landed at the top of the date-sorted table, nth(1) became an
un-annotated row, and the shipped fly-in screenshot was a picture of an empty
Verdict, an empty Severity and the literal placeholder "Add a note…". The test
still passed. Resolve the record you mean from the API and locate the row by its
readable id — and assert the value you came to photograph is actually on screen
(`expect(note).not.toHaveValue("")`), because no selector in the file will notice
placeholder grey.

The same rule applies to sort order: if the shot is about annotated rows, assert
that annotated ids are in the top of the frame, don't assume the default order
puts them there.

## Verify by looking

**Open every screenshot before committing it.** Exit code is not evidence — every failure mode
above produces a passing test and a useless image.

This has now been enforced once as a sweep across every shipped image, which
found three classes of rot that no capture script can catch on its own: shots
carrying junk from a shared fixture (chat threads titled "hi" and "hello there"
in the Recent chats rail — archive them through
`POST /paddington/projects/:id/tasks/:id/archive` before shooting), shots clipped
by the right edge of the viewport rather than by the app, and images left in
`images/` after the page that embedded them was rewritten. Check for the last one
with a diff of `images/` against every `src="/images/…"` in the `.mdx` files.

## Fixture quality is per-surface

Captures are only as good as the seed. `acme-refunds-csat` populates Sessions richly — ten real
transcripts — but creates Scenarios as empty shells, every row reading "Add name…", "Add goal…",
"Not set". That capture is technically valid and visually useless.

Check `pnpm seed:list` in the app repo for a profile that populates the surface you need, or
populate it by hand first. Never ship a screenshot of placeholder text.

## Adding a capture

1. Create `scripts/{name}.ts`
2. `gotoSurface` → assert real content → `settle()` → `page.screenshot()`
3. Add a `capture:{name}` entry in `package.json`
4. Run it and **look at the output**

Shared helpers live in `lib/`, outside `testDir`, so Playwright does not treat them as test files.
