/**
 * Capture: Evaluator create flow
 * Opens the evaluator creation form and screenshots the kind selector
 * (LLM Judge / Structured Match) and score type picker.
 * Output: ../images/evaluators-create-flow.png
 */
import { test } from "@playwright/test";

test("capture evaluators create flow", async ({ page }) => {
  await page.goto("/evaluators");

  // Click the "Create" button to open the create form/modal.
  const createBtn = page.locator(
    'button:has-text("Create"), [data-testid="create-evaluator"]'
  );
  await createBtn.first().waitFor({ state: "visible" });
  await createBtn.first().click();

  // Wait for the create form to render — look for the kind selector.
  const form = page.locator(
    '[data-testid="evaluator-form"], [role="dialog"], form'
  );
  await form.first().waitFor({ state: "visible" });

  await page.screenshot({
    path: "../images/evaluators-create-flow.png",
    fullPage: false,
  });
});
