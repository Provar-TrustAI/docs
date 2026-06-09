export const meta = {
  name: 'demos-responsive',
  description: 'Make the 3 Tier-3 demos genuinely responsive — reflow (never overflow) from wide down to ~320px',
  phases: [{ title: 'Responsive', detail: 'add media queries per demo' }],
}

const REPO = '/Users/brady.hunt/Developer/docs'

const COMMON = `
Read the demo HTML in full and add RESPONSIVE CSS so it reflows gracefully across viewport widths.
These demos render inside the Mintlify docs content column (≈720px on desktop, but ≈360px on a phone,
and anywhere in between on tablets / split windows / the docked sidebar). Today they assume a wide
fixed layout and overflow / get cramped on narrow widths. Fix that.

HARD REQUIREMENTS:
- NO horizontal overflow / no horizontal scrollbar at ANY width from ~320px up. Content reflows, it
  does not clip or spill.
- Use \`@media (max-width: ...)\` breakpoints (e.g. ~760px and ~480px). Scale padding/margins/font-size
  down a notch at narrow widths; let buttons and control rows wrap (\`flex-wrap: wrap\`); let text wrap.
- Make any fixed pixel widths fluid (max-width:100% / width:100%) where they would otherwise overflow.
- PRESERVE everything else exactly: the copy (the eyebrow now reads "Trust Agent" — keep it), the
  fixtures, the \`⤢ Full window\` button + its script, the \`:fullscreen\` width rules already present,
  and the component behavior. Tone/structure unchanged — this is CSS-only responsive hardening.
- Keep it self-contained (no new external resources).
After editing, re-read the file and confirm: the new @media rules are well-formed, no existing rule
was broken, the fullscreen rules and the ⤢ button are intact.`

const DEMOS = [
  { file: 'demos/floating-chat.html', extra: `SPECIFIC: the \`.fx-shell\` is a flex row (faux nav + chat column + Plan rail side-by-side). On narrow widths this is the worst offender. At <= ~720px: drop the 52px faux nav (\`.fx-nav { display:none }\`) and STACK the Plan rail BELOW the chat (set \`.fx-shell { flex-direction: column }\` and let the chat + rail each be full width, rail with a top border instead of left). At <= ~480px shrink the header/composer paddings and the control buttons. Keep the desktop (side-by-side) layout above the breakpoint. Make the \`.controls\` row wrap. Ensure the chat message bubbles and tool-call card never exceed the container width.` },
  { file: 'demos/qa-flow.html', extra: `SPECIFIC: this is a single centered card. Ensure the card is fluid (max-width:100% within its stage, with comfortable side padding that shrinks on narrow), the question options and Back/Next footer wrap rather than overflow, the progress dots stay on one row, and the write-in "Other" field is full width. No fixed width that exceeds a phone.` },
  { file: 'demos/permission-card.html', extra: `SPECIFIC: single approval card(s). Ensure each card is fluid (max-width:100%), the scope-option rows and the Approve / Reject / danger buttons wrap rather than overflow on narrow widths, and the reject-with-note field is full width. Padding scales down on small screens.` },
]

phase('Responsive')
const results = await parallel(DEMOS.map(d => () =>
  agent(`${COMMON}

## Your demo: ${REPO}/${d.file}
${d.extra}

Report what breakpoints + rules you added and confirm no horizontal overflow remains at 320px.`,
    { label: d.file.split('/').pop(), phase: 'Responsive' })
))
return { fixed: results.filter(Boolean).length }
