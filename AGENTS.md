# Documentation project instructions

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Run `mint dev` to preview locally (use `--port 3333`)
- Run `mint broken-links` to check links
- **`mint dev` is not production.** The deployed Mintlify host refuses to frame repo-served `.html`
  and the site is auth-gated; local rendering proves nothing about the live site. Interactive demo
  iframes point at the GitHub Pages origin (`https://provar-trustai.github.io/docs/…`), never at repo
  paths — see `docs-plan/doc-kit/demo-tooling.md`.

## Terminology

- The in-app assistant is the **Trust Agent** — never "Paddington" (internal codename), never
  "the bot", never "the AI". Lowercase "the agent" is fine once the page has established it.
- An **Agent Version** is the *customer's agent under test* — a pinned snapshot being evaluated.
  It is a different concept from the Trust Agent; never conflate them, and disambiguate on any
  page that uses both.
- A **Scenario** is a first-class, flat entity — name, goal, personas, expected output, linked
  sessions — with a stable reader-visible id (`SCN-000123`). **Scenario sets are gone** as of
  v2026.06.30.1: every project has one flat **Scenarios** list. Never write "Scenario set"
  except as history (a few vestigial in-app strings still say it — do not follow them). The
  collection is "your scenarios" / "the Scenarios list". Never call a scenario a "row".
- Wire surface: scenario reads and edits go through **`/v1/scenarios`** (list, get/patch/delete,
  `/recommended`, `/{id}/expected-output`, `/{id}/delete-check`; there is no `POST /v1/scenarios`).
  **`/v1/datasets` survives as the legacy container API** underneath (create, rows, columns are
  still on the wire) — the re-root is a rename over existing storage. The UI route is
  `/projects/:id/scenarios`; `/projects/:id/datasets` redirects to it.
- A session's **Source** is exactly one of **Scenario / Playground / External** — never
  "uploaded", "generated", "simulated", or "synced" reader-visible. Route wording: Scenarios
  surfaces say **Expected routes**; Sessions say **Routed To**.
- The Playground's segmented toggle is **Chat / Simulate** (there is no "Ask mode"). The side
  rail's first section label is **Progress** (reserve "plan" for the planning phase).

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references
- Headlines and captions are concrete and informational — these are reference docs, not marketing.
  No superlatives, no boilerplate slop; every label, caption, and fixture is specific and deliberate.
- **Icons: never use the lucide `bot` icon.** Trust Agent surfaces use `sparkles` (the site's
  established AI affordance). Pick icons already in use before introducing new ones.
- Audience is largely non-technical and **agent-first**: lead task guides with what to ask the
  Trust Agent; the UI is the observation pane and manual fallback. No inline curl/SDK in guides or
  concepts — one API Reference pointer per page; the API Reference tab owns endpoints.
- Every page must reflow with no horizontal overflow at 375 px (responsive is an audit dimension).

## Content boundaries

- No internal routes (`/paddington/*`, `/v1/internal/*`), internal codenames, or machine-local
  paths anywhere reader-visible — **including the published OpenAPI spec**, which is re-exported
  from the release tag and sanitized at every landing.
- Unverified claims read as unverified: behavior the running app hasn't confirmed carries an
  `{/* ACCURACY-AUDIT-PENDING */}` marker and is written at behavior level, hedged, never asserted
  with mechanics. Never vouch for an unverified security property.
- Preview features are labeled preview, never GA. Test Data Management (v2026.06.30.1) is
  flag-gated and **off by default** (frontend `VITE_TDM_PREVIEW`, backend `ENABLE_TDM`; both kept
  off in production and FedRAMP builds) — describe it as a preview with the flag caveat, or not
  at all. When release notes and the tagged code disagree on a flag default, the code wins.
- Interactive demos are sanitized, self-contained design prototypes with synthetic data, always
  captioned "Interactive prototype — … Design reference." The surrounding prose, never the
  prototype, is the authority on shipped behavior.
- Don't document internal build/process vocabulary ("capture pass", ticket IDs, codenames) in
  reader-visible prose.
