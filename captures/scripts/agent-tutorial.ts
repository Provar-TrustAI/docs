/**
 * Capture: the Trust Agent end-to-end tutorial beats
 * (`tutorials/evaluate-with-the-trust-agent.mdx`).
 *
 * Outputs:
 *   ../images/agent-tutorial-welcome.png          — Welcome surface, pill expanded, composer pre-filled
 *   ../images/agent-tutorial-clarify-card.png     — the clarify-first question card in the composer slot
 *   ../images/agent-tutorial-plan.png             — the proposed plan + the Progress side rail
 *   ../images/agent-tutorial-permission-card.png  — a write's permission card in the composer slot
 *   ../images/agent-tutorial-object-table.png     — a clickable object table + the Outputs side rail
 *
 * ## This one DRIVES A REAL CONVERSATION, and that is the point
 *
 * Every beat this tutorial documents (clarify-first question, the plan on the
 * rail, a write's permission gate, the object table of records the run built)
 * only exists as the product of a live agent turn. There is no fixture that
 * paints them, and the design-system gallery renders the same components
 * against canned props — a screenshot of that would be a picture of a mock,
 * not of the product. So this script creates a task, sends the tutorial's own
 * brief, and shoots the surface as the agent works, answering and approving
 * the way a reader would.
 *
 * Consequences worth knowing before you re-run it:
 *
 *  - It takes 10–20 minutes and costs real model calls.
 *  - It really writes: it edits evaluators, generates scenarios, and starts an
 *    evaluation in the target project. Point it at a demo project only.
 *  - The agent's exact wording differs every run. The script therefore waits
 *    on STRUCTURE (a pending HITL card, a plan list in the rail, a
 *    multi-record tool-call card) and never on a phrase.
 *
 * ## Modes, because the page is specific about them
 *
 * The tutorial runs in **Ask** — the mode a new chat opens in, the one that
 * clarifies first and then gates every write — so that is this script's
 * default and it never touches the toggle.
 *
 * `MODE=plan` drives the page's optional Plan detour instead. It is the only
 * way to see the **Plan ready · N steps** bar, and a turn sent in Plan is
 * blocked from raising an approval card at all, so a Plan run can shoot the
 * plan beat and nothing after it:
 *
 *   DRIVE=1 MODE=plan BEATS=plan npx playwright test agent-tutorial -g "end-to-end"
 *
 * `TASK_ID` re-shoots against a conversation that already exists rather than
 * starting a new one; `BEATS` narrows which shots a run is responsible for.
 *
 * ## The trap this script is built around
 *
 * The beats live in cards that lift into the composer slot, and a card that
 * is taller than the room left under the transcript gets its footer — the
 * Approve button, the Next control — cut off by the viewport. `shoot()`
 * refuses to write a screenshot whose subject is not fully inside the frame,
 * because a clipped Approve button is exactly the detail the page is
 * pointing at.
 */
import { test, expect, type Page, type Locator } from "@playwright/test";
import { firstProjectId, settle } from "../lib/helpers";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";
const IMAGES = "../images";

/** The tutorial's own opening brief, verbatim from the page. */
const BRIEF =
  "Our support agent handles refunds, and I need to trust it before Friday's release. " +
  "Can you build test coverage and run it?";

const VIEWPORT = { width: 1440, height: 960 };

/** The pending question / permission card lifts into this slot. */
const HITL = "trust-agent-v2-hitl-slot";

/**
 * Screenshot, but only once `subject` is provably whole inside the frame.
 *
 * A pending card is bottom-anchored and grows upward; a tall one runs off the
 * bottom of the viewport and the shot loses its primary action. Exit code
 * would still be 0.
 */
async function shoot(page: Page, name: string, subject: Locator) {
  // A queued message is an artifact of THIS script, not of the product: the
  // nudge below can land while the agent is between states, and the composer
  // parks it as "Sends when Trust Agent finishes". A reader following the
  // tutorial would never see that banner, so it never goes in a shot.
  const queued = page.getByTestId("trust-agent-v2-composer-queued");
  if (await queued.count()) {
    await page.getByTestId("trust-agent-v2-composer-queued-cancel").click();
    await page.waitForTimeout(1000);
  }
  // `settle()` waits for network idle, which a LIVE streaming turn never
  // reaches — the SSE connection stays open for the whole run. Let it try
  // (it is the right wait between turns) but never let it fail the shot.
  await settle(page).catch(() => {});
  await subject.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  const box = await subject.boundingBox();
  if (!box) throw new Error(`${name}: the subject of this shot is not rendered.`);
  const vp = page.viewportSize()!;
  const clipped =
    box.y < 0 || box.x < 0 || box.y + box.height > vp.height || box.x + box.width > vp.width;
  if (clipped) {
    throw new Error(
      `${name}: the subject is clipped by the viewport ` +
        `(top ${Math.round(box.y)}, bottom ${Math.round(box.y + box.height)}, viewport ${vp.height}). ` +
        `Give the run a taller viewport or scroll the subject into view — do not ship a cut-off card.`
    );
  }
  await page.screenshot({ path: `${IMAGES}/${name}` });
}

/** Text of the pending HITL card, or "" when no card is pending. */
async function pendingCard(page: Page): Promise<string> {
  return (await page.getByTestId(HITL).innerText().catch(() => "")).trim();
}

/** Wait for a card to lift into the composer slot. Returns its text. */
async function waitForCard(page: Page, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const txt = await pendingCard(page);
    if (txt.length > 10) return txt;
    await page.waitForTimeout(3000);
  }
  throw new Error(
    `No HITL card appeared within ${timeoutMs / 1000}s. The agent either answered without ` +
      `gating (check the mode toggle really reads Plan) or the run failed — open the task and look.`
  );
}

test("trust agent welcome surface", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize(VIEWPORT);
  const pid = await firstProjectId();

  // New chat === the agent route with no ?task — never a top-level /agent.
  await page.goto(`/projects/${pid}/agent`);
  const hero = page.getByRole("heading", { level: 1 });
  await hero.waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);

  // A pill on its own is a row of four words. Expand one and pre-fill the
  // composer from a suggestion, so the shot shows what the pills are FOR.
  await page.getByRole("button", { name: "Evaluate agent" }).click();
  await page.waitForTimeout(600);
  const suggestion = page.getByText(
    "Build a tone-of-voice evaluator for the brand voice",
    { exact: true }
  );
  await suggestion.click();
  await page.waitForTimeout(600);

  // Prove the click pre-filled the composer rather than sending it.
  const composer = page.locator("textarea").first();
  await expect(composer).toHaveValue(/tone-of-voice/);
  expect(page.url(), "clicking a suggestion must not navigate or send").toContain("/agent");

  await shoot(page, "agent-tutorial-welcome.png", page.locator("main").first());
});

/**
 * The three remaining beats all come out of ONE live conversation, driven on
 * one page mount (the mode toggle is per-mount — a reload silently drops back
 * to Ask and the run stops gating).
 *
 * It is written as a state machine rather than a straight line because a live
 * agent does not deal its beats in a fixed order: it may ask a second round of
 * questions after the plan, or gate two writes back to back. Each pass looks at
 * what the surface is showing, shoots the beat if that beat is still owed, and
 * moves the conversation forward. `BEATS` narrows the set — pass
 * `TASK_ID=<id> BEATS=permission,objects` to resume a conversation that is
 * already past the earlier ones.
 */
const BEATS = new Set((process.env.BEATS ?? "clarify,permission,objects").split(","));
/** "ask" (the tutorial's mode, and the default) or "plan" (the optional detour). */
const MODE = process.env.MODE ?? "ask";

test("trust agent end-to-end drive", async ({ page }) => {
  // Opt-in. `pnpm capture:all` runs every file in scripts/, and this one costs
  // ten minutes of model calls and really mutates the target project — it must
  // never be something a full capture pass does by accident.
  test.skip(
    !process.env.DRIVE,
    "live agent drive — re-run deliberately with DRIVE=1 (it writes to the project)"
  );
  // A live agent run: several model turns and three writes before the last shot.
  test.setTimeout(2_400_000);
  await page.setViewportSize(VIEWPORT);
  const pid = await firstProjectId();

  let taskId = process.env.TASK_ID;
  const fresh = !taskId;
  if (!taskId) {
    const res = await fetch(`${API}/paddington/projects/${pid}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Refund coverage before Friday's release" }),
    });
    if (!res.ok) throw new Error(`Could not create a task (HTTP ${res.status}).`);
    taskId = (await res.json()).id as string;
  }
  console.log(`Driving task ${taskId}${fresh ? " (new)" : " (resumed)"}`);
  await page.goto(`/projects/${pid}/agent?task=${taskId}`);
  await page.getByTestId("trust-agent-v2-composer").waitFor({ state: "visible", timeout: 30_000 });
  await settle(page).catch(() => {});

  const slot = page.getByTestId(HITL);
  const planBar = page.getByTestId("trust-agent-v2-plan-confirm-bar");
  const planSteps = page.getByTestId("trust-agent-v2-rail-plan-step");
  const tables = page.getByTestId("tcc-multi");

  // The tutorial runs in ASK — the mode every new chat starts in, and the one
  // whose contract is clarify-first-then-gate-every-write. So the default here
  // is to leave the toggle alone. `MODE=plan` drives the page's optional Plan
  // detour instead, which is the only way to see the "Plan ready · N steps"
  // bar; a Plan turn cannot raise a permission card at all, so that run can
  // shoot the plan beat and nothing after it.
  if (MODE === "plan") {
    await page.getByTestId("trust-agent-v2-mode-toggle").click();
    await page.getByRole("menuitem", { name: /Plan first/ }).click();
    await expect(page.getByTestId("trust-agent-v2-mode-toggle")).toHaveText(/Plan/);
  } else if (fresh) {
    // Only a NEW chat is guaranteed to open in Ask. A resumed one carries
    // whatever the last turn left the toggle on — sending anything while a
    // plan is pending flips it to Act — so asserting Ask there would fail on
    // a conversation that is behaving exactly as documented.
    await expect(
      page.getByTestId("trust-agent-v2-mode-toggle"),
      "a new chat must open in Ask — the tutorial's mode"
    ).toHaveText(/Ask/);
  }

  if (fresh) {
    await page.getByTestId("trust-agent-v2-composer-input").click();
    await page.keyboard.type(BRIEF);
    await page.keyboard.press("Enter");
  }

  const owed = new Set(BEATS);
  const deadline = Date.now() + 35 * 60_000;
  let lastNudge = 0;
  let richestWriteShot = false;

  /** Send a typed confirmation — the go-ahead that moves planning to execution. */
  const goAhead = async () => {
    await page.getByTestId("trust-agent-v2-composer-input").click();
    await page.keyboard.type("Confirmed — go ahead and run the plan.");
    await page.keyboard.press("Enter");
    lastNudge = Date.now();
    await page.waitForTimeout(8000);
  };

  while (owed.size && Date.now() < deadline) {
    const card = (await slot.innerText().catch(() => "")).trim();

    // ---- a pending card owns the composer lane ---------------------------
    if (card.length > 10) {
      const approve = slot.getByRole("button", { name: /^Approve$/ });
      const isWrite = (await approve.count()) > 0;

      if (isWrite) {
        // Any write gate proves the mechanism, so the first one is banked
        // immediately — a run that stalls later still ships this beat.
        //
        // But the page documents FOUR ways to answer, and a two-choice gate
        // shows only three of them: the chat-wide standing grant is offered
        // only where the agent wrote a label for it. So a later gate that
        // does offer it replaces the banked shot — that is the card the
        // table in the step is describing.
        // The richest gate for this shot has BOTH: a structured preview (the
        // "N fields changed" summary line and the View proposal link — a bare
        // gate has neither) and a third choice, which is the chat-wide
        // standing grant the step's table describes.
        const choices = await slot.locator('[role="radio"]').count();
        const hasPreview = (await slot.getByTestId("permission-card-preview").count()) > 0;
        const richest = choices >= 3 && hasPreview;
        if (owed.has("permission")) {
          await shoot(page, "agent-tutorial-permission-card.png", slot);
          owed.delete("permission");
          console.log(`banked a write gate (${choices} choices, preview=${hasPreview}): ${card.slice(0, 60)}…`);
          if (richest) richestWriteShot = true;
        } else if (!richestWriteShot && richest) {
          console.log(`replacing it with a richer gate: ${card.slice(0, 60)}…`);
          await shoot(page, "agent-tutorial-permission-card.png", slot);
          richestWriteShot = true;
        }
        await approve.click();
        await page.waitForTimeout(6000);
        continue;
      }

      // A question. On a multi-question flow, answer the first and advance so
      // the shot carries what a still of question 1 cannot — Back AND Next
      // live, the step dots part-filled, a flow you can still revise.
      if (owed.has("clarify")) {
        const flowNext = slot.getByTestId("qaflow-next");
        if (await flowNext.count()) {
          await slot.getByTestId("qaflow-choice").nth(1).click();
          await page.waitForTimeout(400);
          await flowNext.click();
          await page.waitForTimeout(1500);
          await slot.getByTestId("qaflow-choice").first().click();
          await page.waitForTimeout(600);
        }
        await shoot(page, "agent-tutorial-clarify-card.png", slot);
        owed.delete("clarify");
      }
      await answerQuestion(page, slot);
      continue;
    }

    // ---- the plan proposal, and the confirmation that starts execution ----
    if ((await planBar.count()) > 0) {
      if (owed.has("plan")) {
        await expect
          .poll(async () => planSteps.count(), {
            message: "A plan-confirm bar with no steps in the rail",
            timeout: 60_000,
          })
          .toBeGreaterThanOrEqual(2);
        await shoot(page, "agent-tutorial-plan.png", page.getByTestId("trust-agent-v2-side-rail"));
        owed.delete("plan");
      }
      // Type the go-ahead rather than tapping "Approve & run". Both routes
      // flip the toggle to Act — while a plan with unfinished steps is on the
      // rail, ANYTHING sent from the composer does — and Act still stops at
      // every write, so the gates survive either way. Typing it exercises the
      // route the page flags as the easy one to miss.
      await goAhead();
      continue;
    }

    // ---- the records the run produced ------------------------------------
    // Wait for the rail to have real Outputs before shooting. An Outputs
    // section holding one row is technically the section the page describes
    // and tells the reader nothing about what the run built.
    if (owed.has("objects") && (await tables.count()) > 0 && (await outputChanges(page)) >= 3) {
      if (await shootObjectTable(page, tables)) owed.delete("objects");
    }

    // ---- nothing pending, nothing running --------------------------------
    // Plan mode ends its turn and WAITS for a go-ahead, and the plan-confirm
    // bar is live-turn state: it is not rehydrated when a conversation is
    // resumed, so on a resumed run there is no bar to see and no card to
    // answer — just a stopped conversation. Nudge it, at most every two
    // minutes, and only while the server says the run is idle.
    if (owed.size && Date.now() - lastNudge > 120_000 && (await runState(taskId!)) === "idle") {
      // Confirm the stall before typing into the composer. A single idle
      // reading catches the gap between a submitted answer and the next turn
      // starting, and a message sent into that gap is QUEUED — it then sits
      // in a "Sends when Trust Agent finishes" banner across the next shot.
      await page.waitForTimeout(30_000);
      const stillIdle =
        !(await pendingCard(page)) && (await runState(taskId!)) === "idle";
      if (!stillIdle) continue;
      console.log("run is idle with beats still owed — sending the go-ahead");
      await goAhead();
      continue;
    }

    await page.waitForTimeout(10_000);
  }

  expect([...owed], `beats never captured within the window: ${[...owed].join(", ")}`).toEqual([]);
});

/** How many changes the rail's Outputs section is reporting (0 when absent). */
async function outputChanges(page: Page): Promise<number> {
  const badge = page.getByText(/^\d+ changes?$/);
  if (!(await badge.count())) return 0;
  const txt = await badge.first().innerText();
  return Number.parseInt(txt, 10) || 0;
}

/** Is the agent still working this task? The server is the authority. */
async function runState(taskId: string): Promise<string> {
  const res = await fetch(`${API}/paddington/tasks/${taskId}`);
  if (!res.ok) return "unknown";
  return (await res.json()).run_state ?? "unknown";
}

/** Answer whichever question shape is pending and submit it. */
async function answerQuestion(page: Page, slot: Locator) {
  const next = slot.locator('[data-testid="qaflow-next"],[data-testid="qacard-submit"]');
  const choices = slot.locator('[data-testid="qaflow-choice"],[data-testid="qacard-choice"]');
  if (await choices.count()) await choices.first().click();
  await page.waitForTimeout(500);
  if ((await next.count()) && (await next.first().isEnabled())) {
    await next.first().click();
    await page.waitForTimeout(4000);
  } else {
    // Nothing answerable — let the loop breathe rather than spin on it.
    await page.waitForTimeout(6000);
  }
}

/**
 * Shoot the richest object table that fits the frame.
 *
 * Newest-first: the last table is the one the reader just watched the agent
 * produce. A table with one or two rows does not read as a table at all, and a
 * table taller than the viewport would ship cut in half — both are skipped
 * rather than shipped.
 */
async function shootObjectTable(page: Page, tables: Locator): Promise<boolean> {
  for (let i = (await tables.count()) - 1; i >= 0; i--) {
    const t = tables.nth(i);
    if ((await t.getByTestId("tcc-multi-row").count()) < 3) continue;
    await t.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    try {
      await shoot(page, "agent-tutorial-object-table.png", t);
      return true;
    } catch {
      console.log(`object table ${i} did not fit the frame — trying an earlier one`);
    }
  }
  return false;
}

