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

**Vocabulary is pinned to `v2026.09.09.2`.** Every rule below was verified against a read-only
worktree at that tag. Where the shipped app and a release note disagree, the app wins. Where the app
disagrees with *itself* — it does, in several places called out below — the rule here is the answer.
The cross-surface gardener pass for this release re-verified and amended several rules in place —
the sessions replay model, the test-user label scoping, the Requirements filter chips, thinking-depth
scope, the `2/3 passed` carve-out, and the product-name ruling in *Style preferences* — so read those
blocks fresh rather than from memory of the previous pin.

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
- An image in a conversation is a **picture** — the noun the transcript's own copy uses throughout.
  The composer control is **Attach images** (it reads **Attach files** when the filter admits more
  than images). Never "photo", "attachment", or "upload" as the product noun here, and reserve
  **Attachments** for the Trust Agent rail's document panel, which is a different thing. Accepted
  formats render only as **PNG, JPEG, WebP, or GIF** — never a media type. Size and count limits are
  served by the API and rendered from it; never hardcode one in prose.
- A simulated conversation closes with one sentence led by **"This conversation ended because "** and
  completed by one of: *the customer got what they needed · the agent could not help with it · the
  customer gave up · the agent ended or transferred it · it reached the length limit before
  finishing* (fallback: *the customer chose to stop*). Write **the customer** on these surfaces —
  that is who the simulated user plays; "persona" is our word for the configuration behind it. A
  conversation with no recorded ending renders nothing at all, so never promise the line is there.

## Terminology — verdicts and human judgment

- Two distinct human-verdict surfaces — never conflate them: session-level **Verdict** annotations
  ground **evaluator accuracy** on runs; pass/fail **verdict columns on scenarios** are what the
  evaluator **Calibrate** tab samples (its "Check agreement" section, **Calibrate** /
  **Re-calibrate** button, 20-scenario cap).
- A human verdict does not override an automated one **on the Verdict annotation column**. This is
  **not** universal: on **Groundedness** results a reviewer may override a per-claim verdict with a
  note, and the score recomputes. Scope the claim to the surface.
- Three neutral labels, never one: **Not evaluated** (no evaluation exists) versus **Not graded**
  (evidence exists, no behavioural score) versus **Not scored** — the reliability lexicon's neutral,
  interchangeable with neither. Pick per surface; never blanket one across the others. **Not graded**
  now has two shipped run-header refinements: **Run only — nothing was graded** (a deliberate
  simulation) and **Not graded — no evaluators** (a graded run that inherited none). Bare **Not
  graded** is the residual case, and runs recorded before this shipped keep neutral wording rather
  than claiming an intent the record cannot evidence.
- **Needs review** (amber) is the per-check third verdict, excluded from pass/fail gating.
- The results verdict is the **Final verdict**. The Safety · Outcome · Quality trio is **retired** —
  never write it, and the end-state-only **Outcome** column went with it. The rule now has a positive
  half: **End state** is a live run-detail column header *and* a live result fly-in tab, rendering
  only when a result actually graded on end state. The `verdict-matrix` primitive still documents a
  locked five-dimension set; it is no longer the run-detail surface and is not a source.
- Assertions are **required / disallowed** only. There is no "allowed" and no "optional".
- The product noun is **expected output** (tab, editor, API path). "Expected outcome" is
  release-note-internal vocabulary — never reader-facing. Guard the collision that test data
  introduced: **Expected end state** is the backend-*data* contract inside a test data plan, a
  different contract from Expected Output (the agent-*behaviour* contract on the scenario's own
  tab). Never reuse "Expected Output" for test data, and never write "Expected Data" — a
  release-note spelling with no shipped label behind it.

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
  Never hardcode a different count. Three amendments the counts don't carry:
  - The Quality preset formerly named "Does not hallucinate" is now **Internally consistent**. The
    slug is unchanged and never reader-visible, and the rename applies to newly adopted copies only —
    an older project can still hold a copy under the old name.
  - The two 1–5 presets are **Answer is complete** and **Accomplished the goal**, both with a pass
    cutoff of 3, and they are 1–5 in their **authoring shape only**: the judge is asked for
    PASS/FAIL. Never promise a reader a graded 1–5 score they will not see.
  - Three presets are agent-relative and carry a **Tailor first** badge — Accomplished the goal,
    Stays within scope, No unauthorized commitments. It nudges; it never blocks adoption. Never the
    wire field `tailor_first`, never "needs tailoring" as a chip.
- An evaluator rubric is **grading criteria only** — response-format, verdict-shape, and answer-key
  sections are rejected server-side.

## Terminology — the starter catalog

- **"Trust Library" is not a shipped label.** No rendered string in the app says it; it survives only
  in internal code comments. Keep it, if you keep it at all, as the docs' own page title — never as
  something a reader will see on screen, and never attribute a button or a tab to it. The product
  noun for the catalog is **recommended scenarios** (and, for checks, **recommended evaluators**).
  The two shipped entry points are **Add recommended evaluators** and **Add recommended scenarios**;
  they are not interchangeable. Scope the evaluators one by surface: the **Evaluators** page header
  button reads **Add recommended**, while the empty-state hero and the modal title read **Add
  recommended evaluators**. Both ship; name whichever the reader is looking at.
- The starter safety scenarios are **10 recommended scenarios, one per OWASP Agentic Top 10 (2026)
  category**, mapped one to one. Name the category in the product's friendly words — **Goal hijack ·
  Tool misuse · Identity & privilege · Poisoned knowledge source · Unsafe command execution · Context
  poisoning · Forged system handoff · Cascading actions · Misplaced trust · Off-mission drift** —
  never the `ASI01`–`ASI10` codes, which are citation metadata only. **Those friendly names are
  TrustAI's, not OWASP's official category titles** — never present them as the standard's own words.
- **A citation is a pointer, not a coverage claim**, and one entry says so out loud: the **Forged
  system handoff** probe is a *partial* mapping. The OWASP category is agent-to-agent compromise;
  what ships is a user-pasted note styled like an internal handoff — a legitimate first-party
  injection probe against the same weakness, but not the category. Say so where it matters rather
  than letting the catalog read as a coverage matrix.
- **Never render raw provenance.** A provenance chip's visible label is always a friendly high-level
  category — **Answer quality / Factual accuracy / Task success / Safety & security / Stays in bounds
  / Fairness** for evaluators (fallback **Evaluation standard**), the friendly OWASP category for
  scenarios. Never a framework acronym (OWASP, RAGAS, G-Eval, promptfoo), never an `ASI0X` or `LLM0x`
  code, never a slug. The raw method and citation belong only in the chip's plain-English tooltip,
  which ends in a citable link. Do not import the contradicting docstring on the `ProvenanceChip`
  primitive — it describes retired prototype behaviour, and the guard tests are the answer.
- The adopted-record chip reads **Recommended**, and it renders on **evaluators only** — the
  Evaluators list row, the evaluator panel header, and the Expected Output eval card. An adopted
  *scenario* records its catalog provenance in storage but renders **no** chip on the Scenarios list;
  its provenance shows only as the muted **"In your project"** state back in the adopt modal. Never
  promise a reader a chip on an adopted scenario.
- Adopting recommended scenarios offers two actions and a dismiss, never three equal buttons:
  **"Add & tailor to your agent"** (primary) and **"Add without tailoring"** (secondary), plus
  **Cancel**. With no agent connected the primary disables under the nudge **"Connect an agent to
  tailor these"** — adoption itself never blocks. The evaluators modal's CTA counts instead:
  **"Add N evaluators"**. Never a bare "Add", never "Adopt" as a button. The select-all control reads
  **"Select all N"**, and N is computed from what is still selectable — write it as *N*, never as a
  fixed 10.
- The gesture is **tailor**. Tailoring completes adoption immediately and then runs unattended in the
  background. Report per-category state in plain words — **grounded / needs approval / not tailored /
  failed / working / pending / not applicable**. Never surface the internal grounding ladder
  (`L1`–`L4`, "rung", "ground" / "grounding pass"), a catalog slug, or an `ASI0X` code; the modal's
  own copy note says "Plain language only". An item in the catalog is an **entry**, a **probe** or a
  **scenario** — never a "row", and the no-carve-out version of that rule applies here.
- **No catalog scenario ships expected actions, test data, or reference material.** A catalog entry
  carries a name, a goal, its friendly category, its citation, prose expected-behaviour guidance and
  the checks it pairs with — nothing else. Never tell a reader an adopted scenario arrives ready to
  run against their own data.

## Terminology — evaluations and results

- Repeats are **"Repeat each test case"** (launcher, 1–4), **"Trial N"** (grouped child rows), and
  **"Trial N of K"** (fly-in switcher). `Pass^K` is headline notation only — never write bare "K"
  or "trials" in reader-facing prose.
- Results default to **By scenario**; the flat table is the explicit **Flat** view.
- Quote a reliability read as `2/3`, not "2 of 3 passed". **One verbatim-UI carve-out:** the
  collapsed per-evaluator cell on a run's results matrix literally renders `2/3 passed`
  (`matrix-column-derivation.tsx:109`), with an `N not scored` caption beneath it where checks were
  skipped, and a grouped summary whose rollup passes despite untestable attempts is labelled
  **Pass among scored** with an amber `N couldn't test` caption. Quote those surfaces as they ship.
- **Five outcomes leave the pass-rate denominator; only four of them are the environment's fault.**
  Exclusion and attribution are separate axes — never write "four denominator-excluded classes"
  again. The excluded set is `runtime_blocked`, `infra_failure`, `harness_failure`, `access_blocked`
  and `agent_error`. Only the first four carry the grey **"Environment problem — not the agent ·
  Excluded from the score"** framing, under the headings **Guardrail blocked** / **Environment
  problem** / **Access blocked**. `agent_error` — the agent's own action threw — reads amber as
  **Couldn't test**, and the grey copy is structurally unreachable for it, so never blanket "the
  agent never got a fair shot" across all five. Voiding is asymmetric: only a would-be pass is
  voided; a graded failure keeps its verdict with a degraded annotation.
- The evaluation-reliability lexicon is frozen to exactly three terms, and nothing else may be coined
  on these screens: **Couldn't test**, **Not scored**, **Unverified**. Quote **Couldn't test** with a
  **straight** apostrophe (U+0027) — that is the byte the app ships, and it is deliberately not
  uniform across the product (the connections pill **Can’t reach it** ships a typographic one).
  **This is a source rule, not a rendering claim:** Mintlify's typographer converts a straight
  apostrophe on the way out, so the published page displays **Couldn’t test** curly. Write the
  straight byte anyway — it is what the source, and any future extraction from these files, is
  matched against. The connection strings are the opposite case: they ship curly, so they are
  written curly (`Can’t reach it`, `You can’t undo this.`, `This agent’s Salesforce org`). The
  reader-facing noun for what a run grades on these surfaces is **conversation / conversations** —
  not "row", not "case", not "example".
- Run health has its own surfaces and its own words: the run list carries an amber count beside the
  pass rate so a green rate never renders uncaveated; Run Detail gets a health strip, a **"What
  happened in this run"** dialog with a live **Re-run at concurrency 3** action, and a hero stat that
  explains its own denominator; the Result fly-in gets a banner, a typed action-error drill-down and
  a red failed-step pill in the transcript. The one-line agent-error summary is **"Not scored because
  an action the agent runs returned an error."**
- A **quick evaluation** is the reader-facing name for grading one session in place from its own
  fly-in: the toast **"Quick evaluation started"**, the in-flight caption **"Scoring check 2 of
  3…"**, the finish toast **"Quick evaluation finished"** with a **View** action, and a muted
  **Quick** pill on the Evaluations list row, which opens the conversation it graded rather than a
  run-detail page. It mints no run record, so those rows carry no Cancel and no Delete. Never write
  the wire value `one_off`, and never "one-off evaluation" — reconcile older docs to **quick
  evaluation**.
- **Scenarios simulate; sessions replay.** A bulk evaluation launched from the Sessions source does
  **not** grade the stored transcript: the worker re-sends each row's stored input turns to the live
  agent through the gateway and grades the answer it gives now (`evaluation_worker.py:14-20`;
  `service.py:3150` — "Rule 1 — scenarios simulate; sessions replay", with
  `simulate_at_eval_time=is_scenarios`). So a bulk sessions run needs a connected agent, even though
  the launcher shows no Environment section for it. The **only** path that grades a stored
  transcript is the single-session **quick evaluation** from a session's own fly-in
  (`service.py:3220` — "grade the chosen session's STORED transcript in place"). The launcher's
  shipped line **"No conversations are simulated."** means no *scenario* is played out — never that
  the agent is not called. Never write "graded as they are", "no agent is invoked", "needs no
  agent", "read-only grading" or "nothing is re-sent" of a bulk sessions run.
- **Run comparison is an endpoint, not a screen.** Nothing renders it in the app at this tag and the
  MCP surface does not expose it, so cover it by reference only, hedged, and treat today's shape as
  provisional. Its verdict vocabulary is a closed set that never borrows row-verdict words:
  **Better** / **Worse** / **Too close to call** / **"We can't compare these fairly."** Statistics
  vocabulary is banned: write **the likely range**, never "confidence interval"; write **too close
  to call**, never "not significant". A withheld comparison quotes no number at all, and scenarios
  present in only one run are reported, never treated as zeros.

## Terminology — Trust Agent

- The Trust Agent has three operating modes: **Ask / Plan / Act**. These are product names.
  (The **Playground**'s segmented toggle is a separate thing: **Chat / Simulate**.) A third thing is
  now also called Act — MCP **act mode**, a property of one granted bearer token. Disambiguate on any
  page that uses both; see *Terminology — the MCP surface*.
- The side rail's first section label is **Progress** — reserve "plan" for the planning phase.
- **Standing approval** is the durable chat-wide grant. The chip prefix "Standing approval active:"
  is sr-only; visible text is "\<action\> in this chat · Active until Jul 7". The control is
  **"turn off"** (aria-label `Turn off: <label>`) — **never "Revoke"**. The release notes say
  Revoke; no shipped label does.
- One batch write, **one approval card**. A batch of changes is approved at a single, all-or-nothing
  card — never a card per item, and never a first-card grant that silently covers the rest. The
  per-batch cap is **50 items**; past it the agent is told to split the batch. A standing approval
  can **never** cover three things, each confirmed every time: **deleting items**, **saving an agent
  profile**, and **starting an unattended full run** (the preview-gated capability below). Bulk
  mutating or deleting an existing requirement is likewise never covered, even though saving a new
  one is.
- **Four** distinct failure states, quoted exactly:
  - "The Trust Agent hit an unexpected error and stopped. Please try again." — a failed turn the
    server verdicted
  - "The Trust Agent couldn't finish this reply. Please check your connection and try again." — a
    transport failure that never reached a server verdict
  - "This reply was interrupted." + **Continue** — a reply cut short. This note is painted for
    **two** dispositions: a dropped connection *and* a turn you stopped, so it is no longer
    disconnect-only.
  - "Couldn't load this conversation" + **Retry** — history read failure

  A failed turn paints a card where the reply would have been, carrying one humanised sentence, the
  recovery hint **"You can try again, or pick a different model first."**, a **Try again** action and
  the model picker. The raw exception is never shown. Note the near-miss legacy string "The Trust
  Agent hit **an error** and stopped." (`STRANDS_ERROR`) — different sentence, different code path.
  Don't merge them. The app-wide error boundary ("Something went wrong displaying this page" +
  **Reload page**) is route-level, not agent-level — never merge it with these four either.
- **Built-in skill** (editor note and Workspace Settings group label; the transcript chip says
  **Core skill**) versus **Workspace skill** (chip; listed as **Custom**). Skills are
  **workspace-scoped**. The receipt line reads **Reviewed \<skill name\>**.
  **Never hardcode a built-in skill count** — the set keeps moving: **20** at this tag (21 files,
  one rejected by the slug guard), against 11 in the release notes and "sixteen" in the engineering
  notes. Four sources, four numbers, which is exactly why the rule is right.
- **Connected agent** is the card at the top of the rail's **Context** section. The rail's health
  chip vocabulary is exactly **Not checked / Healthy / Degraded / Unreachable** — and **scope that
  set to the rail**: the project Connections card answers a different question with a different four
  (see *Terminology — connections*). In-flight Outputs rows read **Generating…** (session) and
  **Running…** (evaluation).
- **The backend wins on Act mode.** The runtime waits for approval on every mutating write. The
  mode-toggle subtitle still says "without pausing for approval" — that copy is stale; do not
  document it.
- A chat turn has a **model** and a **thinking depth**, both chosen by you. **Never hardcode a model
  count, a vendor list, or a default model.** The code serves six models across two vendors, but a
  deployment pins its own allowlist, so what a reader sees is whatever their workspace offers — write
  "the models your workspace offers". The composer's **Thinking** chip sets depth:
  **Standard / Brief / Balanced / Thorough**, default **Balanced**, offering only the depths the
  selected model declares and hiding entirely for a model with one. Do not write "per message" —
  the menu's own footer says **"Applies to this conversation, starting with your first message"**
  (`welcome-page.tsx:178`). Quote that sentence rather than restating the scope in your own words. Write "thinking depth", never
  "reasoning effort" (the wire name), and never present a depth as comparable across vendors — each
  is its own scale.
- A settled reply carries a timing line reading **"Answered in 42s · 31s thinking"**, collapsed by
  default and expanding into a proportion bar with per-phase totals. Quote the shape, never a
  specific duration. Under a second the whole line reads **"Answered in under 1s"**. A turn paused at
  an approval gate has not settled and shows no timing line.
- **Stop** interrupts an in-flight turn (accessible name `Stop generating`) and appears only while a
  turn is genuinely running. The halted turn is stored as cancelled — distinct from a disconnect and
  from a provider failure — but the transcript paints the same calm note for both. So write "you
  stopped it" in your own prose, quote **"This reply was interrupted."** exactly as it ships, and
  never promise a reader a separate "cancelled" label: no string saying "you stopped this reply"
  ships.

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
  isn't available for this connection yet." (That is the reader-facing string; the gateway's own
  fallthrough — "Capability discovery is not yet available for \<platform\> connections." — is
  not.)
- The confirmation gate on a discovered capability is a locked trio: **Asks the person first** /
  **Runs without asking** / **Not published by the platform**. Never collapse the third into the
  second.

## Terminology — connections

- **Two surfaces, two names, one word each — never swap them.** A project's settings strip is
  **General · Connections · Members**, and the **Connections** tab lists the agents that project
  tests; the action on it is **Connect an agent**, never "Add connection". The workspace admin tab is
  **Connected orgs**, and it manages the workspace's Salesforce org authorizations. The retired
  singular **Connection** tab and the **Environments & Connections** tab survive only behind a
  temporary default-ON kill-switch, and both old routes redirect onto the tab that owns the job now.
  Never write "Environments & Connections" except as history, and never build guidance on the off
  branch.
- Four connectable agent platforms, including the **Conversational HTTP agent**. Agent connections
  and **data** connections are different sets: the test-data data plane is frozen to **Salesforce**,
  **DynamoDB** and a fixture adapter. Postgres and S3 adapters exist in core but are unwired at this
  tag, so never present a Postgres or S3 test-data connection as available.
- On the Connections tab each agent is a **card**, and **Customize environment** is the expander that
  extends it downward in place — holding that connection's test data stores, its reset behaviour as a
  plain sentence, how many tests may run at once, and its optional test users. The card answers two
  different questions in two vocabularies that are **not** interchangeable:
  - *Is setup finished?* — the setup badge **Connected / Setting up / Needs admin / Setup failed**,
    shown only while setup still has something to say.
  - *Can TrustAI reach it right now?* — the reachability pill **Connected / Partly reachable /
    Can’t reach it / Not checked yet**. That apostrophe is typographic (U+2019), as shipped —
    unlike the reliability lexicon's **Couldn't test**, which ships a straight one.

  Health is never fabricated green: an unchecked connection says so. Neither set is the Trust Agent
  rail's **Not checked / Healthy / Degraded / Unreachable** — three vocabularies, three surfaces.
- **Agent** and **Environment** are discover-then-pick selects populated by a **Find agents**
  button — never "Agent ID" / "Environment ID".
- The execution-identity vocabulary is **test user**, everywhere a person reads it. On the shipped
  Connections card the disclosure reads **Run tests as different users (permission sets)**, and
  inside it each row is **Test user *N***, added with **Add test user** and committed with **Save
  test users**; with none added it reads **No additional test users yet**. **Default test user** and
  **Additional test users (permission sets)** are the *connection edit form's* labels only — scope
  them there, and never present them as what the card shows. The in-chat connect card keeps **Run-as user**.
  The backend words **execution identity** and **execution user** are banned from these surfaces, so
  retire **Default execution user** and **Permission test identities** from the docs with them —
  neither renders on the Connections surface at this tag. Never "Integration user". One carve-out:
  the legacy environment-editor fly-in still heads itself "Execution identities", but it sits on the
  retired Environments & Connections tab, so don't document it either way.
- Salesforce sign-in labels, in the settings picker: "Authorize TrustAI as an admin (recommended)" /
  "External Client App key + secret (legacy)" / "Certificate-based JWT (legacy)" / "Username +
  password (legacy)". In-chat: "Authorize TrustAI (recommended)" / "Key and secret" /
  "Certificate (JWT)". **Scope those four to the edit form.** The create path has no sign-in-method
  control at all — the admin-authorize flow *is* the create path — so never describe a picker a new
  connection never sees.
- **The admin-authorize (token-exchange) path is the only documented way to create a Salesforce
  connection.** The three legacy modes are deprecated: do not present them as alternatives, and do
  not write a fallback path around them.
- **External Client App** is the org-side app **TrustAI deploys**, not something the customer hands
  over. "App A" / "App B" are retired internal shorthand. Do not quote a literal app-name template:
  the old `TrustAI_Agent_Eval_<suffix>` string appears nowhere in the app source at this tag. A
  one-click connect may also stand up a *second*, named-user-JWT External Client App for a read-only
  Salesforce MCP tool set whose usage defaults off — neither app is reader-facing, so keep both out
  of prose.
- Reusing an already-authorized org creates an **agent-less connection**: a clone pointed at the same
  provisioned org, with no agent selected yet. The panel is **"Reuse a Salesforce connection you
  already have"**, the action is **Use this connection**, and availability reads **"Already connected
  in your workspace"**. The release-note phrase "the organizations you can already reach" matches no
  shipped label — don't quote it.
- Connection lifecycle: **Connected / Setting up / Needs admin / Setup failed**. Sign-in labels on
  the workspace row: **Admin authorization / App key & secret / Certificate (JWT) / Username &
  password**.
- Write-only secret affordance: a **Configured** status pill plus the placeholder
  `•••• configured — leave blank to keep existing`. For Salesforce this now includes the
  **Consumer key**.
- "Agentforce Builder", not "Agent Builder". This one is sourced from Salesforce's own naming, not
  from our code — neither string renders anywhere in the app — so treat it as house style, not as a
  quote of a shipped label.
- Salesforce trace lag is **~11–13 minutes, typically** — and the app now says so on screen, so
  **match the shipped sentence rather than leading it**: "The agent's platform has not published this
  conversation's execution trace yet. Traces usually land 11-13 minutes after a conversation ends."
  (straight hyphen, as shipped). The grading **wait cap** is a different number and is also on
  screen — "TrustAI keeps checking for up to 30 minutes, then grades these checks automatically."
  Quote it; never paraphrase it, and never merge the two numbers. (Five stale code comments say
  ~9 min; ignore them.)

## Terminology — test data

The product word is **test data**. See *Content boundaries* for the codename ban that makes this
enforced rather than preferred.

- A scenario's test data is authored as one **plan**. The in-app help drawer locks eight terms
  against their points of use: **The plan · Read-back · Filter · Cleanup · How this test runs ·
  Starting data · Expected end state · Environment**. Note the deliberate split: the *noun* is
  hyphenated **Read-back**; the step is the verb **Read back**.
- The plan renders as five step cards, and their shipped titles are full sentences, not short names:
  **"Create what this test needs" · "Run the conversation" · "Read back what the agent created" ·
  "Check what should happen" · "Clean up everything this test created"**. "Compare" is an internal
  accordion id and renders nowhere — never write it as a step.
- Authoring entry points are **Set up with AI** and **Add manually** on the empty-plan hero, and
  **Edit plan** thereafter. All three open the same docked drawer, whose tabs are **AI · Form ·
  JSON** (the older "With AI · As a form · As JSON" segmented control is retired and does not
  render). An AI proposal is always reviewable before it replaces the stored plan.
- A **run report** is the per-run record of what actually happened to test data — setup, read-back,
  structural results and cleanup. Its heading is **"What TrustAI did"**, and it links back to the
  scenario's plan.
- The execution-mode pair is **Runs alongside other tests (recommended)** / **Runs alone**. There is
  no third option.
- **Two locked cleanup sentences, never swapped and never paraphrased.** The Connections surface's
  footer reads "Between tests: " followed by **"Removes only the records each test created."** The
  plan's Clean-up card has its own: **"Removes the records this test created and tagged for the run —
  seeded records included."** Cleanup runs on every run and cannot be turned off; no surface offers
  to disable it.
- Flags and defaults **in the tagged code** — defaults, not deployment posture; see the box below.
  `ENABLE_TDM` on, `VITE_TEST_DATA_PLAN` on, `VITE_TEST_DATA_RUN_REPORT` on; the two web flags
  *narrow* the test-data gate and never widen it. `ENABLE_TDM_SHARED_STORE` is **off**, so
  shared-store cleanup — row-level scoping into a customer's existing store — is dark: do not
  describe the capability at all. The development-only fixture hooks are never documented.

## Terminology — the MCP surface

TrustAI is an **MCP server**, and the surface is **live and unflagged** at this tag. Document it as
an ordinary shipped surface — not as preview, and not as gated.

- Connecting is a URL plus one browser click: the client discovers the authorization server,
  registers itself, and a person approves one consent screen naming the app, the account and the
  workspace. Sign-in is **your workspace's SSO identity provider**, in exactly those words. The
  bearer is revocable, and a caller can list and delete their own tokens.
- The consent screen offers three answers, quoted exactly and in sentence case: **"Read only"** /
  **"Read and write"** / **"Read and write, act mode"** — "act mode" is lowercase in the shipped
  radio label. Never "Act Mode", never "Read/Write". A write-only request instead reads **"Write
  access"**. Act is a person-only choice made at the consent screen: a client may request read and
  write, and can never demand or self-escalate into act mode. Explain the behaviour in prose and
  quote the label plainly — the engineering guide's gloss "Read and write (asks before every change)"
  is a doc-side explanation, not a shipped label.
- **The cookie path is a dev/local fallback only.** The middleware reads the `Authorization` header
  first and the cookie second; a cookie session carries no scope and no act mode. Never present it as
  the customer path.
- Six coarse tools, named with underscores and no dot: **`trustai_project`**,
  **`trustai_requirements`**, **`trustai_evaluators`**, **`trustai_scenarios`**, **`trustai_runs`**,
  **`trustai_adjudicate`**. Each covers a whole area and takes an operation name plus that
  operation's arguments; the argument detail lives in a schema resource a client reads once, for the
  tool it is about to use. The older dotted `trustai.*` names are the V0 surface and still ship —
  keep the two shapes visibly distinct rather than merging them into one list. Do not enumerate
  per-tool operations in prose: they land per capability, and the schema resource is the source.
- **Disambiguate the three Acts.** The Trust Agent's **Act** is one of its three in-product operating
  modes, and it still stops for every mutating write. MCP **act mode** is a consent-granted property
  of one bearer token that skips the per-change approval for that connection. **Standing approval**
  is a third thing again — the Trust Agent's durable, chat-wide grant. Separate mechanisms, separate
  grants; never imply one implies another.
- State two limits plainly rather than hedging the whole surface: parity with the REST authoring
  surface is **incomplete by design and enumerated** as a CI-enforced backlog (run comparison and
  annotations are on it), and there is **no in-app management screen yet** — token listing and
  revocation are API-level.
- `docs/eng/mcp-clients/` is a **valid source** for the connect recipe and the consent copy: seven
  maintained files, partly pinned by a conformance test, and its own README names itself the
  canonical connection instructions. It is **not** a source for the production URL (it prints a
  non-deployed origin) and not for counts that move (it says "sixteen recipes"; the bundled set
  is 20).

## Terminology — access, workspace, billing

- Workspace roles are **Owner / Admin / Member / Guest**. Project tiers are **Viewer / Editor /
  Admin** — all three grantable — plus **Owner**, conferred at creation, never grantable, and moved
  only by an explicit **Transfer ownership** (dialog title "Transfer ownership?"), after which the
  outgoing owner steps down to Admin. Never render the raw slugs — `member` displays as **Editor**. A
  workspace **Guest cannot create a project**.
- The workspace admin surface has **six** tabs: Members, Teams, Project access, Credits,
  **Connected orgs**, General. The fifth is deliberately *not* called "Connections" — that name
  belongs to the project-settings tab — so don't "fix" it back. Two further routes resolve but are
  **not** tabs: Roles & permissions (opened at the role picker) and Access audit (opened as a
  drawer). The v2026.06.30.1 changelog's "consolidates six tabs into four" is history, not current
  state.
- Every permission refusal names your role, the action and the remedy. Quote the shipped template,
  never invent one: **"Your Viewer role doesn't have permission to delete personas. Contact a project
  admin to change your role."** Two refusals deliberately end differently because the remedy differs
  — project deletion and ownership transfer both close with **"Only the project's owner, or a
  workspace admin, can …"**. A caller with no role on the project at all hears **"You don't have
  access to this project. Contact a workspace admin to request access."** A workspace Guest who tries
  to create a project gets its own sentence. None of them carries a UUID or a catalog slug.
- Identity is federated via **your workspace's SSO identity provider** — never name WorkOS in
  reader-facing prose. (WorkOS commercial is the default; Keycloak Organizations sits on the
  self-hosted/gov OIDC boundary, which is preview and off.)
- Billing nouns: **credits**, **credit pool**, **Credit usage**, "Where your credits went".
  **The credit pool resets monthly** — the release note calling it a "lifetime" pool is wrong. The
  breakdown's three curated row labels are **Scenario simulations**, **Evaluator checks** and **Trust
  Agent conversations**.
- Three different cap strings, none interchangeable: **Credit limit reached** (FE banner title) ·
  `cap reached — contact your admin` (server 402 detail) · "This run would exceed your workspace
  credit limit. Contact your admin to continue." (no-detail fallback).
- **Never publish per-action credit weights, and never print a dollar figure.** The weights are
  uncalibrated placeholders — which is why the Credits card itself hedges metered rows as "About N
  credits". Every metered action now records a real cost, but none of it is reader-visible, so the
  docs must not be the first place a dollar appears.

## Terminology — Requirements

Requirements ships and is enabled in production. Document it as an ordinary surface. The vocabulary
below is locked — several of these labels are enforced by conformance tests, so a slip is a build
failure, not a style nit.

- The handle is **`REQ-{n}`** — a bare integer, deliberately **not** zero-padded like `SCN-000123`.
  The UUID is never reader-visible.
- Health is a locked five-state set: **Passing / Failing / Partially covered / Uncovered / Not yet
  run**. **"Broken" is banned** — it is the prototype's label and a conformance test blocks it.
- `status` is the editorial **lifecycle** (draft / active / archived); `health` is the **computed
  rollup**. Never conflate. Draft and Archived render as lifecycle chips, never as health pills.
- Type reads "The agent must do this" / "The agent must never do this"; the fly-in chip for `avoid`
  is **Must-not**. Never surface the wire enum `achieve` / `avoid`.
- **Gaps** = Uncovered + Partially covered. Source is **Manual / Document / Chat / Import** (a
  requirement written through MCP is stamped as agent-authored). **All / Gaps / Failing** are a fixed three **filter
  chips** — not saved views, and neither renameable nor extendable. The only built-in *saved view*
  is **All requirements**. Both sit alongside the ordinary table controls: show/hide, reorder, resize, save a view, set as default, fullscreen.
- Requirements are the **step-2 gate of the Trust Agent's enforced authoring workflow**, and the gate
  is a runtime refusal rather than a nudge: asking the agent to generate scenarios before any
  requirement exists is refused with **"Draft and save the requirements first. I can guide you
  through that now before we continue."** The later steps chain off it — setting expected output,
  setting test data, simulating and running all refuse until each requirement has an evaluator
  created *and* attached. A guide that skips requirements will dead-end its reader.

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
  **A markdown table wider than three short columns must sit in its own**
  `<div style={{ overflowX: "auto" }}>`: Mintlify's own table wrapper does not scroll, so an
  unwrapped wide table pushes the whole page sideways at 375 px. Keep tables to two or three narrow
  columns, or wrap them.
- **The product name in prose is TrustAI**; the formal site name Provar Trust AI stays only where it
  is already the site name. (Editorial ruling this cycle — reversible.)

## Content boundaries

- No internal routes (`/paddington/*`, `/v1/internal/*`), internal codenames, or machine-local
  paths anywhere reader-visible — **including the published OpenAPI spec**, which is re-exported
  from the release tag and sanitized at every landing.
- **Never write "Paddington" reader-visible.** The Credits-breakdown leak this rule used to cite is
  **fixed** — the humaniser now maps that action to **Trust Agent conversations** — so drop the old
  warning rather than sending readers to look for a row that no longer exists. One residual risk is
  worth keeping: the humaniser title-cases any *unmodelled* action type, so a future action added
  without a label entry could leak the codename again.
- Two reader-visible slash-command labels in the Trust Agent's palette currently leak retired or
  internal vocabulary (the palette paints each bundled recipe as `/<slug>`, which at this tag yields
  `/author-tdm-data-with-discovery` and `/create-dataset`). **Do not document either slug** — report
  them as defects instead.
- Unverified claims read as unverified: behavior the running app hasn't confirmed carries an
  `{/* ACCURACY-AUDIT-PENDING */}` marker and is written at behavior level, hedged, never asserted
  with mechanics. Never vouch for an unverified security property.
- **"TDM" and "Test Data Management" are internal codenames and must never be reader-visible.** The
  product word is **test data**. This is enforced, not preferred: a conformance test sweeps the
  public route table for a whole-word `tdm`, and its known-leak ledger is empty. Never write
  `/v1/tdm/*` (the internal gateway path), never expand the acronym, and prefer "test data"
  everywhere — headings and the changelog included.
- Preview features are labeled preview, never GA. **Requirements and test data are NOT preview** —
  both default on in the tagged code and are documented as ordinary shipped surfaces, including
  `/v1/connect/environments*`. The **MCP surface** is not preview either, and is not flagged at all.
- **Automatic Full Run is the one genuinely default-OFF capability in scope.** The sentence that used
  to close this block — "nothing in the docs is currently preview-gated" — is **retired**, because it
  is no longer safe to assert. The ruling: **omit Automatic Full Run from reader-facing docs**, or,
  only after an operator confirms posture, label that one surface preview and hedge it. Nothing else
  moves. While you are here, fix the trap in `snippets/preview-notice.mdx`: its usage example is
  `<PreviewNotice surface="Test Data Management" />` — a surface this very rule declares *not*
  preview, named with the banned codename.

  > [!IMPORTANT]
  > **How to establish flag state — read this before writing about any gated surface.**
  >
  > The tagged code is authoritative for **behaviour**: what a surface does, what the router returns
  > when a flag is off, which labels render. It is **not** authoritative for **deployment state**.
  >
  > A default in `core/config.py` is evidence of a default, nothing more. And the `values/**` files
  > in the app repo are **not** production — `values-prod-agents.yaml` is a template whose origins
  > are placeholders (`api.trustai.example.com`) and whose own comments describe a cluster that does
  > not exist yet. `docs/eng/mcp-clients/README.md` likewise prints a non-deployed origin. Real
  > deployments are `app.agents.provar.com` and its siblings, configured elsewhere.
  >
  > **Confirm flag posture with someone who operates the deployment.** Reading it out of the repo
  > has produced two wrong conclusions already: that the Salesforce authorize path 503s in
  > production (it does not), and that Requirements is off everywhere (it is on — and the tagged
  > default now agrees, so that rule no longer reads as a correction of the repo). A third is
  > available for free from the newest release notes, which describe the test data plan and
  > run-report screens as enabled in a separately built image, with production promotion still
  > pending. The read-only app running at this tag renders the default-on surfaces below — that is
  > **behaviour** evidence, not evidence about any customer's deployment.
  >
  > **Web flags are compiled into the bundle at build time.** A `VITE_` flag has to cross four layers
  > to reach a running site, and an undeclared build arg is silently dropped — the bundle then
  > compiles the source default. So **"ask your admin to enable it" is wrong for every `VITE_`
  > flag**: an operator cannot flip one on a running pod; it needs a rebuilt image.
  >
  > **Defaults in the tagged code. Defaults, not posture.**
  >
  > *On — opt out with the literal `false`:*
  > - `ENABLE_TDM` + `VITE_TDM_PREVIEW` — test data. The web flag derives from the backend switch, so
  >   the two cannot drift.
  > - `ENABLE_REQUIREMENTS` — Requirements. Routes are always mounted; a router guard 404s them when
  >   off.
  > - `VITE_CONNECTIONS_REDESIGN` — the single project **Connections** tab. A temporary kill-switch,
  >   not a product choice; build nothing on the off branch.
  > - `EVAL_AGENT_ERROR_ENABLED` + `VITE_EVAL_RELIABILITY` — the typed agent-error outcome and its
  >   surfaces. Server and frontend flip together.
  > - `VITE_TEST_DATA_PLAN` and `VITE_TEST_DATA_RUN_REPORT` — new at this tag. Both *narrow* the
  >   test-data gate and never widen it.
  >
  > *Off — an environment opts in:*
  > - `autopilot_enabled` — Automatic Full Run. Deliberately opt-in: an unattended run spends real
  >   credits against a customer's agent with nobody watching. See the preview ruling above.
  > - `ENABLE_PADDINGTON_MCP` — a read-only Salesforce MCP tool set on the Trust Agent. This is
  >   **not** the TrustAI MCP server; never conflate the two.
  > - `ENABLE_TDM_SHARED_STORE` — seeding into a customer's real store. Blocked on two named defects.
  > - `VITE_AGENT_DEV` — the Trust Agent dev harness. Opt in on the literal `true` only.
  > - `enable_project_snapshots`, and the development-only fixture hooks. Both prohibited in
  >   production.
  >
  > *Unflagged:* the MCP surface mounts unconditionally. Do not hedge it as gated.
  >
  > Where a surface genuinely is gated off, say so with the caveat. Where it ships, document it
  > plainly. Do not infer either from a config default.
- The MCP **cookie** path is a dev/local fallback, not a customer path — see *Terminology — the MCP
  surface*, which **supersedes** the old blanket rule that the whole external MCP connection was
  internal and that `docs/eng/mcp-clients/` was not a source. Both halves of that rule are retired:
  the customer path is OAuth with a consent screen, and those engineering notes are now a valid
  source within the bounds that block sets.
- The Trust Agent dev harness (`VITE_AGENT_DEV`, the OBSERVE fly-in, the build-identity chip, the
  debug packet, `pnpm devloop`) is developer-only, defaults off, and is never reader-visible in any
  form. Same for the self-eval principal `trustai-self-eval-author`.
- **`trustai_project` names two different things — split the clause.** As an internal *connection
  type* (the gateway's self-eval loopback data plane) it stays unwritten. As one of the six **public
  MCP tool names** it is required vocabulary. Forbid the first; name the second.
- Never document the standing-grant endpoints.
- The in-app string "the TrustAI agent" (Agent Profile overview) is a product-copy defect — do not
  import it into prose.
- Interactive demos are sanitized, self-contained design prototypes with synthetic data, always
  captioned "Interactive prototype — … Design reference." The surrounding prose, never the
  prototype, is the authority on shipped behavior.
- Don't document internal build/process vocabulary ("capture pass", ticket IDs, codenames) in
  reader-visible prose.
