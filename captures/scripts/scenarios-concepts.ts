/**
 * Capture: the surfaces concepts/scenarios.mdx describes.
 *
 * Outputs:
 *   ../images/scenarios-list.png                    — the flat Scenarios table
 *   ../images/scenario-flyin-session.png            — the two-level fly-in (L1 + nested L2 session)
 *   ../images/scenario-expected-output-editor.png   — the Expected Output tab's three sections
 *
 * Four things this script has to work around, all of which produced a passing
 * test and a useless picture first time round:
 *
 * 1. The grading contract is empty in the seed. `ensureScenarioContracts` fills
 *    it in before anything is shot, and the list capture then ASSERTS no
 *    "Not set" survives in the body — the fixture is shared with other sessions
 *    and a concurrent wholesale PUT has wiped it mid-pass more than once.
 *
 * 2. Nine visible columns overflow 1800px, and the overflow silently eats the
 *    ID column off the left edge. Evaluators and Sessions are hidden (Sessions
 *    reads "None" on nine of ten rows — the seed links sessions to one scenario
 *    only) and three columns are resized so names and persona pills stop
 *    truncating. `scrollLeft === 0` is asserted before the shot.
 *
 * 3. The fly-in is URL state (`?scn=<id>`), the nested session panel is not.
 *    Opening L1 by clicking a row does not work — the list's cells are inline
 *    editors and swallow the click. Navigate with the search param instead,
 *    then click a session row inside the panel to stack L2.
 *
 * 4. The Expected Output tab is taller than a 900px viewport. It is shot at a
 *    tall viewport and clipped to the panel, so all three sections land in one
 *    frame instead of one-and-a-half.
 */
import { expect, test, type Page } from "@playwright/test";
import { gotoSurface, assertTableHasRows, settle, firstProjectId } from "../lib/helpers";
import { ensureScenarioContracts } from "../lib/scenario-contracts";

/** "Refund timing — one week after return": the only seeded scenario with real linked sessions. */
const SCENARIO_HANDLE = "SCN-000002";

async function scenarioIdFor(handle: string): Promise<string> {
  const api = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";
  const projectId = await firstProjectId();
  const body = await (await fetch(`${api}/v1/scenarios?project_id=${projectId}`)).json();
  const hit = (body.items ?? []).find((s: { display_label: string }) => s.display_label === handle);
  if (!hit) throw new Error(`No scenario ${handle} in project ${projectId}`);
  return hit.id;
}

async function columnAction(page: Page, label: string, action: string) {
  await page.getByRole("button", { name: `Column actions for ${label}` }).click();
  await page.waitForTimeout(500);
  await page.getByText(action, { exact: true }).first().click();
  await page.waitForTimeout(600);
}

/** Drag a header's resize handle. Negative narrows, positive widens. */
async function resizeColumn(page: Page, label: string, delta: number) {
  const header = page.locator("table thead th").filter({
    has: page.getByRole("button", { name: `Column actions for ${label}` }),
  });
  const handle = header.locator('[aria-label="Resize column"]');
  const box = await handle.boundingBox();
  if (!box) throw new Error(`No resize handle on the ${label} column`);
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + delta, y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

/** Open the L1 scenario fly-in. It is URL state, not a click target. */
async function openScenarioPanel(page: Page, scenarioId: string) {
  const projectId = await firstProjectId();
  await page.goto(`/projects/${projectId}/scenarios?scn=${scenarioId}`);
  await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);
  await page.waitForTimeout(800);
}

test.beforeAll(async () => {
  await ensureScenarioContracts(await firstProjectId());
});

/** How many rows the 950px viewport actually shows — everything below is out of frame. */
const VISIBLE_ROWS = 10;

test("scenarios list", async ({ page }) => {
  await page.setViewportSize({ width: 1840, height: 950 });
  await gotoSurface(page, "scenarios", "table");
  await assertTableHasRows(page, VISIBLE_ROWS);
  await settle(page);

  // Sort by ID. The default order is by recency, so whichever scenarios a
  // session last touched float to the top — including the ten OWASP starter
  // scenarios someone may have adopted, which carry no contract. Ascending ID
  // puts SCN-000001…010 in frame and makes the shot reproducible.
  await columnAction(page, "ID", "Sort ascending");
  await settle(page);

  // Three columns come off. Sessions reads "None" on nine of ten rows (the
  // seed links its sessions to one scenario); Evaluators and Expected actions
  // repeat what Expected routes already demonstrates. Dropping them is what
  // stops the table overflowing — and horizontal overflow silently eats the ID
  // column off the left edge.
  for (const col of ["Evaluators", "Sessions", "Expected actions"]) {
    await columnAction(page, col, "Hide column");
  }

  // Default widths ellipsise most scenario names and clip the second persona
  // chip in half. Borrow width from ID (a 9-character handle) and User Goal
  // (a two-line clamp at any width).
  //
  // Personas gets exactly enough for two whole chips and no more: in the table
  // model a persona chip is hard-capped at max-width 150px and its label always
  // truncates, so "Frustrated re…" is the product's own rendering, not a
  // framing mistake — no column width fixes it. What IS worth fixing is a chip
  // sliced off mid-pill by the cell edge.
  await resizeColumn(page, "ID", -10);
  await resizeColumn(page, "User Goal", -110);
  await resizeColumn(page, "Scenario", 130);
  await resizeColumn(page, "Personas", 210);
  await resizeColumn(page, "Expected routes", 40);
  await settle(page);

  const rows = page.locator("table tbody tr");

  // The fixture is shared with other sessions. If a concurrent wholesale PUT
  // wiped the contract between setup and here, fail rather than ship a table
  // of "Not set". Checked over EVERY row, not just the ten in frame: the row
  // below the fold is still half-visible at the bottom edge.
  const all = (await rows.allInnerTexts()).join("\n");
  expect(all, "Expected routes are empty — re-run the fixture setup").not.toContain("Not set");
  expect(
    (await rows.allInnerTexts()).slice(0, VISIBLE_ROWS).join("\n"),
    "The ID sort did not take — SCN-000001 is not in frame"
  ).toContain("SCN-000001");

  const scrollLeft = await page.evaluate(() => {
    const el = document.querySelector("table")?.closest("[class*=overflow]") as HTMLElement | null;
    if (el) el.scrollLeft = 0;
    return el ? el.scrollLeft : 0;
  });
  if (scrollLeft !== 0) throw new Error("Table is still horizontally scrolled — the ID column would be cut off.");

  // CSS truncation is invisible to innerText, so measure it. Scenario names (3)
  // and route chips (6) must read in full; User Goal is a deliberate two-line
  // clamp and persona chips are capped by the component, so both are excluded.
  const truncated = await page.evaluate((limit) => {
    const clipped: string[] = [];
    const rowEls = Array.from(document.querySelectorAll("table tbody tr")).slice(0, limit);
    for (const row of rowEls) {
      for (const idx of [3, 6]) {
        const cell = row.querySelector(`td:nth-child(${idx})`);
        if (!cell) continue;
        for (const node of Array.from(cell.querySelectorAll<HTMLElement>("*"))) {
          if (node.children.length === 0 && node.scrollWidth > node.clientWidth + 1) {
            clipped.push((node.textContent ?? "").trim().slice(0, 40));
          }
        }
      }
    }
    return clipped;
  }, VISIBLE_ROWS);
  expect(truncated, "Scenario names / route chips are ellipsised — widen those columns").toEqual([]);

  // The Personas cell clips its chip row rather than wrapping it, so a second
  // chip gets sliced down the middle if the column is a few pixels short.
  const clippedChips = await page.evaluate((limit) =>
    Array.from(document.querySelectorAll("table tbody tr"))
      .slice(0, limit)
      .map((r) => r.querySelector("td:nth-child(5)") as HTMLElement | null)
      .filter((c): c is HTMLElement => !!c && c.scrollWidth > c.clientWidth + 1)
      .map((c) => c.innerText.replace(/\n/g, " ").slice(0, 40)),
  VISIBLE_ROWS);
  expect(clippedChips, "A persona chip is sliced by the cell edge — widen Personas").toEqual([]);

  await settle(page);
  await page.screenshot({ path: "../images/scenarios-list.png" });
});

test("scenario expected output editor", async ({ page }) => {
  // Tall on purpose: Expected behavior → Expected actions → Expected routes is
  // ~1200px of panel, and a 900px viewport shows one and a half sections.
  await page.setViewportSize({ width: 1440, height: 1560 });
  await openScenarioPanel(page, await scenarioIdFor(SCENARIO_HANDLE));

  const panel = page.locator('[role="dialog"]').last();
  await panel.getByRole("button", { name: "Expected Output", exact: true }).click();
  await page.waitForTimeout(1200);
  await settle(page);

  const text = await panel.innerText();
  for (const section of ["Expected behavior", "Expected actions", "Expected routes"]) {
    expect(text, `The ${section} section never rendered`).toContain(section);
  }
  expect(text, "Expected actions is empty — re-run the fixture setup").not.toContain("No expected actions yet");
  expect(text, "Expected routes is empty — re-run the fixture setup").not.toContain("No expected routes yet");

  // If anything real still scrolls, the viewport is not tall enough and the
  // shot would cut a section in half. (`sr-only` headings are collapsed to a
  // 1px box and always "overflow" — they are not a section.)
  const overflow = await panel.evaluate((el) => {
    const scroller = Array.from(el.querySelectorAll<HTMLElement>("*")).find(
      (n) =>
        n.clientHeight > 100 &&
        n.scrollHeight > n.clientHeight + 2 &&
        getComputedStyle(n).overflowY !== "visible"
    );
    return scroller ? scroller.scrollHeight - scroller.clientHeight : 0;
  });
  expect(overflow, "The Expected Output body still scrolls — raise the viewport height").toBeLessThanOrEqual(2);

  // …and the last control in the last section must be inside the frame.
  const panelBox = await panel.boundingBox();
  const lastControl = await panel.getByRole("button", { name: "Add route" }).boundingBox();
  if (!panelBox || !lastControl || lastControl.y + lastControl.height > panelBox.y + panelBox.height) {
    throw new Error("The Expected routes section is cut off at the bottom edge.");
  }

  await panel.screenshot({ path: "../images/scenario-expected-output-editor.png" });
});

test("scenario two-level fly-in", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 840 });

  // Sort the list underneath before opening the panel: the default recency
  // order floats whatever another session last touched to the top, and the
  // slice of table left of the panel is the reader's only clue about where the
  // fly-in opened from. The sort is view state that does NOT survive a
  // navigation, so this shot opens the panel by CLICKING rather than through
  // `?scn=`. Clicking a row is only possible on a cell that is not an inline
  // editor — Name, Goal, Personas and Evaluators all swallow the click. The ID
  // cell is read-only, so that is the one to aim at.
  await gotoSurface(page, "scenarios", "table");
  await assertTableHasRows(page, VISIBLE_ROWS);
  await settle(page);
  await columnAction(page, "ID", "Sort ascending");
  await settle(page);

  const row = page.locator("table tbody tr", { hasText: SCENARIO_HANDLE });
  await row.locator("td").nth(1).click();
  await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);
  await page.waitForTimeout(800);

  expect(
    (await page.locator("table tbody tr").allInnerTexts()).slice(0, 3).join("\n"),
    "The ID sort did not take — the list behind the panel is in recency order"
  ).toContain("SCN-000001");

  const l1 = page.locator('[role="dialog"]').last();
  await l1.getByRole("button", { name: /^Sessions/ }).click();
  await page.waitForTimeout(1200);
  await settle(page);

  // Stack L2 over L1 by opening one of the scenario's own sessions.
  await l1.getByText("RUN-000013", { exact: true }).click();
  await page.waitForTimeout(1800);
  await settle(page);

  const dialogs = await page.locator('[role="dialog"]').count();
  expect(dialogs, "The nested session panel never stacked over the scenario panel").toBeGreaterThan(1);

  // Both panels are the same 560px right-anchored sheet, so L2 covers L1
  // completely — the only visible evidence of the second level is the back
  // chip carrying the parent scenario. If that is missing the shot is just a
  // session fly-in and says nothing about drilling down.
  const l2 = page.locator('[role="dialog"]').last();
  expect(await l2.innerText(), "No back-to-scenario chip — the shot cannot show two levels").toContain(
    "Ask how long the refund"
  );

  await page.screenshot({ path: "../images/scenario-flyin-session.png" });
});
