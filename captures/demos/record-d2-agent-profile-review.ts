/**
 * D2 — Agent Profile review loop (DEV-6217). Blocks `how-to/review-an-agent-profile.mdx`.
 *
 * The profile moves through named states and the review is a cycle, so a still can
 * only ever show one frame of it. The beats walk the whole loop against a live
 * connection: generate a first profile, read the discovery coverage, drill a tool to
 * its exact recorded schema, correct the profile with the overlay editor, and record
 * Approve.
 *
 * Three things this recording had to solve, all of them written down because the next
 * demo will hit them again:
 *
 *  1. **The fixture has to be the project's NEWEST build.** The Playground's picker
 *     defaults to the build `list_run_options` tags `current`, which is the newest
 *     active agent version (`services/api/src/domain/agent_versions/service.py:650`).
 *     Minting the demo build last is what keeps every other fixture's name — other
 *     agents' `ZZ …` scratch connections, a real Salesforce org id — off screen.
 *     No picker is ever opened.
 *  2. **Host save is idempotent on the build label**, so deleting and recreating the
 *     connection alone REUSES the old agent version and its profile. The empty state
 *     this demo opens on is only real if the build row is deleted first — see
 *     `resetFixture()`.
 *  3. **"Profile queued" is not filmable on this instance.** The refresh endpoint
 *     writes `queued` and kicks the worker, which picks the run up in under 20 ms;
 *     the fly-in polls every 2 s (`apps/web/src/hooks/use-agent-profile.ts:30`), so
 *     the first refetch already reads `running`. The demo shows the three pills that
 *     ARE legible — Profile in progress, Version-pinned profile, Profile available —
 *     and no caption claims a queued frame that does not exist.
 *
 * The agent behind the connection is a throwaway AG-UI stub whose capability endpoint
 * answers after a deliberate delay, so the in-progress state lasts long enough to read.
 * Nothing in the app is slowed, stubbed or dressed: every pill, count and string in the
 * frame is the shipped surface reacting to a real capture.
 *
 *   python3 <scratchpad>/d2-stub.py &            # the agent under test
 *   cd captures && npx tsx demos/record-d2-agent-profile-review.ts
 *   cd ../pipeline && npx remotion render src/index.ts DemoComposition \
 *     out/d2-agent-profile-review.mp4 --props="$PWD/public/d2-agent-profile-review.json"
 *
 * Bounds are captured BEFORE each click and written into the timeline — Remotion zooms
 * to them, and they are unrecoverable after the DOM moves on.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { startRecording } from "../lib/helpers-record";

const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";
const APP = process.env.TRUSTAI_APP_URL ?? "http://localhost:3000";
const PUBLIC_DIR = path.resolve(__dirname, "../../pipeline/public");
const SLUG = "d2-agent-profile-review";

/** The connection the demo profiles. Points at the local AG-UI stub. */
const HOST_NAME = "Refunds assistant";
const STUB_BASE_URL = "http://host.docker.internal:8321";

interface Bounds { x: number; y: number; width: number; height: number }
interface Beat {
  timeMs: number;
  action: "navigate" | "click" | "type" | "hover" | "wait" | "scroll";
  elementBounds?: Bounds;
  caption?: string;
  durationMs?: number;
}

const beats: Beat[] = [];
// Set the moment the recording context opens, NOT at module load: the fixture
// reset below makes half a dozen API calls, and a timeline zeroed before them
// puts every beat seconds later than the frame it describes.
let t0 = Date.now();
const at = () => Date.now() - t0;

/** Record a beat with the target's real bounds. Call it BEFORE acting. */
async function beat(
  action: Beat["action"],
  caption: string,
  locator?: Locator,
  durationMs?: number,
): Promise<void> {
  const bounds = locator ? await locator.boundingBox() : null;
  beats.push({
    timeMs: at(),
    action,
    ...(bounds ? { elementBounds: bounds } : {}),
    caption,
    ...(durationMs ? { durationMs } : {}),
  });
}

async function api(pathname: string, method = "GET", body?: unknown) {
  const res = await fetch(API + pathname, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw new Error(`${method} ${pathname} -> HTTP ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Put the fixture back to "never captured", and make it the project's current build.
 *
 * Deletes the connection AND the agent build row it registered — the build row is what
 * the profile hangs off, and host save re-registers the same row for the same label, so
 * skipping the build delete would hand the demo a profile it is supposed to generate on
 * camera.
 */
async function resetFixture(): Promise<string> {
  const projects = await api("/v1/projects");
  const projectId = (Array.isArray(projects) ? projects : projects.items)?.[0]?.id;
  if (!projectId) throw new Error("No projects — seed one first.");

  for (const host of await api(`/v1/connect/hosts?project_id=${projectId}`)) {
    if (host.name === HOST_NAME) await api(`/v1/connect/hosts/${host.id}?project_id=${projectId}`, "DELETE");
  }
  const versions = await api(`/v1/agent-versions?project_id=${projectId}`);
  for (const version of versions.items) {
    if (version.label === HOST_NAME) await api(`/v1/agent-versions/${version.id}`, "DELETE");
  }

  await api(`/v1/connect/hosts?project_id=${projectId}`, "POST", {
    name: HOST_NAME,
    platform_type: "conversational_http",
    platform_config: {
      base_url: STUB_BASE_URL,
      endpoint_path: "/agui/run",
      health_path: "/health",
      auth_mode: "none",
      preset: "generic",
      mode: "act",
      request_timeout: 300,
    },
  });

  // Assert the two preconditions rather than discovering them in the render.
  const options = await api(`/v1/agent-versions/run-options?project_id=${projectId}`);
  const current = options.items[0];
  if (current.label !== HOST_NAME) {
    throw new Error(
      `The Playground would open on "${current.label}", not the demo fixture. ` +
        "Another build was registered after this one — re-run to mint a newer row.",
    );
  }
  const view = await api(`/v1/agent-versions/${current.id}/profile`);
  if (view.state !== "not_captured") {
    throw new Error(`The demo build already has a profile (state=${view.state}); the empty state would not render.`);
  }
  return projectId;
}

async function main() {
  const stub = await fetch(`${STUB_BASE_URL.replace("host.docker.internal", "localhost")}/agui/capabilities`, {
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!stub?.ok) throw new Error("The AG-UI stub is not answering on :8321 — start d2-stub.py first.");

  const projectId = await resetFixture();

  const rec = await startRecording();
  t0 = Date.now();
  const { page } = rec;
  const tabs = page.getByRole("navigation", { name: "Agent profile sections" });

  // Load with the rail already collapsed. The expanded rail carries a
  // Requirements row (preview, flag-gated OFF for every customer) and this
  // workspace's recent-chat titles — neither belongs in a shipped asset, and
  // collapsing on camera would waste the opening seconds.
  await page.context().addInitScript(() => {
    window.localStorage.setItem("sidebar:collapsed", "1");
  });

  await page.goto(`${APP}/projects/${projectId}/playground`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);

  const openProfile = page.getByTestId("playground-open-profile");
  await openProfile.waitFor({ state: "visible", timeout: 20_000 });
  await beat("navigate", "The Playground topbar opens the profile of the agent you are talking to");
  await page.waitForTimeout(2300);

  await beat("click", "Agent profile", openProfile);
  await openProfile.click();
  await page.getByTestId("agent-profile-empty").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(900);

  const generate = page.getByRole("button", { name: "Generate profile" });
  await beat("wait", "A build nobody has captured says so — absence is a named state, never a blank panel");
  await page.waitForTimeout(2900);

  await beat("click", "Generate profile", generate);
  await generate.click();

  // The capture runs in a worker; the panel polls itself to settlement.
  const pill = page.getByTestId("agent-profile-lifecycle-pill");
  await pill.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(700);
  await beat("hover", "Profile in progress — the panel follows the capture without a reload", pill, 5200);
  await page.getByTestId("agent-profile-overview-tab").waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(1200);

  await beat("hover", "Capture lands. The header pill reads Version-pinned profile", pill);
  await page.waitForTimeout(2700);

  const coverage = page.getByTestId("agent-profile-coverage-list");
  await coverage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await beat("hover", "Discovery coverage is one of three words per dimension — never a percentage", coverage);
  await page.waitForTimeout(3400);

  const toolsTab = tabs.getByRole("button", { name: /Tools/ });
  await beat("click", "The Tools tab is the catalog: actor, availability, parameter count", toolsTab);
  await toolsTab.click();
  await page.getByTestId("agent-profile-tool-rows").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(2100);

  const refundRow = page.getByTestId("agent-profile-tool-row").filter({ hasText: "issue_refund" }).first();
  await beat("click", "Open a tool for the schema recorded at capture time", refundRow);
  await refundRow.click();
  await page.getByTestId("agent-profile-tool-detail").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(1500);

  const parameters = page.getByTestId("agent-profile-tool-detail");
  await beat("hover", "order_id and amount are required; reason accepts three recorded values", parameters);
  await page.waitForTimeout(3400);

  const edit = page.getByTestId("agent-profile-edit-action");
  await beat("click", "Capture reports what the platform said. Edit profile is where a person corrects it", edit);
  await edit.click();
  await page.getByTestId("agent-profile-overlay-editor").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(1400);

  const ruleInput = page.getByPlaceholder("e.g. Always confirm the customer before making a change");
  await beat("type", "Add a rule in your own words", ruleInput);
  await ruleInput.click();
  await ruleInput.type("Never refund an order that has not shipped", { delay: 42 });
  await page.waitForTimeout(700);

  await page.getByRole("button", { name: "Add rule" }).click();
  await page.waitForTimeout(1000);

  const save = page.getByRole("button", { name: "Save edits" });
  await beat("click", "Edits belong to the build, so regenerating the profile keeps them", save);
  await save.click();
  await page.getByTestId("agent-profile-overlay-editor").waitFor({ state: "hidden", timeout: 20_000 });
  await page.waitForTimeout(1600);

  const overviewTab = tabs.getByRole("button", { name: "Overview" });
  // No caption: a one-second tab hop has nothing to say, and a caption
  // nobody can finish reading is worse than none.
  await beat("click", "", overviewTab);
  await overviewTab.click();
  const rules = page.getByTestId("agent-profile-behavior-rules");
  await rules.waitFor({ state: "visible", timeout: 20_000 });
  await rules.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await beat("hover", "Your rule now sits alongside the generated behavioral rules", rules);
  await page.waitForTimeout(3000);

  const reviewCard = page.getByTestId("agent-profile-review-card");
  await reviewCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const approve = page.getByRole("button", { name: "Approve" });
  await beat("click", "Approve signs this revision. Request changes is the other verdict", approve);
  await approve.click();
  await page.waitForTimeout(2200);
  await reviewCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  await beat("hover", "The decision names the reviewer and the moment", reviewCard, 3000);
  await page.waitForTimeout(3000);

  // Close the loop. Regenerating mints a NEW revision: the human edit rides on
  // the build and survives, the approval was signed against the old revision and
  // does not. Verified on the wire before it was filmed — the same build's review
  // goes from `approved` to `null` across one refresh while `behavioral_rules`
  // keeps the added rule.
  const refresh = page.getByTestId("agent-profile-refresh-action");
  await beat("click", "Refresh profile asks the connector for a fresh capture", refresh);
  await refresh.click();
  await page.getByTestId("agent-profile-capturing").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(600);
  await beat("hover", "The pill walks the same path again", pill, 3200);
  await page.getByTestId("agent-profile-overview-tab").waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(1000);

  await rules.waitFor({ state: "visible", timeout: 20_000 });
  await rules.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await beat("hover", "Your rule survived the regeneration — edits belong to the build", rules);
  await page.waitForTimeout(3200);

  await reviewCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await beat("hover", "The approval did not. A new revision is unreviewed until someone reads it", reviewCard, 3800);
  await page.waitForTimeout(3800);

  const video = await rec.finish(SLUG);

  const timeline = {
    title: "Agent Profile review loop",
    description:
      "Generate a first profile, read the discovery coverage, drill a tool to its recorded schema, correct it with the overlay editor, record Approve, then regenerate and watch the approval reset while the correction survives",
    _ticket: "DEV-6217",
    _blocksPage: "how-to/review-an-agent-profile.mdx",
    viewportWidth: 1280,
    viewportHeight: 800,
    totalDurationMs: at(),
    videoFile: `${SLUG}.webm`,
    beats,
  };
  fs.writeFileSync(path.join(PUBLIC_DIR, `${SLUG}.json`), JSON.stringify(timeline, null, 2) + "\n");

  console.log("recorded:", video);
  console.log("beats:", beats.length, "duration:", timeline.totalDurationMs, "ms");
  for (const b of beats) {
    console.log(
      ` ${String(b.timeMs).padStart(6)}ms ${b.action.padEnd(9)} ${b.elementBounds ? "bounds ok" : "no bounds"}  ${b.caption}`,
    );
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
