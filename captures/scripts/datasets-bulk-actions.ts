/**
 * Capture: Datasets bulk actions toolbar
 * Navigates to a dataset detail page, selects several rows, and screenshots the
 * bulk actions toolbar (Export CSV, Upload CSV, Remove Rows).
 * Output: ../images/datasets-bulk-actions.png
 */
import { test } from "@playwright/test";

test("capture datasets bulk actions", async ({ page }) => {
  // Navigate to the first dataset's detail page.
  // Adjust the route if datasets use a different URL pattern.
  await page.goto("/datasets");
  const firstDataset = page.locator("table tbody tr").first();
  await firstDataset.waitFor({ state: "visible" });
  await firstDataset.click();

  // Wait for the detail table to render.
  await page.locator("table tbody tr").first().waitFor({ state: "visible" });

  // Select 2-3 rows via their row-level checkboxes.
  const checkboxes = page.locator('table tbody tr input[type="checkbox"], table tbody tr [role="checkbox"]');
  for (let i = 0; i < 3; i++) {
    const cb = checkboxes.nth(i);
    if (await cb.isVisible()) await cb.click();
  }

  // Wait for the bulk actions toolbar to appear.
  const toolbar = page.locator(
    '[data-testid="bulk-actions"], [role="toolbar"]'
  );
  await toolbar.first().waitFor({ state: "visible", timeout: 5000 });

  await page.screenshot({
    path: "../images/datasets-bulk-actions.png",
    fullPage: false,
  });
});
