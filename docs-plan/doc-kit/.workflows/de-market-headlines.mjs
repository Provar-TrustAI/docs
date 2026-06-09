export const meta = {
  name: 'de-market-headlines',
  description: 'Scan the 12 v2026.06.09.1 pages for marketing-style headlines/descriptions and rewrite the egregious ones to concrete, informational, concise',
  phases: [{ title: 'Scan', detail: 'flag marketing headlines per page' }, { title: 'Fix', detail: 'rewrite the flagged ones in place' }],
}

const REPO = '/Users/brady.hunt/Developer/docs'

const PAGES = [
  'concepts/trust-agent.mdx', 'concepts/scenarios.mdx', 'concepts/playground.mdx',
  'concepts/multi-tenancy.mdx', 'concepts/overview.mdx', 'concepts/agent-versions.mdx',
  'how-to/work-with-the-trust-agent.mdx', 'how-to/approve-agent-writes.mdx', 'how-to/simulate-with-scenarios.mdx',
  'tutorials/evaluate-with-the-trust-agent.mdx', 'changelog.mdx', 'glossary.mdx',
]

const RUBRIC = `
THE BAR: reference docs, not marketing. A reader scanning the page should learn WHAT each section
covers and WHAT the thing IS/DOES — not be sold on why it is great. Concise and concrete wins.

FLAG as marketing (score 3-5) — rewrite these:
- Superlatives / hype: "largest", "powerful", "seamless", "rich", "robust", "flagship", "killer",
  "ground-up", "best-in-class", "the entire workflow", "now default" used as a boast.
- Value-claim / slogan headings that don't say what the section is: "Real objects, not prose",
  "Built for humans", "Trust, rebuilt", "Production-ready platform".
- Salesy cadence in a frontmatter description or lead sentence: a string of benefit clauses
  ("streams its reasoning, shows real records, and stops for your approval") where a plain
  statement of what it is would be clearer.
- Cute/clever over descriptive when it costs clarity.

KEEP (score 0-2) — leave alone:
- Concrete, descriptive headings: "The three shells", "Approve a write", "Run a simulation",
  "How enforcement works at the repository layer", "Answer the agent's clarifying questions".
- Plain statements of fact, even if punchy, as long as they inform.

REWRITE GUIDANCE: make the heading/description state the subject plainly and specifically, in as
few words as the meaning needs. Keep it helpful for product clarity. Do NOT change any factual
claim, route, label, or anchor — tone/voice only. Prefer a noun-phrase or a plain verb phrase.
Examples: "Real objects, not prose" -> "Tool results as clickable records"; "This is the flagship
walkthrough." -> "This walkthrough covers the full evaluation flow."; "Production-ready platform"
-> "Deployment and infrastructure".`

const SCAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'findings'],
  properties: {
    page: { type: 'string' },
    findings: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['kind', 'current', 'marketingScore', 'problem', 'rewrite', 'isAnchorTarget'],
      properties: {
        kind: { type: 'string', enum: ['frontmatter-description', 'h1', 'h2', 'h3', 'bold-lead', 'callout-lead'] },
        current: { type: 'string', description: 'the exact current text (the heading line or description value), verbatim, so it can be matched for editing' },
        marketingScore: { type: 'integer', description: '0 = concrete/keep, 5 = pure marketing' },
        problem: { type: 'string' },
        rewrite: { type: 'string', description: 'the concrete, concise replacement text' },
        isAnchorTarget: { type: 'boolean', description: 'true if this heading carries an explicit {#anchor} or is a likely cross-page deep-link target (e.g. the tutorial #ch-* headings)' },
      },
    } },
  },
}

const FIX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['page', 'applied', 'skipped', 'notes'],
  properties: {
    page: { type: 'string' },
    applied: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['from', 'to'], properties: { from: { type: 'string' }, to: { type: 'string' } } } },
    skipped: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
}

phase('Scan')
const results = await pipeline(
  PAGES,
  (page) => agent(`Scan ${REPO}/${page} for marketing-style headlines and descriptions. Read the file.
List EVERY frontmatter description, heading (h1/h2/h3), and any bolded lead-in or callout lead sentence,
and score each for marketing-ness using this rubric. Only the ones scoring 3+ need a rewrite, but
report 2+ so the picture is complete. For each, give the EXACT current text (verbatim, matchable) and
a concrete rewrite. Mark isAnchorTarget true for any heading with an explicit {#...} anchor or that
looks like a cross-page deep-link target (especially the tutorial's #ch-clarify/#ch-plan/#ch-approve/#ch-objects).

${RUBRIC}`,
    { label: `scan:${page.split('/').pop()}`, phase: 'Scan', schema: SCAN_SCHEMA }),

  (scan, page) => {
    const toFix = (scan?.findings || []).filter(f => f.marketingScore >= 3)
    if (!toFix.length) return { page, applied: [], skipped: ['no findings >= 3'], notes: 'clean' }
    return agent(`Apply concrete-headline rewrites to ${REPO}/${page}. Use the Edit tool for each change below.

RULES:
- Tone/voice ONLY. Do NOT change any factual claim, route, UI label, anchor, or {/* ...PENDING */} marker.
- If a heading to change carries an explicit {#anchor} (e.g. the tutorial's {#ch-clarify}), KEEP the
  exact {#anchor} on the rewritten heading so inbound deep-links keep working. NEVER change a #ch-* anchor slug.
- If isAnchorTarget is true but there is no explicit anchor, ADD an explicit {#<original-slug>} to the
  rewritten heading (the original-slug is the lowercased, hyphenated current heading text) so any inbound
  link still resolves.
- Match the current text EXACTLY when editing. Keep frontmatter valid.

Rewrites to apply (current -> rewrite):
${toFix.map(f => `- [${f.kind}, score ${f.marketingScore}, anchorTarget=${f.isAnchorTarget}] "${f.current}" -> "${f.rewrite}"`).join('\n')}

After editing, re-read the file and confirm frontmatter is valid and no PENDING markers or anchors were lost.`,
      { label: `fix:${page.split('/').pop()}`, phase: 'Fix', schema: FIX_SCHEMA })
  }
)
const fixes = results.filter(Boolean)
const totalApplied = fixes.reduce((n, f) => n + (f.applied?.length || 0), 0)
log(`Applied ${totalApplied} headline rewrites across ${fixes.filter(f => f.applied?.length).length} pages`)

return { totalApplied, fixes }
