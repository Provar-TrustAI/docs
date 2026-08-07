/**
 * Smoke recording — proves the Playwright → Remotion handoff.
 *
 * Not a budgeted artifact. It exists so `remotion render` has an input, and as the
 * template the four D1–D4 recorders are written from.
 *
 *   cd captures && npx tsx demos/record-smoke.ts
 *   cd ../pipeline && npx remotion render src/index.ts DemoComposition out/smoke.mp4 \
 *     --props=public/smoke-timeline.json
 */
import { startRecording } from "../lib/helpers-record";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";
const APP = process.env.TRUSTAI_APP_URL ?? "http://localhost:3000";

async function main() {
  const res = await fetch(`${API}/v1/projects`);
  if (!res.ok) throw new Error(`Cannot reach ${API} — is the app running on the release tag?`);
  const body = await res.json();
  const items = Array.isArray(body) ? body : body.items;
  if (!items?.length) throw new Error("No projects — seed one first.");
  const id = items[0].id;

  const rec = await startRecording();
  const { page } = rec;

  await page.goto(`${APP}/projects/${id}/sessions`);
  await page.locator("table tbody tr").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(1200);

  // Capture bounds BEFORE clicking — the timeline needs them and they are
  // unrecoverable afterwards. This is the pattern the D1–D4 recorders follow.
  const row = page.locator("table tbody tr").first();
  const box = await row.boundingBox();
  console.log("first-row bounds:", box);

  await row.click();
  await page.waitForTimeout(1800);

  console.log("recorded:", await rec.finish("smoke"));
}

main().catch((e) => { console.error(e); process.exit(1); });
