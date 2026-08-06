/**
 * Capture: Workspace Settings → Connections.
 *
 * Output:
 *   ../images/workspace-settings-connections.png
 *     The Connections tab with its one connection row — org My Domain host,
 *     lifecycle badge, Used by, Sign-in, and the Disconnect / Delete pair.
 *
 * ## Why this one does NOT use gotoSurface()
 *
 * Every other capture targets a project-scoped route (`/projects/:id/...`), so
 * `gotoSurface` discovers a project id first. This surface is WORKSPACE-scoped:
 * `/workspace/settings/connections`, a flat route under the Access Center shell
 * (apps/web/src/routes/workspace/settings/connections.tsx). There is no project
 * id in the path.
 *
 * The trap `gotoSurface` exists to close is still live, though — apps/web is a
 * Vite SPA behind an nginx fallback, so a wrong path returns 200 with the index
 * shell and screenshots an empty app while the test passes. So this script
 * re-implements the same guard by hand, and then some:
 *
 *   1. `access-center-panel-connections` — the panel testid the route's own tab
 *      contract owns. Present only when the Connections route actually matched.
 *   2. The tab strip's Connections tab must be the SELECTED one. A sibling tab
 *      route also renders the shell, so the panel alone is not proof.
 *   3. `workspace-connection-row` must exist — the empty state and the loading
 *      skeleton both satisfy the panel assertion, and neither is worth shipping.
 *   4. The row must name a real Salesforce host, carry a badge, and offer both
 *      Disconnect and Delete — i.e. everything the docs page describes is in
 *      frame, not just a card-shaped div.
 *
 * ## What this instance actually holds
 *
 * One live `salesforce_agentforce` connection, `trustaidev`, pointed at
 * `provar--trustaidev.sandbox.my.salesforce.com`, authorized by admin token
 * exchange and used by the one project (`Acme refunds CSAT`). No fixture work
 * was needed — nothing on this surface renders placeholder text.
 *
 * Its lifecycle badge reads **Needs admin**, and that is REAL, not a staging
 * artefact: the org-side agent isn't activated, so the last health probe came
 * back unreachable and `derive_salesforce_lifecycle_status` falls through to
 * `needs_admin` (services/gateway/src/domain/hosts/schemas.py). Turning that
 * badge green would mean forging a live-integration health state, so the shot
 * ships the state the instance is genuinely in and the caption names it.
 *
 * ## Viewport
 *
 * 1440 wide to match the rest of the harness. 760 tall rather than 900: the tab
 * holds a single card, and the extra 140px is dead panel. The sidebar footer is
 * bottom-pinned, so the shorter frame still shows the **Workspace Settings**
 * entry the docs page tells the reader to click.
 *
 * 760 is the floor, not a round number. A 640-tall trial was shot and rejected:
 * the sidebar's RECENT CHATS list scrolls under the pinned footer, and at 640 a
 * chat title was sliced in half behind it — a clipped-edge artefact in a shot
 * whose whole job is to look like the surface a reader will see. Shortening
 * this further trades dead panel for a visible defect.
 */
import { expect, test } from "@playwright/test";
import { settle } from "../lib/helpers";

test("workspace settings connections tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 760 });
  await page.goto("/workspace/settings/connections");

  // (1) The route matched, not the SPA fallback.
  const panel = page.locator('[data-testid="access-center-panel-connections"]');
  try {
    await panel.waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    throw new Error(
      "Navigated to /workspace/settings/connections but the Connections panel never rendered.\n" +
        "This is USUALLY a dead route, not a slow one: the SPA fallback serves 200 for any path,\n" +
        "so a wrong URL looks identical to a working one. Verify the route still exists at\n" +
        "apps/web/src/routes/workspace/settings/connections.tsx before adjusting the selector."
    );
  }

  // (2) Connections is the SELECTED tab — a sibling tab renders the same shell.
  await expect(
    page.getByRole("tab", { name: "Connections" }),
    "The Connections tab is not the selected tab — the shot would show a different panel"
  ).toHaveAttribute("aria-selected", "true");

  // (3) A real row, not the empty state and not the loading skeleton.
  const rows = page.locator('[data-testid="workspace-connection-row"]');
  await expect
    .poll(async () => rows.count(), {
      message:
        "No connection row rendered. Either the surface is still loading, or this instance has " +
        "no salesforce_agentforce host — check GET /v1/connect/hosts?project_id=<id>.",
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(1);
  await expect(
    page.locator('[data-testid="workspace-connections-loading"]'),
    "The loading skeleton is still mounted — the shot would be two grey placeholder bars"
  ).toHaveCount(0);

  await settle(page);

  // (4) Everything the docs page describes is actually in frame.
  const row = rows.first();
  const rowText = await row.innerText();
  expect(
    rowText,
    "The row is not labelled with a Salesforce My Domain host — it fell back to a connection nickname, " +
      "which is the 'connection missing its org URL' edge case, not the shot this page wants"
  ).toContain(".salesforce.com");
  expect(
    rowText,
    "The row names no project under 'Used by' — the docs page is specifically about which projects use an org"
  ).not.toContain("No projects");
  expect(rowText, "The row has no Sign-in line").toContain("Sign-in");
  await expect(
    row.locator('[data-testid="workspace-connection-disconnect"]'),
    "No Disconnect button — this connection is not one TrustAI bootstrapped, so the shot cannot show the Disconnect/Delete pair"
  ).toBeVisible();
  await expect(
    row.locator('[data-testid="workspace-connection-delete"]'),
    "No Delete button"
  ).toBeVisible();

  // A lifecycle badge must be present. Which one is whatever the instance is
  // genuinely in — asserting a specific status here would invite forging it.
  const badge = row.getByText(
    /^(Connected|Setting up|Needs admin|Setup failed)$/
  );
  await expect(badge, "The row shows no lifecycle badge").toBeVisible();
  console.log(`lifecycle badge in frame: "${await badge.innerText()}"`);

  // Nothing clipped: the card is a flex row that wraps rather than scrolls, but
  // prove the page itself is not scrolled sideways before shooting.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (overflow > 0) {
    throw new Error(
      `Page overflows horizontally by ${overflow}px — the Disconnect / Delete buttons would be cut off.`
    );
  }

  await settle(page);
  await page.screenshot({ path: "../images/workspace-settings-connections.png" });
});
