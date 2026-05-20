# Versioning convention — docs.provar.dev

**Adopted:** 2026-05-20 (DEV-1810)
**Rationale source:** [DEV-1764 spike memo](../audit/recommendation-memo.md) — but the canonical write-up is here.
**Companion runbook:** `../runbooks/version-transition.md` (DEV-1811 — the step-by-step cutover procedure).

---

## The convention in one paragraph

`docs.provar.dev` follows a **single rolling site** model. The latest supported Trust AI app version's documentation lives at the **root** of the docs tree. When a new major version cuts, the prior version's content gets **copied** into a `vN/` subfolder as a frozen archive — the root then advances to reflect the new latest. No Mintlify `navigation.versions` dropdown is enabled until at least two simultaneously-supported major versions actually exist.

## What the file tree looks like over time

### Today (M2 — single version v2026.05.11)

```
docs/
├── concepts/          ← latest (v2026.05.11)
├── tutorials/         ← latest
├── how-to/            ← latest
├── reference/         ← latest (pinned to v2026.05.11 OpenAPI URL)
├── glossary.mdx       ← version-agnostic
├── changelog.mdx      ← version-agnostic; aggregates all majors
└── index.mdx          ← latest landing
```

### After M3 cutover (root = v2026.05.19; v2026.05.11 archived)

```
docs/
├── concepts/                ← latest (now v2026.05.19)
├── tutorials/               ← latest
├── how-to/                  ← latest
├── reference/               ← latest (pinned to v2026.05.19 OpenAPI URL)
├── glossary.mdx
├── changelog.mdx
├── index.mdx
└── v2026.05.11/             ← archived snapshot
    ├── concepts/            ← frozen
    ├── tutorials/           ← frozen
    ├── how-to/              ← frozen
    └── reference/           ← frozen, pinned to v2026.05.11 OpenAPI URL
```

The `.mintignore` currently lists `v2026.*/` so any empty version folder won't render. When M3 actually creates `v2026.05.11/` with content, **remove that ignore entry** so the archive becomes reachable at `/v2026.05.11/*`.

## Why this shape (not a Mintlify version dropdown)

Per DEV-1764's spike memo:
- The Mintlify version dropdown adds value **only when there are ≥2 versions in it AND customers actually need to pick**. With one version, a dropdown is visual noise.
- The folder convention is a strict prefix of the dropdown setup — when V2 cuts and we need a dropdown, we add `navigation.versions` to `docs.json` and the folder names already align.
- Matches peer patterns (Stripe, FastMCP, Pydantic AI all ship rolling docs).
- Aligns with the no-self-host reality of Trust AI today — customers are always on `latest`.

## Naming

- **Folder names follow the app's CalVer tags** verbatim: `v2026.05.11`, `v2026.05.19`, `v2026.06.02`, etc. The folder IS the app version it pins.
- Major-version naming (V0, V1) is a **product-marketing axis** that is NOT used in the folder structure. The changelog distinguishes "V0 platform launch" from "v2026.05.11 tag" explicitly.

## Cutover procedure

See `../runbooks/version-transition.md` for the step-by-step. High level:

1. Confirm the docs at root represent a usable snapshot for the version being archived.
2. `cp -r concepts how-to reference tutorials v2026.05.11/` (creates the archive).
3. Add `<Info>` archive banners to every page in `v2026.05.11/`.
4. Update root content for the new latest version — primarily the OpenAPI URL pin in `docs.json`'s API config.
5. Add a `changelog.mdx` entry capturing the delta.
6. Remove `v2026.*/` from `.mintignore` so the archive renders.
7. Verify both versions via local `mintlify dev` before merging.

## When to revisit this convention

Trigger conditions for re-evaluation:
- Trust AI ships a multi-version self-host SKU (customers stuck on old versions need first-class archive support — might warrant the `navigation.versions` dropdown).
- A major version cut requires fundamentally different IA (e.g., Trust AI V1 reorganizes Concepts entirely — might warrant per-version IA, which dropdowns or subdomains handle better).
- Provar adds a second product to `docs.provar.dev` (the per-product tabs in `docs.json` become the primary axis; versioning becomes secondary).

Until any of those trigger, this folder convention is the convention.
