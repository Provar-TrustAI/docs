export const meta = {
  name: 'curl-to-agent-first',
  description: 'Remove inline curl/SDK from user-facing pages; re-center task guides on the Trust Agent + UI; clean concept pages; keep setup how-tos technical',
  phases: [{ title: 'Rewrite', detail: 'agent-first / curl-removal per page, by category' }],
}

const REPO = '/Users/brady.hunt/Developer/docs'

const COMMON = `
Read ${REPO}/<page> and rewrite it. AUDIENCE: largely NON-TECHNICAL — they work through the Trust
Agent (the in-app assistant) first and use the UI to observe results and drive manually when needed.
The API Reference tab (/api-reference) is the authoritative place for endpoints.

HARD RULES (all categories):
- REMOVE every inline API code block: any <CodeGroup> / fenced \`\`\`bash|sh|curl|http|json|typescript
  block showing a curl command, an SDK call, or a raw request/response. Also remove the "Or via the
  API:" lead-ins that introduce them.
- Where such a block showed HOW to do something, replace it with one plain sentence describing how you
  do it via the Trust Agent or the UI — NOT an API call. Link to /api-reference ONCE where a developer
  might want the endpoint detail (don't sprinkle it).
- Do NOT change facts, concepts, routes named in prose, frontmatter, or the page's structure beyond
  removing the code blocks and adjusting the surrounding sentence. Preserve all <Tip>/<Note>/<Warning>/
  <Card>/<Steps>/<Frame> and internal links. Keep it concise.
- Do NOT touch any {/* ACCURACY-AUDIT-PENDING ... */} or {/* CAPTURE-PENDING ... */} markers.
After editing, re-read the file: confirm NO curl/SDK code blocks remain, frontmatter valid, no broken MDX.`

const TASK_GUIDE = `${COMMON}

CATEGORY: TASK GUIDE — make it AGENT-FIRST.
- For each step/task, LEAD with what the user asks the Trust Agent, as a concrete plain-language
  example prompt in a <Note> or inline (e.g. *Ask the Trust Agent:* "Pull my latest sessions and flag
  the order-status one as a pass."). Then describe what they SEE / can do in the UI as the observation
  + manual-drive path ("You'll see ... in the Sessions list; or do it by hand: ...").
- Keep one-time technical SETUP (connecting a runtime via AgentCore/IAM) as a UI/admin step or a
  pointer to /how-to/connect-agentcore — do NOT make setup agent-driven.
- The Trust Agent is the in-app assistant (see /concepts/trust-agent), NOT an Agent Version.`

const CONCEPT = `${COMMON}

CATEGORY: CONCEPT PAGE — explanatory, not an API tutorial.
- Keep all conceptual prose, the data-model explanation, UI references, diagrams, structure. Do NOT
  rewrite the concept or change facts — only remove the API code blocks and reframe interaction as
  Trust-Agent / UI-first (e.g. "You curate a Dataset from the Sessions list, or by asking the Trust
  Agent to add sessions to one"), pointing to /api-reference for endpoint detail.`

const SETUP = `${COMMON}

CATEGORY: TECHNICAL SETUP HOW-TO — audience here is an admin/developer wiring infrastructure.
- KEEP the setup mechanics that audience genuinely needs (IAM role / CloudFormation / MCP client
  config). ONLY remove gratuitous curl API-call examples that merely duplicate the API Reference and
  are not part of the setup procedure. Add one line noting day-to-day product use is via the Trust
  Agent + UI (link the relevant concept). Preserve the technical setup content and structure.`

const PAGE_RESULT = {
  type: 'object', additionalProperties: false,
  required: ['page', 'codeBlocksRemoved', 'agentFirstAdded', 'notes'],
  properties: {
    page: { type: 'string' },
    codeBlocksRemoved: { type: 'integer' },
    agentFirstAdded: { type: 'boolean' },
    notes: { type: 'string' },
  },
}

const PAGES = [
  // task guides → agent-first
  { p: 'tutorials/quickstart.mdx', cat: TASK_GUIDE },
  { p: 'tutorials/build-first-evaluator.mdx', cat: TASK_GUIDE },
  { p: 'tutorials/run-first-evaluation.mdx', cat: TASK_GUIDE },
  { p: 'how-to/compare-agent-versions.mdx', cat: TASK_GUIDE },
  { p: 'how-to/simulate-with-scenarios.mdx', cat: TASK_GUIDE },
  { p: 'tutorials/evaluate-with-the-trust-agent.mdx', cat: TASK_GUIDE },
  // concepts → remove curl, keep concept
  { p: 'concepts/datasets.mdx', cat: CONCEPT },
  { p: 'concepts/evaluations.mdx', cat: CONCEPT },
  { p: 'concepts/projects.mdx', cat: CONCEPT },
  { p: 'concepts/evaluators.mdx', cat: CONCEPT },
  { p: 'concepts/agent-versions.mdx', cat: CONCEPT },
  { p: 'concepts/sessions.mdx', cat: CONCEPT },
  { p: 'concepts/saved-views.mdx', cat: CONCEPT },
  { p: 'concepts/annotations.mdx', cat: CONCEPT },
  { p: 'concepts/scenarios.mdx', cat: CONCEPT },
  { p: 'concepts/overview.mdx', cat: CONCEPT },
  // technical setup → keep technical, light trim
  { p: 'how-to/connect-agentcore.mdx', cat: SETUP },
  { p: 'how-to/connect-mcp-client.mdx', cat: SETUP },
]

phase('Rewrite')
const results = await parallel(PAGES.map(x => () =>
  agent(`${x.cat}

## Your page: ${x.p}`, { label: x.p.split('/').pop(), phase: 'Rewrite', schema: PAGE_RESULT })
)).then(r => r.filter(Boolean))

const removed = results.reduce((n, r) => n + (r.codeBlocksRemoved || 0), 0)
log(`Removed ${removed} code blocks across ${results.length} pages`)
return { totalRemoved: removed, results }
