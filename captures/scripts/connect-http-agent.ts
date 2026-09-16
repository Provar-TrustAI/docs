/**
 * Capture: connecting a Conversational HTTP agent.
 *
 * Outputs:
 *   ../images/connect-http-platform-picker.png  — the platform picker, all four cards
 *   ../images/connect-http-connection-form.png  — the form with Sign-in method = Bearer token
 *
 * Both surfaces live inside Project Settings → **Connections** → **Connect an
 * agent** (/projects/:id/settings/connections/connect). That route mounts the
 * shipped connect wizard inside the redesigned Connections chrome, which is
 * why neither shot can be reached by URL alone in the old way:
 *
 *   - the settings strip reads General / Connections / Members — there is no
 *     "Connection" tab any more, and /settings/connection redirects onto
 *     /settings/connections;
 *   - under the embedded chrome the wizard suppresses its own "Add a
 *     connection" heading, its "New connection" heading and its breadcrumb.
 *     The page header reads "Connect an agent" on every step and the only
 *     escape is "Back to connections".
 *
 * So the markers this script waits on are the page header and the platform
 * cards themselves, never the retired headings — waiting on "Add a connection"
 * is how this script silently captured the pre-redesign IA for a release.
 *
 * Nothing here is ever saved. The form is filled and shot before "Save
 * connection" is clicked, so the capture leaves no connection behind in the
 * fixture (other capture runs share this project).
 *
 * Hosts are overridable because the docs audit runs the app on a pinned tag
 * beside a developer's own stack:
 *   TRUSTAI_APP_URL (default http://localhost:3000)
 *   TRUSTAI_API_URL (default http://localhost:8000)
 *   TRUSTAI_PROJECT (optional exact project name; otherwise the first project)
 */
import { test, expect } from "@playwright/test";
import { settle } from "../lib/helpers";

const APP = process.env.TRUSTAI_APP_URL ?? "http://localhost:3000";
const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";

/** The four platform cards, in the order the picker lays them out. */
const PLATFORMS = [
  "AWS Bedrock AgentCore",
  "Salesforce Agentforce",
  "Claude Managed Agent",
  "Conversational HTTP agent",
];

/**
 * Resolve the project to shoot in.
 *
 * Never hardcode an id — seeds change. And prefer a NAMED project when the
 * caller gives one: a project's name is painted in the settings header, so a
 * scratch project left behind by another job puts its own title (often a
 * ticket id) into a reader-facing screenshot.
 */
async function projectId(): Promise<string> {
  const res = await fetch(`${API}/v1/projects`);
  if (!res.ok) {
    throw new Error(
      `Cannot reach ${API}/v1/projects (HTTP ${res.status}). Is the app running on the release tag?`
    );
  }
  const body = await res.json();
  const items: Array<{ id: string; name: string }> = Array.isArray(body)
    ? body
    : (body.items ?? []);
  if (items.length === 0) {
    throw new Error(
      "No projects exist. Seed one first: `pnpm seed acme-refunds-csat` in the app repo."
    );
  }
  const wanted = process.env.TRUSTAI_PROJECT;
  if (wanted) {
    const match = items.find((p) => p.name === wanted);
    if (!match) {
      throw new Error(
        `No project named "${wanted}". Found: ${items.map((p) => p.name).join(", ")}`
      );
    }
    return match.id;
  }
  return items[0].id;
}

/** Open the connect wizard on its first step, from the Connections tab. */
async function openPicker(page: import("@playwright/test").Page) {
  const id = await projectId();
  await page.goto(`${APP}/projects/${id}/settings/connections`);

  // Prove we are on the redesigned tab and not the SPA fallback: the tab's own
  // subtitle is rendered by nothing else.
  await page
    .getByText("The agents this project tests", { exact: false })
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);

  // "Connect an agent" is the header action when the project has connections
  // and the empty-state hero when it has none. Both are LINKS to
  // /settings/connections/connect, not buttons — the wizard is a route, so
  // matching on the button role finds nothing and times out.
  await page.getByRole("link", { name: "Connect an agent" }).first().click();

  await page
    .getByRole("heading", { name: "Connect an agent" })
    .waitFor({ state: "visible", timeout: 20_000 });
  await settle(page);
}

test("connect-an-agent platform picker", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await openPicker(page);

  // The page tells the reader there are four cards and names all four. If the
  // build ever ships a fifth (or drops one) the prose is wrong, so assert the
  // set rather than just "some cards rendered".
  for (const label of PLATFORMS) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${label}`) }),
      `The picker did not render a "${label}" card`
    ).toHaveCount(1);
  }

  // The retired chrome must be absent, or this shot is the old IA again.
  await expect(
    page.getByRole("heading", { name: "Add a connection" }),
    "The picker still renders its own heading — the embedded chrome is off"
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Back to connections" }),
    "The page-level escape is missing — this is not the embedded chrome"
  ).toHaveCount(1);

  await settle(page);
  await page.screenshot({ path: "../images/connect-http-platform-picker.png" });
});

test("conversational http connection form with bearer token", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1120 });
  await openPicker(page);

  await page.getByRole("button", { name: /^Conversational HTTP agent/ }).click();

  // The form step keeps the page header and the escape; what identifies the
  // step is the platform chip and the connection-name field.
  await page.locator("#connection-name").waitFor({ state: "visible", timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: "New connection" }),
    "The form still renders its legacy heading — the embedded chrome is off"
  ).toHaveCount(0);
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
  // an element shot loses the Project Settings header and the Connections tab
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
