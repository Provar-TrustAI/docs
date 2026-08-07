/**
 * Capture: the Trust Agent surface (/projects/:id/agent).
 *
 * Outputs:
 *   ../images/trust-agent-transcript.png       — a finished turn: prose + tool-call card
 *   ../images/trust-agent-object-table.png     — the object table with a record fly-in open
 *   ../images/trust-agent-composer.png         — the composer chassis with the / palette open
 *   ../images/trust-agent-permission-card.png  — a write gate in the composer slot
 *   ../images/trust-agent-side-rail.png        — Progress / Context / Outputs / Attachments
 *
 * Unlike every other script in this directory, this one cannot screenshot a
 * static surface: the transcript, the tool-call cards, the side rail and the
 * permission card only exist because a real conversation produced them. So each
 * test DRIVES the agent — sends a prompt, waits for the turn to land, and shoots
 * the result. That makes these the slowest captures in the harness (a turn is
 * upstream model time, 20-120s) and the only ones whose content is not
 * byte-identical between runs.
 *
 * Two consequences worth knowing before you re-run it:
 *
 *   - Never reuse an existing chat from the Recent chats rail. The list is
 *     capped at five and other sessions push entries off it, so "click the chat
 *     I made" silently clicks somebody else's. Each test starts its own chat and
 *     keeps the `?task=` id from the URL.
 *
 *   - `settle()` is not sufficient here. A network-idle agent surface is often
 *     one that has not started streaming yet. `waitForTurn()` below waits for
 *     the typing indicator to appear AND go away, which is the only reliable
 *     "the turn is done" signal on this surface.
 */
import { test, expect, type Page } from "@playwright/test";
import { firstProjectId, settle } from "../lib/helpers";
import fs from "node:fs";
import path from "node:path";

const VIEWPORT = { width: 1440, height: 900 };

/** Open a brand-new chat and send the first turn. Returns the task id. */
async function startChat(page: Page, prompt: string): Promise<string> {
  const id = await firstProjectId();
  await page.goto(`/projects/${id}/agent`);
  await page
    .getByTestId("welcome-composer-textarea")
    .waitFor({ state: "visible", timeout: 30_000 });
  await settle(page);
  await page.getByTestId("welcome-composer-textarea").fill(prompt);
  await page.getByTestId("welcome-composer-send").click();
  await page.getByTestId("trust-agent-v2-composer").waitFor({ timeout: 60_000 });
  await page.waitForURL(/[?&]task=/, { timeout: 60_000 });
  return new URL(page.url()).searchParams.get("task")!;
}

/** Send a follow-up turn in the already-open full view. */
async function sendTurn(page: Page, prompt: string): Promise<void> {
  const box = page.getByTestId("trust-agent-v2-composer-input-textarea");
  await box.click();
  await box.fill(prompt);
  await page.getByTestId("trust-agent-v2-composer-input-send").click();
}

/**
 * Wait for the agent to finish the current turn.
 *
 * The wait that matters is the SECOND one: the typing indicator disappearing.
 * Screenshotting on "the request went out" reliably catches an empty transcript,
 * because the first token can be 20s of upstream model time away.
 *
 * `stopOn` lets a write turn end early: a permission card halts the run at the
 * tool call, and the typing indicator goes away while the card is what we want
 * to shoot.
 */
async function waitForTurn(
  page: Page,
  opts: { timeout?: number; stopOn?: () => Promise<boolean> } = {}
): Promise<void> {
  const timeout = opts.timeout ?? 240_000;
  const started = Date.now();
  const typing = page.getByTestId("trust-agent-typing");

  while (Date.now() - started < timeout) {
    await page.waitForTimeout(2_000);
    if (opts.stopOn && (await opts.stopOn())) return;
    // Idle == no typing dots, no streaming caret, and the send button live again.
    const busy =
      (await typing.count()) > 0 ||
      (await page.getByTestId("trust-agent-streaming-caret").count()) > 0;
    if (!busy && Date.now() - started > 8_000) {
      // Hold briefly and re-check: the gap between two tool calls in one turn
      // reads as idle for a beat.
      await page.waitForTimeout(6_000);
      if (opts.stopOn && (await opts.stopOn())) return;
      const stillBusy =
        (await typing.count()) > 0 ||
        (await page.getByTestId("trust-agent-streaming-caret").count()) > 0;
      if (!stillBusy) return;
    }
  }
  throw new Error(
    `The agent never finished its turn in ${timeout}ms. This is upstream model time, ` +
      `not a selector problem — re-run, or check the model gateway is reachable.`
  );
}

/**
 * Screenshot a union of elements with a little breathing room.
 *
 * Popovers (the / palette, the mode menu) render in a portal ABOVE the control
 * that opened them, so an `element.screenshot()` of the composer crops the
 * palette off entirely and the shot looks like the feature is missing.
 */
async function shootRegion(
  page: Page,
  file: string,
  locators: ReturnType<Page["locator"]>[],
  pad = 16,
  padTop = pad
): Promise<void> {
  const boxes = [];
  for (const l of locators) {
    const b = await l.first().boundingBox();
    if (b) boxes.push(b);
  }
  if (boxes.length === 0) throw new Error(`Nothing to shoot for ${file}`);
  const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad);
  const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - padTop);
  const right = Math.min(VIEWPORT.width, Math.max(...boxes.map((b) => b.x + b.width)) + pad);
  const bottom = Math.min(VIEWPORT.height, Math.max(...boxes.map((b) => b.y + b.height)) + pad);
  await page.screenshot({ path: file, clip: { x, y, width: right - x, height: bottom - y } });
}

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";

/**
 * Delete any leftover evaluator by this name before driving the write.
 *
 * Without this the capture works exactly once. On the second run the agent finds
 * the evaluator its previous run created, and instead of a write gate you get a
 * question card ("There's already a 'Refund policy window' evaluator with that
 * exact rubric. How do you want to proceed?") — which is correct behaviour and a
 * useless screenshot.
 */
async function dropEvaluator(projectId: string, name: string): Promise<void> {
  const res = await fetch(`${API}/v1/evaluators?project_id=${projectId}`);
  if (!res.ok) return;
  const body = await res.json();
  const items = Array.isArray(body) ? body : (body.items ?? []);
  for (const e of items) {
    if (e.name === name) {
      await fetch(`${API}/v1/evaluators/${e.id}`, { method: "DELETE" }).catch(() => {});
    }
  }
}

/** Put the transcript back at the top of the turn and prove the card is whole. */
async function frameTurn(page: Page): Promise<void> {
  // The transcript auto-scrolls as the reply streams. Put it back at the top so
  // the shot reads as a whole turn — the prompt, the reply, and the card — rather
  // than a mid-conversation slice with a headerless list in it.
  await page.getByTestId("trust-agent-v2-thread-viewport").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(800);
  await expect(
    page.getByTestId("tcc-multi-head").first(),
    "The tool-call card's header is off-screen — the card would read as a bare list"
  ).toBeInViewport();
}

test("trust agent transcript", async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize(VIEWPORT);

  // Keep the ask narrow, and ask about a set whose members read differently from
  // one another. A broad analytical question produces a long answer that scrolls
  // the card's header off the top; a question about the simulated runs produces
  // five rows of near-identical text that teaches the reader nothing.
  await startChat(page, "What evaluators does this project have, and what does each one check?");
  await waitForTurn(page);
  await settle(page);

  // A turn with no tool-call card is a turn that answered from memory — the shot
  // would illustrate none of what this page claims. Fail rather than ship it.
  await expect(
    page.getByTestId("tcc-root").first(),
    "The turn produced no tool-call card, so the transcript shot would show prose only"
  ).toBeVisible();
  await frameTurn(page);
  await page.screenshot({ path: "../images/trust-agent-transcript.png" });
});

test("trust agent object table and composer", async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize(VIEWPORT);

  // The prompt has to be specific enough to skip the clarify-first gate. "Pull up
  // this project's sessions so I can open one" is open-ended, and the agent
  // answered it with a question card ("Which session do you want to open?") that
  // took the composer's slot — so the composer half of this test had nothing to
  // shoot and the table shot showed an interrupt instead of a reply.
  await startChat(page, "Show me the reviewer-annotated sessions in this project.");
  await waitForTurn(page);
  await settle(page);
  await expect(page.getByTestId("tcc-root").first()).toBeVisible();
  await frameTurn(page);

  // The card is a clickable object table. Open a record from it and the real
  // session fly-in comes up in context — the same panel the Sessions surface
  // opens, not a summary the agent wrote.
  await page.getByTestId("tcc-multi-row").first().click();
  await page.getByTestId("fly-in-panel-header").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2_500);
  await settle(page);
  await expect(
    page.getByTestId("transcript"),
    "The fly-in opened but rendered no session transcript — it is a placeholder, not the real record"
  ).toBeVisible();
  await page.getByTestId("trust-agent-v2-thread-viewport").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "../images/trust-agent-object-table.png" });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1_500);

  // The composer, with the slash palette open over it. The palette is a portal
  // above the chassis, so shoot the union of the two.
  const textarea = page.getByTestId("trust-agent-v2-composer-input-textarea");
  const palette = page.getByTestId("trust-agent-v2-skill-picker");
  const items = page.locator('[data-testid^="trust-agent-v2-skill-picker-item-"]');

  // The palette paints before the registry answers. Open it, and if it comes up
  // on "No matching commands", close it and try again — a screenshot of an empty
  // palette says the product has no slash commands, which is the opposite of what
  // this section claims.
  let ready = false;
  for (let attempt = 0; attempt < 4 && !ready; attempt++) {
    await textarea.click();
    await page.keyboard.type("/");
    await palette.waitFor({ timeout: 15_000 });
    await page.waitForTimeout(2_000);
    ready = (await items.count()) >= 3;
    if (!ready) {
      await page.keyboard.press("Escape");
      await textarea.fill("");
      await page.waitForTimeout(2_500);
    }
  }
  if (!ready) throw new Error("The slash palette never loaded any commands to show.");

  // Start the crop a few pixels INSIDE the palette's box. Its popper wrapper
  // carries ~5px of transparent slack above the visible card, and a crop that
  // honours the box top slices whatever transcript line happens to sit behind it
  // across the top of the image.
  await shootRegion(
    page,
    "../images/trust-agent-composer.png",
    [palette, page.getByTestId("trust-agent-v2-composer")],
    16,
    -6
  );
});

/** Attach the policy note the write turns lean on, and wait for the chip. */
async function attachPolicyNote(page: Page): Promise<void> {
  const note = path.resolve("/tmp/refund-policy-note.md");
  fs.writeFileSync(
    note,
    "# Refund policy note (Acme, Q3)\n\n" +
      "Refunds clear within 5-10 business days of the return being received.\n" +
      "Support must confirm the return has been received before quoting a clear-by\n" +
      "date, and must never promise a date outside that window.\n"
  );
  await page.getByTestId("trust-agent-v2-composer-attach-input").setInputFiles(note);
  await page.getByTestId("trust-agent-v2-composer-attachment").waitFor({ timeout: 30_000 });
}

/**
 * Drive past whatever the interrupt slot puts in front of the write gate.
 *
 * Reaching a permission card is not a single wait: the runtime's clarify-first
 * gate can put one or two QUESTION cards in the same slot ahead of it, and the
 * vaguer the prompt the more of them you get. The first attempt at this capture
 * asked the agent to "use the attached policy note" and got a two-step question
 * flow instead of a write.
 */
async function reachWriteGate(page: Page): Promise<void> {
  const slot = page.getByTestId("trust-agent-v2-hitl-slot");
  const approve = slot.getByTestId("permission-card-cta");
  for (let attempt = 0; attempt < 4; attempt++) {
    await waitForTurn(page, {
      timeout: 300_000,
      stopOn: async () =>
        (await approve.count()) > 0 || (await slot.getByTestId("qacard-choice").count()) > 0,
    });
    if (await approve.count()) break;
    const choice = slot.getByTestId("qacard-choice").first();
    if (!(await choice.count())) continue;
    await choice.click();
    await page.waitForTimeout(600);
    // A single question submits; a flow steps forward until the last one does.
    for (let step = 0; step < 5; step++) {
      const next = slot.getByTestId("qaflow-next");
      const submit = slot.getByTestId("qacard-submit");
      if (await next.count()) {
        await next.click();
      } else if (await submit.count()) {
        await submit.click();
        break;
      } else break;
      await page.waitForTimeout(900);
      const c = slot.getByTestId("qacard-choice").first();
      if (await c.count()) {
        await c.click();
        await page.waitForTimeout(500);
      }
    }
    await page.waitForTimeout(2_000);
  }
  await approve.waitFor({ timeout: 180_000 });
}

test("trust agent permission card", async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize(VIEWPORT);

  // Without this the capture works exactly once — see dropEvaluator.
  await dropEvaluator(await firstProjectId(), "Refund policy window");

  // Ask for the write as the FIRST message, so the whole conversation fits in one
  // viewport with nothing sliced by the top edge.
  //
  // Two richer versions of this chat were tried and rejected. Opening with "what
  // is this agent being judged on" filled the side rail but produced a two-screen
  // transcript, and the thread cannot scroll far enough to put the request that
  // tripped the gate at the top — every shot opened on a paragraph cut in half.
  // Opening with a deliberately tiny read ("how many evaluators… one line please")
  // left the composer disabled behind an unfinished turn and never got to the
  // write at all. A short chat and an empty rail is the honest trade: the rail has
  // its own capture, and this one is about where the card sits.
  await startChat(
    page,
    "Create an LLM-judge evaluator named 'Refund policy window'. It should pass only when the reply " +
      "confirms the return has been received before quoting a clear-by date, and the window it quotes " +
      "is 5-10 business days. Use exactly that — you have everything you need."
  );
  await reachWriteGate(page);
  await page.waitForTimeout(1_500);
  await settle(page);

  const clipped = await page.getByTestId("trust-agent-v2-thread-viewport").evaluate((el) => {
    el.scrollTop = 0;
    const first = el.querySelector('[data-role="user"]') as HTMLElement | null;
    if (!first) return -1;
    return Math.round(first.getBoundingClientRect().top - el.getBoundingClientRect().top);
  });
  await page.waitForTimeout(600);
  if (clipped > 80 || clipped < -4) {
    throw new Error(
      `The conversation does not start at the top of the transcript (offset ${clipped}px), so the ` +
        `shot would open on a line sliced in half by the top edge.`
    );
  }

  // Shoot the WHOLE window, not just the card. The point of this surface is that
  // the interrupt shell takes the COMPOSER'S PLACE — you cannot type past it —
  // and a tight crop of the card alone shows a floating dialog that could be
  // anywhere on the page.
  await page.screenshot({ path: "../images/trust-agent-permission-card.png" });

  // Leave the chat resolved rather than parked on an open gate. Approving also
  // proves the claim the page makes about it: the write really lands.
  await page.getByTestId("trust-agent-v2-hitl-slot").getByTestId("permission-card-cta").click();
  await waitForTurn(page);
});

test("trust agent side rail", async ({ page }) => {
  test.setTimeout(900_000);
  await page.setViewportSize(VIEWPORT);

  await dropEvaluator(await firstProjectId(), "Refund receipt confirmation");

  await startChat(page, "What is this project's refund agent being judged on right now?");
  await waitForTurn(page);
  await settle(page);
  await attachPolicyNote(page);

  // All four rail sections in one frame needs ONE multi-step task, not a
  // conversation that accumulates them. `create_plan` deliberately clears the
  // Context and Outputs rows when it lands (a new plan supersedes the old rail),
  // so a plan asked for AFTER a write wipes the Outputs section it was meant to
  // sit beside — which is exactly what the first attempt at this shot produced.
  // Act mode runs plan-then-execute inside a single turn, so the plan lands first
  // and the reads and writes fold in underneath it.
  await page.getByTestId("trust-agent-v2-mode-toggle").click();
  await page.getByText("Act without asking", { exact: true }).click();
  await page.waitForTimeout(800);
  await sendTurn(
    page,
    "Create an LLM-judge evaluator named 'Refund receipt confirmation' that fails when the reply " +
      "quotes a clear-by date without confirming the return arrived. Then check which of this " +
      "project's requirements it covers, and tell me which ones are still uncovered."
  );

  const rail = page.getByTestId("trust-agent-v2-side-rail");
  const titles = async () =>
    (await rail.getByTestId("side-rail-section-title").allInnerTexts()).map((t) =>
      t.split("\n")[0].trim()
    );

  // Act mode does NOT mean unattended. It skips the per-step pauses, but the
  // write gate still halts the run at the mutation — the first attempt at this
  // shot waited out the turn and got a rail with Progress and Context and an
  // empty space where Outputs goes, because the create was still sitting at an
  // unanswered permission card.
  const approve = page.getByTestId("trust-agent-v2-hitl-slot").getByTestId("permission-card-cta");
  for (let gate = 0; gate < 3; gate++) {
    await waitForTurn(page, {
      timeout: 400_000,
      stopOn: async () => (await approve.count()) > 0,
    });
    if (!(await approve.count())) break;
    await approve.click();
    await page.waitForTimeout(3_000);
  }
  await settle(page);
  console.log("rail sections:", JSON.stringify(await titles()));

  for (const section of ["Progress", "Context", "Outputs", "Attachments"]) {
    await expect(
      rail.getByText(section, { exact: true }),
      `The rail has no ${section} section — the shot would show a partial rail`
    ).toBeVisible();
  }

  // Crop to the SECTIONS, not the rail container. The container is the full
  // height of the viewport, so shooting it leaves two thirds of the image as an
  // empty gutter and the reader has to hunt for the content.
  const panels = rail.getByTestId("side-rail-section");
  const n = await panels.count();
  await shootRegion(
    page,
    "../images/trust-agent-side-rail.png",
    [panels.first(), panels.nth(n - 1)],
    12
  );
});
