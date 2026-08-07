/**
 * Capture: the Evaluation Launcher in SESSIONS mode.
 *
 * Output:
 *   ../images/evaluate-sessions-launcher.png  — the "Evaluate sessions" modal
 *
 * Reached the way a reader reaches it: tick session checkboxes on the Sessions
 * table, then hit Evaluate in the bulk-actions bar. Opening the launcher from
 * the page-level header button instead would target the whole view and render
 * a different fan-out, which is not what the page's Step 2 describes.
 *
 * Three things have to be TRUE in the frame, so each is asserted before the
 * shot rather than hoped for:
 *
 *   1. The judge multi-select carries real judge chips — not the
 *      "Choose evaluators…" placeholder. The launcher pre-selects the first
 *      three LLM judges, so a placeholder here means the project's judge
 *      roster is empty and the shot would document an empty picker.
 *   2. The "This will run" fan-out reads sessions × evaluators → evaluator
 *      runs with real numerals.
 *   3. The dialog fits the viewport WITHOUT internal scroll. The modal is a
 *      scroll container; at the harness's default 800px height the fan-out
 *      panel — the whole point of the shot — sits below the fold and the
 *      screenshot silently loses it. Hence the tall viewport plus the
 *      scrollHeight check.
 *
 * The judge popover is deliberately left CLOSED. Open, it covers the trials
 * selector and the fan-out preview it sits above, so an "open multi-select"
 * shot cannot also be a "fan-out preview" shot. Closed, the trigger still
 * reads as a multi-select: chips for what's picked, chevron for more.
 */
import { expect, test } from "@playwright/test";
import { gotoSurface, assertTableHasRows, settle } from "../lib/helpers";

const SELECTED_SESSIONS = 5;

test("evaluation launcher in sessions mode", async ({ page }) => {
  // Tall enough that the modal never scrolls internally — see note 3 above.
  await page.setViewportSize({ width: 1440, height: 1060 });

  await gotoSurface(page, "sessions", "table");
  await assertTableHasRows(page, SELECTED_SESSIONS);
  await settle(page);

  // The modal is the subject, but the dimmed table behind it is still in the
  // frame. This fixture has no routing or tool-call data (the header stats read
  // "0 unique routes · 0 unique tools called"), so those two columns render a
  // wall of em-dashes AND push DATE off the right edge — a clipped column in
  // the background makes the whole shot look sloppy. Hide them, same move as
  // scripts/sessions-annotations.ts.
  for (const col of ["Routed To", "Tools Called"]) {
    const gear = page.getByRole("button", { name: `Column actions for ${col}` });
    if (await gear.count()) {
      await gear.click();
      await page.waitForTimeout(400);
      await page.getByText("Hide column", { exact: true }).first().click();
      await page.waitForTimeout(500);
    }
  }
  await settle(page);

  // Select the first N sessions, exactly as the page tells the reader to.
  const rowCheckboxes = page.getByRole("checkbox", { name: "Select row" });
  for (let i = 0; i < SELECTED_SESSIONS; i++) {
    await rowCheckboxes.nth(i).click();
    await page.waitForTimeout(120);
  }

  // The bulk-actions bar only mounts on a non-empty selection; if it never
  // arrives the clicks landed somewhere other than the checkboxes.
  const evaluate = page.getByRole("button", { name: "Evaluate", exact: true }).last();
  await evaluate.waitFor({ state: "visible", timeout: 10_000 });
  await evaluate.click();

  const dialog = page.getByRole("dialog").last();
  await dialog.getByText("Evaluate sessions", { exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await settle(page);
  // Radix animates the dialog in; shoot before it lands and the frame is a
  // scaled, half-transparent modal that reads as a rendering bug.
  await page.waitForTimeout(700);

  const body = await dialog.innerText();

  // 1. Real judges, not the empty-roster placeholder.
  expect(
    body,
    "The evaluator picker shows its placeholder — this project has no LLM Judge " +
      "evaluators, so the shot would document an empty picker. Create judges first.",
  ).not.toContain("Choose evaluators…");

  //    The launcher pre-fills up to THREE judges, which is what the page's
  //    Step 2 tells the reader to expect. Fewer chips than that means the
  //    project's judge roster is thinner than the prose, and the shot quietly
  //    contradicts the sentence it illustrates.
  const chipCount = await page
    .getByTestId("evaluation-launcher-evaluators")
    .locator("span.rounded-kind-pill")
    .count();
  expect(
    chipCount,
    "The judge multi-select carries fewer than three chips — add LLM Judge " +
      "evaluators to the project so the shot matches 'pre-filled with up to three'.",
  ).toBeGreaterThanOrEqual(3);

  // 2. The fan-out preview actually resolved to numbers.
  expect(body, "The 'This will run' fan-out preview is missing").toContain("This will run");
  expect(
    body,
    "The fan-out preview never resolved to a session count",
  ).toMatch(/\b\d+\s*\n?\s*sessions?\b/);
  expect(
    body,
    "The fan-out preview never resolved to an evaluator-run count",
  ).toMatch(/evaluator runs?/);

  // 3. The name field is pre-filled — an empty one would misrepresent Step 2.
  const nameValue = await dialog.getByRole("textbox").first().inputValue();
  expect(nameValue.trim().length, "The run-name field is empty").toBeGreaterThan(0);

  // 4. Nothing is clipped: the dialog must not be an internal scroll container,
  //    and must sit fully inside the viewport.
  //    Only elements that actually scroll count. A 1-2px delta on a clamped
  //    text node is rounding, not a hidden fan-out panel, so the check keys off
  //    a scrolling overflow style and a delta big enough to hide content.
  const overflow = await dialog.evaluate((el) => {
    const candidates = [el, ...Array.from(el.querySelectorAll("*"))] as HTMLElement[];
    for (const node of candidates) {
      const style = getComputedStyle(node);
      if (!["auto", "scroll"].includes(style.overflowY)) continue;
      const hidden = node.scrollHeight - node.clientHeight;
      if (hidden > 4) return { hidden, cls: node.className.toString().slice(0, 80) };
    }
    return null;
  });
  expect(
    overflow,
    `The launcher is scrolling internally — ${overflow?.hidden}px of it (the fan-out ` +
      `preview) is below the fold and would be cut out of the shot. Raise the viewport height.`,
  ).toBeNull();

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  if (!box) throw new Error("The launcher dialog has no layout box");
  expect(box.y, "The launcher is clipped at the top of the viewport").toBeGreaterThanOrEqual(0);
  expect(
    box.y + box.height,
    "The launcher is clipped at the bottom of the viewport",
  ).toBeLessThanOrEqual(viewport.height);

  await page.screenshot({ path: "../images/evaluate-sessions-launcher.png" });
});
