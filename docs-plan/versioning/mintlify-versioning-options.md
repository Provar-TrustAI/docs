# Mintlify Versioning Options

**Spike:** DEV-1764 (docs.provar.dev versioning strategy)
**Date:** 2026-05-20
**Method:** WebFetch against `https://mintlify.com/docs.json` (schema), `https://www.mintlify.com/docs/llms.txt` (sitemap), `https://www.mintlify.com/docs/organize/navigation.md` (versioning guide), `https://www.mintlify.com/docs/organize/settings-reference.md` (nav schema), `https://mintlify.com/pricing` (tiers). Peer sites: `docs.stripe.com`, `gofastmcp.com`.

---

## What Mintlify supports natively

Mintlify exposes `versions` as a **first-class field on the `navigation` object** in `docs.json`. Quoting the published schema:

```json
"versions": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "version":  { "type": "string", "description": "The name of the version" },
      "default":  { "type": "boolean", "description": "Whether this version is the default version" },
      "tag":      { "type": "string", "description": "Tag for the version" },
      "hidden":   { "type": "boolean", "description": "Whether the current option is default hidden" }
    },
    "required": ["version", "href"]
  }
}
```

(Note: the schema lists `version` + `href` as required but the published example uses `version` + nested `groups`/`tabs`. The schema appears slightly stale vs. the docs. Either form works.)

### Configuration patterns from the docs

Mintlify's navigation reference shows **two valid nesting shapes** for versions:

**Pattern 1 — versions wrap tabs ("version-major" layout):**

```json
{
  "navigation": {
    "versions": [
      {
        "version": "v2.0",
        "default": true,
        "tabs": [
          { "tab": "Documentation", "groups": [ /* ... */ ] },
          { "tab": "API Reference", "groups": [ /* ... */ ] }
        ]
      },
      {
        "version": "v1.0",
        "tabs": [
          { "tab": "Documentation", "groups": [ /* ... */ ] }
        ]
      }
    ]
  }
}
```

**Pattern 2 — tabs wrap versions ("tab-major" layout):**

```json
{
  "navigation": {
    "tabs": [
      {
        "tab": "Documentation",
        "versions": [
          { "version": "v2.0", "default": true, "groups": [ /* ... */ ] },
          { "version": "v1.0", "groups": [ /* ... */ ] }
        ]
      }
    ]
  }
}
```

Pattern 1 gives a single global version dropdown that swaps the entire site (every tab) at once. Pattern 2 lets the user pick a tab first, then optionally pick a version within that tab — useful when only Reference is versioned and Concepts / How-to are not.

### Content layout on disk

The published example uses page paths like `"v1/overview"` and `"v2/overview"`, implying **file-system folders named after each version** (`v1/`, `v2/` directories at repo root, each containing the version's MDX). This is convention, not enforced — `href` accepts any path. But the natural Mintlify-idiomatic layout is folder-per-version.

### UI behavior

A **version dropdown selector** appears in the navbar. Selecting a version swaps the navigation tree. The `tag` field adds a small badge (e.g., "Latest", "Beta") next to the version name in the dropdown. The `default` field controls which version is served at `/`.

### URL pattern

Mintlify's published docs do not explicitly commit to a URL pattern, but the convention shown in examples (`"v1/overview"`) suggests **paths are prefixed by the on-disk folder name**. So `v1/overview` → `https://docs.example.com/v1/overview`. There is no documented query-param or fragment-based version switching.

### Tier availability

`mintlify.com/pricing` lists three tiers — Hobby (free), Pro ($250/mo), Enterprise (custom). The published feature lists are:

- **Hobby:** Full platform, custom domain, web editor, MCP server, custom components, 5,000 AI credits.
- **Pro:** + Assistant agent, writing agent, preview deployments, password protection.
- **Enterprise:** + Self-updating workflows, boosted performance, enterprise security & legal, migration & support.

**Versioning is not listed as a gated feature on any tier.** It does not appear in any "Pro only" or "Enterprise only" column. The `versions` array is part of the public `docs.json` schema with no `$comment` flagging it as paid. Provisional reading: **versioning is free-tier capable.**

**Confidence: medium.** Pricing pages historically omit details. The safest verification is to add a `versions` array to a non-prod Mintlify project, deploy, and confirm the dropdown renders — a 10-minute test before committing.

---

## Three architectures, side-by-side

### Option A — Mintlify native versioning (one site, version dropdown)

**Shape:** Single Mintlify project. One `docs.json`. A `navigation.versions` array enumerates each version. Each version owns its own `groups` (Concepts / How-to / Reference / Tutorials) and its own `pages` (which live in `v0/`, `v1/` folders on disk).

**URL:** `https://docs.provar.dev/v1/reference/api`, `https://docs.provar.dev/v0/concepts/overview`. Default version at root.

**How it works:**

```
docs/
├── docs.json                    # one config
├── v0/
│   ├── concepts/overview.mdx
│   ├── reference/api.mdx
│   └── ...
├── v1/
│   ├── concepts/overview.mdx
│   ├── reference/api.mdx
│   └── ...
└── shared/                      # version-agnostic pages (privacy, support)
    └── ...
```

**Pros:**
- First-class Mintlify support — version dropdown renders automatically, no custom UI.
- Single search index that can be scoped to current version (Mintlify's `boost` / built-in search picks the visible version's pages first).
- One Mintlify project to administer — one custom domain, one analytics view, one MCP integration.
- All versions live in one Git history; cross-version diffs are easy.
- Free-tier capable (provisional, pending a test deploy).

**Cons:**
- Every old-version page sits in the repo forever, even ones that haven't been touched in 18 months. Repo grows. Most pages are duplicated between versions until they diverge, leading to **drift risk** (a fix to `v1/concepts/overview.mdx` that doesn't get backported to `v0/`).
- Authoring overhead per version. Spinning up `v1/` is "copy `v0/` → 80 files → diff what changed." There's no Mintlify-native "inherit unchanged pages from default version" feature documented.
- The version dropdown is **the** version axis. You can't have, say, "API reference is versioned but Concepts is rolling" without using Pattern 2 (tabs-wrap-versions) and only versioning the Reference tab — which works but is unusual.

**Cost:** Free tier (provisional).

### Option B — Version subfolders, single site, no Mintlify versioning UI

**Shape:** Same on-disk layout as Option A (`v0/`, `v1/` folders) but **no `navigation.versions` array**. Instead, the `groups` array hard-codes the current version's pages; old versions live under their folder but are **not in the nav tree** at all. A static page (`changelog/v0`) links to the archive.

**URL:** `https://docs.provar.dev/reference/api` (always points to current version). Old version pages reachable only via deep link: `https://docs.provar.dev/v0/reference/api`.

**How it works:**

```
docs/
├── docs.json                   # navigation hard-coded to current version
├── concepts/overview.mdx       # = v1 (current)
├── reference/api.mdx           # = v1
├── v0/
│   ├── concepts/overview.mdx   # frozen, no nav link
│   └── reference/api.mdx
└── changelog.mdx               # has section "V0 archive" linking to /v0/*
```

**Pros:**
- Zero Mintlify-feature dependency. Works on any static site host. Future-portable.
- Old versions stay reachable for SEO + customers with stale bookmarks; they just don't clutter the nav.
- The "current docs" experience is uncluttered — no version dropdown, no choice paralysis.
- Cheapest authoring overhead: when V1 cuts, you `mv` current pages into `v0/`, copy them back to root, and edit the root copies.

**Cons:**
- No version dropdown means **customers on V0 don't see V0 docs by default**. They have to know to navigate to the `/v0/` subtree, or click through the changelog archive. This is fine when there's no self-host; problematic if a V0 customer base exists.
- Search may index both versions and confuse users (Mintlify search doesn't know `v0/` is archived). Could mitigate with `frontmatter: { noindex: true }` on archive pages — verify the Mintlify field name.
- Mintlify analytics treats `v0/` and root as two unrelated content areas. Hard to ask "what % of traffic hits the current docs vs. archive."

**Cost:** Free tier — uses no Mintlify-specific versioning features.

### Option C — Per-major-version subdomains

**Shape:** Multiple Mintlify projects, one per major version. `v0.docs.provar.dev`, `v1.docs.provar.dev`, with `docs.provar.dev` either redirecting to the current major or hosting a landing page.

**URL:** `https://v1.docs.provar.dev/reference/api`. `https://v0.docs.provar.dev/reference/api`.

**How it works:**

```
docs-v0/                        # separate Git repo or branch
├── docs.json
└── ...

docs-v1/                        # separate Git repo or branch
├── docs.json
└── ...
```

Each subdomain is its own Mintlify project, deployed independently, with its own custom-domain DNS record.

**Pros:**
- Strongest isolation. V0 docs can use a different theme, different navigation structure, even different Mintlify version. No cross-contamination.
- "Old" docs can be **truly frozen** — no CI runs against them, no risk of accidental edits via the web editor.
- Each subdomain has its own Mintlify analytics + SEO + MCP server.

**Cons:**
- **Multiple Mintlify projects.** If Mintlify's "multiple repos" / multi-project capability is gated to Enterprise (the pricing page lists "Multiple repos" only under Enterprise customization), this becomes a paid feature implicitly.
- DNS overhead (a wildcard or per-version A/CNAME).
- Search is per-subdomain — no unified search across versions.
- The "current" docs URL is unstable: `docs.provar.dev` either redirects (and breaks deep links to `docs.provar.dev/concepts/overview`) or hosts duplicate content.
- Highest authoring overhead — switching repos to fix a typo in V0, then a typo in V1, is friction every time.
- Shared assets (logo, glossary, support pages) must be duplicated or proxied.

**Cost:** Plausibly Pro or Enterprise — needs verification that the Hobby tier permits a Mintlify org with N projects on N custom domains.

---

## Peer-site comparison

### Stripe (`docs.stripe.com`)

URL audit: pages live at `docs.stripe.com/<topic>` with **no version prefix**. The API reference has a separate per-API-version selector for the API itself (which dates each API change like `2024-04-10`), but the docs site is a **single rolling site**. Stripe treats API versioning as a runtime concern (the `Stripe-Version` header), not a docs-site concern. Docs follow latest; the API reference page shows version-specific changes inline.

**Takeaway:** Stripe's audience is API-first, so they invest in the inline-version-selector pattern (Pattern B in spirit). Their docs site is **not** versioned. Total docs = one site, one nav tree.

### Pydantic AI (`pydantic.dev/docs/ai`)

URL audit: the docs live under a single path, no version segment. Pydantic AI is pre-1.0 and uses rolling docs. Future versioning is signposted (`pydantic.dev/docs/...` is the modern URL after a recent redirect from `ai.pydantic.dev`), but no version dropdown is visible today.

**Takeaway:** Pre-1.0 projects mostly skip docs versioning. They version by Git branch + a release-notes page. Mirrors Trust AI's current state.

### FastMCP (`gofastmcp.com`)

URL audit: single rolling site. Self-described policy quoted from the docs landing page:

> "This documentation reflects FastMCP's `main` branch, meaning it always reflects the latest development version."

Per-feature in-line "New in version: 3.0.0" badges, like Python's stdlib docs. No version dropdown, no version folders.

**Takeaway:** Rolling docs with inline version badges is a real, well-known pattern. It works when there's a single canonical install of the product and back-compatibility is communicated per-feature, not per-page-tree.

### Synthesis

All three peers ship **rolling docs**, not versioned docs. None expose a version dropdown today. Versioning shows up only inside the API reference, as a separate runtime/SDK concern. For a product at Trust AI's stage (pre-launch, no self-host, single deployed instance) **the dominant peer pattern is no docs-site versioning at all**.

---

## Comparison table

| Dimension | (A) Mintlify native | (B) Subfolders, no UI | (C) Subdomains |
|---|---|---|---|
| Version dropdown in UI | Yes | No | No (per-subdomain switch only) |
| Authoring overhead per new major | Medium (copy folder, manage nav array) | Low (mv + copy) | High (new repo, new Mintlify project, new DNS) |
| Old-version isolation | Weak (one config) | Medium (no nav, but same site) | Strongest |
| Search across versions | Single index, scoped to default | Single index, may leak archive | Per-subdomain (no cross) |
| Deep-link stability after cut | High (URLs include `/v1/`) | High for archive, version-implicit for root | High (subdomain identifies version) |
| Mintlify tier needed | Hobby (provisional) | Hobby | Hobby + N projects (likely Pro / Enterprise) |
| Time-to-implement for V1 cut | ~1 day | ~half day | ~2-3 days (DNS + Mintlify project provisioning) |
| Reversibility | High (drop the `versions` array, keep folders) | High (already minimal) | Low (subdomains and DNS sprawl) |
| Matches peer-site convention | No peers use this | Closest to Stripe / FastMCP shape | No peers use this |
| Self-host customer scenario | Best — V0 customers see V0 nav | Workable — archive link from changelog | Best — explicit per-version site |

---

## Recommendation preview

For Trust AI at V0/V1 stage with no self-host, **Option B (subfolders, no version UI)** is the right starting point. It is the closest match to peer-site convention, has the lowest authoring overhead, and **does not paint us into a corner**: if we later need a version dropdown, we can add the `navigation.versions` array on top of the existing folder layout in an afternoon. The folder convention is identical to Option A, so Option B is a strict prefix of Option A and the migration cost is near zero.

Option C is reserved for the "we now have multi-major self-host customers and need fully-frozen old-version sites" scenario, which is **not the v1 reality**.

Full rationale and sequencing in `recommendation-memo.md`.
