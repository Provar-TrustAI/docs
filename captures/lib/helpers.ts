/**
 * Shared helpers for capture scripts.
 *
 * Two problems these exist to solve, both learned the hard way (DEV-6187):
 *
 * 1. Every surface worth capturing is PROJECT-SCOPED — /projects/:id/sessions, not /sessions.
 *    The original scripts navigated to top-level paths that are not routes at all.
 *
 * 2. `apps/web` is a Vite SPA behind an nginx fallback, so EVERY path returns 200 with the
 *    index shell. A script pointed at a dead route does not fail — it screenshots an empty
 *    app and reports success. `assertOnSurface` is what makes that impossible.
 */
import { expect, type Page } from "@playwright/test";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";

/** Discover a project id at runtime. Never hardcode one — seeds change. */
export async function firstProjectId(): Promise<string> {
  const res = await fetch(`${API}/v1/projects`);
  if (!res.ok) {
    throw new Error(
      `Cannot reach ${API}/v1/projects (HTTP ${res.status}). Is the app running on the release tag?`
    );
  }
  const body = await res.json();
  const items = Array.isArray(body) ? body : (body.items ?? []);
  if (items.length === 0) {
    throw new Error(
      "No projects exist. Seed one first: `pnpm seed acme-refunds-csat` in the app repo."
    );
  }
  return items[0].id;
}

/**
 * Navigate to a project-scoped route and PROVE we landed on the real surface.
 *
 * `marker` must be something only the intended surface renders. If it never appears we
 * are almost certainly looking at the SPA fallback, and the error says so — rather than
 * timing out on a selector and leaving the reader to guess why.
 */
export async function gotoSurface(
  page: Page,
  path: string,
  marker: string
): Promise<void> {
  const id = await firstProjectId();
  const url = `/projects/${id}/${path.replace(/^\//, "")}`;
  await page.goto(url);

  try {
    await page.locator(marker).first().waitFor({ state: "visible", timeout: 20_000 });
  } catch {
    throw new Error(
      `Navigated to ${url} but "${marker}" never rendered.\n` +
        `This is USUALLY a dead route, not a slow one: the SPA fallback serves 200 for any\n` +
        `path, so a wrong URL looks identical to a working one. Verify the route exists in\n` +
        `apps/web/src/routes/projects/$projectId/ before adjusting the selector.`
    );
  }
}

/** Fail loudly rather than shipping a blank or near-blank screenshot. */
export async function assertNotBlank(page: Page): Promise<void> {
  const text = (await page.locator("main").innerText().catch(() => "")) || "";
  expect(
    text.trim().length,
    "The captured surface rendered almost no text — likely an empty state or a failed load"
  ).toBeGreaterThan(40);
}

/**
 * Wait until the surface has actually finished loading its DATA.
 *
 * This exists because a passing selector is not a ready surface. The first rebuild of
 * this harness captured a Sessions page mid-load: a skeleton row satisfied
 * `table tbody tr`, `main` had enough chrome text to clear assertNotBlank, the test
 * reported success — and the screenshot showed a spinner over an empty table with
 * "0 sessions" in the toolbar while the nav said 10.
 *
 * Anything that screenshots a data surface should call this immediately before
 * `page.screenshot`.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");

  // Any visible spinner means data is still arriving.
  const spinner = page.locator(
    '[role="status"], [aria-busy="true"], .animate-spin, [data-loading="true"]'
  );
  await spinner
    .first()
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => {
      /* no spinner rendered — fine */
    });

  // Let late layout shifts land so the frame is stable.
  await page.waitForTimeout(400);
}

/**
 * Assert a table holds real rows, not skeletons.
 *
 * Pass the count the surface itself reports (e.g. the nav badge) when you have it —
 * a table that renders fewer rows than the app claims exist is still mid-load.
 */
export async function assertTableHasRows(page: Page, atLeast = 1): Promise<void> {
  const rows = page.locator("table tbody tr");
  await expect
    .poll(async () => rows.count(), {
      message: `Table never reached ${atLeast} row(s) — the surface is still loading, or the seed is empty`,
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(atLeast);
}
