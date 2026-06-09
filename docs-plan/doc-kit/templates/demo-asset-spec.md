# Template — `doc-demo` ticket body

The body of a `doc-demo` ticket briefs `doc-demo-agent` to build ONE interactive artifact (Tier 2 or
Tier 3 — see `demo-tooling.md`). Tier-1 screenshots/GIFs do not need a `doc-demo` ticket; the page's
own `doc-page` ticket captures those inline.

```md
## Artifact
- **Name:** <e.g. floating-chat prototype embed>
- **Tier:** <2 | 3>
- **Embeds into:** <the page path that references it, e.g. concepts/trust-agent.mdx>
- **Output path:** <where the asset lands: /images/<name>.mp4 (T2) | demos/<name>.html (T3)>

## Headline flow (the ONE thing this demonstrates)
<e.g. "minimize a running chat to the dock, then to the pill, then expand it back — the agent keeps
running across all three shells">

## Source
- **Tier 2:** the captures/ script + pipeline/ composition to use, and the timeline beats
  (click → spotlight → zoom targets).
- **Tier 3:** the prototype source to extract from
  (PROTOTYPE_DIR/Paddington v2 Library.html § <section>, or src/agent_autoplay.jsx) and which
  components + CSS to inline.

## Build steps
<Tier 2>
1. Drive the flow with the captures/ Playwright script → timeline JSON + recording.
2. Render via pipeline/: `cd pipeline && pnpm render:gif` (or pnpm render for MP4).
3. Place the output at the output path with the {concept}-{surface}-{variant} naming.

<Tier 3>
1. Extract the demo section into a standalone HTML; inline the CSS it already inlines.
2. Run the sanitization checklist (demo-tooling.md) — strip internal data, pin CDN, self-contain,
   remove dead routes, label as prototype, weight-check.
3. Place at the output path; confirm .mintignore does not hide it.

## Acceptance
- [ ] Renders/plays correctly inside `mint dev` in a <Frame>/<iframe> on the embedding page.
- [ ] (Tier 3) Sanitization checklist complete — no internal data, no localhost, self-contained,
      labeled "interactive prototype".
- [ ] Weight within budget (<~5MB GIF / <~300KB Tier-3 embed where feasible).
- [ ] Regenerable — the build steps above reproduce it from source (no hand-pushed artifact).
- [ ] The embedding page's prose describes the SHIPPED behavior; the demo is captioned as a reference.

## Files to touch
- <the output asset path; the embedding page if it adds the <Frame>/<iframe> (else the doc-page ticket
  owns that and this ticket only produces the asset at the agreed path)>
```

## Notes for the builder (`doc-demo-agent`)

- **One artifact, one flow.** The budget is one Tier-2/3 per surface — don't bundle three flows into
  one demo. Keep it the single headline flow.
- **Regenerable beats pixel-perfect.** Every asset must have a rebuild path (a script, a composition,
  a sanitization recipe) so the `freshness` audit can refresh it when the UI changes.
- **The prototype is a design reference, not the product.** A Tier-3 embed must be labeled; the page's
  prose, not the embed, is the authority on shipped behavior.
