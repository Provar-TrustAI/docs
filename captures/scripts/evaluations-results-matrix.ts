/**
 * Capture: Evaluations results matrix
 * Navigates to an evaluation run and screenshots the results matrix with verdict chips.
 * Output: ../images/evaluations-results-matrix.png
 */
import { test } from "@playwright/test";

test("capture evaluations results matrix", async ({ page }) => {
  // Navigate to evaluations list and open the first run.
  await page.goto("/evaluations");
  const firstRun = page.locator("table tbody tr").first();
  await firstRun.waitFor({ state: "visible" });
  await firstRun.click();

  // Wait for the results matrix to render.
  // The matrix typically contains verdict/status chips inside a grid or table.
  const matrix = page.locator(
    '[data-testid="results-matrix"], [data-testid="evaluation-results"], table'
  );
  await matrix.first().waitFor({ state: "visible" });

  await page.screenshot({
    path: "../images/evaluations-results-matrix.png",
    fullPage: false,
  });
});
