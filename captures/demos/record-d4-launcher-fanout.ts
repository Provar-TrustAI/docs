/**
 * D4 — Evaluation launcher fan-out (DEV-6219). Blocks `concepts/evaluations.mdx`.
 *
 * The point of this demo is the one thing the docs got wrong for eleven releases: the
 * launcher HAS a "Repeat each test case" selector. The beats open the launcher, pick a
 * session view, read the fan-out, then move the selector.
 *
 * What recording it actually taught us: the fan-out does NOT recompute. `computeFanout`
 * multiplies sessions × evaluators (or personas × evaluators) and never reads the repeat
 * count, so the preview shows ONE attempt's work at any repeat setting. The first cut of
 * this demo captioned "the fan-out recomputes — three times the work" over a frame that
 * still read 20, which would have taught readers something false in the one artifact
 * meant to correct them. The captions now say what the numbers say.
 *
 * It deliberately stops before committing — the pedagogy is the cost preview, and a real
 * launch would add minutes of dead video.
 *
 *   cd captures && npx tsx demos/record-d4-launcher-fanout.ts
 *   cd ../pipeline && npx remotion render src/index.ts DemoComposition out/d4.mp4 \
 *     --props=public/d4-launcher-fanout.json
 *
 * Bounds are captured BEFORE each click and written into the timeline — Remotion zooms
 * to them, and they are unrecoverable after the DOM moves on.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "@playwright/test";
import { startRecording } from "../lib/helpers-record";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";
const APP = process.env.TRUSTAI_APP_URL ?? "http://localhost:3000";
const PUBLIC_DIR = path.resolve(__dirname, "../../pipeline/public");
const SLUG = "d4-launcher-fanout";

interface Bounds { x: number; y: number; width: number; height: number }
interface Beat {
  timeMs: number;
  action: "navigate" | "click" | "type" | "hover" | "wait" | "scroll";
  elementBounds?: Bounds;
  caption?: string;
}

const beats: Beat[] = [];
const t0 = Date.now();
const at = () => Date.now() - t0;

/** Record a beat with the target's real bounds, then act. */
async function beat(
  page: Page,
  action: Beat["action"],
  caption: string,
  locator?: ReturnType<Page["locator"]>,
): Promise<void> {
  const bounds = locator ? await locator.boundingBox() : null;
  beats.push({
    timeMs: at(),
    action,
    ...(bounds ? { elementBounds: bounds } : {}),
    caption,
  });
}

async function main() {
  const res = await fetch(`${API}/v1/projects`);
  if (!res.ok) throw new Error(`Cannot reach ${API} — is the app running on the release tag?`);
  const body = await res.json();
  const items = Array.isArray(body) ? body : body.items;
  if (!items?.length) throw new Error("No projects — seed one first.");
  const projectId = items[0].id;

  const rec = await startRecording();
  const { page } = rec;

  await page.goto(`${APP}/projects/${projectId}/evaluations`);
  await page.waitForTimeout(2500);
  await beat(page, "navigate", "Evaluations");

  const newEval = page.getByRole("button", { name: "New evaluation" });
  await newEval.waitFor({ state: "visible", timeout: 20_000 });
  await beat(page, "click", "New evaluation opens the launcher", newEval);
  await newEval.click();
  await page.waitForTimeout(2000);

  const dialog = page.locator('[role="dialog"]').last();
  await dialog.getByText("Repeat each test case").waitFor({ state: "visible", timeout: 15_000 });

  // Sessions source, deliberately. The Scenarios branch would be the more
  // natural illustration of repeats, but every scenario in the seed profile is
  // an empty shell carrying zero evaluators — the fan-out renders 0 → 0 → 0, and
  // a demo of a cost preview that previews zero cost teaches nothing. Sessions
  // is where this fixture is rich (ten real transcripts, two evaluators), so the
  // numbers on screen are real. See captures/README.md §"Fixture quality is
  // per-surface".
  const view = dialog.getByRole("button", { name: /session view|Choose a session view/i }).first();
  await beat(page, "click", "Pick the sessions to grade", view);
  await view.click();
  await page.waitForTimeout(1500);

  const allSessions = page.getByText("All sessions", { exact: true }).last();
  await allSessions.click();
  await page.waitForTimeout(1800);

  // Scroll the fan-out into frame before narrating it. The dialog is taller
  // than the viewport, and the fan-out sits BELOW the repeat selector — an
  // earlier cut of this recording captioned "the fan-out recomputes" over a
  // frame where the fan-out was off-screen. The caption has to be able to
  // point at something.
  const fanout = dialog.getByText(/This will run/i).first();
  await fanout.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await beat(page, "hover", "10 sessions \u00d7 2 evaluators = 20 grading passes", fanout);
  await page.waitForTimeout(1800);

  // The claim the docs got wrong: this selector exists.
  const repeat3 = dialog.getByRole("radio", { name: "3" })
    .or(dialog.getByText("3", { exact: true })).first();
  await beat(page, "click", "Repeat each test case — 3 attempts, not 1", repeat3);
  await repeat3.click();
  await page.waitForTimeout(2000);

  await fanout.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await beat(page, "wait", "The preview counts ONE attempt — at 3 repeats the real cost is 3\u00d7 this", fanout);
  await page.waitForTimeout(2800);

  const video = await rec.finish(SLUG);

  const timeline = {
    title: "Evaluation launcher fan-out",
    description: "Open the launcher, set Repeat each test case, watch the fan-out count respond",
    _ticket: "DEV-6219",
    _blocksPage: "concepts/evaluations.mdx",
    viewportWidth: 1280,
    viewportHeight: 800,
    totalDurationMs: at(),
    videoFile: `${SLUG}.webm`,
    beats,
  };
  fs.writeFileSync(
    path.join(PUBLIC_DIR, `${SLUG}.json`),
    JSON.stringify(timeline, null, 2) + "\n",
  );

  console.log("recorded:", video);
  console.log("beats:", beats.length, "duration:", timeline.totalDurationMs, "ms");
  for (const b of beats) {
    console.log(` ${String(b.timeMs).padStart(6)}ms ${b.action.padEnd(9)} ${b.elementBounds ? "bounds ok" : "no bounds"}  ${b.caption}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
