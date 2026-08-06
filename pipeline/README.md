# Remotion Demo Pipeline

Composites raw Playwright screen recordings into polished demo GIFs and
MP4s with zoom, highlight, caption, and click-ripple effects -- driven
by a timeline JSON that the Playwright capture layer emits alongside
each recording.

## Three-layer architecture

```
Layer 1 (Playwright)     Layer 2 (Recording)     Layer 3 (Remotion)
---------------------    -------------------     -------------------
Drives the app,          Captures video at        Consumes video +
emits timeline JSON      60 fps via browser       timeline JSON,
with element bounds      recording API            composites effects
```

- **Layer 1** runs Playwright scripts against the live app, recording
  every user action (click, type, navigate, hover) along with the
  bounding box of the target element. Output: `timeline.json`.
- **Layer 2** captures a raw screen recording at 60 fps using the
  browser's built-in recording API. Output: `recording.mp4`.
- **Layer 3** (this directory) takes both artifacts and produces a
  polished demo with smooth zoom, spotlight highlights, captions, and
  click-ripple animations.

## Getting started

```bash
cd pipeline
pnpm install        # install Remotion + React
pnpm preview        # opens Remotion Studio in the browser
```

## The full loop

Layer 2 above is the part that did not exist until DEV-6188 — nothing produced the
recording Remotion composites onto. Playwright is the recorder:

```bash
# 1. Record. Writes pipeline/public/<name>.webm
cd ../captures && npx tsx demos/record-<name>.ts

# 2. Fill in the timeline. Stubs live in pipeline/public/<slug>.json
#    Element bounds come from the recording — do not guess them.

# 3. Render
cd ../pipeline
npx remotion render src/index.ts DemoComposition out/<name>.mp4 \
  --props=public/<slug>.json
```

`--props` selects which demo renders. Duration and viewport are derived from the timeline
via `calculateMetadata`, so a longer recording needs no code change.

### Verify the output

Render a single frame and **look at it** before shipping:

```bash
npx remotion still src/index.ts DemoComposition out/check.png \
  --props=public/<slug>.json --frame=90
```

A render that completes is not a render that is correct — the same lesson the capture
harness learned when a passing test produced a screenshot of a loading spinner.

### GIF export

`ffmpeg` is **not** currently installed on this machine. Install it, then:

```bash
ffmpeg -i out/<name>.mp4 -vf "fps=15,scale=1200:-1" -loop 0 out/<name>.gif
```

## Budgeted artifacts

Four Tier-2 demos this cycle, one per surface, each blocking a page. Timeline stubs are in
`public/`:

| Slug | Blocks | Ticket |
|---|---|---|
| `d1-salesforce-authorize` | `how-to/connect-agentforce.mdx` | DEV-6216 |
| `d2-agent-profile-review` | `how-to/review-an-agent-profile.mdx` | DEV-6217 |
| `d3-groundedness-report` | `how-to/check-answers-against-source-material.mdx` | DEV-6218 |
| `d4-launcher-fanout` | `concepts/evaluations.mdx` | DEV-6219 |

Recordings (`public/*.webm`) and renders (`out/`) are gitignored — they are large binaries,
and only the finished asset belongs in `/images`.

## Timeline JSON contract

The Playwright capture layer emits a `DemoTimeline` JSON file. Each
entry in the `beats` array drives a specific visual effect:

| Action     | Effect                                              |
|------------|-----------------------------------------------------|
| `click`    | Zoom toward element + click ripple at center        |
| `type`     | Zoom toward element (focus on input)                |
| `navigate` | Full viewport, no zoom                              |
| `scroll`   | (reserved) no special effect yet                    |
| `hover`    | Spotlight highlight mask around element              |
| `wait`     | Caption overlay if `caption` is present             |

Every beat can optionally carry a `caption` string, which is rendered as
a pill-shaped overlay at the bottom of the viewport regardless of the
action type.

See `src/types.ts` for the full TypeScript interface and
`example-timeline.json` for a working sample.

## Creating a timeline

Playwright scripts emit the timeline during capture. A minimal example:

```typescript
const beats: TimelineBeat[] = [];

// Record a click
const el = page.locator('.session-row').first();
const box = await el.boundingBox();
beats.push({
  timeMs: elapsed(),
  action: 'click',
  elementBounds: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : undefined,
  caption: 'Click a session row',
});
await el.click();
```

After the script finishes, write the full `DemoTimeline` object
(including viewport size and video path) to a JSON file.

## Style guide

| Property        | Value         |
|-----------------|---------------|
| GIF dimensions  | 1200 x 750   |
| GIF frame rate  | 15 fps        |
| Max GIF size    | 5 MB          |
| Theme           | Light mode    |
| Font            | Inter         |
