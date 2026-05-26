/**
 * Capture: Sidebar navigation
 * Screenshots the sidebar showing the project switcher, nav items, and count badges.
 * Output: ../images/sidebar-navigation.png
 */
import { test } from "@playwright/test";

test("capture sidebar navigation", async ({ page }) => {
  await page.goto("/");

  // Wait for the sidebar to render. shadcn/ui sidebars typically use
  // an <aside> or a nav with a specific data attribute.
  const sidebar = page.locator(
    '[data-testid="sidebar"], aside, nav[data-sidebar]'
  );
  await sidebar.first().waitFor({ state: "visible" });

  // Ensure the sidebar is expanded (not collapsed).
  // If there's a toggle button and the sidebar is collapsed, click to expand.
  const collapseToggle = page.locator('[data-testid="sidebar-toggle"], [aria-label="Toggle sidebar"]');
  if (await collapseToggle.isVisible()) {
    const isCollapsed = await page.locator('[data-collapsed="true"], [data-state="collapsed"]').count();
    if (isCollapsed > 0) await collapseToggle.click();
  }

  await page.screenshot({
    path: "../images/sidebar-navigation.png",
    fullPage: false,
  });
});
