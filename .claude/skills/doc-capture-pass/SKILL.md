---
name: doc-capture-pass
description: Inventory and burn down the docs' media + verification debt — every CAPTURE-PENDING and ACCURACY-AUDIT-PENDING marker repo-wide, with age (git blame), owning surface, and a burn-down plan executed against the pinned release-tag app. Use when asked to "refresh screenshots", "burn down capture debt", "how stale are the docs' images", or at each release landing.
user-invocable: true
---

# /doc-capture-pass — the debt ledger for media and unverified claims

Placeholder frames shipped as broken links (`6fbce64` stripped 26 pre-landing), wrong-surface
screenshots captioned as current UI (`9bbbfa7` removed 4), and a pre-rename GIF went quietly stale
(`30942c1`). The markers that replaced them — `{/* CAPTURE-PENDING */}` and
`{/* ACCURACY-AUDIT-PENDING */}` — are tracked only *in-page*, which makes the aggregate backlog
invisible: 26 capture markers were deferred at one landing and nothing noticed a marker surviving
two releases. This skill is the inverse of `strip-placeholders.mjs`: the ledger and the burn-down.

## Phase 1 — the ledger (read-only, always safe)

1. Inventory both marker types plus every media reference:
   ```bash
   grep -rn 'CAPTURE-PENDING\|ACCURACY-AUDIT-PENDING' --include='*.mdx' .
   grep -rnoE '/images/[a-zA-Z0-9_./-]+' --include='*.mdx' . | sort -u
   ```
2. For each marker: owning page + surface, what it hedges/promises, and **age** — last-touched
   commit and date via `git log -1 --format='%h %as' -L<line>,<line>:<file>` (or blame). For each
   media file: does the asset exist; capture date (file's last commit) vs the surface's
   last-structural-change (release notes / app history).
3. Emit the ledger sorted by age, flagging:
   - markers older than one release cycle (**debt escalation** — they were "temporary");
   - media whose surface changed structurally since capture (**stale-depiction risk**);
   - prose referencing media that has no asset (**broken promise** — `c725c24` class).

## Phase 2 — the burn-down (needs the app running at the release tag)

Work the ledger oldest-first, against the **pinned tag** (never main-tip; `APP_CAPTURE_URL` +
`captures/` tooling — `cd captures && pnpm capture:<surface>`, output to `/images`, 2× DPI, naming
`{concept}-{surface}-{variant}.{ext}`):

- `CAPTURE-PENDING` → capture the real surface, restore the `<Frame>`, delete the marker. If the
  surface no longer exists at the tag, delete the marker AND the prose that promised it.
- `ACCURACY-AUDIT-PENDING` → drive the claim in the app; either confirm (assert plainly, cite the
  tag in the marker's place — or just remove the marker) or refute (fix the prose). Never remove a
  marker without doing the verification.
- Stale-depiction media → recapture; if the surface was removed, remove the frame and adapt prose.

Ship as small per-surface PRs (media diffs are heavy; keep them reviewable). `mint broken-links`
gate as always. Note remaining debt count in the PR body — the number should go DOWN each release.

## Cadence

Run Phase 1 at every landing (`/doc-land-release` can consume the ledger as its freshness input)
and after any release whose notes mention a redesign of a captured surface. Phase 2 runs whenever
the app is up at the tag — typically right after a release alignment, while the pinned worktree
and running app are already warm.
