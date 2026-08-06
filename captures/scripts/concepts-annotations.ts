/**
 * Capture for concepts/annotations.mdx — "Where you annotate".
 *
 * Output:
 *   ../images/annotations-two-places.png
 *
 * The marker asked for a GIF (inline edit, then the fly-in). ffmpeg is not
 * available, and PR #205 already shipped the two halves as separate stills
 * (sessions-inline-verdict.png, session-fly-in-annotations.png) on
 * how-to/annotate-sessions.mdx. Re-shooting either would be a near-duplicate.
 *
 * So this captures the one frame neither existing image can: BOTH annotation
 * surfaces at once, on the SAME session. RUN-000012's Verdict (Fail) and
 * Severity (major) are visible as table cells on the highlighted row while the
 * fly-in's Annotations tab shows the identical values plus the Reviewer note.
 * That is the concept the page argues — two entry points, one value, never in
 * disagreement — and it needs both in frame to land.
 *
 * Two things make this shot hard, and both are asserted rather than hoped for:
 *
 *   1. The fly-in OVERLAYS the table (it does not reflow it). At the 1440px
 *      viewport the other scripts use, the panel's left edge lands on top of
 *      the Verdict column, so the shot silently loses the very cells that make
 *      the point. Hence the wider viewport, the hidden empty columns, and the
 *      explicit panel-vs-column overlap assertion below.
 *   2. Verdict / Severity ship HIDDEN on a fresh view and must be revealed.
 */
import { test, expect } from "@playwright/test";
import { gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";

/**
 * The shot is only worth taking if the session still carries a full annotation
 * set. Assert it up front rather than discovering a half-empty panel in the PNG.
 */
async function assertFixtureIsAnnotated(): Promise<void> {
  const res = await fetch(`${API}/v1/sessions/${SESSION_ID}`);
  if (!res.ok) throw new Error(`Cannot read fixture session (HTTP ${res.status}).`);
  const { annotations } = await res.json();
  const expected = { verdict: false, severity: "major" };
  for (const [key, value] of Object.entries(expected)) {
    if (annotations?.[key] !== value) {
      throw new Error(
        `Fixture session RUN-000012 has ${key}=${JSON.stringify(annotations?.[key])}, expected ` +
          `${JSON.stringify(value)}. Restore it before capturing:\n` +
          `  curl -X PUT ${API}/v1/sessions/${SESSION_ID}/annotations/${key} ` +
          `-H 'Content-Type: application/json' -d '{"value": ${JSON.stringify(value)}}'`
      );
    }
  }
  if (!annotations?.reviewer_note) throw new Error("Fixture session has no reviewer note to show.");
}

/** RUN-000012 in the acme-refunds-csat seed — Fail / major / reviewer note. */
const SESSION_ID = "22ce734f-d877-4484-9cf1-681d5cdb8eac";

test("annotations in both places at once", async ({ page }) => {
  await assertFixtureIsAnnotated();

  // Wider than the other captures on purpose: the fly-in is a fixed-width
  // overlay, so width is the only way to keep the annotation columns clear of it.
  await page.setViewportSize({ width: 1920, height: 1000 });
  await gotoSurface(page, "sessions", "table");
  await assertTableHasRows(page, 5);
  await settle(page);

  // Reveal the annotation columns.
  await page.getByRole("button", { name: "ADD COLUMN" }).click();
  await page.waitForTimeout(600);
  const menu = page
    .locator('[role="dialog"],[role="menu"],[data-radix-popper-content-wrapper]')
    .last();
  for (const label of ["Verdict", "Severity"]) {
    const row = menu.getByText(label, { exact: true }).first();
    if (await row.count()) {
      await row.click();
      await page.waitForTimeout(500);
    }
  }
  await page.keyboard.press("Escape");
  await settle(page);

  // Hide the columns this fixture has no data for. They render as em-dashes and
  // push Verdict / Severity rightwards, under the fly-in. Same move a reviewer
  // sweeping verdicts would make.
  // NB: Date stays. Hiding it too was tried — it frees enough width for the
  // ADD COLUMN header to clear the fly-in, but leaves a wide empty band between
  // Severity and the panel and costs the reader real context. The partially
  // covered ADD COLUMN header is just the overlay seam, and matches how
  // sessions-inline-verdict.png already ships.
  for (const col of ["Routed To", "Tools Called", "Turns"]) {
    const actions = page.getByRole("button", { name: `Column actions for ${col}` });
    if (!(await actions.count())) continue;
    await actions.click();
    await page.waitForTimeout(400);
    await page.getByText("Hide column", { exact: true }).first().click();
    await page.waitForTimeout(500);
  }
  await settle(page);

  // Open the fly-in for RUN-000012 — the row that carries a full annotation set
  // (Fail / major / reviewer note), so table and panel can be compared directly.
  //
  // Click the SESSION ID cell, NOT the row. `row.click()` targets the row's centre,
  // which now lands on the Verdict cell — an editable control. Doing that does not
  // open the fly-in; it TOGGLES THE VERDICT OFF and silently destroys the fixture
  // data the screenshot is meant to show. That happened on the first run of this
  // script and had to be repaired through the API.
  const row = page.locator("table tbody tr").nth(1);
  await expect(row).toContainText("RUN-000012");
  await row.getByText("RUN-000012", { exact: true }).click();
  await page.waitForTimeout(1800);

  const panel = page.locator('[role="dialog"]').last();
  await panel.getByText("Annotations", { exact: true }).click();
  await page.waitForTimeout(1200);
  await settle(page);

  // The whole point of the shot: prove the annotation cells are actually VISIBLE
  // and not sitting underneath the fly-in. A passing test with the Verdict column
  // hidden behind the panel is the exact failure this capture exists to avoid.
  const panelBox = await panel.boundingBox();
  if (!panelBox) throw new Error("Fly-in panel has no bounding box — it never opened.");
  for (const header of ["VERDICT", "SEVERITY"]) {
    const cell = page.getByRole("button", { name: `Column actions for ${header === "VERDICT" ? "Verdict" : "Severity"}` }).first();
    const box = (await cell.count())
      ? await cell.boundingBox()
      : await page.getByText(header, { exact: true }).first().boundingBox();
    if (!box) throw new Error(`${header} column is not rendered at all.`);
    if (box.x + box.width > panelBox.x) {
      throw new Error(
        `${header} column (ends at x=${Math.round(box.x + box.width)}) is underneath the ` +
          `fly-in (starts at x=${Math.round(panelBox.x)}). The shot would not show the ` +
          `table-side annotation, which is the entire point. Widen the viewport or hide another column.`
      );
    }
  }

  // And prove the table has not scrolled the SESSION ID column off the left.
  const scrolled = await page.evaluate(() => {
    const el = document.querySelector("table")?.closest("[class*=overflow]") as HTMLElement | null;
    if (el) el.scrollLeft = 0;
    return el ? el.scrollLeft : 0;
  });
  if (scrolled !== 0) throw new Error("Table is still horizontally scrolled — SESSION ID would be cut off.");

  await page.screenshot({ path: "../images/annotations-two-places.png" });
});
