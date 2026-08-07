/**
 * Capture: Evaluators library
 * Output: ../images/evaluators-list-overview.png
 */
import { test } from "@playwright/test";
import { gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

test("capture evaluators list", async ({ page }) => {
  await gotoSurface(page, "evaluators", "table");
  await assertTableHasRows(page, 1);
  await settle(page);
  await page.screenshot({ path: "../images/evaluators-list-overview.png", fullPage: false });
});
