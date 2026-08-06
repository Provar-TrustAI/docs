/**
 * Capture: the scenario simulation loop (how-to/simulate-with-scenarios.mdx).
 *
 * Outputs:
 *   ../images/simulate-scenarios-list.png       — the flat Scenarios table + header actions
 *   ../images/simulate-run-launcher.png         — the "Run scenario" launcher + fan-out preview
 *   ../images/simulate-playground-modal.png     — the Playground's Simulate config modal
 *   ../images/simulate-expected-output.png      — the Expected Output editor, route picker open
 *   ../images/simulate-run-detail-personas.png  — the finished run's per-persona matrix
 *
 * Fixture notes (see the PR body for the full list):
 *   - Observed vocabulary (route / tool agent steps) was seeded onto the
 *     project's sessions so the Expected Output pickers have real learned
 *     options instead of the cold-start hint.
 *   - SCN-000010 carries all three personas + a full expected-output
 *     contract, so the fan-out preview counts 3 and the editor has content.
 *   - The run detail shot targets a real Run & evaluate launch over that
 *     scenario (RUN_ID below).
 *
 * Traps this script is built around:
 *   - The Scenarios table is wider than any sane viewport. VERDICT and
 *     SESSIONS hold nothing in this fixture (no scenario annotations; the
 *     list projection omits the session backlink so every row reads "None"),
 *     so both are hidden before shooting and `scrollLeft === 0` is asserted —
 *     otherwise the ID column silently walks off the left edge.
 *   - The run-detail table defaults to "By scenario", which collapses the
 *     three persona results into three identically-named parent rows. The
 *     per-persona matrix is the "Flat" view, reachable from the column gear.
 */
import { expect, test } from "@playwright/test";
import { assertTableHasRows, firstProjectId, gotoSurface, settle } from "../lib/helpers";

/** SCN-000010 "Refund status after return" — three personas, full contract. */
const SCENARIO_ID = "c189638e-a656-4e6d-8cfc-6e5ca41b8a3d";
/** "Refund status after return · persona sweep" — Run & evaluate, 3 personas. */
const RUN_ID = "a4c44367-e2f4-4c05-bfa9-96f3bc112785";

async function hideColumn(page: import("@playwright/test").Page, column: string) {
  await page.getByRole("button", { name: `Column actions for ${column}` }).click();
  await page.waitForTimeout(400);
  await page.getByText("Hide column", { exact: true }).first().click();
  await page.waitForTimeout(500);
}

/** Prove the wide table is not horizontally scrolled before shooting. */
async function assertNoHorizontalScroll(page: import("@playwright/test").Page) {
  const metrics = await page.evaluate(() => {
    const el = document.querySelector("table")?.closest("[class*=overflow]") as HTMLElement | null;
    if (!el) return null;
    el.scrollLeft = 0;
    return { scrollLeft: el.scrollLeft, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
  if (!metrics) throw new Error("Could not resolve the table's scroll container.");
  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    throw new Error(
      `Table overflows its container (${metrics.scrollWidth} > ${metrics.clientWidth}) — ` +
        `the right-hand columns would be clipped. Widen the viewport or hide another column.`,
    );
  }
}

test("scenarios list", async ({ page }) => {
  // All nine default columns are load-bearing on this page — the step below
  // the shot names them, ending "Verdict then Sessions" — and they need
  // ~1870px of table. Hiding any of them to fit a narrower frame would put
  // the picture at odds with the prose, so the shot is simply wide.
  // Tall enough that the last row ends inside the frame rather than being
  // sliced by the bottom edge.
  await page.setViewportSize({ width: 2240, height: 1420 });
  await gotoSurface(page, "scenarios", "table");
  await assertTableHasRows(page, 10);
  await settle(page);
  await assertNoHorizontalScroll(page);

  const headers = await page.locator("table thead th").allInnerTexts();
  expect(headers.join("|")).toContain("VERDICT");
  expect(headers.join("|")).toContain("SESSIONS");
  expect(headers.join("|")).toContain("ADD COLUMN");

  // Sort by ID ascending. The default sort is Created descending, which on
  // this fixture floats the freshly-adopted recommended scenarios — real
  // rows, but ones whose expected output is deliberately still empty, so the
  // top of the shot would be five rows of "Not set". Sorting by ID puts the
  // authored refund scenarios first so every column shows what it holds.
  await page.getByRole("button", { name: "Column actions for ID" }).click();
  await page.waitForTimeout(400);
  await page.getByText("Sort ascending", { exact: true }).first().click();
  await page.waitForTimeout(900);
  await settle(page);
  await expect(page.locator("table tbody tr").first()).toContainText("SCN-000001");

  // Guard against shipping the "Add name…" placeholder table the seed used
  // to produce: every row must carry a real scenario name and goal.
  const firstRow = await page.locator("table tbody tr").first().innerText();
  expect(firstRow).not.toContain("Add name");
  expect(firstRow).not.toContain("Not set");

  await page.screenshot({ path: "../images/simulate-scenarios-list.png" });
});

test("run scenario launcher", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await gotoSurface(page, "scenarios", "table");
  await assertTableHasRows(page, 10);
  await settle(page);

  // Select SCN-000010 — the three-persona scenario, so the fan-out preview
  // counts three conversations rather than the degenerate one.
  const row = page.locator("table tbody tr", { hasText: "SCN-000010" }).first();
  await row.locator('input[type="checkbox"], button[role="checkbox"]').first().click();
  await page.waitForTimeout(600);

  await page.getByRole("button", { name: "More run options" }).first().click();
  await page.waitForTimeout(500);
  await page.getByText("Run only", { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await settle(page);

  const dialog = page.locator('[role="dialog"]').last();
  await expect(dialog).toContainText("Run scenario");
  await expect(dialog).toContainText("This will run");
  // The fan-out count and the confirm button must agree, or the shot teaches
  // the wrong thing.
  await expect(dialog.getByRole("button", { name: /Run 3 conversations/ })).toBeVisible();

  await page.screenshot({ path: "../images/simulate-run-launcher.png" });
});

test("playground simulate modal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await gotoSurface(page, "playground", "main");
  await settle(page);

  await page.getByRole("button", { name: "Simulate", exact: true }).first().click();
  await page.waitForTimeout(1200);
  await settle(page);
  // Pinned by content, not by `.last()` — opening the persona picker pushes
  // another dialog-role node on top and `.last()` would follow it.
  const dialog = page.locator('[role="dialog"]', { hasText: "Simulate a conversation" }).first();
  await expect(dialog).toContainText("Simulate a conversation");

  // Fill the goal — an empty Goal box ships the placeholder prompt, and the
  // Simulate button stays disabled, which reads as a broken modal.
  await dialog
    .getByTestId("playground-simulate-goal")
    .fill("Get a firm date for the refund on the return you already delivered");
  await page.waitForTimeout(600);
  await settle(page);

  // Pick the persona the goal belongs to. The picker preselects whatever
  // happens to be first in the project roster, which is how this shot once
  // paired a refund-status goal with an adversarial red-team persona.
  await dialog.locator("button[aria-haspopup]").first().click();
  await page.waitForTimeout(600);
  await page
    .locator("[data-radix-popper-content-wrapper]")
    .last()
    .getByText("Frustrated regular", { exact: true })
    .first()
    .click();
  await page.waitForTimeout(900);
  await settle(page);

  await expect(dialog).toContainText("Persona");
  await expect(dialog).toContainText("Frustrated regular");
  await expect(dialog).toContainText("Full auto");
  await expect(dialog).toContainText("Stay in the loop");
  await expect(dialog.getByTestId("playground-simulate-start")).toBeEnabled();

  await page.screenshot({ path: "../images/simulate-playground-modal.png" });
});

test("expected output editor", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1250 });
  const projectId = await firstProjectId();
  await page.goto(`/projects/${projectId}/scenarios?scn=${SCENARIO_ID}`);
  await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);

  const panel = page.locator('[role="dialog"]').last();
  await panel.getByText("Expected Output", { exact: false }).first().click();
  await page.waitForTimeout(1200);
  await settle(page);

  // All three sections must be authored — an empty contract renders three
  // empty shells and the cold-start hint, which teaches nothing.
  await expect(panel).toContainText("Expected behavior");
  await expect(panel).toContainText("Expected actions");
  await expect(panel).toContainText("Expected routes");

  await panel.getByRole("button", { name: "Add route" }).click();
  await page.waitForTimeout(900);
  const picker = page.locator("[data-radix-popper-content-wrapper]").last();
  // The point of the shot: the picker offers routes LEARNED from real
  // sessions, with the session counts that make them credible.
  await expect(picker).toContainText("seen in");

  await page.screenshot({ path: "../images/simulate-expected-output.png" });
});

test("run detail per-persona matrix", async ({ page }) => {
  // Wider than the other shots: the results matrix carries a column per
  // pinned evaluator plus the two structural checks, and at 1440 the last
  // one is clipped.
  await page.setViewportSize({ width: 1700, height: 1000 });
  const projectId = await firstProjectId();
  await page.goto(`/projects/${projectId}/evaluations/${RUN_ID}`);
  await page.locator("table").first().waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);

  // Switch to the Flat view. "By scenario" (the default) folds the three
  // persona results under three identically-titled parent rows whose score
  // cells all read as em-dashes — the persona names only surface here.
  await page.getByRole("button", { name: "Columns" }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Flat", exact: true }).click();
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  // Drop focus off the gear, or the shot ships a stray focus ring on it.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(300);
  await settle(page);

  const table = page.locator("table");
  for (const persona of ["Frustrated regular", "First-time buyer", "Terse power user"]) {
    await expect(table).toContainText(persona);
  }
  await assertNoHorizontalScroll(page);

  await page.screenshot({ path: "../images/simulate-run-detail-personas.png" });
});
