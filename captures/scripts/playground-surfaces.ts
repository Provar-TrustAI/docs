/**
 * Capture: the Playground surfaces for `concepts/playground.mdx`.
 *
 * Outputs:
 *   ../images/playground-shell.png                 — the Chat greeting empty state
 *   ../images/playground-simulate-modal.png        — the "Simulate a conversation" dialog
 *   ../images/playground-save-scenario-modal.png   — "Save as a scenario" over a finished Chat
 *   ../images/playground-history.png               — the History menu, real past runs
 *
 * ── The prerequisite this surface has and no other capture does ──────────
 *
 * Every Playground shot needs a connected agent that ACTUALLY REPLIES. The
 * save-as-scenario action only unlocks after a real user turn AND a real agent
 * turn; History only lists runs that produced turns. `acme-refunds-csat` seeds
 * no runnable agent, so before running this file:
 *
 *   node ../captures/fixtures/refunds-concierge-stub.mjs   # serves :8397
 *
 * and register it once as a `conversational_http` connection named "Refunds
 * Concierge" (the exact curl is in that file's header). The stub speaks the
 * connector's AG-UI dialect, so the product drives it down its ordinary HTTP
 * agent path — nothing about the Playground itself is faked, only the far end
 * of the connection. It emits a route decision and a tool call per turn, so the
 * transcript carries the "Routed to" / "Tool used" peek the page describes.
 *
 * `AGENT` below is asserted, not assumed: a stack where the stub is missing
 * would otherwise default to whatever build sorts first and screenshot a
 * greeting naming an agent nobody has heard of.
 *
 * ── Why `settle()` is not enough here ────────────────────────────────────
 *
 * The rest of the harness screenshots REST-backed tables, where `settle()`'s
 * `networkidle` is the right readiness signal. The Playground streams over SSE:
 * while a reply (or a Simulate auto-drive) is in flight the connection is an
 * open request, and `networkidle` never fires. So each shot here waits on a
 * real UI condition first — the reply text landing, the run's status row
 * clearing — and only then settles. `quiet()` is `settle()` with that
 * understanding baked in.
 */
import { expect, test, type Page } from "@playwright/test";
import { gotoSurface, settle } from "../lib/helpers";

/** The connected agent every shot on this page runs against. */
const AGENT = "Refunds Concierge";

const COMPOSER = '[data-testid="playground-composer"]';

/** First message: opens the run and unlocks the save action once answered. */
const TURN_ONE =
  "My return was delivered a week ago and I still haven't seen the refund. When should it land?";
/** Second message: makes the saved conversation a two-exchange one. */
const TURN_TWO = "It's been eleven days now. What happens if it doesn't arrive?";

/**
 * `settle()`, but tolerant of an SSE stream still being open. Callers must
 * have already waited on the real readiness condition (a reply rendered, a
 * status row gone); this only drains spinners and lets layout land.
 */
async function quiet(page: Page): Promise<void> {
  await settle(page).catch(() => {
    /* an open EventSource keeps `networkidle` from ever firing */
  });
  await page.waitForTimeout(600);
}

/** Open the Playground and prove the stub agent is the one selected. */
async function openPlayground(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoSurface(page, "playground", COMPOSER);
  await expect(
    page.getByText(`Chat with ${AGENT}`),
    `The Playground did not open on ${AGENT}. Is the stub connection registered ` +
      `and is captures/fixtures/refunds-concierge-stub.mjs running on :8397?`,
  ).toBeVisible({ timeout: 20_000 });
  await quiet(page);
}

/** Send one message and wait for the agent's reply to finish streaming. */
async function sendAndAwaitReply(page: Page, text: string): Promise<void> {
  const before = await page.locator("text=Show agent steps").count();
  await page.locator(COMPOSER).fill(text);
  await page.locator('[data-testid="playground-send"]').click();
  // The agent turn is complete once its trace toggle renders — that only
  // appears on a committed bubble, so it is a stricter signal than any
  // substring of the reply text appearing mid-stream.
  await expect
    .poll(async () => page.locator("text=Show agent steps").count(), {
      message: "The agent never replied — is the stub still listening on :8397?",
      timeout: 90_000,
    })
    .toBeGreaterThan(before);
  await quiet(page);
}

test("playground shell — the Chat greeting empty state", async ({ page }) => {
  await openPlayground(page);

  // The empty shell shows THREE icon actions; the save action only renders
  // once a session has started. Assert that, because it is the specific claim
  // the surrounding prose makes.
  await expect(
    page.getByRole("button", { name: "Save this conversation as a scenario" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Playground history" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Playground mode" })).toBeVisible();

  // Park the cursor off-surface so no hover tooltip paints into the frame.
  await page.mouse.move(1439, 899);
  await quiet(page);
  await page.screenshot({ path: "../images/playground-shell.png" });
});

test("playground simulate modal — as it opens", async ({ page }) => {
  await openPlayground(page);

  await page.getByRole("button", { name: "Simulate", exact: true }).click();
  const modal = page.locator('[data-testid="playground-simulate-modal"]');
  await expect(modal).toBeVisible({ timeout: 15_000 });
  // Wait past the "Loading personas…" gate: the persona pre-selection only
  // exists on the settled body, and the whole point of this shot is that a
  // project with a roster opens with a persona already chosen.
  await expect(modal.getByText("Loading personas…")).toHaveCount(0, { timeout: 15_000 });
  await expect(
    modal.getByText("Choose a persona…"),
    "No persona was pre-selected — the project roster is empty. Populate personas " +
      "via POST /v1/projects/:id/personas before capturing this dialog.",
  ).toHaveCount(0);

  // Shot the dialog exactly as it opens: goal empty (so the reader sees the
  // prompt AND that Simulate stays disabled until it is filled), persona
  // pre-selected, Full auto chosen.
  await expect(modal.locator('[data-testid="playground-simulate-start"]')).toBeDisabled();
  await page.mouse.move(1439, 899);
  await quiet(page);
  await page.screenshot({ path: "../images/playground-simulate-modal.png" });
});

test("playground save-as-scenario modal — over a finished Chat", async ({ page }) => {
  await openPlayground(page);

  await sendAndAwaitReply(page, TURN_ONE);
  await sendAndAwaitReply(page, TURN_TWO);

  const save = page.getByRole("button", { name: "Save this conversation as a scenario" });
  await expect(save).toBeVisible();
  await save.click();

  const modal = page.locator('[data-testid="playground-add-scenario-modal"]');
  await expect(modal).toBeVisible({ timeout: 15_000 });

  // A Chat carries no goal to pre-fill and no persona to pre-select, so both
  // are typed the way an operator would — a dialog full of placeholders would
  // teach a reader nothing.
  await modal.locator('[data-testid="playground-add-name"]').fill(
    "Refund late after a delivered return",
  );
  await modal.locator('[data-testid="playground-add-goal"]').fill(
    "Find out when a refund will land after the return was delivered, and what happens if it does not.",
  );

  // Attach one persona so the Personas row shows a real pill next to its helper.
  await modal.locator('[data-testid="persona-tag-cell"]').click();
  await page.waitForTimeout(500);
  await page.getByRole("option", { name: "Frustrated regular" }).click()
    .catch(async () => {
      await page.getByText("Frustrated regular", { exact: true }).first().click();
    });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Prove the turn-count strip reports the two exchanges just driven, not a
  // half-captured run.
  await expect(modal.getByText(/4 turns · 2 from the user · 2 from the agent/)).toBeVisible();

  await page.mouse.move(1439, 899);
  await quiet(page);
  await page.screenshot({ path: "../images/playground-save-scenario-modal.png" });

  // Leave without saving. The run stays unfinalized — no session, no scenario —
  // and, exactly as the page says, it is still listed in History. The next test
  // needs it there as the Chat row.
  await page.keyboard.press("Escape");
});

/** Drive one manual Chat run to a single exchange, then close it out. */
async function driveChatRun(page: Page, opener: string): Promise<void> {
  await sendAndAwaitReply(page, opener);
  await page.getByRole("button", { name: "New session" }).click();
  await quiet(page);
}

/** Drive one persona Simulate run far enough to be worth listing, then stop. */
async function driveSimulateRun(page: Page, goal: string): Promise<void> {
  await page.getByRole("button", { name: "Simulate", exact: true }).click();
  const modal = page.locator('[data-testid="playground-simulate-modal"]');
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(modal.getByText("Loading personas…")).toHaveCount(0, { timeout: 15_000 });
  await modal.locator('[data-testid="playground-simulate-goal"]').fill(goal);
  await modal.locator('[data-testid="playground-simulate-start"]').click();
  await expect(modal).toBeHidden({ timeout: 15_000 });

  // Let the auto-drive land two exchanges, then stop waiting — the run cap is
  // six and the menu only needs a turn count to report.
  await expect
    .poll(async () => page.locator("text=Show agent steps").count(), {
      message: "The Simulate run never produced an agent turn.",
      timeout: 180_000,
    })
    .toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(1_500);
  await page.getByRole("button", { name: "New session" }).click();
  await quiet(page);
}

test("playground history menu — a Simulate run and a Chat run", async ({ page }) => {
  // Seven runs, driven one after another: the menu is a 360px scroller that
  // holds about seven rows, and this project is a shared fixture other capture
  // passes have left their own debris in ("ZZ 6238 …", "Second probe."). Those
  // rows are real history, but they are somebody's connector smoke test, and a
  // reader learns nothing from them. Driving a full menu's worth of genuine
  // refund conversations puts the fixture's own noise below the fold instead of
  // in the frame.
  test.setTimeout(900_000);
  await openPlayground(page);

  // Interleaved so the list reads like a week of real use, and ordered so the
  // newest entry is a Simulate run — History renders newest-first.
  await driveChatRun(page, "Can I still return a jacket I bought on the 3rd of July?");
  await driveChatRun(page, "Where has the refund for order AC-40119 got to?");
  await driveSimulateRun(
    page,
    "Find out whether a return posted after the 60-day window can still be accepted.",
  );
  await driveChatRun(page, "I was charged twice for the same order — can you fix that?");
  await driveChatRun(page, "Can I have store credit instead of a refund to my card?");
  await driveChatRun(page, "Does a refund cover the delivery charge as well?");
  await driveSimulateRun(
    page,
    "Get a firm date for a refund that is already past the promised window.",
  );

  await page.getByRole("button", { name: "Playground history" }).click();
  const menu = page.locator('[data-testid="playground-history-menu"]');
  await expect(menu).toBeVisible({ timeout: 15_000 });
  await expect(menu.getByText("Loading past sessions…")).toHaveCount(0, { timeout: 20_000 });
  await expect(
    menu.getByText("No past sessions yet."),
    "History is empty — the runs this file drove did not persist any turns.",
  ).toHaveCount(0);

  // Both row shapes must be present, or the shot does not show what the page
  // is describing.
  await expect(
    menu.getByText(/· simulated$/).first(),
    "No simulated row in History — the persona Simulate run did not land.",
  ).toBeVisible();
  await expect(
    menu.getByText(new RegExp(`^${AGENT} · \\d+ turns$`)).first(),
    "No Chat row in History — the manual chat run did not land.",
  ).toBeVisible();

  // …and the rows that actually fit in the 360px scroller must be the ones
  // just driven. If a "ZZ 6238" / "stub" row has floated into view, the shot
  // would ship somebody's connector smoke test as documentation.
  const visibleRows = (await menu.getByRole("menuitem").allInnerTexts()).slice(0, 7);
  for (const row of visibleRows) {
    expect(
      row,
      `A leftover fixture run is inside the visible menu:\n${row}\nDrive more runs before shooting.`,
    ).not.toMatch(/ZZ \d|stub|probe/i);
  }

  await page.mouse.move(1439, 899);
  await quiet(page);
  await page.screenshot({ path: "../images/playground-history.png" });
});
