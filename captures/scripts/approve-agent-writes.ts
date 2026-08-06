/**
 * Capture: the Trust Agent's three interrupt cards (how-to/approve-agent-writes).
 *
 * Outputs:
 *   ../images/approve-writes-preview.png         — permission card + the "View proposal" panel (diff, proposed end state)
 *   ../images/approve-writes-question-card.png   — single-question card with drafted choices + write-in
 *   ../images/approve-writes-question-flow.png   — multi-question flow card, mid-flow (progress row + Back live)
 *
 * These three cards are NOT static surfaces you can navigate to — they are
 * frontend tools (`request_permission`, `ask_question`, `ask_questions`) that
 * only paint when the model calls them. So each test drives a real Trust Agent
 * turn and waits for the card. Two consequences worth knowing before you rerun
 * this:
 *
 * 1. It is model-driven, therefore not byte-reproducible. The card CHASSIS is
 *    fixed, but the agent writes its own question text and choice labels, so a
 *    rerun produces different copy. Re-open the PNGs after every run.
 *
 * 2. The card is deliberately held back until the run leaves `running` and
 *    halts at the gate (see permission-tool.tsx) — measured 2.8-7.4s AFTER the
 *    agent has finished streaming. Waiting on the card's own testid rather than
 *    on the transcript text is what makes this reliable; a shot taken when the
 *    prose lands catches the composer, not the card.
 *
 * NOTHING here approves a write. Every card is screenshotted while pending and
 * then abandoned, so the fixture's evaluators are never actually mutated.
 */
import { test, expect, type Page } from "@playwright/test";
import { firstProjectId, settle } from "../lib/helpers";

/** Open a fresh Trust Agent chat on the project and send `prompt`. */
async function askTrustAgent(page: Page, prompt: string): Promise<void> {
  const id = await firstProjectId();
  const url = `/projects/${id}/agent`;
  await page.goto(url);
  try {
    await page
      .getByTestId("welcome-composer-textarea")
      .waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    throw new Error(
      `Navigated to ${url} but the Trust Agent composer never rendered.\n` +
        `The SPA fallback serves 200 for any path, so a wrong route looks identical\n` +
        `to a working one. Check apps/web/src/routes/projects/$projectId/agent.tsx.`
    );
  }
  await settle(page);
  const ta = page.getByTestId("welcome-composer-textarea");
  await ta.click();
  await ta.fill(prompt);
  await page.getByTestId("welcome-composer-send").click();
}

/** Wait for one of the three interrupt cards and prove which one we got. */
async function waitForCard(
  page: Page,
  testId: "permission-card-body" | "qacard-body" | "qaflow-body"
): Promise<void> {
  const card = page.getByTestId(testId).first();
  try {
    await card.waitFor({ state: "visible", timeout: 240_000 });
  } catch {
    throw new Error(
      `The agent finished its turn without raising a "${testId}" card.\n` +
        `That is a MODEL decision, not a broken selector: it answered in prose,\n` +
        `or it raised a different card. Re-run, or sharpen the prompt so the\n` +
        `clarification / write is unavoidable. Do not relax this into a\n` +
        `screenshot of the composer.`
    );
  }
  // The card animates into the composer slot; let it land before shooting.
  await page.waitForTimeout(1500);
  await settle(page);
}

test("permission card write preview", async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize({ width: 1280, height: 800 });

  await askTrustAgent(
    page,
    "Update the evaluator named 'Tone' — rename it to 'Tone and empathy' and change its description to 'Judges whether the reply stays warm and apologetic when a refund is delayed.'"
  );
  await waitForCard(page, "permission-card-body");

  // The card's own body carries only the summary line ("2 fields changed").
  // The field-level diff and the proposed end state live behind "View
  // proposal" — which is the half of the write preview the page is about, so
  // the shot has to open it.
  const viewProposal = page.getByTestId("permission-card-view-proposal");
  await expect(
    viewProposal,
    'No "View proposal" link on the card — the agent gated the write without a structured preview, so this shot would show a bare approval prompt rather than a write preview.'
  ).toHaveCount(1);
  await viewProposal.click();

  const panel = page.getByTestId("proposal-panel-body");
  await panel.waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);

  // Prove the panel holds a REAL before/after pair, not an empty shell.
  const diffRows = page.getByTestId("proposal-diff-row");
  await expect(
    diffRows,
    "The proposal panel rendered no diff rows — nothing for a reader to learn from."
  ).not.toHaveCount(0);
  const before = (await page.getByTestId("proposal-diff-before").first().innerText()).trim();
  const after = (await page.getByTestId("proposal-diff-after").first().innerText()).trim();
  expect(before.length, "Diff 'before' value is empty").toBeGreaterThan(0);
  expect(after.length, "Diff 'after' value is empty").toBeGreaterThan(0);
  expect(before, "Diff before and after are identical — that is not a change").not.toEqual(after);

  await page.screenshot({ path: "../images/approve-writes-preview.png" });
});

test("single question card", async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Prompt choice matters here. Four open-ended "help me add an evaluator"
  // phrasings were tried and every one of them raised the MULTI-question flow
  // card instead — the agent batches whenever more than one thing is unclear.
  // Naming a single question is what selects `ask_question` over
  // `ask_questions`.
  await askTrustAgent(
    page,
    "I want to add an evaluator that checks refund answers. Ask me the single most important question first, so you get the kind of evaluator right."
  );
  await waitForCard(page, "qacard-body");

  // Drafted choices AND the write-in row are the point of the shot; a card
  // showing one without the other does not illustrate the section.
  await expect(
    page.getByTestId("qacard-choice"),
    "The question card offered fewer than two drafted choices"
  ).not.toHaveCount(0);
  await expect(
    page.getByTestId("qacard-write-in"),
    'The card has no "Or type your own answer…" row — the section is about never being boxed in by the offered answers.'
  ).toHaveCount(1);

  await page.screenshot({ path: "../images/approve-writes-question-card.png" });
});

test("multi question flow card", async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize({ width: 1280, height: 800 });

  await askTrustAgent(
    page,
    "Add an evaluator for our refund answers. I'm not sure which kind fits best — check with me before you create anything."
  );
  await waitForCard(page, "qaflow-body");

  // Shooting step 1 would show the progress row with Back DISABLED — i.e. the
  // one affordance the section is about (going back to change an earlier
  // answer) greyed out. Answer question 1 and advance so the shot shows the
  // flow mid-stream: "Question 2 of N", Back live, nothing submitted yet.
  await page.getByTestId("qaflow-choice").first().click();
  await page.waitForTimeout(400);
  await page.getByTestId("qaflow-next").click();
  await page.waitForTimeout(900);
  await settle(page);

  const progress = (await page.getByTestId("qaflow-progress").innerText()).trim();
  expect(progress, "Progress row did not advance past the first question").not.toMatch(/\b1 of\b/);
  await expect(
    page.getByTestId("qaflow-back"),
    "Back is still disabled — the shot would not show that you can revise an earlier answer"
  ).toBeEnabled();

  await page.screenshot({ path: "../images/approve-writes-question-flow.png" });
});
