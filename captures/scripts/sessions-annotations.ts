/**
 * Capture: the Sessions annotation surfaces.
 *
 * Outputs:
 *   ../images/sessions-inline-verdict.png     — Verdict cells set in the table
 *   ../images/session-fly-in-annotations.png  — the fly-in's Annotations tab
 *
 * The Verdict / Severity columns ship HIDDEN on a fresh view, so this script
 * shows them from the column menu before shooting. Capturing without that step
 * produces a technically-valid screenshot of a table with no annotation data in
 * it, which is exactly what the page is trying to illustrate.
 */
import { expect, test } from "@playwright/test";
import { firstProjectId, gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";

/**
 * Resolve an annotated Session from the API rather than trusting a row index.
 *
 * The first cut of this script clicked `tbody tr` nth(1) because row two
 * happened to carry a verdict on the seed of the day. It does not any more:
 * simulated runs land at the top of a date-sorted table, so nth(1) is now an
 * un-annotated row and the fly-in shot came back showing an empty Verdict, an
 * empty Severity and the literal placeholder "Add a note…". Positional
 * targeting on a growing fixture is a screenshot that silently rots.
 */
async function annotatedSessionLabel(
  projectId: string,
  need: "full" | "any"
): Promise<string> {
  const res = await fetch(`${API}/v1/sessions?project_id=${projectId}&limit=200`);
  if (!res.ok) throw new Error(`Cannot read sessions (HTTP ${res.status})`);
  const body = await res.json();
  const items = Array.isArray(body) ? body : (body.items ?? []);
  const match = items.find((s: Record<string, unknown>) => {
    const a = (s.annotations ?? {}) as Record<string, unknown>;
    return need === "full"
      ? a.verdict !== undefined && a.severity && a.reviewer_note
      : a.verdict !== undefined;
  });
  if (!match) {
    throw new Error(
      "No Session in this project carries the annotations this shot is about. " +
        "Populate them first: PUT /v1/sessions/:id/annotations/{verdict,severity,reviewer_note}."
    );
  }
  return String(match.display_label ?? match.display_id);
}

/** Every Session that carries a human Verdict, by readable id. */
async function gradedSessionLabels(projectId: string): Promise<string[]> {
  const res = await fetch(`${API}/v1/sessions?project_id=${projectId}&limit=200`);
  if (!res.ok) throw new Error(`Cannot read sessions (HTTP ${res.status})`);
  const body = await res.json();
  const items = Array.isArray(body) ? body : (body.items ?? []);
  return items
    .filter((s: Record<string, unknown>) =>
      ((s.annotations ?? {}) as Record<string, unknown>).verdict !== undefined
    )
    .map((s: Record<string, unknown>) => String(s.display_label ?? s.display_id));
}

test("sessions inline verdict", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const projectId = await firstProjectId();
  await gotoSurface(page, "sessions", "table");
  await assertTableHasRows(page, 5);
  await settle(page);

  // Reveal the annotation columns.
  await page.getByRole("button", { name: "ADD COLUMN" }).click();
  await page.waitForTimeout(600);
  const menu = page.locator('[role="dialog"],[role="menu"],[data-radix-popper-content-wrapper]').last();
  for (const label of ["Verdict", "Severity"]) {
    const row = menu.getByText(label, { exact: true }).first();
    if (await row.count()) { await row.click(); await page.waitForTimeout(500); }
  }
  await page.keyboard.press("Escape");
  await settle(page);

  // Adding two columns pushes the table into horizontal scroll, which cuts
  // SESSION ID off the left edge — the one column a reader needs to orient.
  // Hide the three columns this fixture has no data for (they render as
  // em-dashes) so the shot fits without scrolling. This is the same move a
  // reviewer sweeping verdicts would make, not a staging trick.
  for (const col of ["Routed To", "Tools Called", "Turns"]) {
    await page.getByRole("button", { name: `Column actions for ${col}` }).click();
    await page.waitForTimeout(400);
    await page.getByText("Hide column", { exact: true }).first().click();
    await page.waitForTimeout(500);
  }
  await settle(page);

  // The table defaults to newest-first, and the newest Sessions are simulator
  // runs nobody has graded yet — so the default order leads with six rows of
  // un-set toggles and em-dashes, which is not what this Step is illustrating.
  // Sort ON the Verdict column instead: that is the gesture a reviewer sweeping
  // a batch actually makes, and it brings the graded rows to the top.
  const graded = await gradedSessionLabels(projectId);
  let onScreen = 0;
  for (const direction of ["Sort descending", "Sort ascending"]) {
    await page.getByRole("button", { name: "Column actions for Verdict", exact: true }).click();
    await page.locator('[role="menu"]').last().waitFor({ state: "visible", timeout: 10_000 });
    await page.getByText(direction, { exact: true }).first().click();
    await settle(page);

    // Prove the sort put graded rows in frame. A screenshot of ten un-set
    // toggles passes every selector in this file and teaches nothing — so the
    // check is against the ids the API says are graded, not against pixels.
    const top = await page
      .locator("table tbody tr")
      .evaluateAll((rows) => rows.slice(0, 8).map((r) => r.textContent ?? ""));
    onScreen = graded.filter((id) => top.some((t) => t.includes(id))).length;
    if (onScreen >= 3) break;
  }
  expect(
    onScreen,
    "Neither sort direction brings graded rows to the top — the shot would be a column of empty toggles"
  ).toBeGreaterThanOrEqual(3);

  // Belt and braces: prove nothing is clipped before shooting.
  const scrolled = await page.evaluate(() => {
    const el = document.querySelector("table")?.closest("[class*=overflow]") as HTMLElement | null;
    if (el) el.scrollLeft = 0;
    return el ? el.scrollLeft : 0;
  });
  if (scrolled !== 0) throw new Error("Table is still horizontally scrolled — SESSION ID would be cut off.");

  await page.screenshot({ path: "../images/sessions-inline-verdict.png" });
});

test("session fly-in annotations tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const projectId = await firstProjectId();
  // The shot's whole subject is a filled-in editor, so target the Session that
  // actually carries all three values rather than whichever row is second today.
  const label = await annotatedSessionLabel(projectId, "full");

  await gotoSurface(page, "sessions", "table");
  await assertTableHasRows(page, 5);
  await settle(page);

  const row = page.locator("table tbody tr").filter({ hasText: label }).first();
  await expect(
    row,
    `Session ${label} carries the annotations this shot needs but has no row in the table`
  ).toBeVisible();
  await row.click();
  await page.waitForTimeout(1800);
  const panel = page.locator('[role="dialog"]').last();
  await panel.getByText("Annotations", { exact: true }).click();
  await page.waitForTimeout(1200);
  await settle(page);

  // A textarea still showing its placeholder is the failure this shot keeps
  // regressing into, and it is invisible to every other assertion here.
  const note = panel.locator("textarea").first();
  await expect(
    note,
    "The Reviewer note is empty — the shot would be a picture of placeholder text"
  ).not.toHaveValue("");

  await page.screenshot({ path: "../images/session-fly-in-annotations.png" });
});
