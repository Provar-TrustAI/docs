# Recommendation: docs.provar.dev Versioning + App-to-Docs Information Flow

**Spike:** DEV-1764
**Date:** 2026-05-20
**Author:** Brady (via spike)
**Status:** Proposal — needs Brady sign-off before any implementation work
**Predecessors:** `app-release-cadence-audit.md`, `mintlify-versioning-options.md` (same folder)

---

## Headline recommendation

**Ship `docs.provar.dev` as a single rolling site that follows the latest app release. Use product-axis version names (V0, V1, V2) — never engineering CalVer tags. Adopt the `vN/` subfolder convention from day one, but do NOT enable Mintlify's `navigation.versions` dropdown until a second simultaneously-supported major version exists.**

For the information flow, **OpenAPI is the only machine-generated docs input for V1.** Everything else (concepts, how-tos, release notes) is human-authored Markdown in this repo. The minimum-viable cross-repo seam is a docs-side GitHub Action that, on a `repository_dispatch` from the app repo's tag-publish workflow, downloads the tagged `openapi.json`, regenerates `reference/api.mdx`, and opens a PR. Manual-first for V0–V1; automate once we have two cycles of muscle memory.

This recommendation hedges against the two failure modes that scare me:
1. **Premature versioning UI** (a version dropdown with one entry "V1" in it is just visual noise).
2. **Premature automation** (auto-generated docs that drift because no human inspects the diff are worse than manual ports).

The rec is structured so the cheap, reversible decisions land now and the expensive ones wait for a real V1-and-V2 scenario.

---

## Information flow: app tag → docs

### ASCII flow diagram

```
+---------------------------+              +-------------------------+
|  trust-ai-app (monorepo)  |              |   docs (Mintlify repo)  |
+---------------------------+              +-------------------------+
        |                                            ^
        | 1. Human cuts tag:                         |
        |    git tag v2026.MM.DD && git push --tags  |
        v                                            |
+---------------------------+                        |
|  .github/workflows/       |                        |
|  publish-ghcr.yml         |                        |
|  (on push: tags: ["v*"])  |                        |
|                           |                        |
|  Today:                   |                        |
|    - builds 4 images      |                        |
|    - tags GHCR :<tag>     |                        |
|    - opens values bump PR |                        |
|                           |                        |
|  ADD (Phase 2):           |                        |
|    - dump openapi.json    |                        |
|    - attach as            |                        |
|      release asset        |                        |
|    - emit                 |                        |
|      repository_dispatch  |---------------------+  |
|      to docs repo         |                     |  |
+---------------------------+                     |  |
                                                  |  |
        Manual (V0->V1 cut):                      |  |
+---------------------------+                     |  |
|  Brady runs:              |                     |  |
|    curl raw.github.com/   |                     |  |
|      ../<tag>/openapi.json|                     |  |
|    -> reference/api.mdx   |                     |  |
|    -> changelog.mdx entry |                     |  |
|    -> commit + PR         |                     |  |
+---------------------------+                     |  |
                                                  v  |
                              +-----------------------------+
                              |  .github/workflows/         |
                              |  regen-reference.yml (NEW)  |
                              |                             |
                              |  on:                        |
                              |    repository_dispatch:     |
                              |      types: [app-released]  |
                              |    workflow_dispatch:       |
                              |      inputs: { tag, ver }   |
                              |                             |
                              |  Steps:                     |
                              |  1. download openapi.json   |
                              |     from the app tag        |
                              |  2. run docs-gen script     |
                              |     (mdx + group nav)       |
                              |  3. open PR labeled         |
                              |     "auto-reference-bump"   |
                              +-----------------------------+
                                          |
                                          v
                              +-----------------------------+
                              |  Brady reviews PR diff      |
                              |  - approves: merge          |
                              |  - rejects: edit + push     |
                              |  - drift detected: fix at   |
                              |    source in app repo       |
                              +-----------------------------+
                                          |
                                          v
                              +-----------------------------+
                              |  Mintlify auto-builds       |
                              |  docs.provar.dev on merge   |
                              +-----------------------------+
```

### What crosses the seam, what doesn't

**Crosses (machine-generated):**
- `openapi.json` (one file, per tag) → `reference/api.mdx` (+ optionally per-endpoint splits)

**Does NOT cross (human-authored in docs repo):**
- `concepts/*.mdx` — conceptual model, evaluation loop, glossary. Updated by humans when product semantics change.
- `how-to/*.mdx` — task-oriented guides. Updated when UX flows change; tracked manually.
- `tutorials/*.mdx` — onboarding paths. Updated rarely.
- `changelog.mdx` — release-axis Markdown. Updated on each major cut by porting/condensing the app's `RELEASE_NOTES_*.md`.
- `reference/schemas.mdx` — the seven nouns. Stable; updated only if domain model changes.

**Does NOT cross today, may later:**
- Skill registry (Paddington OOTB skills) — could be JSON-dumped from `services/api/src/domain/paddington/skills/`. Defer until M5+ when a skills directory becomes a customer-facing page.
- TypeScript types tarball — derived from `openapi.json`. If a public SDK ships, surface from the SDK repo, not from app repo. Not v1 concern.

---

## Versioning architecture decision

**Adopt Option B (subfolders, no version UI) as the v1 architecture.**

Concrete docs-repo layout when V1 cuts:

```
docs/
├── docs.json                  # navigation.groups points at current-version paths
├── index.mdx
├── changelog.mdx              # version-agnostic; aggregates all majors
├── glossary.mdx               # version-agnostic
├── v0/                        # frozen archive when V1 cuts
│   ├── concepts/
│   ├── how-to/
│   ├── reference/
│   ├── tutorials/
│   └── index.mdx              # "You're viewing V0 archive. Latest is at /."
├── concepts/                  # = current (V1+)
├── how-to/
├── reference/
├── tutorials/
└── docs-plan/                 # planning artifacts, gitignored from Mintlify build via mintlify ignore
```

### Why Option B, not Option A

- The Mintlify version dropdown adds value **only when there are ≥2 versions in the dropdown** AND **customers actually need to pick**. We have neither.
- Option B is a strict prefix of Option A: when V2 cuts and we need a dropdown, we add `navigation.versions` to `docs.json` and move existing pages under a `v1/` folder. The folder convention is already correct.
- Mirrors the dominant peer pattern (Stripe, FastMCP, Pydantic AI all ship rolling docs).
- Aligns with "no self-host" reality: a customer using Trust AI cannot be "on V0 in prod" if Provar runs the prod env. They are always on `latest`. Docs follow.

### Why product-axis version names ("V0", "V1") not engineering tags

Quote from `app-release-cadence-audit.md`:

> The tag is too noisy and too internal to surface to customers.

CalVer tags happen 1–4× per week. Most are dot releases. Customers care about marketing milestones, not deploys. The docs-axis version name is a **product-marketing concept**, decoupled from the tag clock. Brady decides when V0 becomes V1.

### Version-name lifecycle

```
                 V0 launches (April 2026)
                          |
                          v
         /              <docs site at HEAD = V0 docs>
                          |
                 V0 stabilizes; V1 development underway
                          |
                          v
                 V1 is announced (date TBD)
                          |
                 (BEFORE V1 ship) docs-side prep:
                 - copy current docs/ tree to docs/v0/
                 - update v0/*/index.mdx with "V0 archive" banner
                 - keep docs/<top-level> = work-in-progress V1
                          |
                 V1 ships
                          |
                          v
         /              <docs site at HEAD = V1 docs;
                         /v0/* = frozen archive>
                          |
                 (Optional, if V2 has multi-version self-host customers)
                 - add navigation.versions array
                 - move docs/<top-level> into docs/v1/
                 - introduce dropdown
```

---

## Automation sketch

### App-side (Phase 2; not blocking V0/V1 docs ship)

New workflow at `trust-ai-app/.github/workflows/publish-docs-artifacts.yml`:

```yaml
name: Publish Docs Artifacts

on:
  push:
    tags: ["v*"]
  workflow_dispatch:
    inputs:
      tag:
        description: "Tag to republish artifacts for"
        required: true

permissions:
  contents: read

jobs:
  publish-openapi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with: { python-version: "3.14" }
      - name: Install uv + deps
        run: |
          pip install uv
          cd services/api && uv sync --extra dev
      - name: Dump OpenAPI
        run: |
          cd services/api
          uv run python -c "from src.main import app; import json, sys; json.dump(app.openapi(), sys.stdout)" > openapi.json
      - name: Upload as release asset
        uses: softprops/action-gh-release@v2
        with:
          files: services/api/openapi.json
          tag_name: ${{ github.ref_name }}
      - name: Dispatch docs regen
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.DOCS_REPO_DISPATCH_TOKEN }}
          repository: Provar-TrustAI/docs
          event-type: app-released
          client-payload: |
            {
              "tag": "${{ github.ref_name }}",
              "openapi_url": "https://github.com/Provar-TrustAI/trustai-app/releases/download/${{ github.ref_name }}/openapi.json"
            }
```

Why phase 2: there is no `services/api/scripts/dump_openapi.py` today. The committed `openapi.json` at HEAD is stale-but-functional for V0/V1. Adding the dumper is a small ticket, not a blocker.

### Docs-side (Phase 1; the only piece that needs to work for V0 → V1)

New workflow at `docs/.github/workflows/regen-reference.yml`:

```yaml
name: Regenerate API Reference

on:
  repository_dispatch:
    types: [app-released]
  workflow_dispatch:
    inputs:
      app_tag:
        description: "App tag (e.g. v2026.05.19) to pull openapi.json from"
        required: true
      product_version:
        description: "Product-axis version name (e.g. V1) -- determines target folder"
        required: true
        default: "current"   # "current" = root reference/, otherwise vN/reference/

permissions:
  contents: write
  pull-requests: write

jobs:
  regenerate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Determine source URL
        id: src
        run: |
          if [ -n "${{ github.event.client_payload.openapi_url }}" ]; then
            echo "url=${{ github.event.client_payload.openapi_url }}" >> "$GITHUB_OUTPUT"
            echo "tag=${{ github.event.client_payload.tag }}" >> "$GITHUB_OUTPUT"
          else
            echo "url=https://raw.githubusercontent.com/Provar-TrustAI/trustai-app/${{ inputs.app_tag }}/services/api/openapi.json" >> "$GITHUB_OUTPUT"
            echo "tag=${{ inputs.app_tag }}" >> "$GITHUB_OUTPUT"
          fi

      - name: Determine target folder
        id: target
        run: |
          PV="${{ github.event.client_payload.product_version || inputs.product_version }}"
          if [ "$PV" = "current" ] || [ -z "$PV" ]; then
            echo "folder=reference" >> "$GITHUB_OUTPUT"
          else
            echo "folder=${PV,,}/reference" >> "$GITHUB_OUTPUT"
          fi

      - name: Fetch openapi.json
        run: curl -fsSL "${{ steps.src.outputs.url }}" -o /tmp/openapi.json

      - name: Render reference MDX
        run: |
          # Stub: real implementation calls a TS/Python script that
          # reads /tmp/openapi.json and emits:
          #   <folder>/api.mdx                       (overview + endpoint table)
          #   <folder>/endpoints/<noun>.mdx          (per-noun grouped pages, optional)
          #   <folder>/schemas/<schema>.mdx          (per-schema, optional)
          node scripts/render-reference.mjs \
            --input /tmp/openapi.json \
            --output "${{ steps.target.outputs.folder }}" \
            --app-tag "${{ steps.src.outputs.tag }}"

      - name: Open PR
        uses: peter-evans/create-pull-request@v6
        with:
          base: main
          branch: auto/reference-bump-${{ steps.src.outputs.tag }}
          delete-branch: true
          commit-message: "chore(reference): regen from app ${{ steps.src.outputs.tag }}"
          title: "chore(reference): regen from app ${{ steps.src.outputs.tag }}"
          labels: auto-reference-bump
          body: |
            Auto-regenerated API reference from `trust-ai-app@${{ steps.src.outputs.tag }}`.

            **Source:** ${{ steps.src.outputs.url }}
            **Target:** `${{ steps.target.outputs.folder }}/`

            Review the diff carefully:
            - Are removed endpoints intentional?
            - Are added endpoints public (not internal-only)?
            - Are descriptions customer-grade?

            If the diff looks wrong, **fix at source in the app repo** (route docstrings, schema descriptions) and re-trigger; do not hand-edit the generated MDX.
```

### The renderer (`scripts/render-reference.mjs`) — out of scope for this spike

A 100–200-line script that parses OpenAPI 3.1 and emits MDX. Reasonable starting points: `@redocly/cli`, `swagger-typescript-api`, or a hand-rolled Pug-like template. **Not a blocker for V0**: the first ports of `reference/api.mdx` can be hand-written from the existing `openapi.json` and the script lands as a follow-up to remove the manual step.

---

## Sequencing

### Now (Phase 0 — already partially done, finish in current sprint)

- Keep `docs.json` as-is (no `navigation.versions`).
- Keep top-level folders for current docs (no `v0/` folder yet — `docs.provar.dev` is still pre-launch and there is no shipped V0 docs experience to archive).
- Add a one-paragraph "How releases flow into these docs" stub to `docs-plan/versioning/recommendation-memo.md` (this file) and link to it from `CONTRIBUTING.md`. **Done by this spike.**

### V0 docs go-live → V1 cut (Phase 1 — manual)

When V0 is content-complete and ready to publish:

1. No code change to `docs.json` re: versioning. Just publish V0 as the canonical site.
2. Manual port of `RELEASE_NOTES_v0.md` content into `changelog.mdx` (the existing scaffold).
3. Manual port of `RELEASE_NOTES_paddington_v1.md` into the changelog (separate `<Update>` block).
4. Manual generation of `reference/api.mdx` from the V0 `openapi.json` snapshot. Hand-edit or use any open-source OpenAPI-to-Markdown tool.

When V1 is announced:

5. Decide on V1 docs cutover date.
6. Pre-cut: `cp -r {concepts,how-to,reference,tutorials} v0/` to freeze V0. Add archive banners. Update internal links if needed.
7. Cut: edit `docs.json` only if any top-level groups changed. The root paths keep serving the latest content (V1).
8. **Still no `navigation.versions` array.** Customers reach V0 via `changelog.mdx` deep links and via Google's cached `/v0/` URLs.

### V1 → V2, if and only if there's a multi-major self-host scenario (Phase 2 — automation)

9. Add app-side `publish-docs-artifacts.yml` (sketch above).
10. Add docs-side `regen-reference.yml` (sketch above) + `scripts/render-reference.mjs`.
11. Run one full dry-run: cut a `v0.0.0-dryrun` tag in the app, watch the dispatch fire, review the PR.
12. After 1 cycle of V1.x releases with the automation working manually-triggered (`workflow_dispatch`), enable the auto-dispatch from the app side.

### Phase 3 — if we ever have ≥2 simultaneously-supported majors

13. Enable `navigation.versions` in `docs.json` with the actual two versions.
14. Decide between Pattern 1 (versions wrap tabs) vs Pattern 2 (tabs wrap versions) based on what's actually versioned. Likely Pattern 2, scoping the dropdown to the Reference tab only.

---

## Minimum-viable-versioning v1 spec

For the V0 → V1 transition, the absolute minimum that has to be true:

| Requirement | Mechanism |
|---|---|
| Customers can find V0 docs after V1 ships | `/v0/*` folder reachable via direct URL + changelog link |
| Customers default to current (V1) docs | Mintlify serves top-level folders at `/` |
| Reference matches the deployed API | Manual port from `services/api/openapi.json` at V1 cut tag |
| Release notes archived | `changelog.mdx` has `<Update>` blocks per major version |
| Cutover is reversible | Git revert. No external infra (DNS, subdomains, separate Mintlify projects) involved |

That's it. No Mintlify versioning feature toggled. No dispatch workflows live. No subdomains. Five deliverables, all under our control, all hand-portable in a half-day.

---

## Risks

### 1. Mintlify versioning is actually paid-tier

**Probability:** Medium. The pricing page does not list it, but Mintlify's pricing pages have historically omitted detail.
**Impact:** Low. We're not depending on `navigation.versions` for the v1 ship. If we ever need it and discover a paywall, the upgrade decision is on Brady's desk, not blocking work-in-flight.
**Mitigation:** Before any commitment to Option A, deploy a one-time test on a non-prod Mintlify project with a 2-element `versions` array and verify it renders on Hobby.

### 2. "V0" / "V1" naming drift between marketing, app code, and docs

**Probability:** High. The app repo already conflates "V0" (the platform) with "Paddington v1" (a feature). Marketing will invent its own framing.
**Impact:** Medium. Customers will see "Trust AI V1" launched but docs reference "Paddington v1" in changelog and get confused.
**Mitigation:** Pick the docs-axis name **explicitly** at each major cut. Document it at the top of `changelog.mdx`. Recommendation: docs uses the platform name ("V0", "V1") and treats feature releases (Paddington v1, M5 MCP, etc.) as items inside the platform major's changelog entry.

### 3. Auto-generated reference drifts from the app and no one notices

**Probability:** Medium. Happens by default if the dispatch workflow is wired up and PRs auto-merge.
**Impact:** High. Customer-facing API docs that don't match the API are a trust-killer for a product literally called Trust AI.
**Mitigation:** **Never auto-merge the regen PR.** Every dispatch opens a PR labeled `auto-reference-bump`; a human reviews the diff. If the diff is bad, fix at source in the app repo (better docstrings, schema descriptions) — do not hand-edit MDX. This is the same principle as "fix at source, not at render."

### 4. The committed `services/api/openapi.json` at HEAD diverges from the actual app

**Probability:** Medium-high. There is no CI gate that regenerates and diffs it.
**Impact:** Medium when manual-port mode (V0/V1). Higher in auto-dispatch mode if the dispatched payload references HEAD's OpenAPI rather than the tagged-commit OpenAPI.
**Mitigation:** The docs-side workflow always fetches the OpenAPI from the **tagged commit**, via `raw.githubusercontent.com/.../v<tag>/services/api/openapi.json`. Never reference HEAD. The app-side phase-2 workflow generates fresh, not reads committed file. Separately, add a CI check (out of scope here — propose as a follow-up) that diffs the live FastAPI app's openapi against the committed file.

### 5. Subdomain sprawl if we panic-pick Option C later

**Probability:** Low if we hold the line on Option B.
**Impact:** High once committed — DNS + Mintlify project sprawl is hard to walk back.
**Mitigation:** Treat Option C as "only if a self-host SKU ships AND multi-major support is a customer demand." That's a real product decision, not a docs-architecture decision.

---

## Recommended follow-up tickets (do NOT open them; propose only)

1. **`docs(versioning): add CONTRIBUTING.md section on release-to-docs flow`** — link this memo, add a one-page "how to port release notes" runbook. P3, ~2 hours.

2. **`docs(reference): hand-port openapi.json -> reference/api.mdx + endpoints/`** — first-time V0 reference content port. Block on M3 (Reference content milestone). P2, ~half day.

3. **`app: add services/api/scripts/dump_openapi.py`** — small script that emits OpenAPI to stdout, callable from CI or locally. Unblocks all auto-generation. P3, ~1 hour.

4. **`app: publish openapi.json as release asset on tag push`** — new workflow `publish-docs-artifacts.yml` (sketch in this memo). Depends on #3. P3, ~half day. Defer until ≥1 V0→V1 cycle has happened manually.

5. **`docs: add regen-reference.yml workflow + render-reference.mjs script`** — docs-side automation receiver (sketch in this memo). Depends on #4. P3, ~1 day. Defer until #4 ships.

6. **`docs: stub /v0/ folder + archive banner partial`** — pre-V1-cut prep. P3, ~2 hours. Block on V1-cut date.

7. **`docs(spike): verify Mintlify versioning is free-tier`** — 10-minute test on a throwaway Mintlify project, document result in this memo. P3, ~10 minutes. Do before any commitment to Option A.

8. **`app: CI gate diffing live FastAPI openapi vs committed services/api/openapi.json`** — prevents the stale-file risk. P3, ~half day. Independent of docs work; worth doing anyway.

---

## Open questions for Brady

- Is "V0" the marketing name for the April 2026 launch, or will marketing rename it ("Platform 1.0", "Trust AI Launch", etc.) before public docs? The answer determines the docs-axis name.
- When is V1 expected? If it's >6 months out, this memo's Phase 1 timeline has plenty of slack. If it's <3 months, the manual-port runbook (follow-up ticket #1) should land first.
- Is there any scenario in the next 12 months where a customer is contractually entitled to "stay on V0"? If yes, that's the trigger for Option A or C and changes the entire calculus.
- What's the appetite for adding a tag-triggered workflow to `trust-ai-app` now vs. waiting? My read is "wait" — but if there's a near-term reason to land it (e.g., M5 MCP docs want auto-generation from the FastMCP-mounted server), we should know.
