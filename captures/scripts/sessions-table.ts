/**
 * Capture: Sessions list overview
 * Output: ../images/sessions-list-overview.png
 */
import { test } from "@playwright/test";
import { gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

test("capture sessions table", async ({ page }) => {
  await gotoSurface(page, "sessions", "table");
  await assertTableHasRows(page, 5);
  await settle(page);
  await page.screenshot({ path: "../images/sessions-list-overview.png", fullPage: false });
});
