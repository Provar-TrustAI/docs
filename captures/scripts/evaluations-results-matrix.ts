/**
 * Capture: Evaluations list
 * Output: ../images/evaluations-list-overview.png
 */
import { test } from "@playwright/test";
import { gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

test("capture evaluations list", async ({ page }) => {
  await gotoSurface(page, "evaluations", "table");
  await assertTableHasRows(page, 1);
  await settle(page);
  await page.screenshot({ path: "../images/evaluations-list-overview.png", fullPage: false });
});
