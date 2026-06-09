export const meta = {
  name: 'doc-plan-v2026-06-09-1',
  description: 'Build the v2026.06.09.1 documentation plan: asset inventory, hero-demo IA judge panel, per-page roster + claim-maps, adversarial review',
  phases: [
    { title: 'Inventory', detail: 'parallel catalog of portable assets + authoritative claims' },
    { title: 'Design', detail: 'competing hero-demo IAs, judged, synthesized' },
    { title: 'Roster', detail: 'per-page ticket spec + claim-map drafting' },
    { title: 'Review', detail: 'adversarial critique + final plan synthesis' },
  ],
}

const REPO = '/Users/brady.hunt/Developer/docs'
const APP = '/Users/brady.hunt/Developer/trust-ai-app'
const PROTO = '/Users/brady.hunt/Downloads/Paddington UIUX - brady v7'
const RELEASE = 'v2026.06.09.1'

const GROUND = `
## Context — Doc Kit plan for ${RELEASE}
You are helping plan the documentation for the largest Trust AI release. Read the Doc Kit playbook
at ${REPO}/docs-plan/doc-kit/00-playbook.md and templates under ${REPO}/docs-plan/doc-kit/templates/.
Get the release notes with: gh release view ${RELEASE} --repo Provar-TrustAI/trustai-app
SOURCE OF TRUTH = the shipped app + release notes + ADRs (${APP}/docs/decisions/). The Paddington v7
prototype at "${PROTO}" is a DESIGN REFERENCE ONLY — it is the source for interactive demo embeds,
never for a behavioral claim. When prototype and app disagree, the app wins.
Decisions already locked with the human (Brady):
- Trust Agent = ONE rich concept page (concepts/trust-agent.mdx) covering shells/transcript/approvals/objects, + focused how-tos.
- Demo set approved: floating-chat (T3), autoplay walkthrough (T3), HITL approval cards (T3), Playground simulate (T2).
- Brady's hero-demo concern (CRITICAL): each embedded demo must handle ONE concept and do it clearly and cleanly.
  The full autoplay walkthrough has wow factor but may be too much to take in. Resolve this tension.
- A flagship agent tutorial IS in scope (tutorials/evaluate-with-the-trust-agent.mdx).
- Surfaces: Trust Agent; Scenarios & Playground; Multi-tenancy & infra (light, security-shaped).
`

const PAGES = [
  { path: 'concepts/trust-agent.mdx', action: 'create', type: 'concept', surface: 'Trust Agent', note: 'rich page: shells (full/dock/pill) + floating chat, streaming transcript, HITL approvals, clickable objects + side rail. Disambiguate from the existing "Agent Versions" page (the thing under test).' },
  { path: 'concepts/scenarios.mdx', action: 'create', type: 'concept', surface: 'Scenarios', note: 'persona/goal scenario sets + generate-from-scratch wizard; persona+goal simulation at evaluation time.' },
  { path: 'concepts/playground.mdx', action: 'create', type: 'concept', surface: 'Playground', note: 'live chat-with / simulate-agent surface.' },
  { path: 'concepts/multi-tenancy.mdx', action: 'create', type: 'concept', surface: 'Multi-tenancy', note: 'LIGHT, security-shaped: organization_id enforcement across the data model, cross-tenant denial at the repository layer.' },
  { path: 'concepts/overview.mdx', action: 'update', type: 'concept', surface: 'Overview', note: 'place the Trust Agent + Scenarios/Playground into the existing domain model (Projects>Sessions>Annotations>Datasets>Evaluators>Evaluations>Agent Versions).' },
  { path: 'how-to/work-with-the-trust-agent.mdx', action: 'create', type: 'how-to', surface: 'Trust Agent', note: 'task recipe: open the agent, the three shells, ask it something, read the transcript + side rail.' },
  { path: 'how-to/approve-agent-writes.mdx', action: 'create', type: 'how-to', surface: 'Trust Agent', note: 'task recipe: respond to permission / single-question / multi-question approval cards; review a write preview (diff/dependencies/proposed state); approve so the write executes.' },
  { path: 'how-to/simulate-with-scenarios.mdx', action: 'create', type: 'how-to', surface: 'Scenarios', note: 'task recipe: build a scenario set (incl. generate wizard), run a simulation in the Playground, drive persona+goal simulation at evaluation time.' },
  { path: 'tutorials/evaluate-with-the-trust-agent.mdx', action: 'create', type: 'tutorial', surface: 'Trust Agent', note: 'FLAGSHIP learning-oriented end-to-end: chat with the Trust Agent to build/run an evaluation, approving its writes along the way. The capstone where the FULL autoplay walkthrough belongs.' },
  { path: 'changelog.mdx', action: 'update', type: 'reference', surface: 'Changelog', note: 'add the v2026.06.09.1 Update block from the release notes.' },
  { path: 'glossary.mdx', action: 'update', type: 'reference', surface: 'Glossary', note: 'add terms: Trust Agent, shell (full/dock/pill), streaming transcript, side rail, HITL approval, write preview, scenario, persona, goal, Playground, simulation, organization/tenant.' },
]

// ---- schemas ----
const PROTO_ASSET_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['assets', 'heroNotes'],
  properties: {
    assets: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['name', 'sourceFile', 'illustratesConcept', 'mapsToPage', 'selfContained', 'digestibility', 'recommendedTier', 'portNotes'],
      properties: {
        name: { type: 'string' },
        sourceFile: { type: 'string', description: 'file + section/line range in the prototype' },
        illustratesConcept: { type: 'string', description: 'the ONE concept this asset teaches best' },
        mapsToPage: { type: 'string', description: 'which planned doc page it belongs on' },
        selfContained: { type: 'boolean' },
        digestibility: { type: 'integer', description: '1=overwhelming, 5=instantly clear as a single-concept demo' },
        recommendedTier: { type: 'string', enum: ['T1', 'T2', 'T3'] },
        portNotes: { type: 'string', description: 'how to extract/sanitize for embedding; coupling/risks' },
      },
    } },
    heroNotes: { type: 'string', description: 'guidance on taming the agent_autoplay walkthrough into digestible single-concept pieces vs leaving it whole' },
  },
}
const EXISTING_ASSET_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['existing', 'gaps', 'newCaptureScripts'],
  properties: {
    existing: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['path', 'shows', 'reusableFor'], properties: { path: { type: 'string' }, shows: { type: 'string' }, reusableFor: { type: 'string' } } } },
    gaps: { type: 'array', items: { type: 'string', description: 'a release surface that has NO usable static asset yet' } },
    newCaptureScripts: { type: 'array', items: { type: 'string', description: 'a captures/ script to add (surface + what it captures)' } },
  },
}
const CLAIMS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['surface', 'claims'],
  properties: {
    surface: { type: 'string' },
    claims: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['claim', 'authority', 'verifyAgainstApp'],
      properties: {
        claim: { type: 'string' },
        authority: { type: 'string', description: 'release-notes section, ADR file, or observed app behavior' },
        verifyAgainstApp: { type: 'string', description: 'the concrete drive: route + interaction + observable outcome' },
      },
    } },
  },
}
const DEMO_IA_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['approachName', 'summary', 'assignments', 'tamesOverloadHow', 'wowPlacement', 'tradeoffs'],
  properties: {
    approachName: { type: 'string' },
    summary: { type: 'string' },
    assignments: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['page', 'tier', 'artifact', 'singleConcept', 'mintlifyWiring'], properties: {
      page: { type: 'string' }, tier: { type: 'string', enum: ['T1', 'T2', 'T3'] }, artifact: { type: 'string' }, singleConcept: { type: 'string' }, mintlifyWiring: { type: 'string', description: 'how it embeds: Frame/iframe/Tabs/Accordion/progressive-disclosure' } } } },
    tamesOverloadHow: { type: 'string' },
    wowPlacement: { type: 'string' },
    tradeoffs: { type: 'string' },
  },
}
const JUDGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['ranking', 'bestApproach', 'rationale', 'mergeAdvice'],
  properties: {
    ranking: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['approachName', 'oneConceptDiscipline', 'clarity', 'wowWhereItCounts', 'bloatRisk', 'overall'], properties: {
      approachName: { type: 'string' }, oneConceptDiscipline: { type: 'integer' }, clarity: { type: 'integer' }, wowWhereItCounts: { type: 'integer' }, bloatRisk: { type: 'integer', description: '1=bloated,10=lean' }, overall: { type: 'integer' } } } },
    bestApproach: { type: 'string' },
    rationale: { type: 'string' },
    mergeAdvice: { type: 'string', description: 'best ideas from the runners-up to graft into the winner' },
  },
}
const DEMO_FINAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['chosenApproach', 'demoBudgetTable', 'assignments', 'heroDemoGuidance', 'newPrimitives'],
  properties: {
    chosenApproach: { type: 'string' },
    demoBudgetTable: { type: 'string', description: 'markdown table: page | tier | artifact | single concept | wiring' },
    assignments: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['page', 'tier', 'artifact'], properties: { page: { type: 'string' }, tier: { type: 'string' }, artifact: { type: 'string' } } } },
    heroDemoGuidance: { type: 'string', description: 'the resolution of the wow-vs-overload tension, in plain terms the human can approve' },
    newPrimitives: { type: 'array', items: { type: 'string', description: 'net-new shared doc components/conventions needed (Wave 0 doc-primitive tickets)' } },
  },
}
const PAGE_SPEC_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'action', 'diataxisType', 'title', 'navPlacement', 'sourceOfTruth', 'claimMap', 'demoTier', 'demoArtifact', 'acceptance', 'intentionalDivergence', 'outOfScope', 'filesToTouch', 'blockedBy'],
  properties: {
    page: { type: 'string' }, action: { type: 'string' }, diataxisType: { type: 'string' },
    title: { type: 'string' }, navPlacement: { type: 'string' },
    sourceOfTruth: { type: 'array', items: { type: 'string' } },
    claimMap: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['n', 'claim', 'verifyAgainstApp', 'authority'], properties: { n: { type: 'integer' }, claim: { type: 'string' }, verifyAgainstApp: { type: 'string' }, authority: { type: 'string' } } } },
    demoTier: { type: 'string' }, demoArtifact: { type: 'string' },
    acceptance: { type: 'array', items: { type: 'string' } },
    intentionalDivergence: { type: 'array', items: { type: 'string' } },
    outOfScope: { type: 'array', items: { type: 'string' } },
    filesToTouch: { type: 'array', items: { type: 'string' } },
    blockedBy: { type: 'array', items: { type: 'string', description: 'other page paths this is blockedBy (concept-before-howto/tutorial)' } },
  },
}
const CRITIQUE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['bloatFindings', 'completenessGaps', 'sequencingIssues', 'terminologyRisks', 'unverifiableClaims', 'verdict'],
  properties: {
    bloatFindings: { type: 'array', items: { type: 'string' } },
    completenessGaps: { type: 'array', items: { type: 'string', description: 'a release headline capability with no home in the plan' } },
    sequencingIssues: { type: 'array', items: { type: 'string' } },
    terminologyRisks: { type: 'array', items: { type: 'string' } },
    unverifiableClaims: { type: 'array', items: { type: 'string' } },
    verdict: { type: 'string' },
  },
}

// ===== Phase 1 — Inventory (barrier: design needs the full inventory) =====
phase('Inventory')
const inv = await parallel([
  () => agent(`${GROUND}

TASK: Catalog every portable UX-illustrating asset in the Paddington v7 prototype that could be embedded
in the docs as an interactive or static demo. Open and read (in excerpts):
- "${PROTO}/Paddington v2 Library.html" — the self-contained component gallery; it has TWO live demos (a
  floating-chat shell-transition demo and a QA-flow multi-question card). Catalog every section + both demos.
- "${PROTO}/src/agent_autoplay.jsx" — the self-playing end-to-end walkthrough (transport controls). Identify
  its discrete BEATS (clarify, plan, stream, tool-call, approval, object-result, side-rail) so we can judge
  whether to slice it into focused single-concept clips vs embed it whole.
- "${PROTO}/src/agent_v6.jsx" — the six core components (V6Message, V6TCC, V6Reasoning, V6PermissionCard,
  V6QACard/V6QAFlowCard, V6StreamSidebar). Which are self-containable single-concept demos.
For each asset, map it to ONE concept it teaches best and ONE planned doc page (from this list: ${PAGES.map(p=>p.path).join(', ')}).
Score digestibility 1-5 (how cleanly it reads as a SINGLE-concept demo). Recommend a tier (T1 static / T2 rendered
walkthrough / T3 live embed). In heroNotes, give specific guidance on Brady's concern: how to make the
agent_autoplay walkthrough digestible (slice into chapters/clips per concept? leave whole in the tutorial only?).`,
    { label: 'inv:prototype-assets', phase: 'Inventory', schema: PROTO_ASSET_SCHEMA }),

  () => agent(`${GROUND}

TASK: Inventory the EXISTING static assets and capture tooling in the docs repo and map them to the release surfaces.
- List ${REPO}/images/*.{png,gif} — what each shows, and which release surface (if any) it can still illustrate.
- Read ${REPO}/captures/README.md and ${REPO}/captures/scripts/*.ts — the Playwright capture scripts + their pnpm commands.
- Read ${REPO}/pipeline/README.md — the Remotion rig (for T2 walkthroughs).
Identify GAPS: which ${RELEASE} surfaces (Trust Agent shells/transcript/approvals/objects, Scenarios, Playground,
Multi-tenancy) have NO usable static asset yet. Propose the new captures/ scripts to add (surface + what each captures
against the running app).`,
    { label: 'inv:existing-assets', phase: 'Inventory', schema: EXISTING_ASSET_SCHEMA }),

  () => agent(`${GROUND}

TASK: Extract the authoritative CLAIMS for the TRUST AGENT surface (the in-app assistant at /projects/:id/agent —
shells, streaming transcript, HITL approvals, clickable objects + side rail). Run \`gh release view ${RELEASE} --repo
Provar-TrustAI/trustai-app\` and read the Trust Agent sections. Read any referenced ADRs under ${APP}/docs/decisions/
(grep for agent/approval/streaming/tenant). Produce a deduplicated list of every factual/behavioral claim the docs
will make about the Trust Agent, each with its authority (release-notes section / ADR / observed behavior) and the
concrete way to verify it against the running app (route + interaction + observable outcome). Be exhaustive — this
feeds the claim-maps. Flag the "Trust Agent" vs "Agent Versions" terminology trap explicitly.`,
    { label: 'inv:claims-trust-agent', phase: 'Inventory', schema: CLAIMS_SCHEMA }),

  () => agent(`${GROUND}

TASK: Extract the authoritative CLAIMS for (a) Scenarios & Playground and (b) Multi-tenancy & infra. Run
\`gh release view ${RELEASE} --repo Provar-TrustAI/trustai-app\` and read those sections; read referenced ADRs under
${APP}/docs/decisions/ (grep for scenario/persona/simulation/playground/organization/tenant). Produce a deduplicated
claims list (claim + authority + how-to-verify-against-app) covering: persona/goal scenario sets, the generate-from-
scratch wizard, Playground chat/simulate, persona+goal simulation at evaluation time, and organization_id enforcement
with cross-tenant denial at the repository layer. Be exhaustive.`,
    { label: 'inv:claims-scenarios-tenancy', phase: 'Inventory', schema: CLAIMS_SCHEMA }),
])
const protoAssets = inv[0], existingAssets = inv[1], claimsTA = inv[2], claimsST = inv[3]
log(`Inventory done: ${protoAssets?.assets?.length||0} prototype assets, ${(claimsTA?.claims?.length||0)+(claimsST?.claims?.length||0)} claims`)

// ===== Phase 2 — Design: competing hero-demo IAs, judged, synthesized (barrier) =====
phase('Design')
const invDigest = `
## Prototype assets available
${JSON.stringify(protoAssets, null, 1)}
## Existing static assets + gaps
${JSON.stringify(existingAssets, null, 1)}
## Pages in scope
${PAGES.map(p => `- ${p.path} (${p.action} ${p.type}, ${p.surface}): ${p.note}`).join('\n')}
`
const DESIGNERS = [
  { name: 'focused-clips', brief: 'Each concept/how-to page gets ONLY a focused single-concept demo; the FULL agent_autoplay walkthrough lives solely in the flagship tutorial as the capstone. Maximize one-concept clarity; concentrate wow in the tutorial.' },
  { name: 'progressive-disclosure', brief: 'Every embed defaults to a static screenshot, with a play/open-interactive reveal (Mintlify Tabs/Accordion). Lower upfront cognitive load everywhere; the autoplay is available but gated behind a click.' },
  { name: 'chaptered-walkthrough', brief: 'Keep the agent_autoplay as ONE artifact but add chapter markers (it already has transport controls); embed the whole thing once (tutorial) and deep-link to chapters from each concept section instead of separate clips.' },
]
const designs = await parallel(DESIGNERS.map(d => () =>
  agent(`${GROUND}
${invDigest}

You are a documentation-experience designer. Design a COMPLETE hero-demo information architecture for these docs using
this approach: "${d.name}" — ${d.brief}

Hard constraints: the four approved demos are floating-chat (T3), autoplay walkthrough (T3), HITL approval cards (T3),
Playground simulate (T2). Budget: at most ONE T2/T3 artifact per page, each teaching ONE concept. Resolve Brady's
tension: the autoplay has wow factor but may overwhelm as a single block. For EVERY page in scope, assign its demo
(tier + artifact + the single concept it teaches + the exact Mintlify wiring). Explain how this approach tames overload
and where the wow lands.`,
    { label: `design:${d.name}`, phase: 'Design', schema: DEMO_IA_SCHEMA })
))
const validDesigns = designs.filter(Boolean)
const designsDigest = validDesigns.map(d => JSON.stringify(d, null, 1)).join('\n---\n')

const judges = await parallel(['clarity-first', 'stakeholder-wow', 'maintenance-cost'].map(lens => () =>
  agent(`${GROUND}

Three competing hero-demo information architectures for the ${RELEASE} docs follow. Judge ALL THREE through the
"${lens}" lens, scoring each on: one-concept discipline, clarity, wow-where-it-counts, bloat-risk (1=bloated,10=lean),
overall. Brady's north star: each embedded demo must handle ONE concept and do it clearly and cleanly; the full
walkthrough has wow but may be too much to take in. Rank them, name the best, and advise which ideas from the
runners-up to graft into the winner.

## Designs
${designsDigest}`,
    { label: `judge:${lens}`, phase: 'Design', schema: JUDGE_SCHEMA })
)).then(r => r.filter(Boolean))

const demoFinal = await agent(`${GROUND}
${invDigest}

You are the design synthesizer. Here are three competing hero-demo IAs and three judge panels' scores. Synthesize the
FINAL hero-demo plan: pick the winning approach, graft the best ideas from the runners-up, and produce the definitive
demo budget. For every page, give tier + artifact + the single concept it teaches + Mintlify wiring. Write
heroDemoGuidance as a plain-language resolution of the wow-vs-overload concern that Brady can approve at a glance.
List any net-new shared doc primitives needed (e.g. a reusable demo-embed wrapper) as Wave 0 doc-primitive tickets.

## Designs
${designsDigest}

## Judge panels
${judges.map(j => JSON.stringify(j, null, 1)).join('\n---\n')}`,
  { label: 'design:synthesize', phase: 'Design', schema: DEMO_FINAL_SCHEMA })
log(`Design chosen: ${demoFinal?.chosenApproach}`)

// ===== Phase 3 — Roster: per-page ticket spec + claim-map (parallel per page) =====
phase('Roster')
const allClaims = `
## Trust Agent claims
${JSON.stringify(claimsTA?.claims || [], null, 1)}
## Scenarios/Playground + Multi-tenancy claims
${JSON.stringify(claimsST?.claims || [], null, 1)}
`
const demoAssignDigest = JSON.stringify(demoFinal?.assignments || [], null, 1)
const specs = await parallel(PAGES.map(p => () =>
  agent(`${GROUND}

Draft the COMPLETE doc-page ticket spec for ONE page, following ${REPO}/docs-plan/doc-kit/templates/page-ticket-spec.md
and templates/claim-map.md. Read the existing page if action=update (${REPO}/${p.path}). Read the surrounding pages to
match voice. Ground every claim in the release notes + ADRs (NOT the prototype). Each claim-map row needs a concrete
"verify against the running app" drive (route + interaction + observable outcome).

## Page
- path: ${p.path}
- action: ${p.action}
- diataxis: ${p.type}
- surface: ${p.surface}
- note: ${p.note}

## Authoritative claims available (filter to the ones this page makes)
${allClaims}

## Demo assignment for this page (from the synthesized demo plan)
${demoAssignDigest}

Produce a complete, unambiguous brief. The claim-map must be exhaustive for this page's scope. Note blockedBy
(concept-before-how-to/tutorial). For the tutorial and the approve-writes how-to, be precise about the end-to-end steps.`,
    { label: `roster:${p.path.split('/').pop()}`, phase: 'Roster', schema: PAGE_SPEC_SCHEMA })
)).then(r => r.filter(Boolean))
log(`Roster drafted: ${specs.length}/${PAGES.length} page specs`)

// ===== Phase 4 — Adversarial review + final synthesis =====
phase('Review')
const planDigest = `
## Demo plan
${JSON.stringify(demoFinal, null, 1)}
## Page specs (${specs.length})
${specs.map(s => JSON.stringify({ page: s.page, action: s.action, type: s.diataxisType, demo: `${s.demoTier} ${s.demoArtifact}`, claims: s.claimMap?.length, blockedBy: s.blockedBy })).join('\n')}
`
const critique = await agent(`${GROUND}

Adversarially review this ${RELEASE} documentation plan. Find: BLOAT (any page with >1 T2/T3 artifact, or a demo that
does not teach one clean concept); COMPLETENESS GAPS (run \`gh release view ${RELEASE} --repo Provar-TrustAI/trustai-app\`
and check every headline capability has a home in the plan — Trust Agent shells/transcript/approvals/objects, Scenarios,
generate wizard, Playground simulate, persona+goal at eval time, multi-tenancy); SEQUENCING issues (deadlocks, a how-to
not blockedBy its concept); TERMINOLOGY risks (Trust Agent vs Agent Versions, and others); UNVERIFIABLE claims (claim-map
rows with no real drive against the app). Be a harsh critic — this is the last gate before the human sees it.

${planDigest}`,
  { label: 'review:adversarial', phase: 'Review', schema: CRITIQUE_SCHEMA })

const finalPlan = await agent(`${GROUND}

You are the plan synthesizer. Assemble the FINAL ${RELEASE} documentation plan as polished markdown ready to be saved as
a Linear project document and presented to Brady. Incorporate the adversarial critique (fix or explicitly accept each
finding). Structure:
1. **Summary** — release, slug (docs-v2026-06-09-1), worktrunk (worktrunk/docs-v2026-06-09-1), surfaces.
2. **Surface to Diataxis map** — the page roster table (path, action, type, surface).
3. **Hero-demo plan** — the demo budget table + the wow-vs-overload resolution (heroDemoGuidance), front and center.
4. **Wave plan** — Wave 0 (doc-primitives + demo scaffold), then waves by surface; concept-before-how-to/tutorial;
   demo assets blockedBy their page; each wave ends with a wave-convergence gate. Use templates/wave-plan.md shape.
5. **Per-page briefs** — for each page: action, diataxis, the claim-map (numbered), demo tier+artifact, blockedBy.
6. **Risks & open questions** — from the critique, plus anything needing Brady's call.
Also return, separately from the markdown (clearly delimited), a crisp BLUF (3-5 sentences) to lead with when presenting
to Brady, and a one-paragraph plain-language statement of the hero-demo decision.

## Demo plan
${JSON.stringify(demoFinal, null, 1)}
## Page specs
${specs.map(s => JSON.stringify(s, null, 1)).join('\n---\n')}
## Adversarial critique
${JSON.stringify(critique, null, 1)}`,
  { label: 'review:final-plan', phase: 'Review' })

return {
  release: RELEASE,
  slug: 'docs-v2026-06-09-1',
  worktrunk: 'worktrunk/docs-v2026-06-09-1',
  demoFinal,
  critique,
  pageCount: specs.length,
  specs,
  finalPlanMarkdown: finalPlan,
}
