/**
 * Capture: the Trust Agent surfaces used by how-to/work-with-the-trust-agent.mdx.
 *
 * Outputs:
 *   ../images/howto-agent-welcome-pills.png    — Welcome, a starter pill open over its prompts panel
 *   ../images/howto-agent-full-page-shell.png  — the full-page shell (left nav + Recent chats + transcript + composer)
 *   ../images/howto-agent-tool-call-table.png  — a tool-call card whose result is a clickable object table
 *   ../images/howto-agent-side-rail.png        — the side rail's Progress / Context / Outputs / Attachments stack
 *
 * Filenames carry a `howto-` prefix because concepts/trust-agent captures the
 * SAME surface in a parallel pass — neither page may overwrite the other's images.
 *
 * ## Three things this script has to work around
 *
 * 1. `run_state` is not "the reply finished". It flickers back to `idle` between
 *    tool calls, so a single poll catches the gap and screenshots a half-built
 *    transcript with a "Working" pill still in the header. `waitSettled` requires
 *    the non-running state to HOLD, and cross-checks the streaming caret in the DOM.
 *
 * 2. The agent legitimately interrupts, and every interruption REPLACES the
 *    composer. An open-ended turn comes back as a stepped clarifying-question
 *    card; a write comes back as a permission card; a finished plan comes back as
 *    a "Plan ready · N steps" confirm bar. In all three the run reads `idle` and
 *    the composer textarea simply does not exist, so a script that just types
 *    into it waits out its timeout on a locator that will never resolve.
 *    `answerAnyCard` clears whichever one is up.
 *
 * 3. The side rail's Progress section is destructive: `create_plan` clears the
 *    folded Context / Outputs rows (services/api .../agui/rail.py). The plan has
 *    to land BEFORE the reads and the writes, or the rail can only ever show
 *    Progress alone.
 */
import { test, expect, type Page } from "@playwright/test";
import { firstProjectId, settle } from "../lib/helpers";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";

/** Open the agent route's Welcome page (no `?task=`) and prove it rendered. */
async function gotoWelcome(page: Page): Promise<string> {
  const projectId = await firstProjectId();
  await page.goto(`/projects/${projectId}/agent`);
  await page
    .locator('[data-testid="welcome-pills"]')
    .waitFor({ state: "visible", timeout: 30_000 });
  await settle(page);
  return projectId;
}

/**
 * Wait until the turn has genuinely stopped, not merely paused between tools.
 * Returns the settled run state (`idle` / `awaiting` / `done`).
 */
async function waitSettled(page: Page, taskId: string): Promise<string> {
  const deadline = Date.now() + 240_000;
  let stable = 0;
  let state = "running";
  while (Date.now() < deadline) {
    state = (await (await fetch(`${API}/paddington/tasks/${taskId}`)).json()).run_state;
    const streaming = await page
      .locator('[data-testid="trust-agent-streaming-caret"]')
      .count();
    stable = state !== "running" && streaming === 0 ? stable + 1 : 0;
    if (stable >= 4) return state;
    await page.waitForTimeout(2500);
  }
  throw new Error(`Task ${taskId} never settled — last run_state was "${state}".`);
}

/**
 * Answer whatever the agent put in the composer slot, if anything.
 * Returns true when a card was dealt with (so the caller should wait again).
 */
async function answerAnyCard(page: Page): Promise<boolean> {
  // A finished plan parks a "Plan ready · N steps" confirm bar over the composer.
  // It is not a hitl card and it is easy to miss: the run reads `idle`, nothing
  // is waiting on the server, and the composer simply is not there.
  const planConfirm = page.locator('[data-testid="trust-agent-v2-plan-confirm-approve"]');
  if (await planConfirm.count()) {
    await planConfirm.first().click();
    await page.waitForTimeout(2500);
    return true;
  }

  // Scope to the page, NOT to `trust-agent-v2-hitl-slot`. That slot element is
  // present even when the card renders as a sibling inside the composer, so
  // querying inside it finds nothing and the driver concludes — wrongly — that
  // nothing is blocking.
  const slot = page;

  // A write proposal: take the one-time grant, never the chat-wide one — a
  // standing grant would silently un-gate the next write and the transcript
  // would stop showing the card this page is about.
  const cta = slot.locator('[data-testid="permission-card-cta"]');
  if (await cta.count()) {
    const once = slot.locator('[data-testid="permission-card-scope-once"]');
    if (await once.count()) {
      await once.first().click();
      await page.waitForTimeout(400);
    }
    await cta.first().click();
    await page.waitForTimeout(2500);
    return true;
  }

  // A clarifying question: pick the first drafted choice and advance. The one
  // control carries both "Next →" and "Submit" depending on the step, so this
  // walks a multi-question flow one call at a time.
  const choice = slot.locator('[data-testid="qaflow-choice"]');
  if (await choice.count()) {
    await choice.first().click();
    await page.waitForTimeout(400);
    const next = slot.locator('[data-testid="qaflow-next"]');
    if (await next.count()) {
      await next.first().click();
      await page.waitForTimeout(1500);
      return true;
    }
  }
  return false;
}

/** Send a prompt from the full-shell composer. */
async function sendFollowUp(page: Page, text: string): Promise<void> {
  const box = page.locator('[data-testid="trust-agent-v2-composer-input-textarea"]');
  // Anything occupying the composer slot has to be cleared first, or this waits
  // 30s for a textarea that is not rendered and reports a timeout that says
  // nothing about the card actually blocking it.
  for (let i = 0; i < 3 && !(await box.count()); i++) {
    if (!(await answerAnyCard(page))) break;
  }
  await box.waitFor({ state: "visible", timeout: 30_000 });
  await box.fill(text);
  await box.press("Enter");
  await page.waitForTimeout(1500);
}

/**
 * Pick Ask / Plan / Act on the composer's mode toggle.
 *
 * Returns false when the toggle is not on screen — it lives inside the composer,
 * so a card in the composer slot takes it away with everything else. Clicking it
 * blind is a 15-minute timeout on a locator that will never resolve.
 */
async function setMode(page: Page, mode: "Ask" | "Plan" | "Act"): Promise<boolean> {
  const toggle = page.locator('[data-testid="trust-agent-v2-mode-toggle"]');
  if (!(await toggle.count())) return false;
  await toggle.click();
  await page.waitForTimeout(500);
  // Anchor the match at the start of the item's text. A plain `hasText: "Act"`
  // matches the ASK row, whose description ends "...before each action" — the
  // toggle then silently stays on Ask and the turn runs in the wrong mode.
  await page
    .locator('[data-testid="trust-agent-v2-mode-toggle-item"]')
    .filter({ hasText: new RegExp(`^${mode}\\b`) })
    .first()
    .click();
  await page.waitForTimeout(500);
  // The toggle chip shows the live selection. If the pick did not land the turn
  // runs in the wrong mode and the rail comes back missing a section, which is
  // a much harder failure to read than this one.
  await expect(page.locator('[data-testid="trust-agent-v2-mode-toggle"]')).toContainText(mode);
  return true;
}

/** Start a chat from Welcome and run it to a stop, answering cards on the way. */
async function startChat(page: Page, prompt: string): Promise<{ projectId: string; taskId: string }> {
  const projectId = await gotoWelcome(page);
  const hero = page.locator('[data-testid="welcome-composer"] textarea').first();
  await hero.fill(prompt);
  await hero.press("Enter");
  await page.waitForURL(/[?&]task=/, { timeout: 30_000 });
  const taskId = new URL(page.url()).searchParams.get("task");
  if (!taskId) throw new Error(`No ?task= in ${page.url()} — the chat never opened.`);

  for (let i = 0; i < 6; i++) {
    await waitSettled(page, taskId);
    if (!(await answerAnyCard(page))) break;
  }
  return { projectId, taskId };
}

/** Nowhere near anything clickable — parks the cursor so no row paints a hover. */
async function parkCursor(page: Page): Promise<void> {
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
}

/**
 * Reopen a finished chat before shooting it.
 *
 * A live chat keeps a "Working" pill and a blinking caret in the DOM for a beat
 * after the reply lands; the reopened chat renders the settled, persisted
 * history — which is also what a reader sees when they come back to it.
 */
async function reopen(page: Page, projectId: string, taskId: string): Promise<void> {
  await page.goto(`/projects/${projectId}/agent?task=${taskId}`);
  await page
    .locator('[data-testid="trust-agent-v2-full-shell"]')
    .waitFor({ state: "visible", timeout: 30_000 });
  await settle(page);
  await page.waitForTimeout(2500);
  await expect(
    page.locator('[data-testid="trust-agent-streaming-caret"]'),
    "the reopened chat is still streaming — the shot would catch a half-written reply",
  ).toHaveCount(0);
}

test("welcome starter-prompt pills", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 860 });
  await gotoWelcome(page);

  // The two-click gesture is the point of this shot: clicking a pill does NOT
  // fill the composer, it opens an inline panel of three ready-made prompts.
  // A resting shot would show four chips and prove nothing.
  const pills = page.locator('[data-testid="welcome-pills"] button');
  await expect(pills).toHaveCount(4);
  await pills.nth(1).click();
  await page
    .locator('[data-testid="welcome-prompts"]')
    .waitFor({ state: "visible", timeout: 10_000 });
  await expect(page.locator('[data-testid="welcome-prompt"]')).toHaveCount(3);
  await settle(page);
  await parkCursor(page);

  await page.screenshot({ path: "../images/howto-agent-welcome-pills.png" });
});

test("full-page shell and the tool-call object table", async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Sessions, not Scenarios: every Session carries a reader-visible SES- / RUN-
  // id, whereas the Scenarios list currently holds unnamed rows whose id column
  // falls back to truncated goal prose — a screenshot of exactly the raw-ish
  // output the object table exists to avoid.
  //
  // `SHELL_TASK` reopens a chat this script already ran instead of driving a
  // fresh one, so re-framing a shot costs a page load rather than a model turn.
  const { projectId, taskId } = process.env.SHELL_TASK
    ? { projectId: await firstProjectId(), taskId: process.env.SHELL_TASK }
    : await startChat(page, "Review this project's sessions and tell me what they cover.");
  await reopen(page, projectId, taskId);

  // The card must have folded REAL records — a prose-only receipt would make
  // both of these shots pointless. Note the `:has()` filter: the FIRST tcc-root
  // in this transcript is the prose-only "Reviewed the project" receipt, and
  // shooting `.first()` blind gets you a picture of one empty grey bar.
  const card = page.locator('[data-testid="tcc-root"]:has([data-testid="tcc-multi"])').first();
  await card.waitFor({ state: "visible", timeout: 30_000 });
  await expect(
    page.locator('[data-testid="tcc-multi-row"]').first(),
    "the tool call returned no object rows — nothing to illustrate",
  ).toBeVisible();

  // Anchor the transcript at the user's message so the shell shot reads as a
  // conversation rather than a mid-scroll fragment.
  await page
    .locator('[data-testid="trust-agent-v2-thread-viewport"]')
    .evaluate((el) => {
      el.scrollTop = 0;
    });
  await page.waitForTimeout(600);
  await parkCursor(page);
  await page.screenshot({ path: "../images/howto-agent-full-page-shell.png" });

  // Leave the table windowed at five rows. Expanding it fills the shot with
  // near-identical persona-sweep runs and buries the "Show more" control, which
  // is the part of this surface a reader needs to recognise.
  await parkCursor(page);

  // Shoot the prose receipt AND the table together: the pair is what the step
  // describes — a plain-language verb-and-object summary, and the same summary
  // turned into a disclosure header over real rows. The clip stops on the card's
  // own bottom edge; a couple of pixels more and the truncation notice below it
  // bleeds in as a half-line of clipped italics.
  const plain = page.locator('[data-testid="tcc-root"]').first();
  const top = (await plain.boundingBox())!;
  const bottom = (await card.boundingBox())!;
  const clipY = top.y - 12;
  await page.screenshot({
    path: "../images/howto-agent-tool-call-table.png",
    clip: {
      x: top.x - 12,
      y: clipY,
      width: Math.max(top.width, bottom.width) + 24,
      height: bottom.y + bottom.height + 2 - clipY,
    },
  });
});

test("side rail", async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize({ width: 1440, height: 1100 });

  // Turn one has to be the one that produces the plan, and it has to be a broad,
  // obviously multi-step goal: `create_plan` fires when the agent decides a task
  // needs steps, and no mode forces it — a Plan-mode turn asking for "a plan"
  // still comes back as prose. Getting the plan FIRST is not stylistic either:
  // `create_plan` clears the folded Context / Outputs rows, so a plan written
  // after the work erases the rows it is supposed to sit above.
  const started = process.env.RAIL_TASK
    ? { projectId: await firstProjectId(), taskId: process.env.RAIL_TASK }
    : await startChat(
        page,
        "Our support agent handles refunds and I need to trust it before Friday. " +
          "Give me a step-by-step plan for getting there, then start working through it.",
      );
  const { projectId, taskId } = started;
  if (process.env.RAIL_TASK) await reopen(page, projectId, taskId);

  // Now drive the chat until a write has folded into Outputs. Which of the three
  // things is blocking on any given pass is not predictable — a clarifying
  // question, a plan-confirm bar, a permission card, or simply a finished turn
  // that stopped short — so this loop reads the state each time rather than
  // assuming a fixed sequence. Nudges go out in Act mode so the agent chains the
  // read and the write together instead of pausing between them.
  let outputs = 0;
  for (let i = 0; i < 14; i++) {
    await waitSettled(page, taskId);
    const state = await (await fetch(`${API}/paddington/tasks/${taskId}`)).json();
    outputs = (state.rail?.outputs ?? []).length;
    if (outputs > 0) break;
    if (await answerAnyCard(page)) continue;

    // Nudging is best-effort. If the composer never comes back, something is
    // sitting in its slot that this driver does not know how to answer — say so
    // and shoot the rail as it stands rather than failing the whole capture and
    // leaving the page with no image at all.
    try {
      await setMode(page, "Act");
      await sendFollowUp(
        page,
        i === 0
          ? "Do the first two steps now. Review this project's sessions, then create an " +
              "evaluator called 'Refund timeline consistency' that fails a reply whose " +
              "quoted refund window contradicts the window the other sessions use. " +
              "Pick the rubric wording yourself — don't check back with me first."
          : "Yes — create the 'Refund timeline consistency' evaluator now, with your own wording.",
      );
    } catch {
      console.warn("WARNING: the composer never came back — stopping the drive here.");
      break;
    }
  }
  if (outputs === 0) {
    console.warn("WARNING: no write folded into Outputs — the rail will be missing that section.");
  }

  // Attachments are the fourth rail section and the seed has none, so the chat
  // gets the policy doc a reviewer would actually be working from. Uploaded
  // through the task's own files endpoint — the same endpoint the composer's
  // attach chip posts to.
  const filesUrl = `${API}/paddington/projects/${projectId}/tasks/${taskId}/files`;
  const existing = await (await fetch(filesUrl)).json();
  if ((existing.items ?? []).length === 0) {
    const body = new FormData();
    body.append(
      "file",
      new Blob([ATTACHMENT_MD], { type: "text/markdown" }),
      "acme-refund-policy-v4.md",
    );
    const upload = await fetch(filesUrl, { method: "POST", body });
    if (!upload.ok) {
      throw new Error(
        `Attachment upload failed (HTTP ${upload.status}) — the rail's Attachments section would be missing.`,
      );
    }
  }

  await reopen(page, projectId, taskId);
  const rail = page.locator('[data-testid="trust-agent-v2-side-rail"]');
  await rail.waitFor({ state: "visible", timeout: 30_000 });
  const railText = await rail.innerText();
  for (const section of ["Progress", "Context", "Outputs", "Attachments"]) {
    if (!railText.includes(section)) {
      console.warn(`WARNING: rail is missing its ${section} section:\n${railText}`);
    }
  }
  await parkCursor(page);

  // The rail element is a full-height scroll column, so `rail.screenshot()`
  // returns the sections followed by ~1,000px of empty gutter. Clip to where the
  // last section actually ends instead.
  const box = (await rail.boundingBox())!;
  const contentBottom = await rail.evaluate((el) => {
    let bottom = 0;
    el.querySelectorAll('[data-testid="side-rail-section"]').forEach((node) => {
      bottom = Math.max(bottom, node.getBoundingClientRect().bottom);
    });
    return bottom;
  });
  await page.screenshot({
    path: "../images/howto-agent-side-rail.png",
    clip: {
      x: box.x,
      y: box.y,
      width: box.width,
      height: Math.max(contentBottom - box.y + 12, 120),
    },
  });
});

/** The document the rail chat attaches — a plausible policy a reviewer would hand the agent. */
const ATTACHMENT_MD = `# Acme refunds — support policy v4

## Refund window

Refunds are issued for orders returned within 30 days of delivery. An order
outside that window is escalated to a supervisor rather than refused outright.

## The timeline the agent may quote

Once a return is scanned at the warehouse, the credit clears in 5 to 7 business
days. The agent must not quote any other figure. "7-10 business days" is a
legacy figure from v2 of this policy and is no longer correct.

## Tone

Acknowledge the delay before quoting policy. A customer who has already waited
more than two weeks is offered a goodwill credit.
`;
