# Demo tooling — the interactive-demo strategy

How Doc Kit makes the docs beautiful and interactive without bloating them. Three tiers, a hard
budget, and the wiring recipe for each. `/doc-plan` sets the budget; `doc-demo-agent` builds the
assets.

## The budget rule (the bloat guard)

> **Each surface gets AT MOST ONE Tier-2 or Tier-3 artifact, for its single headline flow.
> Everything else is Tier-1.**

This is the analog of the UI kit's "suppression list." Rich docs, not bloated docs. A page that wants
a second moving artifact has to justify it to the human in `/doc-plan` — the default answer is no, use
Tier-1.

## The three tiers

### Tier 1 — native rich (every page, default)

Mintlify-native components. Lowest cost, always allowed.

- **`<Frame>`** wrapping a screenshot or GIF from `/images`.
- **`<Tabs>`** for variant flows; **`<Steps>`** for sequences; **`<Accordion>`** for progressive
  disclosure; **`<Cards>`/`<CardGroup>`** for navigation; **`<Info>`/`<Warning>`/`<Note>`** callouts.

**Source:** the `captures/` Playwright rig (already in the repo).

```bash
cd captures && pnpm install && npx playwright install chromium   # first time
pnpm capture:<surface>          # e.g. pnpm capture:sessions — writes to /images at 2× DPI
```

Naming convention: `{concept}-{surface}-{variant}.{ext}` → `images/sessions-flyin-panel.png`. Embed:

```mdx
<Frame caption="The Sessions table with a row fly-in open">
  <img src="/images/sessions-flyin-panel.png" alt="Sessions table fly-in" />
</Frame>
```

### Tier 2 — animated walkthrough (one per headline flow)

A rendered MP4/GIF with **click-spotlight + zoom-on-component** callouts — the "show the click, zoom
in" effect, done programmatically so it's agent-drivable and re-renderable when the UI changes. The
weight is one media file, not MDX.

**Source:** the `pipeline/` Remotion rig (already in the repo). Layer 1 (Playwright) emits a timeline
JSON `{ timeMs, action, elementBounds, caption }`; Layer 3 (Remotion) compositor renders the
spotlight/zoom from `elementBounds`.

```bash
cd pipeline && pnpm install
pnpm preview                    # Remotion Studio, to tune
pnpm render                     # → out/demo.mp4
pnpm render:gif                 # → out/demo.gif  (requires ffmpeg)
```

Style guide (from `pipeline/README.md`): GIF 1200×750, 12–15fps, <5MB; MP4 1920×1080, 30fps. Output to
`/images` with the same naming convention. Embed the MP4 via a `<Frame>` + `<video>` or the GIF via
`<img>`.

**Headline flows for this release:** Trust Agent send → stream → approve; Playground simulate.

### Tier 3 — embedded live prototype (2–3 core features per release)

A sanitized, self-contained HTML page embedded via `<iframe>` so stakeholders **click through the
real surface**. This is the highest-wow tier and the one the v7 prototype makes nearly free.

**The two ready-made sources** (already self-contained — see the prototype catalog):

1. **`Paddington v2 Library.html`** — a self-contained component gallery with two LIVE demos: the
   **floating-chat shell-transition demo** (minimize/expand a running chat between full/dock/pill) and
   the **QA-flow multi-question card**. CSS is inlined from `app-styles.css` + `agent.css` +
   `paddington-lib.css`; no `src/` fetch needed. This is the cleanest Tier-3 artifact in the release.
2. **`src/agent_autoplay.jsx`** — a self-playing end-to-end agent walkthrough (clarify → plan → stream
   → tool calls → approvals → results) with transport controls (play/pause/seek). Needs React + Babel
   (CDN) + the mock-data globals + `agent.css`/`app-styles.css`.

**The floating-chat embed (Brady's pick) — recipe:**

1. Extract just the floating-chat shell-transition demo section from `Paddington v2 Library.html` into
   a standalone `demos/floating-chat.html` (inline the three CSS files it already inlines; keep the
   two demo components + the fake timeline driver).
2. Sanitize (checklist below).
3. Serve it as a static asset (Mintlify serves files under the repo; place under `demos/` and confirm
   `.mintignore` does not hide it, or under `public/` if configured). Embed:

```mdx
<Frame caption="Interactive prototype — the full, docked, and pill shells. Design reference.">
  <iframe src="https://provar-trustai.github.io/docs/floating-chat.html" width="100%" height="640" style={{border:0}}
          loading="lazy" allow="fullscreen" title="Floating chat prototype" />
</Frame>
```

**Hosting rule — iframes point at the GitHub Pages origin, never at repo paths.** The deployed
Mintlify host refuses to frame repo-served `.html`; only local `mint dev` serves it — which is a trap
(local-clean, prod-broken; this shipped a P0 on 2026-06-09). `demos/` is published to
`https://provar-trustai.github.io/docs/<demo>.html` by `.github/workflows/deploy-demos.yml` on every
push to `main` that touches `demos/**`. Exposure: none new — the repo is public; Pages only makes the
HTML render. **First-embed canary:** the first embed of any NEW asset class merges one canary asset and
is confirmed rendering on the DEPLOYED docs host before pages depend on it.

**Caption rule — one label, kept short.** The `<Frame caption>` is the ONLY label:
`Interactive prototype — <what it is>. Design reference.` Do NOT restate behavior the prose already
covers and do NOT append "shipped behavior is described above" — "Design reference" already says it.
**Do NOT put a second caption/footer inside the demo HTML** (it duplicates the Frame caption), and
**do NOT add an "Open in a full window" link line in the MDX** — the in-demo button below is
self-discoverable; explaining it is clutter. The surrounding prose is the authority on shipped
behavior (the embed is a design reference, §1 rung 4).

**Real estate — give the demo room without breaking the docs layout.** A wide demo (the floating
chat + its rail) is cramped in the docs content column, so:
1. **`allow="fullscreen"` on the iframe** + a self-contained **`⤢ Full window`** button inside the
   demo HTML — a fixed top-right button that toggles the native Fullscreen API on `documentElement`.
   The demo fills the monitor in place (modal-like, no new tab, docs page untouched). Insert the
   button + toggle script before `</body>` in every Tier-3 demo. No MDX-side copy — let users find it.
2. **Use the fullscreen real estate.** A demo's normal layout is capped (e.g. `.wrap{max-width:880px}`)
   so it doesn't sprawl inline — but that cap wastes the screen in fullscreen. Add `:fullscreen`
   overrides so the demo widens and grows when expanded:
   ```css
   html:fullscreen .wrap   { max-width: min(1500px, 94vw); }
   html:fullscreen .fx-shell { height: min(780px, 78vh); }   /* grow the live surface too */
   ```

Do NOT try to break the iframe out of the content column with negative margins / full-bleed — that
fights the Mintlify theme. The Fullscreen API (with `:fullscreen` width overrides) gives the room cleanly.

## Sanitization checklist (mandatory before any Tier-3 embed)

The prototype carries design-time data and dev scaffolding. Before committing a Tier-3 asset:

- [ ] **Strip internal/customer data.** Scrub `data.js` / fixtures of any real names, emails, account
      IDs, internal URLs, or anything not safe for an internal-stakeholder (and eventually public)
      audience. Replace with obviously-synthetic sample data.
- [ ] **Pin CDN versions.** The prototype loads React/Babel from `unpkg` with version + integrity
      hashes — keep them pinned (already are in the HTML). Do not point at `@latest`.
- [ ] **Self-contain.** No reference to a local dev server, no `localhost`, no absolute paths from
      Brady's machine. Inline or co-locate every CSS/JS/asset the page needs.
- [ ] **Remove dead routes.** Strip surfaces the demo doesn't exercise so the bundle is the one
      feature, not the whole 2.2MB app.
- [ ] **Label it.** The embed caption says "interactive prototype" / "design reference," never "the
      product."
- [ ] **Thoughtful copy, not slop.** Every visible label / eyebrow / heading / fixture is specific and
      meaningful — use the real product vocabulary (Trust Agent, Sessions, Scenarios…) and realistic
      sample content. NEVER generic boilerplate like "Sample Product · Agent surface." Sanitize the
      *data*; keep the *product name* real — over-sanitizing the product's own name into "Sample
      Product" is itself slop.
- [ ] **Responsive.** The demo reflows with NO horizontal overflow from ~320 px up — add media queries
      so the chat / rail / cards stack on narrow widths and control rows wrap. It must render cleanly in
      the docs content column AND on a phone, and carry a `:fullscreen` width override so the
      `⤢ Full window` view uses the space without sprawling (see "Real estate" above).
- [ ] **Weight check.** A Tier-3 asset should be the single feature, not the standalone app dump.
      Target < ~300KB per embed where feasible; the floating-chat demo extracted from the Library is
      well under that.

## Open-source tooling note (best thinking)

- **Remotion** (Tier 2) and **rrweb** are the clean OSS paths. The polished SaaS "show-the-click"
  tools (Arcade, Storylane, Supademo, Navattic) are **not** open-source and watermark their free tiers.
- **rrweb** records real DOM interactions → an embeddable replay with timeline scrubbing, speed, and
  skip-inactivity. It is the **future path for truth-to-shipped-app interactive replays**: once we want
  an embed of the *real* app (not the prototype), record a session against `APP_CAPTURE_URL` with
  rrweb and embed the player, instead of maintaining a hand-sanitized prototype. For this release the
  prototype embeds are already built and self-contained, so they're the fastest path to wow — adopt
  rrweb when the prototype and shipped app diverge enough that a prototype embed would mislead.
- Whatever the tier, the asset is **regenerable**: a `captures/` script, a Remotion composition, or a
  sanitization script — never a hand-pixel-pushed artifact no one can rebuild when the UI changes. The
  `freshness` audit (`doc-qa-taxonomy.md`) depends on every asset having a rebuild path.
