/**
 * Capture: the Sessions annotation surfaces.
 *
 * Outputs:
 *   ../images/sessions-inline-verdict.png     — Verdict cells set in the table
 *   ../images/session-fly-in-annotations.png  — the fly-in's Annotations tab
 *
 * The Verdict / Severity columns ship HIDDEN on a fresh view, so this script
 * shows them from the column menu before shooting. Capturing without that step
 * produces a technically-valid screenshot of a table with no annotation data in
 * it, which is exactly what the page is trying to illustrate.
 */
import { test } from "@playwright/test";
import { gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

test("sessions inline verdict", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoSurface(page, "sessions", "table");
  await assertTableHasRows(page, 5);
  await settle(page);

  // Reveal the annotation columns.
  await page.getByRole("button", { name: "ADD COLUMN" }).click();
  await page.waitForTimeout(600);
  const menu = page.locator('[role="dialog"],[role="menu"],[data-radix-popper-content-wrapper]').last();
  for (const label of ["Verdict", "Severity"]) {
    const row = menu.getByText(label, { exact: true }).first();
    if (await row.count()) { await row.click(); await page.waitForTimeout(500); }
  }
  await page.keyboard.press("Escape");
  await settle(page);

  // Adding two columns pushes the table into horizontal scroll, which cuts
  // SESSION ID off the left edge — the one column a reader needs to orient.
  // Hide the three columns this fixture has no data for (they render as
  // em-dashes) so the shot fits without scrolling. This is the same move a
  // reviewer sweeping verdicts would make, not a staging trick.
  for (const col of ["Routed To", "Tools Called", "Turns"]) {
    await page.getByRole("button", { name: `Column actions for ${col}` }).click();
    await page.waitForTimeout(400);
    await page.getByText("Hide column", { exact: true }).first().click();
    await page.waitForTimeout(500);
  }
  await settle(page);

  // Belt and braces: prove nothing is clipped before shooting.
  const scrolled = await page.evaluate(() => {
    const el = document.querySelector("table")?.closest("[class*=overflow]") as HTMLElement | null;
    if (el) el.scrollLeft = 0;
    return el ? el.scrollLeft : 0;
  });
  if (scrolled !== 0) throw new Error("Table is still horizontally scrolled — SESSION ID would be cut off.");

  await page.screenshot({ path: "../images/sessions-inline-verdict.png" });
});

test("session fly-in annotations tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoSurface(page, "sessions", "table");
  await assertTableHasRows(page, 5);
  await settle(page);

  // Row 2 carries a Fail verdict, a Severity and a reviewer note.
  await page.locator("table tbody tr").nth(1).click();
  await page.waitForTimeout(1800);
  const panel = page.locator('[role="dialog"]').last();
  await panel.getByText("Annotations", { exact: true }).click();
  await page.waitForTimeout(1200);
  await settle(page);

  await page.screenshot({ path: "../images/session-fly-in-annotations.png" });
});
