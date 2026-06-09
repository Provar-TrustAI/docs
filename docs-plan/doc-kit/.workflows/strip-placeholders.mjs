export const meta = {
  name: 'strip-placeholders',
  description: 'Remove the CAPTURE-PENDING placeholder image/video Frames (broken /images/* links) so the docset is link-clean, keeping each page coherent + the working demos',
  phases: [{ title: 'Strip', detail: 'remove broken placeholder assets per page' }],
}

const REPO = '/Users/brady.hunt/Developer/docs'

const GROUND = `
Read the page and REMOVE every placeholder that points at a screenshot/GIF/MP4 that does NOT exist
yet (these are the \`/images/*\` files marked with a \`{/* CAPTURE-PENDING: ... */}\` comment — they are
currently broken links failing \`mint broken-links\`). Goal: the page renders link-clean NOW, with the
real screenshots added back in a later capture pass.

RULES:
- For each placeholder \`<Frame>\` whose \`<img src="/images/...">\` / \`<video>\` / \`<iframe src="/images/....mp4">\`
  references a non-existent asset: REMOVE the <Frame> (and its broken media), but LEAVE the page coherent.
  Replace it with its \`{/* CAPTURE-PENDING: <what> */}\` comment ALONE (keep/add the comment so the future
  capture pass knows what to add back) — the comment is invisible and is NOT a broken link.
- KEEP the surrounding prose, headings, <Steps>, <Note>s, <CardGroup>s, and especially the WORKING
  interactive demo embeds (the \`<iframe src="/demos/*.html">\` — those files EXIST, do not touch them).
- If removing a placeholder leaves a structural component empty or single-child and awkward — e.g. an
  AccuracySeamTabs \`<Tabs>\` where Tab 1 was the shipped-screenshot placeholder and Tab 2 is the live
  \`/demos/*.html\` prototype — COLLAPSE it gracefully: drop the \`<Tabs>\`/\`<Tab>\` wrapper and keep the
  working prototype \`<Frame>\` directly, with a one-line note that the shipped-app screenshot is coming.
- Do NOT touch any \`<iframe src="/demos/...">\` (working), any internal page links, frontmatter, or the
  \`ACCURACY-AUDIT-PENDING\` comments. Only remove BROKEN /images/* media.
- After editing, re-read the file and confirm: NO \`src="/images/...\` (or \`/images/....mp4\`) references
  remain, the MDX is well-formed (balanced tags), and all \`<iframe src="/demos/...">\` embeds are intact.`

const PAGES = [
  'concepts/trust-agent.mdx',
  'concepts/scenarios.mdx',
  'concepts/playground.mdx',
  'how-to/approve-agent-writes.mdx',
  'how-to/simulate-with-scenarios.mdx',
  'tutorials/evaluate-with-the-trust-agent.mdx',
]

const RESULT = {
  type: 'object', additionalProperties: false,
  required: ['page', 'removed', 'collapsedTabs', 'demosKept', 'notes'],
  properties: {
    page: { type: 'string' },
    removed: { type: 'integer', description: 'count of broken /images placeholders removed' },
    collapsedTabs: { type: 'integer' },
    demosKept: { type: 'integer', description: 'count of working /demos iframes left intact' },
    notes: { type: 'string' },
  },
}

phase('Strip')
const results = await parallel(PAGES.map(p => () =>
  agent(`${GROUND}

## Your page: ${REPO}/${p}`, { label: p.split('/').pop(), phase: 'Strip', schema: RESULT })
)).then(r => r.filter(Boolean))

const removed = results.reduce((n, r) => n + (r.removed || 0), 0)
return { totalRemoved: removed, results }
