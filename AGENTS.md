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

**Vocabulary is pinned to `v2026.08.03.2`.** Every rule below was verified against a read-only
worktree at that tag. Where the shipped app and a release note disagree, the app wins. Where the app
disagrees with *itself* — it does, in several places called out below — the rule here is the answer.

---

## Terminology — core nouns

- The in-app assistant is the **Trust Agent** — never "Paddington" (internal codename), never
  "the bot", never "the AI". Lowercase "the agent" is fine once the page has established it.
- An **Agent Version** is the *customer's agent under test* — a pinned snapshot being evaluated.
  It is a different concept from the Trust Agent; never conflate them, and disambiguate on any
  page that uses both.
- A **Scenario** is a first-class, flat entity — name, goal, personas, expected output, linked
  sessions — with a stable reader-visible id (`SCN-000123`). **Scenario sets are gone** as of
  v2026.06.30.1: every project has one flat **Scenarios** list. Never write "Scenario set"
  except as history. The collection is "your scenarios" / "the Scenarios list".
- **Never call a scenario a "row"** — with one carve-out: when quoting shipped UI copy verbatim.
  The Calibrate tab's own text says "rows". Quote it, don't adopt it.
- Wire surface: **`/v1/scenarios` is the whole surface**. `POST /v1/scenarios` **exists** (201).
  The `/v1/datasets` family was **removed at v2026.07.08.1** — do not describe it as a surviving
  legacy container. Tenancy lives on each scenario's own project. UI route
  `/projects/:id/scenarios`; `/projects/:id/datasets` redirects to it.
- A **Team** is a workspace group that bundles project access.

## Terminology — sessions

- A session's **Source** column is exactly one of **Scenario / Playground / External** — never
  "uploaded", "generated", "simulated", or "synced". **This applies to the list column only.** The
  fly-in meta row legitimately composes two fields and renders things like "Conversation · Synced"
  or "Synthetic · Uploaded"; that is not a violation.
- Route wording: Scenarios surfaces say **Expected routes**. The Sessions **list column header** is
  **Routed To**; the transcript step label is sentence-case **Routed to**. Match the surface.

## Terminology — verdicts and human judgment

- Two distinct human-verdict surfaces — never conflate them: session-level **Verdict** annotations
  ground **evaluator accuracy** on runs; pass/fail **verdict columns on scenarios** are what the
  evaluator **Calibrate** tab samples (its "Check agreement" section, **Calibrate** /
  **Re-calibrate** button, 20-scenario cap).
- A human verdict does not override an automated one **on the Verdict annotation column**. This is
  **not** universal: on **Groundedness** results a reviewer may override a per-claim verdict with a
  note, and the score recomputes. Scope the claim to the surface.
- Two neutral labels, never one: **Not evaluated** (no evaluation exists) versus **Not graded**
  (evidence exists, no behavioural score). Pick per surface; never blanket one across both.
- **Needs review** (amber) is the per-check third verdict, excluded from pass/fail gating.
- The results verdict is the **Final verdict**. The Safety · Outcome · Quality trio is **retired** —
  never write it.
- Assertions are **required / disallowed** only. There is no "allowed" and no "optional".
- The product noun is **expected output** (tab, editor, API path). "Expected outcome" is
  release-note-internal vocabulary — never reader-facing.

## Terminology — evaluators

- Kind labels are **sentence case**: "LLM judge", "Structured match", "Groundedness judge",
  "Outcome grounded" — never "LLM Judge" or "Structured Match". Subkind refinements: "Routing
  match", "Tool match".
- **Groundedness judge** — never "Faithfulness judge" (the v2026.07.26.1 name, renamed at
  v2026.08.03.1), never the wire literal `document_faithfulness`.
- The metric chip reads **"N% grounded"**, never "N% faithful".
- Claim verdicts render **Supported / Contradicted / Unsupported / Unknown / Conversational** —
  never the raw `not_a_claim`.
- **Reference material** (wire `reference_documents`) attaches **per scenario** on Expected Output,
  never on the evaluator.
- Creating a Structured Match evaluator is **retired**; structural checks live on Expected Output.
- The recommended catalog is **11 presets — 5 Quality, 6 Safety**. "Answer is grounded" was removed.
  Never hardcode a different count, and note that two presets are 1–5 scale, not pass/fail.
- An evaluator rubric is **grading criteria only** — response-format, verdict-shape, and answer-key
  sections are rejected server-side.

## Terminology — evaluations and results

- Repeats are **"Repeat each test case"** (launcher, 1–4), **"Trial N"** (grouped child rows), and
  **"Trial N of K"** (fly-in switcher). `Pass^K` is headline notation only — never write bare "K"
  or "trials" in reader-facing prose.
- Results default to **By scenario**; the flat table is the explicit **Flat** view.
- Quote a reliability read as `2/3`, not "2 of 3 passed".
- Four denominator-excluded classes: **Guardrail blocked** (`runtime_blocked`), **Environment
  problem** (`infra_failure`, `harness_failure`), and **Access blocked** (`access_blocked`).

## Terminology — Trust Agent

- The Trust Agent has three operating modes: **Ask / Plan / Act**. These are product names.
  (The **Playground**'s segmented toggle is a separate thing: **Chat / Simulate**.)
- The side rail's first section label is **Progress** — reserve "plan" for the planning phase.
- **Standing approval** is the durable chat-wide grant. The chip prefix "Standing approval active:"
  is sr-only; visible text is "\<action\> in this chat · Active until Jul 7". The control is
  **"turn off"** (aria-label `Turn off: <label>`) — **never "Revoke"**. The release notes say
  Revoke; no shipped label does.
- Three distinct failure states, quoted exactly:
  - "The Trust Agent hit an unexpected error and stopped. Please try again." — failed turn
  - "This reply was interrupted." + **Continue** — disconnect
  - "Couldn't load this conversation" + **Retry** — history read failure

  Note the near-miss legacy string "The Trust Agent hit **an error** and stopped." (`STRANDS_ERROR`)
  — different sentence, different code path. Don't merge them.
- **Built-in skill** (editor note and Workspace Settings group label; the transcript chip says
  **Core skill**) versus **Workspace skill** (chip; listed as **Custom**). Skills are
  **workspace-scoped**. The receipt line reads **Reviewed \<skill name\>**.
  **Never hardcode a built-in skill count** — the set keeps moving (15 at this tag, not the 11 the
  release notes claim).
- **Connected agent** is the card at the top of the rail's **Context** section. Health chip
  vocabulary is exactly **Not checked / Healthy / Degraded / Unreachable**. In-flight Outputs rows
  read **Generating…** (session) and **Running…** (evaluation).
- **The backend wins on Act mode.** The runtime waits for approval on every mutating write. The
  mode-toggle subtitle still says "without pausing for approval" — that copy is stale; do not
  document it.

## Terminology — Agent Profile

- **Agent Profile ≠ Agent Version.** A profile is *about* a version and nests under it
  (`/v1/agent-versions/{id}/profile`); its versioned unit is the **profile revision**
  (`/v1/profile-revisions/{id}/review`).
- Two distinct pins: an **Evaluation** pins an *agent version*; a **Trust Agent session** pins a
  *profile revision*.
- Lifecycle pills: **Profile queued / Profile in progress / Profile available / Profile failed /
  Profile out of date**, plus the fly-in header's **Version-pinned profile** and the
  never-generated empty state.
- Coverage is **Captured / Partial / Limited** — never percentages, never "complete/incomplete".
- Source availability has three distinct absences — **Available / Not exposed / Not sampled /
  Not run**. Never collapse them into one "unavailable".
- Review states: **Pending review / Approved / Changes requested**; actions **Approve** and
  **Request changes**.
- "Agent version" is the concept name. "Agent build" appears in shipped server copy — quote it,
  don't adopt it.
- State the platform limit honestly: capability discovery is implemented for **Conversational HTTP,
  Claude Managed Agent, and Salesforce Agentforce**. AgentCore falls through to "Agent profiling
  isn't available for this connection yet."

## Terminology — connections

- Four connectable platforms, including the **Conversational HTTP agent**.
- **Agent** and **Environment** are discover-then-pick selects populated by a **Find agents**
  button — never "Agent ID" / "Environment ID".
- **Default execution user** (settings) / **Run-as user** (in-chat card) — never "Integration
  user". Also **Permission test identities**.
- Salesforce sign-in labels, in the settings picker: "Authorize TrustAI as an admin (recommended)" /
  "External Client App key + secret (legacy)" / "Certificate-based JWT (legacy)" / "Username +
  password (legacy)". In-chat: "Authorize TrustAI (recommended)" / "Key and secret" /
  "Certificate (JWT)".
- **The admin-authorize (token-exchange) path is the only documented way to create a Salesforce
  connection.** The three legacy modes are deprecated: do not present them as alternatives, and do
  not write a fallback path around them.
- **External Client App** is the org-side app **TrustAI deploys** (`TrustAI_Agent_Eval_<suffix>`),
  not something the customer hands over. "App A" / "App B" are retired internal shorthand.
- Connection lifecycle: **Connected / Setting up / Needs admin / Setup failed**. Sign-in labels on
  the workspace row: **Admin authorization / App key & secret / Certificate (JWT) / Username &
  password**.
- Write-only secret affordance: a **Configured** status pill plus the placeholder
  `•••• configured — leave blank to keep existing`. For Salesforce this now includes the
  **Consumer key**.
- "Agentforce Builder", not "Agent Builder".
- Salesforce trace lag is **~11–13 minutes, typically** — hedge it. No user-facing string names a
  number, so the docs are the first place a customer sees this. (One stale code comment says ~9 min;
  ignore it.)

## Terminology — access, workspace, billing

- Workspace roles are **Owner / Admin / Member / Guest**. Project tiers are **Viewer / Editor**
  (grantable) and **Owner** (conferred at creation, never grantable, no transfer). Never render the
  raw slugs — `member` displays as **Editor**.
- The workspace admin surface has **six** tabs: Members, Teams, Project access, Credits,
  Connections, General. The v2026.06.30.1 changelog's "consolidates six tabs into four" is history,
  not current state.
- Identity is federated via **your workspace's SSO identity provider** — never name WorkOS in
  reader-facing prose. (WorkOS commercial is the default; Keycloak Organizations sits on the
  self-hosted/gov OIDC boundary, which is preview and off.)
- Billing nouns: **credits**, **credit pool**, **Credit usage**, "Where your credits went".
  **The credit pool resets monthly** — the release note calling it a "lifetime" pool is wrong.
- Three different cap strings, none interchangeable: **Credit limit reached** (FE banner title) ·
  `cap reached — contact your admin` (server 402 detail) · "This run would exceed your workspace
  credit limit. Contact your admin to continue." (no-detail fallback).
- **Never publish per-action credit weights.** They are uncalibrated placeholders.

## Terminology — Requirements (pinned now, do not publish yet)

Requirements is a fully built domain behind a flag that is off in every environment. The vocabulary
is pinned here so drafts and the eventual flip are consistent; the pages stay out of `docs.json`.

- The handle is **`REQ-{n}`** — a bare integer, deliberately **not** zero-padded like `SCN-000123`.
  The UUID is never reader-visible.
- Health is a locked five-state set: **Passing / Failing / Partially covered / Uncovered / Not yet
  run**. **"Broken" is banned** — it is the prototype's label and a conformance test blocks it.
- `status` is the editorial **lifecycle** (draft / active / archived); `health` is the **computed
  rollup**. Never conflate. Draft and Archived render as lifecycle chips, never as health pills.
- Type reads "The agent must do this" / "The agent must never do this"; the fly-in chip for `avoid`
  is **Must-not**. Never surface the wire enum `achieve` / `avoid`.
- **Gaps** = Uncovered + Partially covered. Source is **Manual / Document / Chat / Import**.

---

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
- **Never write "Paddington" reader-visible** — including in a Credits breakdown, where the shipped
  humaniser leaks a row reading "Paddington Message". That is a product defect; do not reproduce or
  legitimise it.
- Unverified claims read as unverified: behavior the running app hasn't confirmed carries an
  `{/* ACCURACY-AUDIT-PENDING */}` marker and is written at behavior level, hedged, never asserted
  with mechanics. Never vouch for an unverified security property.
- Preview features are labeled preview, never GA. When release notes and the tagged code disagree on
  a flag default, **the code wins**. Currently flag-gated and off:
  - **Test Data Management** — frontend `VITE_TDM_PREVIEW`, backend `ENABLE_TDM`, both off in
    production and FedRAMP builds. Describe as preview with the flag caveat, or not at all.
  - **Requirements** — `enable_requirements` off in every environment; the router 404s and the
    sidebar row is hidden. Not documented this cycle.
  - `/v1/connect/environments*` are TDM-gated and must not be presented as generally available.
- **Cookie-authenticated external MCP connection is internal only** — not a supported customer path.
  Do not present it as one. The engineering notes at `docs/eng/mcp-clients/README.md` are vestigial
  and are **not** a source.
- The Trust Agent dev harness (`VITE_AGENT_DEV`, the OBSERVE fly-in, the build-identity chip, the
  debug packet, `pnpm devloop`) is developer-only, defaults off, and is never reader-visible in any
  form. Same for the self-eval principal `trustai-self-eval-author` and the connection type
  `trustai_project`.
- Never document the standing-grant endpoints.
- The in-app string "the TrustAI agent" (Agent Profile overview) is a product-copy defect — do not
  import it into prose.
- Interactive demos are sanitized, self-contained design prototypes with synthetic data, always
  captioned "Interactive prototype — … Design reference." The surrounding prose, never the
  prototype, is the authority on shipped behavior.
- Don't document internal build/process vocabulary ("capture pass", ticket IDs, codenames) in
  reader-visible prose.
