/**
 * Capture: the shared table / fly-in interaction language
 * (concepts/tables-and-panels.mdx).
 *
 * Run: cd captures && npx playwright test tables-and-panels
 *
 * Outputs:
 *   ../images/tables-panels-header-menu.png     — a column header menu open on Sessions
 *   ../images/tables-panels-scenario-panel.png  — level one: the scenario fly-in's Sessions tab
 *   ../images/tables-panels-stacked-fly-in.png  — level two: the session panel stacked over it
 *
 * Three things this script exists to work around.
 *
 * 1. The header menu is a Radix popover portaled to <body>, so it is NOT inside
 *    the table. Its trigger is the header button whose aria-label is
 *    `Column actions for {LABEL}` (components/ui/data-table/header-menu.tsx).
 *    Sort items render only on sortable columns and "Hide column" only on
 *    hideable ones, so the script asserts all three before shooting — a menu
 *    missing a leg is a different claim than the page makes.
 *
 * 2. The Sessions table needs ~1460px of column width but only gets ~1094px at
 *    a 1440px viewport, so the right-hand columns sit past the fold. Rather
 *    than hide populated columns to fit, the script picks a column that is
 *    fully on screen at scrollLeft 0 and asserts BOTH the trigger and the
 *    popover are inside the viewport before shooting. It also asserts the
 *    leftmost column is still visible, which is the failure captures/README
 *    warns about.
 *
 * 3. The Scenarios L1 fly-in is URL state (`?scn=<id>`); the nested L2 session
 *    panel is page-local React state with no URL of its own, so the only way
 *    to reach the stack is to drive the drill-down. Only one seeded scenario
 *    has linked sessions, so the script resolves it from the API by session
 *    count rather than hardcoding an id a reseed would invalidate.
 *
 * NOTE ON THE STACK: L1 and L2 are both 560px wide and both anchored to the
 * right edge, so L2 covers L1 exactly — there is no offset to photograph. The
 * two-level relationship is therefore captured as two frames (the scenario
 * panel, then the session panel over it, carrying the `‹ back` chip that names
 * its parent) rather than as one shot of a staircase the app never draws.
 */
import { expect, test } from "@playwright/test";
import { firstProjectId, gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";
const VIEWPORT = { width: 1440, height: 900 };

/** Assert an element is wholly inside the viewport before it is photographed. */
async function assertFullyVisible(
  locator: import("@playwright/test").Locator,
  what: string
): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${what} has no box — it is not rendered.`);
  const ok =
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= VIEWPORT.width &&
    box.y + box.height <= VIEWPORT.height;
  if (!ok) {
    throw new Error(
      `${what} is clipped by the viewport: ${JSON.stringify(box)} vs ${JSON.stringify(VIEWPORT)}`
    );
  }
}

/**
 * The one scenario that can demonstrate the stack: it needs linked sessions,
 * or its Sessions tab is an empty state and there is nothing to drill into.
 */
async function scenarioWithMostSessions(projectId: string): Promise<string> {
  const res = await fetch(`${API}/v1/sessions?project_id=${projectId}&limit=100`);
  if (!res.ok) throw new Error(`Cannot read sessions (HTTP ${res.status})`);
  const body = await res.json();
  const items = Array.isArray(body) ? body : (body.items ?? []);
  const counts = new Map<string, number>();
  for (const s of items) {
    if (s.scenario_id) counts.set(s.scenario_id, (counts.get(s.scenario_id) ?? 0) + 1);
  }
  // Tie-break on the id so repeated runs pick the same scenario.
  const best = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0];
  if (!best) {
    throw new Error(
      "No session in this project is linked to a scenario, so the Scenarios fly-in has " +
        "nothing to stack an L2 session panel over. Run a scenario first."
    );
  }
  return best[0];
}

/** The column whose menu the header-menu shot opens. Sortable, hideable, and on screen at 1440. */
const MENU_COLUMN = "Routed To";

test("shared column header menu", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await gotoSurface(page, "sessions", "table");
  await assertTableHasRows(page, 5);
  await settle(page);

  // Keep the id column — the reader's anchor — on screen.
  await page.evaluate(() => {
    const el = document.querySelector("table")?.closest("[class*=overflow]") as HTMLElement | null;
    if (el) el.scrollLeft = 0;
  });
  await assertFullyVisible(
    page.locator("table thead th").filter({ hasText: "SESSION ID" }).first(),
    "The SESSION ID header"
  );

  const trigger = page.getByRole("button", {
    name: `Column actions for ${MENU_COLUMN}`,
    exact: true,
  });
  await assertFullyVisible(trigger, `The "${MENU_COLUMN}" header menu trigger`);

  // Sort first, then reopen the menu, so the shot also carries the page's
  // claim that the active direction is marked in the menu and the header
  // grows a sort chevron. This is the ordinary two-step a user performs.
  //
  // DESCENDING deliberately: ascending floats the un-routed sessions to the
  // top, and the shot then leads with three rows of em-dashes. Descending
  // puts real route values under the menu, which is what the reader needs to
  // see a sort having done something.
  await trigger.click();
  await page.locator('[role="menu"]').last().waitFor({ state: "visible", timeout: 10_000 });
  await page.getByText("Sort descending", { exact: true }).first().click();
  await settle(page);

  // Prove the sort actually landed on populated rows rather than a run of
  // placeholder em-dashes.
  const topRoutes = await page
    .locator("table tbody tr")
    .evaluateAll((rows) =>
      rows.slice(0, 4).map((r) => (r.querySelectorAll("td")[3]?.textContent ?? "").trim())
    );
  const blank = topRoutes.filter((t) => t === "" || t === "—").length;
  if (blank > 1) {
    throw new Error(
      `The top rows of the sorted table are mostly empty (${JSON.stringify(topRoutes)}) — ` +
        `the shot would be a wall of em-dashes.`
    );
  }

  await trigger.click();
  const menu = page.locator('[role="menu"]').last();
  await menu.waitFor({ state: "visible", timeout: 10_000 });

  // A menu missing a leg illustrates something the page does not claim.
  for (const item of ["Sort ascending", "Sort descending", "Hide column"]) {
    await expect(
      menu.getByText(item, { exact: true }),
      `The ${MENU_COLUMN} column menu is missing "${item}" — this is no longer the three-item menu the page describes`
    ).toBeVisible();
  }
  await assertFullyVisible(menu, "The open column menu");

  await settle(page);
  await page.screenshot({ path: "../images/tables-panels-header-menu.png" });
});

test("scenario fly-in and the session panel stacked over it", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const projectId = await firstProjectId();
  const scenarioId = await scenarioWithMostSessions(projectId);

  // `?scn=` is the L1 fly-in's own URL contract (scenarios-list-page.tsx), so a
  // direct load opens the panel without depending on which cell of a row is a
  // click-through rather than an in-place editor.
  await page.goto(`/projects/${projectId}/scenarios?scn=${scenarioId}`);
  await page.locator("table").first().waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);

  const l1 = page.locator('[role="dialog"]').last();
  await l1.getByTestId("scenario-panel-title").waitFor({ state: "visible", timeout: 15_000 });

  // Level one: the scenario panel on the tab the drill-down starts from.
  await l1.getByText(/^Sessions · \d+$/).first().click();
  await page.waitForTimeout(1200);
  await settle(page);

  const sessionRows = l1.getByTestId("scenario-session-row");
  await expect(
    sessionRows.first(),
    "The scenario's Sessions tab rendered no session rows, so there is nothing to drill into"
  ).toBeVisible();
  await page.screenshot({ path: "../images/tables-panels-scenario-panel.png" });

  // Level two: click a linked session; the session panel mounts OVER the
  // scenario panel rather than replacing it.
  await sessionRows.first().click();
  await page.waitForTimeout(1800);
  await settle(page);

  // The whole point is that BOTH panels are mounted. One dialog means the
  // drill-down closed L1 instead of stacking over it — exactly the regression
  // the page's "Stacked panels" section documents against.
  await expect(
    page.locator('[role="dialog"]'),
    "Expected the scenario panel AND the nested session panel to both be mounted"
  ).toHaveCount(2);

  const l2 = page.locator('[role="dialog"]').last();
  // The back chip is the only on-screen evidence of the parent, so it must be
  // in frame or the shot does not read as a second level at all.
  await expect(
    l2.getByTestId("scenario-session-back"),
    "The nested session panel has no back chip, so nothing in the frame shows it was opened from a scenario"
  ).toBeVisible();
  await expect(l2.getByTestId("transcript")).toBeVisible();

  // The panel footer sits at the bottom of a fixed-height column, but a long
  // transcript takes a beat to settle into its scroll container — the first
  // capture of this shot caught a frame where a chat bubble was still painting
  // over the footer's row and the image ended mid-bubble at the viewport edge.
  const hints = l2.getByTestId("fly-in-panel-keyboard-hints");
  await expect(hints, "The panel's keyboard-hints footer never rendered").toBeVisible();
  await assertFullyVisible(hints, "The panel's keyboard-hints footer");
  await page.waitForTimeout(600);

  await page.screenshot({ path: "../images/tables-panels-stacked-fly-in.png" });
});
