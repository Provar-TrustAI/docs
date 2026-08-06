/**
 * Capture: the workspace administration surfaces (Access Center).
 *
 * Outputs:
 *   ../images/workspace-settings-members.png        — Workspace settings, Members tab
 *   ../images/workspace-grant-access-dialog.png     — the Grant access dialog
 *   ../images/workspace-access-history-drawer.png   — the access history drawer
 *
 * Two things make this surface different from every other capture script.
 *
 * 1. It is NOT project-scoped, so `gotoSurface()` does not apply. The routes
 *    are flat under `/workspace/settings/*` (one route per tab), and the tab
 *    strip is derived from the matched route. `gotoTab()` below asserts the
 *    tab actually rendered, for the same reason `gotoSurface` does: the SPA
 *    serves 200 + the index shell for any path, so a wrong URL screenshots an
 *    empty app and reports success.
 *
 * 2. The Members roster is NOT read from the local database — it is read live
 *    from the workspace's identity provider (WorkOS here). The default dev
 *    workspace (`DEV_AUTH_BYPASS_EMAIL`'s synthetic zero-UUID org) does not
 *    exist in WorkOS at all, so its roster is permanently empty: "0 members"
 *    and an empty state. No amount of local seeding fixes that.
 *
 *    So these captures act as a real member of a real (sandbox) workspace via
 *    the backend's dev-persona seam — the same `x-dev-bypass-persona` header
 *    the app's own RBAC E2E suite uses (`apps/web/e2e/helpers/rbac-personas.ts`).
 *    Every request still runs the production `get_current_user` -> authz
 *    resolver path; only the identity's origin differs. Nothing is mocked and
 *    no response is stubbed.
 *
 *    The workspace behind `FIXTURE_ORG` is documentation fixture data created
 *    through the real APIs: five members in the WorkOS sandbox, two teams, two
 *    projects, and a spread of direct + team grants. See the PR body for the
 *    exact provisioning steps.
 */
import { expect, request as playwrightRequest, test, type Page } from "@playwright/test";
import { settle } from "../lib/helpers";

/** The docs-fixture workspace (a WorkOS sandbox org, external id `trustai-docs-captures`). */
const FIXTURE_ORG = "org_01KZCGFHDN8E6D9X7K931V23R3";

/** Acting identity: a workspace admin who is himself a row in the roster. */
const PERSONA = {
  email: "dana.whitfield@example.com",
  org_id: FIXTURE_ORG,
  role: "admin",
  first_name: "Dana",
  last_name: "Whitfield",
  workspace_name: "Acme",
};

/** Must match `BYPASS_PERSONA_HEADER` in `services/api/src/core/workos.py`. */
function personaHeader(persona: Record<string, string>): Record<string, string> {
  return {
    "x-dev-bypass-persona": Buffer.from(JSON.stringify(persona), "utf-8").toString("base64url"),
  };
}

const PERSONA_HEADER = personaHeader(PERSONA);

/**
 * Other real members of the fixture workspace, used only to make the audit
 * feed look like a workspace with more than one person in it. Each entry's
 * access differs on purpose: Marcus holds a direct Editor grant, Lena reaches
 * the project only through the Risk & Compliance team, and Tomas holds no
 * grant at all — so his read is a genuine Denied row, not a staged one.
 */
const OTHER_MEMBERS = [
  { email: "marcus.webb@example.com", first_name: "Marcus", last_name: "Webb" },
  { email: "lena.ortiz@example.com", first_name: "Lena", last_name: "Ortiz" },
  { email: "tomas.berger@example.com", first_name: "Tomas", last_name: "Berger" },
].map((m) => ({ ...m, org_id: FIXTURE_ORG, role: "member", workspace_name: "Acme" }));

const VIEWPORT = { width: 1440, height: 780 };

/** The fixture project the sidebar rail should be sitting in for every shot. */
const FIXTURE_PROJECT = "Acme refunds CSAT";

/** A context that acts as PERSONA for every request the page issues. */
async function personaPage(browser: import("@playwright/test").Browser): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    extraHTTPHeaders: PERSONA_HEADER,
  });
  return ctx.newPage();
}

/**
 * Park the session in the fixture project so the sidebar rail names the same
 * project the docs prose does. Workspace settings sits outside any project,
 * but the rail still shows whichever project you were last in — landing there
 * first is what keeps the three shots consistent with each other.
 */
async function enterFixtureProject(page: Page): Promise<string> {
  const projectId = await fixtureProjectId(page, FIXTURE_PROJECT);
  await page.goto(`http://localhost:3000/projects/${projectId}/home`);
  await settle(page);
  return projectId;
}

/** Discover the fixture workspace's project id by name (never hardcode — seeds change). */
async function fixtureProjectId(page: Page, name: string): Promise<string> {
  const res = await page.request.get("http://localhost:8000/v1/projects");
  const body = await res.json();
  const match = (body.items ?? []).find((p: { name: string }) => p.name === name);
  if (!match) {
    throw new Error(
      `No project named ${name} in the fixture workspace. Provision the docs fixture first ` +
        `(see this file's header) — a missing project means the Project access tab is empty.`
    );
  }
  return match.id;
}

/**
 * Navigate to an Access Center tab and PROVE it rendered.
 *
 * `/workspace/settings/<tab>` is a real route per tab, but the SPA fallback
 * answers 200 for anything — so assert the tab trigger is the selected one
 * rather than trusting the URL.
 */
async function gotoTab(page: Page, tab: string): Promise<void> {
  await page.goto(`http://localhost:3000/workspace/settings/${tab}`);
  const trigger = page.locator(`[data-testid="access-center-tab-${tab}"]`);
  try {
    await trigger.waitFor({ state: "visible", timeout: 20_000 });
    await expect(trigger).toHaveAttribute("data-state", "active", { timeout: 10_000 });
  } catch {
    throw new Error(
      `Navigated to /workspace/settings/${tab} but that tab never became active.\n` +
        `Either the route does not exist (the SPA fallback looks identical to a working route),\n` +
        `or the acting identity is not a workspace admin — a non-admin gets the "Workspace\n` +
        `management is admin-only" card instead of the tab strip.`
    );
  }
}

/** Fail loudly rather than shipping a screenshot of an empty roster. */
async function assertRosterPopulated(page: Page, atLeast: number): Promise<void> {
  const rows = page.locator("table tbody tr");
  await expect
    .poll(async () => rows.count(), {
      message:
        "The Members roster never filled. It is read live from the identity provider, so an " +
        "empty roster means the acting workspace has no provider memberships — not that the " +
        "page is slow.",
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(atLeast);
  await expect(page.getByText("No members yet", { exact: false })).toHaveCount(0);
}

test("workspace settings — members tab", async ({ browser }) => {
  const page = await personaPage(browser);
  await enterFixtureProject(page);
  await gotoTab(page, "members");
  await assertRosterPopulated(page, 5);
  await settle(page);

  // The roster is the point of the shot, so prove the columns a reader needs
  // actually carry data rather than the em-dash placeholder.
  const firstRow = page.locator("table tbody tr").first();
  await expect(firstRow).toContainText("@example.com");
  await expect(firstRow).toContainText("2026");

  await page.screenshot({ path: "../images/workspace-settings-members.png" });
});

test("grant access dialog", async ({ browser }) => {
  const page = await personaPage(browser);

  // Land in the fixture project first so the sidebar's project context matches
  // the project whose access panel we open — otherwise the shot shows one
  // project in the rail and another in the sheet.
  await enterFixtureProject(page);

  await gotoTab(page, "project-access");
  await settle(page);

  await page
    .locator('[data-testid="project-access-name-cell"]')
    .filter({ hasText: "Acme refunds CSAT" })
    .first()
    .click();
  const sheet = page.locator('[data-testid="project-access-sheet"]');
  await sheet.waitFor({ state: "visible", timeout: 15_000 });
  // The sheet must show real provenance before we open the dialog on top of
  // it — it is the context half of this screenshot.
  await expect(sheet).toContainText("Teams with access");
  await expect(sheet).toContainText("Direct");
  await settle(page);

  await page.locator('[data-testid="project-access-add"]').first().click();
  const dialog = page.locator('[data-testid="grant-access-dialog"]');
  await dialog.waitFor({ state: "visible", timeout: 15_000 });

  // A candidate list that never loaded is the failure this shot exists to
  // avoid: the dialog chrome renders instantly, the People query does not.
  await expect
    .poll(async () => page.locator('[data-testid="grant-candidate"]').count(), {
      message: "The grant dialog's People candidates never loaded",
      timeout: 15_000,
    })
    .toBeGreaterThanOrEqual(2);
  await settle(page);

  await page.screenshot({ path: "../images/workspace-grant-access-dialog.png" });
});

/**
 * Leave a fresh trail of real access changes in the audit log.
 *
 * The feed is newest-first, and the newest rows in a quiet workspace are the
 * routine authorization decisions this very script's page loads just wrote
 * ("View project — Allowed", over and over). A reader learns nothing from
 * that. So: grant and then revoke a person and a team on the SECONDARY fixture
 * project, through the same endpoints the grant dialog calls. Four genuine
 * permission changes land at the head of the feed, the workspace's access
 * state is exactly as it was, and the shot shows the mix the drawer's own
 * description promises — decisions AND changes.
 *
 * The Access-changes saved view would be the tidier route, but at this release
 * the filtered feed renders the previous view's rows above the filtered ones,
 * so the shot would contradict its own filter chip.
 */
async function writeAccessChanges(page: Page): Promise<void> {
  const secondary = await fixtureProjectId(page, "Billing accuracy");
  const base = `http://localhost:8000/v1/projects/${secondary}/grants`;
  const grants = [
    { kind: "user", id: "tomas.berger@example.com" },
    { kind: "team", id: "risk-compliance" },
  ] as const;

  for (const grantee of grants) {
    const res = await page.request.post(base, { data: { grantee, role: "viewer" } });
    expect(res.ok(), `granting ${grantee.id} should succeed`).toBe(true);
  }
  for (const grantee of grants) {
    const res = await page.request.delete(
      `${base}/${encodeURIComponent(grantee.id)}?kind=${grantee.kind}&role=viewer`
    );
    expect(res.ok(), `revoking ${grantee.id} should succeed`).toBe(true);
  }

  // ...and let three other members actually try to open the project, so the
  // Person column reads like a workspace rather than one admin talking to
  // himself. Each request is a real authorization decision — Marcus and Lena
  // are allowed (direct grant / via team), Tomas is denied.
  const projectId = await fixtureProjectId(page, FIXTURE_PROJECT);
  for (const member of OTHER_MEMBERS) {
    const ctx = await playwrightRequest.newContext({
      extraHTTPHeaders: personaHeader(member),
    });
    await ctx.get(`http://localhost:8000/v1/projects/${projectId}`);
    await ctx.dispose();
  }
}

test("access history drawer", async ({ browser }) => {
  const page = await personaPage(browser);
  await enterFixtureProject(page);
  await gotoTab(page, "members");
  await assertRosterPopulated(page, 5);
  await settle(page);

  await writeAccessChanges(page);

  await page.locator('[data-testid="access-history-trigger"]').first().click();
  const drawer = page.locator('[data-testid="access-history-drawer"]');
  await drawer.waitFor({ state: "visible", timeout: 15_000 });

  // Prove the feed really is newest-first and really did pick up what we just
  // did: without this the shot is a wall of identical "View project" rows and
  // the test still passes. Both halves matter — the changes AND more than one
  // person in the Person column.
  const CHANGE_ACTION = /Granted access|Revoked access/;
  /** What the top of the feed — the part the screenshot actually shows — holds. */
  const headOfFeed = async () => {
    const actions = await drawer.locator('[data-testid="audit-action-cell"]').allInnerTexts();
    const actors = await drawer.locator('[data-testid="audit-actor-cell"]').allInnerTexts();
    return {
      changes: actions.slice(0, 9).filter((a) => CHANGE_ACTION.test(a)).length,
      people: new Set(actors.slice(0, 9).map((a) => a.split("\n")[0])).size,
    };
  };

  await expect
    .poll(async () => JSON.stringify(await headOfFeed()), {
      message:
        "The head of the feed is not what we just wrote — at least 2 access changes and at " +
        "least 2 distinct people should be visible. Either the feed is not newest-first, or " +
        "it was captured before it refetched.",
      timeout: 20_000,
    })
    .toMatch(/"changes":([2-9]|\d\d).*"people":([2-9]|\d\d)/);
  await settle(page);

  // The audit table is wider than the drawer that hosts it, so its scroller
  // must be at the origin: any drift silently eats PERSON, the column that
  // says who did it. (The two right-hand columns are cut off by the drawer at
  // every viewport — see the PR body.)
  const scrollLeft = await drawer.evaluate((el) => {
    const scroller = el.querySelector("table")?.closest("[class*=overflow]") as HTMLElement | null;
    if (scroller) scroller.scrollLeft = 0;
    return scroller ? scroller.scrollLeft : 0;
  });
  if (scrollLeft !== 0) {
    throw new Error("The audit table is horizontally scrolled — PERSON would be cut off.");
  }

  await page.screenshot({ path: "../images/workspace-access-history-drawer.png" });
});
