/**
 * Capture: connecting a Conversational HTTP agent.
 *
 * Outputs:
 *   ../images/connect-http-platform-picker.png  — the Add-a-connection picker, all four cards
 *   ../images/connect-http-connection-form.png  — the form with Sign-in method = Bearer token
 *
 * Both surfaces live inside Project Settings → Connection
 * (/projects/:id/settings/connection), rendered by
 * legacy/features/settings/connection-tab.tsx. The tab is a single panel that
 * swaps between the connection LIST, the platform PICKER and the connection
 * FORM, so both shots are reached by clicking through from the list — there is
 * no direct route to either.
 *
 * Nothing here is ever saved. The form is filled and shot before "Save
 * connection" is clicked, so the capture leaves no host behind in the fixture
 * (other capture runs share this project).
 */
import { test, expect } from "@playwright/test";
import { gotoSurface, settle } from "../lib/helpers";

const CONNECTION = "settings/connection";
const TAB_MARKER = "text=Source system connection";

/** Open the picker from whichever state the Connection tab lands in. */
async function openPicker(page: import("@playwright/test").Page) {
  await gotoSurface(page, CONNECTION, TAB_MARKER);
  await settle(page);

  // "Add connection" is the empty-state button when the project has no
  // connections and the header button when it has some. Either way there is
  // exactly one, and it is the only way into the picker.
  await page.getByRole("button", { name: "Add connection" }).first().click();
  await page.getByRole("heading", { name: "Add a connection" }).waitFor({ state: "visible" });
  await settle(page);
}

test("add-a-connection platform picker", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await openPicker(page);

  // The page tells the reader there are four cards and names all four. If the
  // build ever ships a fifth (or drops one) the prose is wrong, so assert the
  // set rather than just "some cards rendered".
  const cards = page.locator("main button", { hasText: "Connect" });
  const labels = [
    "AWS Bedrock AgentCore",
    "Salesforce Agentforce",
    "Claude Managed Agent",
    "Conversational HTTP agent",
  ];
  for (const label of labels) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${label}`) }),
      `The picker did not render a "${label}" card`
    ).toHaveCount(1);
  }
  expect(await cards.count(), "The picker rendered a card count the page does not describe").toBe(4);

  await settle(page);
  await page.screenshot({ path: "../images/connect-http-platform-picker.png" });
});

test("conversational http connection form with bearer token", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1120 });
  await openPicker(page);

  await page.getByRole("button", { name: /^Conversational HTTP agent/ }).click();
  await page.getByRole("heading", { name: "New connection" }).waitFor({ state: "visible" });
  await settle(page);

  // Fill the form with the values a real reader would type. Run endpoint and
  // Health endpoint arrive pre-filled (PLATFORM_FIELD_DEFAULTS), so they are
  // left alone — but Connection Name and Agent base URL are empty, and a shot
  // of "e.g. Production AgentCore" grey placeholder text teaches nothing.
  await page.locator("#connection-name").fill("Refunds agent (staging)");
  await page.locator("#field-base_url").fill("https://refunds-agent.staging.acme.example.com");

  // The shot the page asks for: Sign-in method on Bearer token, which is what
  // reveals the Bearer token field below it.
  await page.locator("#field-auth_mode").selectOption("bearer");
  await page.locator("#field-bearer_token").waitFor({ state: "visible" });
  await page.locator("#field-bearer_token").fill("sk-agent-3f9a1c7e42b8");

  await expect(page.locator("#field-endpoint_path")).toHaveValue("/agui/run");
  await expect(page.locator("#field-health_path")).toHaveValue("/health");

  await settle(page);

  // The form is taller than the standard viewport — Agent mode and the
  // Save / Test Connection row sit below the fold. Grow the viewport to the
  // page's own height rather than shooting the <form> element on its own:
  // an element shot loses the Project Settings header and the Connection tab
  // that tell the reader where the form lives, and the fixed Trust Agent
  // launcher still paints over it, clipping "Save connection". The extra
  // 140px of headroom parks that launcher over empty canvas instead.
  const contentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: 1280, height: Math.min(contentHeight + 140, 1800) });
  await settle(page);

  // Prove the save row really is on screen before shooting — a cropped
  // primary action is the failure this resize exists to prevent.
  const save = page.getByRole("button", { name: "Save connection" });
  await expect(save).toBeInViewport({ ratio: 1 });

  await page.screenshot({ path: "../images/connect-http-connection-form.png" });
});
