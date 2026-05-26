/**
 * Capture: Sessions fly-in panel
 * Opens the first session row to reveal the fly-in detail panel with transcript.
 * Output: ../images/sessions-flyin-panel.png
 */
import { test } from "@playwright/test";

test("capture sessions fly-in panel", async ({ page }) => {
  await page.goto("/sessions");

  // Wait for table rows, then click the first one to open the fly-in.
  const firstRow = page.locator("table tbody tr").first();
  await firstRow.waitFor({ state: "visible" });
  await firstRow.click();

  // Wait for the fly-in panel to appear.
  // Look for a data-testid first; fall back to a role-based selector for a
  // sheet/dialog container that shadcn/ui typically renders.
  const flyIn = page.locator(
    '[data-testid="session-flyin"], [role="dialog"], [data-state="open"]'
  );
  await flyIn.first().waitFor({ state: "visible" });

  await page.screenshot({
    path: "../images/sessions-flyin-panel.png",
    fullPage: false,
  });
});
