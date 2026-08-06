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
pnpm capture:sessions     # sessions list + fly-in
pnpm capture:scenarios
pnpm capture:evaluations
pnpm capture:evaluators
pnpm capture:welcome
pnpm capture:sidebar
pnpm capture:playground   # needs the stub agent below
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

## Verify by looking

**Open every screenshot before committing it.** Exit code is not evidence — every failure mode
above produces a passing test and a useless image.

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
