/**
 * Capture: Scenarios list
 * Replaces the retired datasets-bulk-actions capture — the Datasets container
 * was removed at v2026.07.08.1 and Scenarios is its successor surface.
 * Output: ../images/scenarios-list-overview.png
 */
import { test } from "@playwright/test";
import { gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

test("capture scenarios list", async ({ page }) => {
  await gotoSurface(page, "scenarios", "table");
  await assertTableHasRows(page, 5);
  await settle(page);
  await page.screenshot({ path: "../images/scenarios-list-overview.png", fullPage: false });
});
