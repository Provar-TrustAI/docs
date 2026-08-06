/**
 * Capture: the Trust Agent skills surfaces.
 *
 * Outputs:
 *   ../images/skills-editor-panel.png       — the Skills editor: master list + detail form
 *   ../images/skills-transcript-receipt.png — the "Reviewed <name> · Core skill" receipt
 *
 * Two things this script has to arrange, both of which produce a green run and
 * a useless picture if skipped:
 *
 * 1. The editor opens with "+ New skill" selected, so the detail form is a
 *    column of grey PLACEHOLDER text ("e.g. triage-refunds", "One line shown in
 *    the slash menu"). A row must be selected before shooting.
 *
 * 2. The seed ships only built-in skills, so every row in the master list
 *    carries a "Built-in" chip and the chip distinguishes nothing. The fixture
 *    step below authors ONE workspace skill through the same API the editor
 *    writes to, which is what makes the chip legible.
 *
 * The editor button lives in the FULL shell header, which only mounts on a
 * conversation — the new-chat welcome screen has no Skills button. Both tests
 * therefore open a conversation first.
 */
import { expect, test } from "@playwright/test";
import { firstProjectId, gotoSurface, settle } from "../lib/helpers";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";

/** The one workspace (non-built-in) skill the master-list shot needs. */
const WORKSPACE_SKILL = {
  slug: "acme-refund-review",
  label: "/acme-refund-review",
  description:
    "Pull the week's refund-timing conversations and summarise what changed since the last review.",
  whenToUse:
    "The user asks for the weekly refund review, or for what shifted in refund-timing conversations over the last seven days.",
  instructions: `## Procedure

1. Read the sessions from the last 7 days tagged \`refund-policy\`.
2. Group them by outcome: refunded, declined, escalated to a human.
3. Compare each group's share against the previous week and call out any
   movement larger than 5 points.
4. Quote two conversations per group — one typical, one that went badly.
5. Close with the single change most likely to move CSAT next week.

## Do not

- Do not include conversations outside the seven-day window.
- Do not report a movement without the prior week's number beside it.
`,
};

/** Idempotent: PUT is an upsert on the editor's own save route. */
async function ensureWorkspaceSkill(): Promise<void> {
  const { slug, ...body } = WORKSPACE_SKILL;
  const res = await fetch(`${API}/paddington/agui/skills/${slug}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Could not author the workspace skill (HTTP ${res.status}). Without it every ` +
        `row in the editor is a built-in and the "Built-in" chip shows no contrast.`
    );
  }
}

/** Open the most recent conversation so the full shell header mounts. */
async function openAConversation(page: import("@playwright/test").Page) {
  await gotoSurface(page, "agent", "[data-testid=sidebar-recent-chats-item]");
  await settle(page);
  await page.locator("[data-testid=sidebar-recent-chats-item]").first().click();
  await page
    .locator("[data-testid=trust-agent-v2-skills-launcher]")
    .waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);
}

test("skills editor master list and detail form", async ({ page }) => {
  await ensureWorkspaceSkill();
  await page.setViewportSize({ width: 1280, height: 800 });
  await openAConversation(page);

  await page.locator("[data-testid=trust-agent-v2-skills-launcher]").click();
  const dialog = page.locator("[data-testid=trust-agent-v2-skills-editor]");
  await dialog.waitFor({ state: "visible", timeout: 15_000 });
  await settle(page);

  // The list must hold real rows AND at least one built-in, or the chip the
  // shot exists to show is not on screen.
  const rows = page.locator("[data-testid^=trust-agent-v2-skills-row-]");
  await expect.poll(async () => rows.count(), { timeout: 20_000 }).toBeGreaterThan(5);
  expect(
    await page.locator("[data-testid^=trust-agent-v2-skills-badge-]").count(),
    "no Built-in chips rendered"
  ).toBeGreaterThan(3);

  // Select the workspace skill — it sorts first, so the list stays scrolled to
  // the top and "+ New skill" plus a run of Built-in rows stay in frame.
  await page
    .locator(`[data-testid=trust-agent-v2-skills-row-${WORKSPACE_SKILL.slug}]`)
    .click();

  // The recipe body is fetched per-slug AFTER selection. Shooting before it
  // lands captures an empty Instructions box under a "Loading the current
  // recipe…" note.
  await page
    .locator("[data-testid=trust-agent-v2-skills-body-note]")
    .waitFor({ state: "detached", timeout: 20_000 })
    .catch(() => {
      /* already loaded */
    });
  await expect
    .poll(async () => (await page.locator("#skill-instructions").inputValue()).length, {
      message: "Instructions never pre-filled — the detail fetch has not landed",
      timeout: 20_000,
    })
    .toBeGreaterThan(80);
  await settle(page);

  // Every field must hold real text; a placeholder reads as an empty product.
  for (const id of ["#skill-slug", "#skill-description", "#skill-when"]) {
    expect(
      (await page.locator(id).inputValue()).trim().length,
      `${id} is empty — the shot would show placeholder text`
    ).toBeGreaterThan(3);
  }
  // "+ New skill" must still be in frame at the top of the list.
  expect(
    await page.locator("[data-testid=trust-agent-v2-skills-list]").evaluate((e) => e.scrollTop),
    "the master list is scrolled — + New skill would be cut off the top"
  ).toBe(0);

  // Shoot the dialog itself. A margin round it just frames fragments of the
  // dimmed conversation behind ("Reviewed the projec…", a clipped rail label),
  // which reads as debris rather than as context.
  await dialog.screenshot({ path: "../images/skills-editor-panel.png" });
});

test("transcript skill receipt", async ({ page }) => {
  test.setTimeout(600_000);
  // Taller than the default so the whole opening exchange — question, the
  // agent naming the skill, and the expanded receipt — fits in one frame
  // without a mid-card crop.
  await page.setViewportSize({ width: 1280, height: 1100 });

  await gotoSurface(page, "agent", "[data-testid=welcome-composer-textarea]");
  await settle(page);

  // A question a real user would ask. The agent picks /analyze-patterns on its
  // own from the description — which is the behaviour the page is describing,
  // so the transcript is genuine rather than a slash command staged for the
  // camera.
  await page.locator("[data-testid=welcome-composer-textarea]").click();
  await page.keyboard.type(
    "What kinds of conversations is our refunds assistant actually handling?"
  );
  await page.waitForTimeout(300);
  await page.locator("[data-testid=welcome-composer-send]").click();

  const receipt = page.locator("[data-testid=skill-receipt]");
  await receipt.first().waitFor({ state: "visible", timeout: 240_000 });

  // Let the turn FINISH. Screenshotting mid-stream leaves a half-written
  // sentence and a blinking caret in the frame, and tearing the page down
  // mid-stream also persists the transcript truncated.
  //
  // `RunState` is running | awaiting | done | idle. Only `running` means the
  // agent is still writing: `awaiting` is a settled turn that ended on a
  // question to the user, and both `done` and `idle` are finished. Waiting
  // specifically for `idle` hangs on every run that ends any other way.
  const taskId = new URL(page.url()).searchParams.get("task");
  if (!taskId) throw new Error("No ?task= on the agent URL — the run never started.");
  const deadline = Date.now() + 300_000;
  for (;;) {
    const res = await fetch(`${API}/paddington/tasks/${taskId}`);
    const { run_state: state } = (await res.json()) as { run_state?: string };
    if (state !== "running") break;
    if (Date.now() > deadline) {
      throw new Error(`The agent turn never settled (run_state stuck at ${state}).`);
    }
    await page.waitForTimeout(3000);
  }
  await settle(page);

  // Expand the receipt so the skill's one-line purpose is on show — that is
  // the whole point of the affordance.
  const toggle = receipt.first().locator("[data-testid=skill-receipt-toggle]");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page
    .locator("[data-testid=skill-receipt-purpose]")
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });

  // The thread auto-scrolls to the newest turn; the receipt is near the top of
  // the conversation, so wind back before shooting.
  await page
    .locator("[data-testid=trust-agent-v2-thread-viewport]")
    .evaluate((el) => el.scrollTo({ top: 0 }));
  await page.waitForTimeout(800);
  await settle(page);

  // End the frame on the receipt card's own bottom border. Running the clip to
  // the end of the enclosing tool group instead pulls in the session-reference
  // table that follows — half the frame, none of it about skills — and lands
  // the bottom edge a few pixels INTO the next paragraph, slicing a line of
  // prose in half.
  const viewport = (await page
    .locator("[data-testid=trust-agent-v2-thread-viewport]")
    .boundingBox())!;
  const fold = viewport.y + viewport.height;
  // No trailing pad: inside a tool group the next card butts straight up
  // against the receipt with no gap, so even four spare pixels show a sliver of
  // it. Ending exactly on the receipt's own bottom border is the clean cut.
  const receiptBox = (await receipt.first().boundingBox())!;
  const bottom = receiptBox.y + receiptBox.height;
  if (bottom > fold) {
    throw new Error(
      "The skill receipt runs past the fold — the shot would cut it in half. " +
        "Raise the viewport height."
    );
  }
  await page.screenshot({
    path: "../images/skills-transcript-receipt.png",
    clip: {
      x: viewport.x + 4,
      y: viewport.y + 4,
      width: viewport.width - 8,
      height: bottom - (viewport.y + 4),
    },
  });
});
