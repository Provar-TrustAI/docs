export const meta = {
  name: 'build-remaining-pages',
  description: 'Author the remaining 9 v2026.06.09.1 pages (scenarios, playground, multi-tenancy, overview, simulate how-to, tutorial, changelog, glossary, agent-versions note)',
  phases: [{ title: 'Pages', detail: 'author/update the remaining pages in parallel' }],
}

const REPO = '/Users/brady.hunt/Developer/docs'
const APP = '/Users/brady.hunt/Developer/trust-ai-app'
const RELEASE = 'v2026.06.09.1'
const SPECS = '/tmp/remaining-specs.jsonl'

const PAGE_RESULT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'claimsWritten', 'auditPending', 'notes'],
  properties: {
    page: { type: 'string' },
    claimsWritten: { type: 'integer' },
    auditPending: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}

const GROUND = `
You are authoring ONE Mintlify MDX page for the ${RELEASE} Trust AI docs, writing into the repo at ${REPO}.
Read the Doc Kit playbook (${REPO}/docs-plan/doc-kit/00-playbook.md). Your page's full spec + claim-map is one line in
${SPECS} (JSONL — grep for your page path, then read that JSON object: title, claimMap, demoTier, acceptance,
intentionalDivergence, outOfScope). Match the VOICE + components of existing pages — read ${REPO}/concepts/sessions.mdx
and ${REPO}/concepts/trust-agent.mdx (just-built) as exemplars (frontmatter title+icon+description, sentence-case
headings, second person, <Frame>/<Tabs>/<Steps>/<Note>/<CardGroup>).

SOURCE OF TRUTH = shipped app + release notes + ADRs. Run \`gh release view ${RELEASE} --repo Provar-TrustAI/trustai-app\`
and read the relevant section; read referenced ADRs under ${APP}/docs/decisions/. The Paddington prototype is a DESIGN
REFERENCE only.

ACCURACY DISCIPLINE (you do NOT have the running app this session):
- Write every claim from the claim-map, sourced from release notes + ADRs.
- For any claim whose verification requires DRIVING the app (exact UI label, route, ordering, behavior) that you cannot
  confirm from notes+ADRs, still write the best-supported version and add an MDX comment right after it:
  {/* ACCURACY-AUDIT-PENDING: <claim> — verify against the app on the release tag */}. Do NOT invent UI labels.
- For any screenshot/asset that does not exist yet, use a placeholder <Frame> with a descriptive alt and a comment
  {/* CAPTURE-PENDING: <surface> screenshot */} — do NOT reference a real /images path that exists.
- Respect every [FIX] in the spec verbatim. Critical cross-cutting facts: "Scenarios" is a UI label over the /datasets
  route/model/API (NO /v1/scenarios; ADR-0002); the Playground toggle is "Chat / Simulate" (NOT "Ask mode"); the side
  rail section label is "Progress"; the Trust Agent (assistant) is NOT an Agent Version (the snapshot under test);
  latency = model time only; org/tenant footer is "Tenant · Role" (never "Dev Workspace · Admin").

Write the complete MDX to ${REPO}/<your page>. Re-read it: valid frontmatter, no unclosed tags, no fabricated /images path.
Do NOT edit docs.json (nav is handled separately).`

const PAGES = [
  { page: 'concepts/scenarios.mdx', label: 'scenarios', extra: `Create. T1, no live demo (use CAPTURE-PENDING placeholder <Frame>s for the scenarios list / persona editor / generate wizard). Lead with a <Note>: "Scenarios" is the nav label for the surface whose route + data model + API stay datasets (ADR-0002) — and a second disambiguation that Scenarios ≠ the Trust Agent and ≠ Agent Versions. Cover: scenario = a persona+goal row; Persona/Goal/Source columns; Manage Personas (usage counts, single default, default-protected); the 4-step generate wizard (3-pip track); eval-time simulation (the "Simulate at eval time" toggle + simulatable-row rule). End with a <Card> to how-to/simulate-with-scenarios.` },
  { page: 'concepts/playground.mdx', label: 'playground', extra: `Create. T1, no live demo (CAPTURE-PENDING placeholders). Cover: route /projects/:id/playground; grouped agent picker; the segmented toggle is "Chat / Simulate" (NOT "Ask"); Chat = manual streamed chat; Simulate = persona+goal driven with Full auto / Stay in the loop run modes; add-as-scenario; History = real persisted sessions; Playground ≠ Trust Agent. <Tabs> "Chat" / "Simulate" with placeholder stills. <Card> to how-to/simulate-with-scenarios for the moving demo.` },
  { page: 'concepts/multi-tenancy.mdx', label: 'multi-tenancy', extra: `Create. T1, security-shaped, light. AUTHOR a Mermaid diagram (\`\`\`mermaid block) of the tenant guard: request → shared tenant guard → org-scoped repository → denial (403/404) on mismatch. Cover: organization = tenant boundary (WorkOS-federated); organization_id NOT NULL across anchor tables; shared tenant guard is the single enforcement point; membership is the access gate; org-mismatch for a valid member AUTO-RECONCILES (self-healing) — NOT a hard reject; repository-layer denial. THEN one high-level "Production infrastructure" section homing release Highlight #5 (secrets externalized, IRSA, Envoy cutover, Helm, migration pre-upgrade hook) — posture only, no runbook. Mark architectural claims {/* ACCURACY-AUDIT-PENDING: ... (ADR/code, not UI-drivable) */}. Footer label is "Tenant · Role". <Warning>/<Info> callouts for the guarantees.` },
  { page: 'concepts/overview.mdx', label: 'overview', extra: `UPDATE the existing page (read it first). Seat the Trust Agent + Scenarios + Playground into the domain model WITHOUT removing the Dataset noun (the eval loop still uses Dataset everywhere). If there is a domain-model diagram, add the three new surfaces. Add a disambiguation (Trust Agent ≠ Agent Version) and a one-liner that "Scenarios" is the datasets surface's nav label. Add a <CardGroup> linking the new concept pages, and one <Card> to the tutorial. Preserve the existing prose/structure; this is an additive update.` },
  { page: 'how-to/simulate-with-scenarios.mdx', label: 'simulate', extra: `Create. T2 surface but the MP4 is not rendered yet — use a placeholder <Frame> {/* CAPTURE-PENDING: playground-simulate.mp4 */} in a <Tabs> (Tab 1 = result-fly-in still placeholder; Tab 2 = the video, pending). <Steps> recipe: build a scenario set (route is /datasets; generate wizard = 4 steps/3 pips), run a simulation in the Playground (Chat/Simulate; Full auto / Stay in the loop), add-as-scenario, then drive simulation at evaluation time (the "Simulate at eval time" toggle + simulatable-row precondition). Cross-link concepts/scenarios + concepts/playground.` },
  { page: 'tutorials/evaluate-with-the-trust-agent.mdx', label: 'tutorial', extra: `Create — the FLAGSHIP capstone. CRITICAL: define these heading anchors VERBATIM (other pages deep-link them, they are a frozen contract): a step heading that yields #ch-clarify, one #ch-plan, one #ch-approve, one #ch-objects (e.g. "## Answer the agent's clarifying questions {#ch-clarify}" etc. — use Mintlify's {#anchor} syntax or ensure the slug matches). Use <Steps>. Per step, a single-concept placeholder GIF <Frame> {/* CAPTURE-PENDING: agent-tutorial-<beat>.gif */}. The end-to-end flow: reach the default agent at /projects/:id/agent, Welcome streams, compose in Plan mode, clarify-first, streaming + reasoning, plan→confirm→execute, side rail (Progress/Context/Outputs), object table → record fly-in, permission card → approve → the write EXECUTES (mark AUDIT-PENDING), resolved audit, the agent builds a Scenario set + starts an Evaluation (route /datasets). At the VERY END, a collapsed <Accordion title="Watch the entire flow end-to-end (optional)"> with a placeholder for the full reel video {/* CAPTURE-PENDING: evaluate-with-trust-agent.mp4 */} — gated, last, click-to-play. Do NOT embed the floating-chat or permission-card live demos here.` },
  { page: 'changelog.mdx', label: 'changelog', extra: `UPDATE (read it first). PREPEND a new <Update label="v2026.06.09.1 — June 2026"> block ABOVE the existing v2026.05.26 block. Summarize the FIVE release Highlights in customer language (Trust Agent rebuilt + default; real objects/clickable tables; end-to-end HITL approvals; Scenarios & Playground; production-ready platform) with deep-links: Trust Agent → /concepts/trust-agent, approvals → /how-to/approve-agent-writes, Scenarios/Playground → /concepts/scenarios + /concepts/playground, infra → /concepts/multi-tenancy. State no /v1/scenarios API (the surface is /datasets). High confidence — straight from the release notes. Keep the existing blocks intact.` },
  { page: 'glossary.mdx', label: 'glossary', extra: `UPDATE (read it first). ADD the 12 terms (Trust Agent; shell — full/dock/pill; streaming transcript; side rail; HITL approval; write preview; scenario; persona; goal; Playground; simulation; organization/tenant) in the existing glossary style (Cards or definition list — match what is there), each linking to its owning concept page. The Trust Agent entry disambiguates from Agent Versions; the Scenario entry states nav label = Scenarios, route/model = datasets, no scenarios API. Keep existing terms.` },
  { page: 'concepts/agent-versions.mdx', label: 'agent-versions', extra: `UPDATE (read it first). This page is about the Agent VERSION (the snapshot under test) — add ONE short reverse-disambiguation <Note> near the top: an Agent Version is the thing being evaluated; it is NOT the Trust Agent (the in-app assistant — see /concepts/trust-agent). Minimal, additive edit; do not restructure the page. (This page has no claim-map line in the specs file — this Note is its whole scope.)` },
]

phase('Pages')
const results = await parallel(PAGES.map(p => () =>
  agent(`${GROUND}

## Your page: ${p.page}
${p.extra}`,
    { label: `page:${p.label}`, phase: 'Pages', schema: PAGE_RESULT_SCHEMA })
)).then(r => r.filter(Boolean))

return { built: results.length, pages: results }
