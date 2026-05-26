/**
 * Capture: Welcome surface
 * Navigates to the app root (new chat) and screenshots the welcome greeting
 * with suggestion prompts.
 * Output: ../images/welcome-surface.png
 */
import { test } from "@playwright/test";

test("capture welcome surface", async ({ page }) => {
  await page.goto("/");

  // Wait for the welcome greeting and suggestion prompt cards to render.
  const welcome = page.locator(
    '[data-testid="welcome-surface"], [data-testid="suggestion-prompts"], main h1, main h2'
  );
  await welcome.first().waitFor({ state: "visible" });

  await page.screenshot({
    path: "../images/welcome-surface.png",
    fullPage: false,
  });
});
