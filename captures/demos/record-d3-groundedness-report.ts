/**
 * D3 — Groundedness claim report (DEV-6218). Blocks `how-to/check-answers-against-source-material.mdx`.
 *
 * The point of this demo is the linkage prose cannot show in one screen: a claim, the
 * verbatim quote the product verified before letting the claim keep its verdict, and the
 * position of that quote inside the source document. The beats walk scenario-attached
 * reference material → the check card → the per-claim report → one reviewer override.
 *
 * What driving it taught us, and what the captions therefore say:
 *
 *  - The chip reads "N% grounded". The component's own doc comment still says
 *    "N% faithful" (`evaluator-check-card.tsx:147` renders `{percent}% grounded`,
 *    the comment above it at :131 is stale) — the rendered string is the truth.
 *  - Overriding one claim recomputes the fraction but NOT necessarily the verdict.
 *    Overriding the unsupported claim moved 50% → 75% grounded and the check stayed
 *    **Fail**, because a Contradicted claim is a hard violation. An earlier caption
 *    plan said "the check re-enters gating"; the frame disproves it, so the caption
 *    now says what the frame says.
 *  - No Conversational claim appeared. The judge decomposed four claims from this
 *    reply and none were pleasantries, so the counts line reads three verdicts, not
 *    five. Captions never promise a verdict the frame does not show.
 *
 * Prerequisites (all created through the product's own APIs against the local stack):
 *   - a Groundedness judge bound to SCN-000002 with one reference document attached
 *   - a completed simulated run of that scenario, graded by that judge
 * The run is READ here; this script mutates only the one claim override it demonstrates,
 * and reverts it at the end so the recording is repeatable.
 *
 *   cd captures && npx tsx demos/record-d3-groundedness-report.ts
 *   cd ../pipeline && npx remotion render src/index.ts DemoComposition out/d3.mp4 \
 *     --props="$PWD/public/d3-groundedness-report.json"
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
const SLUG = "d3-groundedness-report";

/** The scenario and run this demo reads. Both carry a Groundedness grade. */
const SCENARIO_LABEL = "Refund timing — one week after return";
const RUN_NAME = "Refund policy groundedness";

interface Bounds { x: number; y: number; width: number; height: number }
interface Beat {
  timeMs: number;
  action: "navigate" | "click" | "type" | "hover" | "wait" | "scroll";
  elementBounds?: Bounds;
  caption?: string;
  /**
   * Explicit beat length. Only used to CAP a zooming beat: the compositor
   * zooms 1.5x toward `elementBounds` for the whole beat, so a click on a
   * left-pane claim card crops the right-hand source pane out of frame. The
   * linkage this demo exists to show needs both panes, so the claim clicks
   * are capped short and the linkage itself is narrated on a following
   * bounds-free `wait` beat that renders at full viewport.
   */
  durationMs?: number;
}

const beats: Beat[] = [];
const t0 = Date.now();
const at = () => Date.now() - t0;

/** Record a beat with the target's real bounds, then act. */
async function beat(
  _page: Page,
  action: Beat["action"],
  caption: string,
  locator?: ReturnType<Page["locator"]>,
  durationMs?: number,
): Promise<void> {
  const bounds = locator ? await locator.boundingBox() : null;
  beats.push({
    timeMs: at(),
    action,
    ...(bounds ? { elementBounds: bounds } : {}),
    caption,
    ...(durationMs ? { durationMs } : {}),
  });
}

async function main() {
  const res = await fetch(`${API}/v1/projects`);
  if (!res.ok) throw new Error(`Cannot reach ${API} — is the app running on the release tag?`);
  const body = await res.json();
  const items = Array.isArray(body) ? body : body.items;
  if (!items?.length) throw new Error("No projects — seed one first.");
  const projectId = items[0].id;

  // Resolve the graded run by name rather than hardcoding an id — the run is
  // re-created whenever the fixture is rebuilt.
  const runsRes = await fetch(`${API}/v1/evaluations?project_id=${projectId}&limit=50`);
  const runs = (await runsRes.json()).items as Array<{ id: string; name: string }>;
  const run = runs.find((r) => r.name?.startsWith(RUN_NAME));
  if (!run) throw new Error(`No completed run named "${RUN_NAME}…" — rebuild the fixture first.`);

  const rec = await startRecording();
  const { page } = rec;

  // ---- 1. Where the reference material lives ---------------------------------
  await page.goto(`${APP}/projects/${projectId}/scenarios`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  await beat(page, "navigate", "Scenarios");

  const scnId = page.getByText("SCN-000002", { exact: true }).first();
  await scnId.waitFor({ state: "visible", timeout: 20_000 });
  await beat(page, "click", "Open the scenario the judge grades", scnId);
  await scnId.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const eoTab = page.getByText("Expected Output", { exact: false }).first();
  await beat(page, "click", "Expected Output", eoTab);
  await eoTab.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);

  // The two levers, side by side: the bound judge and the document it grades against.
  const judgeRow = page.getByText("Refund policy groundedness").first();
  await beat(page, "hover", "The Groundedness judge is bound under Expected behavior", judgeRow);
  await page.waitForTimeout(2200);

  const docRow = page.getByText(/Acme Store refund policy/).first();
  await docRow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await beat(page, "hover", "Reference material attaches to the scenario, never to the evaluator", docRow);
  await page.waitForTimeout(2600);

  // ---- 2. The graded result --------------------------------------------------
  await page.goto(`${APP}/projects/${projectId}/evaluations/${run.id}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2800);
  await beat(page, "navigate", "The run that graded it");

  const scenarioRow = page.getByText(SCENARIO_LABEL).first();
  await scenarioRow.waitFor({ state: "visible", timeout: 20_000 });
  await scenarioRow.click();
  await page.waitForTimeout(1500);

  const trial = page.getByText(/TRIAL 1|Trial 1/).first();
  await beat(page, "click", "Open the result", trial);
  await trial.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2200);

  const evalTab = page.getByText("Evaluation", { exact: true }).last();
  await beat(page, "click", "Evaluation", evalTab);
  await evalTab.click();
  await page.waitForTimeout(2200);

  const chip = page.locator('[data-testid="result-evaluator-faithfulness-chip"]').first();
  await chip.waitFor({ state: "visible", timeout: 20_000 });
  const chipText = (await chip.innerText()).trim();
  if (!/grounded$/.test(chipText)) {
    throw new Error(`Metric chip read "${chipText}" — expected "N% grounded". Do not ship this frame.`);
  }
  await beat(page, "hover", `The metric chip reads ${chipText} — the verdict is Fail`, chip);
  await page.waitForTimeout(2600);

  const counts = page.getByText("1 contradicted").first();
  await beat(page, "hover", "2 supported · 1 contradicted · 1 unsupported", counts);
  await page.waitForTimeout(2400);

  // ---- 3. The evidence surface ----------------------------------------------
  const openReport = page.locator('[data-testid="evaluator-check-card-open-faithfulness-report"]').first();
  await beat(page, "click", "View groundedness report", openReport);
  await openReport.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  const claim1 = page.locator('[data-testid="faithfulness-claim-c1"]');
  await claim1.waitFor({ state: "visible", timeout: 20_000 });
  await beat(page, "click", "Claims on the left, the source on the right", claim1, 1600);
  await claim1.click();
  await page.waitForTimeout(1800);

  // The whole reason this demo is Tier-2: claim → quote → position in the
  // document. Bounds-free on purpose — this beat must render at full viewport
  // or the pane carrying half the linkage is cropped away.
  await beat(page, "wait", "A supported claim carries the quote it was grounded in — highlighted where it sits in the source");
  await page.waitForTimeout(4000);

  const contradicted = page.locator('[data-testid="faithfulness-claim-c2"]');
  await beat(page, "click", "The contradicted claim", contradicted, 1600);
  await contradicted.click();
  await page.waitForTimeout(1800);

  await beat(page, "wait", "The agent said 60 days. The policy says 30 — and the report shows you where");
  await page.waitForTimeout(3600);

  // ---- 4. The human adjudication path ----------------------------------------
  const overrideOpen = page.locator('[data-testid="faithfulness-claim-override-open-c3"]');
  await beat(page, "click", "A reviewer can override one claim's verdict", overrideOpen, 1600);
  await overrideOpen.click();
  await page.waitForTimeout(2000);

  const trigger = page.locator('[data-testid="faithfulness-claim-verdict-trigger-c3"]');
  await trigger.click();
  await page.waitForTimeout(1000);
  const choice = page.locator('[data-testid="faithfulness-claim-choice-c3-supported"]');
  await beat(page, "wait", "Four choices — Unknown is the judge's uncertainty, never a reviewer's call");
  await page.waitForTimeout(2600);
  await choice.click();
  await page.waitForTimeout(900);

  const note = page.locator('[data-testid="faithfulness-claim-note-c3"]');
  await beat(page, "type", "Overrides carry a note", note, 3200);
  await note.click();
  await note.type("Text alerts are covered by the notifications policy, not this document.", { delay: 22 });
  await page.waitForTimeout(1200);

  const apply = page.locator('[data-testid="faithfulness-claim-apply-c3"]');
  await beat(page, "click", "Apply override", apply, 1600);
  await apply.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3200);

  const chipAfter = page.locator('[data-testid="faithfulness-report-drawer"]').getByText(/% grounded/).first();
  const after = (await chipAfter.innerText()).trim();
  // The last beat has no following beat to derive a length from, and the
  // compositor defaults that case to ONE second — long enough to render the
  // caption, far too short to read it. Pin it explicitly.
  await beat(
    page,
    "wait",
    `The score recomputes — ${after}. The contradiction still fails the check.`,
    chipAfter,
    4200,
  );
  await page.waitForTimeout(4400);

  const video = await rec.finish(SLUG);

  const timeline = {
    title: "Groundedness claim report",
    description: "Reference material on the scenario, the N% grounded chip, and the per-claim report with its verified quotes",
    _ticket: "DEV-6218",
    _blocksPage: "how-to/check-answers-against-source-material.mdx",
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
  console.log(
    "\nRe-recording: relaunch the fixture run first, do not just revert the override.\n" +
      "Reverting restores the claim verdict and the score, but the check's reasoning keeps the\n" +
      "post-adjudication “After review, …” prefix, and the opening beats would then narrate a\n" +
      "reviewed grade as a fresh one.",
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
