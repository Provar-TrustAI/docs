# Trust AI Docs Screenshot Captures

Playwright scripts that navigate the Trust AI app and capture high-res screenshots for embedding in docs.

## Prerequisites

- Trust AI app running locally (`pnpm dev` in the trust-ai-app repo, serves on `localhost:3000`)
- Node.js 18+

## Setup

```bash
cd captures
pnpm install
npx playwright install chromium
```

## Usage

Run all captures at once:

```bash
pnpm capture:all
```

Or run individual capture groups:

```bash
pnpm capture:sessions      # Sessions table + fly-in panel
pnpm capture:datasets       # Dataset bulk actions toolbar
pnpm capture:evaluations    # Evaluation results matrix
pnpm capture:evaluators     # Evaluator create flow
pnpm capture:welcome        # Welcome / new-chat surface
pnpm capture:sidebar        # Sidebar navigation
```

## Output

Screenshots are written to `/images/` at the docs repo root (one level up from `captures/`), ready for Mintlify embedding. All images are captured at 2x DPI for crisp rendering.

## Adding new captures

Each script in `scripts/` is a standalone Playwright test file. To add a new capture:

1. Create `scripts/{name}.ts`
2. Navigate to the target page, wait for the relevant UI, and call `page.screenshot()`
3. Add a corresponding `capture:{name}` script entry in `package.json`
