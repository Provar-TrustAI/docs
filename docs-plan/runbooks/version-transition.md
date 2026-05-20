# Runbook — docs version transition

**Use this when:** the Trust AI app is cutting a new version and `docs.provar.dev` needs to advance to reflect it, archiving the prior version under `v<old>/`.

**Companion docs:**
- `../versioning/README.md` — the convention (why we do it this way)
- `../versioning/recommendation-memo.md` — the DEV-1764 spike that produced the strategy

**Source of truth in this turn:** M3 rehearses this runbook end-to-end transitioning from v2026.05.11 → v2026.05.19. Update this file with friction notes after each real cutover.

---

## Pre-cut checklist

Run through this before starting the cutover. If any line is "no," fix it first.

- [ ] All M2 (or current-version) content tickets are merged. The root content represents a deployable snapshot.
- [ ] The target app version's tag exists in `Provar-TrustAI/trustai-app` (e.g., `v2026.05.19`).
- [ ] The target version's `services/api/openapi.json` is reachable via `gh api 'repos/Provar-TrustAI/trustai-app/contents/services/api/openapi.json?ref=<TAG>'` (returns 200 with content, not 404).
- [ ] `docs.provar.dev` is currently rendering cleanly (no stale Mintlify error banners).
- [ ] You have permission to push to `Provar-TrustAI/docs` and create PRs.
- [ ] A `<NEW_VERSION>` placeholder is defined for this transition. Example: `<OLD_VERSION>=v2026.05.11`, `<NEW_VERSION>=v2026.05.19`.

## Steps

Substitute the version numbers throughout. The example uses `v2026.05.11` → `v2026.05.19`.

### 1. Pull main + create the transition branch

```bash
cd /Users/brady.hunt/Developer/docs
git checkout main && git pull --ff-only origin main
git checkout -b bradyhunt/dev-NNN-version-transition-v2026.05.19
```

### 2. Copy the current root into the archive subfolder

```bash
mkdir -p v2026.05.11
cp -r concepts how-to tutorials v2026.05.11/
```

**Don't copy** `api-reference/openapi.json` — see step 4 for how the version-specific OpenAPI is handled.

**Don't copy** `index.mdx`, `glossary.mdx`, or `changelog.mdx` — these are version-agnostic and stay at root only.

### 3. Add archive banners to every page in the archive

Each `v2026.05.11/**/*.mdx` page gets a `<Info>` callout at the top, immediately after the frontmatter:

```mdx
<Info>
  You are viewing the **v2026.05.11** archive. The latest documentation is at [`/`](/) — go there unless you specifically need the v2026.05.11 snapshot.
</Info>
```

Script it:

```bash
for f in v2026.05.11/**/*.mdx v2026.05.11/*.mdx; do
  # Insert the Info banner immediately after the frontmatter's closing ---
  # (manual edit recommended over sed for the first transition; sed risk is per-file)
done
```

For the first transition, do this **manually** so you catch any per-file weirdness. Once the pattern is proven, M4's automation work (DEV-1830 spike) can codify the bulk-insert.

### 4. Update root content for the new version

**4a. Refresh the API Reference OpenAPI pin.** Download the new version's snapshot:

```bash
gh api 'repos/Provar-TrustAI/trustai-app/contents/services/api/openapi.json?ref=v2026.05.19' \
  --jq '.content' | base64 -d > api-reference/openapi.json
```

The `docs.json` field `navigation.tabs[].openapi: "api-reference/openapi.json"` doesn't change — the file content does. The version pinning is in the snapshot, not the path.

**4b. Copy the OLD version's OpenAPI into its archive** so the archived API Reference still pins to the old tag:

```bash
mkdir -p v2026.05.11/api-reference
gh api 'repos/Provar-TrustAI/trustai-app/contents/services/api/openapi.json?ref=v2026.05.11' \
  --jq '.content' | base64 -d > v2026.05.11/api-reference/openapi.json
```

Add a second tab to `docs.json` for the archived API reference, OR (cleaner) link to it from the archive banner — the team decides per cutover. The M2 transition exercise will land the cleaner pattern.

**4c. Walk through each root concept/tutorial/how-to page**: are there content changes between OLD and NEW that need reflecting? Open `RELEASE_NOTES_<NEW>.md` from `trust-ai-app/docs/` (or wherever release notes live for that version) and check.

For minor-version transitions (e.g., v2026.05.11 → v2026.05.19), the delta is often small — maybe a renamed endpoint, a new optional field. Update the affected pages.

For major-version transitions (e.g., V0 → V1), the delta is much larger — entire concept pages may need rewriting. That's a much bigger transition than this runbook covers; treat it as a separate milestone (M3 is the rehearsal of the minor case).

### 5. Update `changelog.mdx`

Add a new `<Update label="v2026.05.19 — <date>">` block at the top with the version delta narrative. Pull content from the app's `RELEASE_NOTES_*.md`.

### 6. Remove the `.mintignore` block for the now-populated archive

In `.mintignore`, remove or scope down the `v2026.*/` line so `v2026.05.11/*` renders:

```diff
- v2026.*/
+ # (archive folders are now first-class — no ignore needed)
```

Or, if you want to keep the pattern for FUTURE empty archive folders:

```
v2026.05.20*/
```

(Match only the next-future version that doesn't exist yet.) The first transition tells us which pattern feels right.

### 7. Verify locally

```bash
# (re)start mintlify dev on port 3333 if not running
cd /Users/brady.hunt/Developer/docs
npx mintlify dev --port 3333 &
```

Then via the `/browse` skill (or directly in your browser):

- **Root** `/` → renders the NEW version's landing
- **Root** `/api-reference` → renders the NEW version's API
- **Archive** `/v2026.05.11/concepts/sessions` (etc.) → renders with the archive banner on top
- **Archive** `/v2026.05.11/api-reference` → renders the OLD version's API (NOT the new one's)
- No 404s on prior internal links — especially the `index.mdx` Card hrefs

### 8. Commit + push + PR

```bash
git add v2026.05.11/ api-reference/openapi.json changelog.mdx .mintignore
git commit -m "Transition docs to v2026.05.19; archive v2026.05.11 (DEV-NNN)"
git push -u origin bradyhunt/dev-NNN-version-transition-v2026.05.19
gh pr create --title "Transition to v2026.05.19; archive v2026.05.11 (DEV-NNN)" --body "..."
```

**Do NOT use `--delete-branch` on merge** — Mintlify preview builds race the deletion (see `~/.claude/projects/.../memory/feedback_no_delete_branch_on_merge.md`).

### 9. Merge + verify on docs.provar.dev

After merge:
- Hard-refresh `docs.provar.dev`
- Walk through the same paths as step 7 on the live site
- Spot-check that any deep-links from external sources (Slack, README, etc.) still resolve

### 10. Capture friction notes

Update this runbook with anything that surprised you:
- A step that took longer than expected
- A copy-paste pattern that should be scripted
- A check that was missing from the pre-cut list
- Mintlify behavior that's not what the docs imply

The point of M3 being a rehearsal is to find these things before V0 → V1 (where the stakes are real).

---

## What this runbook deliberately leaves out

- **Automation** (`repository_dispatch` from trust-ai-app on tag → docs-side regen workflow). That's M4's scope. This runbook is the manual procedure that M4 automates.
- **Major-version transitions** (V0 → V1). Different beast — treat as its own milestone with its own runbook.
- **Per-version Mintlify version dropdown.** Not enabled yet (DEV-1764 says: only when ≥2 simultaneously-supported majors exist).

---

## Cutover friction notes — DEV-1909 / DEV-1910 / DEV-1912 (v2026.05.11 → v2026.05.19)

First end-to-end exercise of this runbook. Notes captured as the cutover happened:

- **Step 3 (archive banners): manual was unnecessary.** A short python regex script (`re.match(r'^(---\n.*?\n---\n)', content, re.DOTALL)`) inserted banners into all 15 files safely and identically. For minor-version cuts where the frontmatter shape is consistent, the script is fine; reserve manual sweeps for major-version cuts where frontmatter shape may have drifted.
- **Step 4b decision (archive API exposure): pick a tab.** We chose: single `tab` per archive in `docs.json` containing both archived MDX `groups` and the archived `openapi`. Documented the rationale in `docs-plan/versioning/README.md` under "How the archived API Reference is exposed."
- **Splitting steps across PRs introduces broken intermediate states.** Step 4 (OpenAPI pin) and step 6 (mintignore unignore) can land in the same PR or separate PRs, but they must NOT land BEFORE step 1-3 (archive copy) and step 4b (docs.json tab addition). The dependency: docs.json references archive paths that mintignore was hiding; the unignore + docs.json + files must all be present together for the build to succeed. Recommend splitting as: PR A = files (1-3), PR B = OpenAPI pin (4a/4b, no docs.json yet), PR C = docs.json archive tab + mintignore unignore (6) + verify (7-9). That's what M3-X1 / X2 / X4 was.
- **Internal links in archived files still point to root paths.** A reader on `/v2026.05.11/concepts/sessions` clicking `[Datasets](/concepts/datasets)` will land on root /concepts/datasets, not /v2026.05.11/concepts/datasets. For a minor-version cut this is harmless (concept names didn't change). For a major-version cut the archive's internal links would need rewriting — flag for the V0→V1 runbook variant.
- **OpenAPI file sizes are large** (~600KB each). Two snapshots committed = ~1.2MB of git history per cutover. Acceptable for now (the repo is small) but worth tracking as a long-term cost — automation in M4 could keep these in git LFS if it becomes meaningful.
