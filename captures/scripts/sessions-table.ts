/**
 * Capture: Sessions list overview
 * Navigates to the sessions page and screenshots the sortable table with filter bar.
 * Output: ../images/sessions-list-overview.png
 */
import { test } from "@playwright/test";

test("capture sessions table", async ({ page }) => {
  await page.goto("/sessions");

  // Wait for the table to render with at least one data row.
  // shadcn/ui tables use <table> inside a wrapper; rows live in <tbody>.
  await page.locator("table tbody tr").first().waitFor({ state: "visible" });

  await page.screenshot({
    path: "../images/sessions-list-overview.png",
    fullPage: false,
  });
});
