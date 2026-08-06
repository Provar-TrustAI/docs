/**
 * Capture: Session fly-in detail panel
 * Output: ../images/sessions-flyin-panel.png
 */
import { test } from "@playwright/test";
import { gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

test("capture sessions fly-in panel", async ({ page }) => {
  await gotoSurface(page, "sessions", "table");
  await assertTableHasRows(page, 1);
  await settle(page);

  await page.locator("table tbody tr").first().click();
  await page.locator('[role="dialog"], aside, [data-testid*="fly-in"]').first()
    .waitFor({ state: "visible", timeout: 15_000 });
  await settle(page);

  await page.screenshot({ path: "../images/sessions-flyin-panel.png", fullPage: false });
});
