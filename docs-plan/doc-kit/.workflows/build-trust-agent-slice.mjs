export const meta = {
  name: 'build-trust-agent-slice',
  description: 'Build the shareable Trust Agent slice: 3 sanitized interactive prototype demos + the 3 pages that embed them',
  phases: [
    { title: 'Demos', detail: 'port + sanitize the 3 Tier-3 live prototypes' },
    { title: 'Pages', detail: 'author the 3 demo-bearing MDX pages from the claim-maps' },
  ],
}

const REPO = '/Users/brady.hunt/Developer/docs'
const APP = '/Users/brady.hunt/Developer/trust-ai-app'
const PROTO = '/Users/brady.hunt/Downloads/Paddington UIUX - brady v7'
const RELEASE = 'v2026.06.09.1'
const SPECS = '/tmp/demo-page-specs.json'

const SANITIZE = `
SANITIZATION CHECKLIST (mandatory — this is a public-ish internal-stakeholder artifact):
- Strip any real/internal/customer names, emails, account IDs, internal URLs from fixtures; replace with obviously-synthetic sample data.
- Keep React/Babel CDN pinned with the integrity hashes already in the prototype HTML; never @latest.
- Self-contained: NO external src= except the pinned CDN scripts; NO localhost, NO absolute paths from a dev machine; inline every CSS the demo needs.
- Remove dead routes/surfaces the demo does not exercise — keep ONLY the one feature.
- Add a visible one-line footer caption inside the page: "Interactive prototype — design reference. Shipped behavior is described in the docs."
- Weight target < ~300KB.
After writing, re-read your output file and confirm: it opens with <!DOCTYPE html>, has the pinned CDN <script> tags, contains the component + a ReactDOM mount, and has NO reference to any other src/ file.`

const DEMOS = [
  {
    file: 'demos/floating-chat.html',
    label: 'demo:floating-chat',
    prompt: `Produce a SELF-CONTAINED, sanitized interactive prototype: the FLOATING-CHAT SHELL TRANSITION demo, written to ${REPO}/demos/floating-chat.html.

SOURCE: "${PROTO}/Paddington v2 Library.html". The floating-chat demo is the "#floating" gallery section — its markup is around lines 1576-1591 and its driver IIFE around lines 1956-2180; its CSS classes are prefixed fx-*, ss-*, tcc-* (plus the shared app-styles/agent tokens already inlined in that file's <head>). Read the file (in excerpts) to extract exactly those pieces + the <head> (pinned React 18.3.1 + ReactDOM + Babel standalone CDN tags with their integrity hashes, and the inlined CSS the demo uses).

CRITICAL RE-AUTHORING (do NOT skip — this is the whole point): as sourced, the floating-chat SCRIPT array (around lines 2030-2048) is a ~22-second AUTO-PLAYING mini-walkthrough (stream a finding -> review 47 sessions -> create a scenario set -> clarify -> answer -> run an eval). That makes the embed a hidden second walkthrough. You MUST GUT the SCRIPT down to a SHORT, calm stream+tool loop (e.g. the agent streams one short message and shows ONE tool-call card, then idles) so the demo teaches ONLY the SHELLS concept. Make the shell controls genuinely USER-DRIVEN: the reader clicks minimize/expand/close to move the SAME running chat between full / docked / pill — the transition must NOT be on a setTimeout. The single concept this demo teaches: one running session, three shells, state preserved when you switch.

${SANITIZE}

Return a short report: what you trimmed from the SCRIPT, how the shell toggles are now user-driven, and the final file size.`,
  },
  {
    file: 'demos/qa-flow.html',
    label: 'demo:qa-flow',
    prompt: `Produce a SELF-CONTAINED, sanitized interactive prototype: the MULTI-QUESTION CLARIFICATION (QA-flow) demo, written to ${REPO}/demos/qa-flow.html.

SOURCE: "${PROTO}/Paddington v2 Library.html". The QA-flow demo is the "#qa-flow" gallery section (markup around line 1109, driver IIFE around lines 1860-1952); CSS classes prefixed qa-*, qaf-*, pc-* (plus the shared tokens inlined in that file's <head>). Read the file in excerpts and extract exactly those pieces + the <head> (pinned CDN tags + the inlined CSS the demo uses).

This demo is ALREADY a clean single-concept, user-driven demo (the cleanest in the kit): a composer-replacement card batching 2-5 clarifying questions that the reader navigates with Back / Next, with a write-in "Other" option, progress dots gating Submit, and a consolidated resolved mark at the end. Keep it user-driven (the reader clicks through). Trim any surrounding gallery chrome so ONLY this card renders. Single concept: read and answer a batched clarification as one exchange.

${SANITIZE}

Return a short report: confirm it is user-driven, what gallery chrome you trimmed, final file size.`,
  },
  {
    file: 'demos/permission-card.html',
    label: 'demo:permission-card',
    prompt: `Produce a SELF-CONTAINED, sanitized interactive prototype: the PERMISSION / APPROVAL CARD demo, written to ${REPO}/demos/permission-card.html.

SOURCE: the V6PermissionCard component in "${PROTO}/src/agent_v6.jsx" (around lines 555-668), and the matching CSS in "${PROTO}/src/agent.css" / "${PROTO}/src/paddington-lib.css" (pc-* / permission classes). You will need to BUILD a small wrapper HTML: <head> with pinned React 18.3.1 UMD + ReactDOM + Babel standalone CDN (copy the exact pinned <script> tags + integrity hashes from "${PROTO}/Paddington v2 Library.html" <head>), the inlined CSS the card needs, then the V6PermissionCard component in a text/babel block, then a ReactDOM mount that renders 2-3 representative states the reader can interact with: a Create approval (Approve / Reject-with-note), and a Delete approval (danger styling). DROP any _autoplay / timeline wiring — this is a user-driven card, the reader clicks Approve or Reject.

NOTE the accuracy seam (documented, not your problem to fix here): the prototype card does NOT render the rich write preview (diff/dependencies/proposed state) that actually shipped. That is handled on the docs page via a shipped screenshot in Tab 1; your job is only the faithful interactive card. Single concept: the approval interaction.

${SANITIZE}

Return a short report: which states you rendered, that autoplay was dropped, final file size.`,
  },
]

phase('Demos')
const demoResults = await parallel(DEMOS.map(d => () => agent(d.prompt, { label: d.label, phase: 'Demos' })))
log(`Demos built: ${demoResults.filter(Boolean).length}/3`)

const PAGE_RESULT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'claimsWritten', 'auditPending', 'demoEmbedded', 'notes'],
  properties: {
    page: { type: 'string' },
    claimsWritten: { type: 'integer' },
    auditPending: { type: 'array', items: { type: 'string', description: 'claims that still need verification by driving the running app' } },
    demoEmbedded: { type: 'string' },
    notes: { type: 'string' },
  },
}

const PAGE_GROUND = `
You are authoring ONE Mintlify MDX page for the ${RELEASE} docs, writing it into the repo at ${REPO}.
Read the Doc Kit playbook (${REPO}/docs-plan/doc-kit/00-playbook.md) and demo-tooling (${REPO}/docs-plan/doc-kit/demo-tooling.md).
Read the page's full spec + claim-map from ${SPECS} (a JSON array of 3 page specs; find yours by its title/page).
Match the VOICE + component style of the existing pages (read ${REPO}/concepts/sessions.mdx and ${REPO}/concepts/evaluators.mdx as exemplars: frontmatter with title+icon+description, sentence-case headings, second person, <Frame>/<Tabs>/<Steps>/<Note>).

SOURCE OF TRUTH: the shipped app + release notes + ADRs. Run \`gh release view ${RELEASE} --repo Provar-TrustAI/trustai-app\` and read the relevant section; read referenced ADRs under ${APP}/docs/decisions/. The Paddington prototype is a DESIGN REFERENCE only.

ACCURACY DISCIPLINE (you do NOT have the running app this session):
- Write every claim from the claim-map, sourced from the release notes + ADRs (authoritative for what shipped).
- For any claim whose claim-map "verify" column requires DRIVING the app (a UI label, an exact route, an ordering, a behavior you cannot confirm from notes+ADRs alone), still write it from the best authority, but add an MDX comment immediately after it: {/* ACCURACY-AUDIT-PENDING: <the claim> — verify against the app on the release tag */}. These markers are the to-do list for the later accuracy audit. Do NOT invent UI labels — use exactly what the release notes/ADRs state; if unknown, describe behavior generically and mark it pending.
- Respect the [FIX] notes in the spec verbatim (e.g. "Scenarios" is a UI label over the /datasets route; the side rail section label is "Progress"; latency = model time only; Trust Agent is NOT Agent Versions).

DEMO EMBED: use the PrototypeEmbed pattern from demo-tooling.md — a <Frame> with an <iframe src="/demos/<file>.html" width="100%" height="..." loading="lazy" title="..."> and the standard caption "Interactive prototype — ... Design reference; shipped behavior is described above." The surrounding prose is the authority on shipped behavior; the embed is a labeled reference.`

phase('Pages')
const PAGES = [
  { page: 'concepts/trust-agent.mdx', label: 'page:trust-agent', extra: `This is the ONE rich Trust Agent concept page. Embed demos/floating-chat.html VISIBLE-ON-ARRIVAL (height ~640) teaching the three shells. Open with a clear "Trust Agent is the in-app assistant — NOT an Agent Version (the snapshot under test)" disambiguation Note near the top. Cover, each as its own calm section with a Tier-1 placeholder <Frame> (use a descriptive alt + a {/* CAPTURE-PENDING: <surface> screenshot */} marker since the screenshots are not captured yet): streaming transcript, reasoning rail, tool-call cards, clickable object table + record fly-ins, the Progress/Context/Outputs side rail, HITL approvals (cross-link the approve-writes how-to), composer + modes + clarify-first. Wrap the secondary stills in <Tabs>/<Accordion> so the page opens calm with just the floating-chat embed + intro prose. End with a <CardGroup> linking the two how-tos + the tutorial.` },
  { page: 'how-to/work-with-the-trust-agent.mdx', label: 'page:work-with', extra: `Task-recipe how-to. Embed demos/qa-flow.html at the "handle a clarifying question" step (it OWNS the multi-question concept). Use <Steps> for the recipe: open the agent, recognize the three shells (inline shell STILLS as placeholder <Frame>s with CAPTURE-PENDING markers — do NOT re-build a shells demo; cross-link concepts/trust-agent for that), compose a request + modes, read the streaming transcript + tool-call cards + side rail, answer a clarification (the qa-flow embed here), note that writes pause for approval (cross-link approve-writes). Keep it task-ordered and concise.` },
  { page: 'how-to/approve-agent-writes.mdx', label: 'page:approve-writes', extra: `Task-recipe how-to for HITL approvals. Use the AccuracySeamTabs pattern for the approval card: a <Tabs> where Tab 1 (default) is the SHIPPED write preview (a placeholder <Frame> for agent-write-preview.png with a {/* CAPTURE-PENDING: shipped write-preview (diff/dependencies/proposed state) #1722 */} marker) and Tab 2 is the interactive prototype <iframe src="/demos/permission-card.html">. Make explicit in prose that approving EXECUTES the real write (verify-by-persistence) — mark that claim ACCURACY-AUDIT-PENDING. Cover: permission vs single-question vs multi-question cards, reject-with-note, the resolved audit echo, the backgrounded-gate indicator. Cross-link work-with for the multi-question flow demo.` },
]
const pageResults = await parallel(PAGES.map(p => () =>
  agent(`${PAGE_GROUND}

## Your page: ${p.page}
${p.extra}

Write the complete MDX file to ${REPO}/${p.page}. Then re-read it and confirm: valid frontmatter, all demo iframes point at an existing file in ${REPO}/demos/, no unclosed MDX tags.`,
    { label: p.label, phase: 'Pages', schema: PAGE_RESULT_SCHEMA })
)).then(r => r.filter(Boolean))

return {
  demos: DEMOS.map(d => d.file),
  demoReports: demoResults,
  pages: pageResults,
}
