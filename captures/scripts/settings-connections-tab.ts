/**
 * Capture: Project Settings → Connections, with a card expanded.
 *
 * Output:
 *   ../images/settings-connections-tab.png
 *     The single Connections tab: heading, subtitle, the Connected orgs
 *     cross-link, Connect an agent, the highlight strip, and one agent
 *     connection card with **Customize environment** open — so the shot shows
 *     the store row, the locked "Between tests:" sentence and the concurrency
 *     field in the same frame as the card's two status pills.
 *
 * ## Why this does NOT use gotoSurface()
 *
 * `gotoSurface` picks the FIRST project `/v1/projects` returns, and that
 * project usually has no agent connection at all — the shot would be the empty
 * state. Worse, the first one that DOES have a connection is not necessarily
 * the one worth photographing: a connection with no test data store renders the
 * stores empty state, and a non-Salesforce one renders no run-as disclosure, so
 * the frame silently loses two of the four things the expander holds. This
 * script therefore ranks candidates by how much of the expander they actually
 * populate and takes the richest, which is the README's "never ship a
 * screenshot of placeholder text" rule applied to project choice. It
 * re-implements `gotoSurface`'s real guard by hand: apps/web is a Vite SPA
 * behind an nginx fallback, so a wrong path returns 200 with the index shell
 * and screenshots an empty app while the test passes.
 *
 * ## What it asserts before shooting
 *
 *   1. `agent-connection-card` rendered — not the loading skeleton
 *      (`connections-loading`), not the empty state (`connections-empty`), not
 *      the error state (`connections-error`), all of which the route also
 *      serves and none of which is worth shipping.
 *   2. The highlight strip is in frame, because the page's first section
 *      describes it.
 *   3. `customize-environment-content` is open and carries the store section,
 *      the reset sentence and the concurrency input — the three things the
 *      caption promises.
 *   4. No horizontal overflow, so nothing is clipped at the right edge.
 *
 * The health pill is asserted to be PRESENT, never to read a particular phrase:
 * pinning it to "Connected" would invite forging a health state the instance is
 * not genuinely in.
 *
 * ## Viewport
 *
 * 1440×880. The expanded card is tall — identity row, store row, reset
 * sentence, concurrency and the collapsed run-as disclosure — and at 800 the
 * run-as disclosure fell below the fold, cutting the frame mid-section. 880 is
 * the first height that holds the whole card; 1000 held it too and added
 * 120px of empty panel underneath.
 */
import { expect, test } from "@playwright/test";
import { settle } from "../lib/helpers";

const APP = process.env.TRUSTAI_APP_URL ?? "http://localhost:3000";
const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";

/**
 * The project whose Connections tab is worth photographing: it has an agent
 * connection, and — ranked ahead of one that does not — that connection has a
 * test data store to render as a row instead of an empty state.
 */
async function projectWithARichConnection(): Promise<string> {
  const res = await fetch(`${API}/v1/projects`);
  if (!res.ok) {
    throw new Error(
      `Cannot reach ${API}/v1/projects (HTTP ${res.status}). Is the app running on the release tag?`
    );
  }
  const body = await res.json();
  const items = Array.isArray(body) ? body : (body.items ?? []);

  const candidates: { id: string; stores: number }[] = [];
  for (const project of items) {
    const hosts = await fetch(
      `${API}/v1/connect/hosts?project_id=${project.id}`
    ).then((r) => (r.ok ? r.json() : []));
    if (!Array.isArray(hosts) || hosts.length === 0) continue;
    const environments = await fetch(
      `${API}/v1/connect/environments?project_id=${project.id}`
    ).then((r) => (r.ok ? r.json() : []));
    const stores = (Array.isArray(environments) ? environments : []).reduce(
      (total: number, environment: { data_connections?: unknown[] }) =>
        total + (environment.data_connections?.length ?? 0),
      0
    );
    candidates.push({ id: project.id, stores });
  }

  if (candidates.length === 0) {
    throw new Error(
      "No project on this stack has an agent connection, so the Connections tab " +
        "would screenshot its empty state. Connect an agent first."
    );
  }
  candidates.sort((a, b) => b.stores - a.stores);
  return candidates[0].id;
}

test("project settings connections tab, one card expanded", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 880 });

  const projectId = await projectWithARichConnection();
  await page.goto(`${APP}/projects/${projectId}/settings/connections`);

  // (1) The route matched, and it served a real card.
  const cards = page.locator('[data-testid="agent-connection-card"]');
  try {
    await cards.first().waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    throw new Error(
      `Navigated to /projects/${projectId}/settings/connections but no connection card rendered.\n` +
        "The SPA fallback serves 200 for any path, so a wrong URL looks identical to a working one.\n" +
        "Verify the route still exists at apps/web/src/routes/projects/$projectId/settings/connections.tsx,\n" +
        "and that VITE_CONNECTIONS_REDESIGN has not been built as the literal 'false'."
    );
  }
  for (const dead of ["connections-loading", "connections-empty", "connections-error"]) {
    await expect(
      page.locator(`[data-testid="${dead}"]`),
      `The ${dead} state is mounted — that is not the surface this shot is about`
    ).toHaveCount(0);
  }

  // (2) The highlight strip the page's first section describes.
  await expect(
    page.getByText(/\d+ agent connections?/),
    "The highlight strip is not in frame"
  ).toBeVisible();

  // The card carries a reachability pill. WHICH phrase is whatever the
  // instance genuinely probed — asserting one here would invite forging it.
  const card = cards.first();
  const health = card.getByText(
    /^(Connected|Partly reachable|Can’t reach it|Not checked yet)$/
  );
  await expect(health, "The card shows no reachability pill").toBeVisible();
  console.log(`reachability pill in frame: "${await health.innerText()}"`);

  // (3) Open Customize environment and prove all three parts are on screen.
  await card.locator('[data-testid="customize-environment-trigger"]').click();
  const expander = card.locator('[data-testid="customize-environment-content"]');
  await expander.waitFor({ state: "visible", timeout: 10_000 });
  await expect(
    expander.getByText("Test data stores"),
    "The expander has no Test data stores section"
  ).toBeVisible();
  await expect(
    expander.locator('[data-testid="reset-sentence"]'),
    "The locked 'Between tests:' sentence is not in frame"
  ).toBeVisible();
  await expect(
    expander.locator('[data-testid="concurrency-input"]'),
    "The concurrency field is not in frame"
  ).toBeVisible();

  await settle(page);

  // (4) Nothing clipped at the right edge.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (overflow > 0) {
    throw new Error(`Page overflows horizontally by ${overflow}px — the frame would be cut off.`);
  }

  await page.screenshot({ path: "../images/settings-connections-tab.png" });
});
