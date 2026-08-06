/**
 * Fixture top-up for the Scenarios captures (concepts/scenarios.mdx).
 *
 * `acme-refunds-csat` seeds scenario names, goals, personas and tags, but it
 * leaves the *grading contract* empty on every scenario: Expected routes and
 * Expected actions read "Not set" straight down the table, and the Expected
 * Output tab paints "No expected actions yet" / "No expected routes yet". That
 * is precisely the surface concepts/scenarios.mdx is about, so it has to be
 * populated before anything is captured.
 *
 * Two things to know about the names below:
 *
 *   - They are AUTHORED, not observed. The seed records no routes or tools on
 *     its sessions (`/v1/scenarios/:id/observed-vocab` returns three empty
 *     lists), so the in-product picker has nothing to offer. These are the
 *     plausible route/tool vocabulary of the refunds agent the fixture
 *     describes.
 *   - The PUT replaces the contract wholesale, so this MERGES rather than
 *     clobbers: `reference_documents` is omitted (the API leaves stored
 *     documents untouched on null) and evaluator ids are unioned with whatever
 *     is already attached. The dev fixture is shared, and a capture pass must
 *     not delete someone else's setup.
 *
 * Idempotent — safe to re-run, and cheap enough to run as capture setup rather
 * than as a step a human has to remember.
 */
const API = process.env.TRUSTAI_API_URL ?? "http://localhost:8000";

type Assertion = { name: string; assertion: "required" | "disallowed"; param_assertions?: { key: string; value: string }[] };

const req = (name: string, params?: { key: string; value: string }[]): Assertion =>
  params ? { name, assertion: "required", param_assertions: params } : { name, assertion: "required" };
const no = (name: string): Assertion => ({ name, assertion: "disallowed" });

/** Keyed by the reader-visible scenario handle. */
const CONTRACTS: Record<string, { routes: Assertion[]; actions: Assertion[]; evaluators: string[] }> = {
  "SCN-000001": {
    routes: [req("returns")],
    actions: [req("lookup_order"), req("issue_refund")],
    evaluators: ["Refund policy groundedness"],
  },
  "SCN-000002": {
    routes: [req("refunds"), no("human_escalation")],
    actions: [req("lookup_order", [{ key: "order_id", value: "AC-88421" }]), req("check_refund_status")],
    evaluators: ["Refund policy groundedness", "Completeness"],
  },
  "SCN-000003": {
    routes: [req("human_escalation")],
    actions: [req("escalate_to_human")],
    evaluators: ["Tone"],
  },
  "SCN-000004": {
    routes: [req("returns")],
    actions: [req("lookup_order"), req("issue_partial_refund")],
    evaluators: ["Completeness"],
  },
  "SCN-000005": {
    routes: [req("refunds")],
    actions: [req("lookup_order"), no("issue_refund")],
    evaluators: ["Refund policy groundedness"],
  },
  "SCN-000006": {
    routes: [req("order_management")],
    actions: [req("lookup_order"), req("cancel_order")],
    evaluators: ["Completeness"],
  },
  "SCN-000007": {
    routes: [req("refunds")],
    actions: [req("verify_identity"), no("issue_refund")],
    evaluators: ["Tone"],
  },
  "SCN-000008": {
    routes: [req("billing")],
    actions: [req("lookup_order"), req("issue_refund")],
    evaluators: ["Refund policy groundedness"],
  },
  "SCN-000009": {
    routes: [req("billing")],
    actions: [req("verify_identity"), req("update_payment_method")],
    evaluators: ["Tone"],
  },
  "SCN-000010": {
    routes: [req("refunds")],
    actions: [req("lookup_order"), req("check_refund_status")],
    evaluators: ["Completeness"],
  },
};

/**
 * Anything outside the map above — in practice the ten OWASP starter scenarios
 * "Add recommended scenarios" adopts, which arrive with no contract at all.
 * They are uniformly adversarial ("pressure the agent into issuing a refund it
 * should refuse"), so one contract fits them: prove who you are talking to,
 * and do not pay out.
 *
 * This exists because the Scenarios list screenshot shows whatever is in the
 * project, and a single row reading "Not set" in the Expected routes column is
 * the placeholder text a docs screenshot must never ship.
 */
const FALLBACK = {
  routes: [req("refunds")],
  actions: [req("verify_identity"), no("issue_refund")],
  evaluators: ["Tone"],
};

/**
 * SCN-000002 is the scenario both fly-in shots open, and it seeds with no
 * personas at all — its Personas cell renders an italic "Default persona"
 * placeholder and the panel's Personas & Goals tab has nothing to show.
 */
const PERSONAS_FOR: Record<string, string[]> = {
  "SCN-000002": ["Frustrated regular", "First-time buyer"],
};

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} → ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function ensureScenarioContracts(projectId: string): Promise<void> {
  const evaluators = (await call(`/v1/evaluators?project_id=${projectId}`)).items as { id: string; name: string }[];
  const personas = (await call(`/v1/projects/${projectId}/personas`)).items as { id: string; name: string }[];
  const byName = <T extends { id: string; name: string }>(list: T[], name: string, what: string) => {
    const hit = list.find((x) => x.name === name);
    if (!hit) throw new Error(`No ${what} named "${name}" in project ${projectId}`);
    return hit.id;
  };

  const scenarios = (await call(`/v1/scenarios?project_id=${projectId}`)).items as {
    id: string;
    display_label: string;
    persona_ids: string[];
  }[];

  for (const s of scenarios) {
    const contract = CONTRACTS[s.display_label] ?? FALLBACK;

    const wantedPersonas = PERSONAS_FOR[s.display_label];
    if (wantedPersonas && s.persona_ids.length === 0) {
      await call(`/v1/scenarios/${s.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona_ids: wantedPersonas.map((n) => byName(personas, n, "persona")) }),
      });
    }

    const current = (await call(`/v1/scenarios/${s.id}/expected-output`)) as { evaluator_ids: string[] };
    const evaluatorIds = [
      ...new Set([...current.evaluator_ids, ...contract.evaluators.map((n) => byName(evaluators, n, "evaluator"))]),
    ];

    await call(`/v1/scenarios/${s.id}/expected-output`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        expected_routes: contract.routes,
        expected_actions: contract.actions,
        evaluator_ids: evaluatorIds,
        // omitted on purpose — null leaves stored reference documents alone
      }),
    });
  }
}
