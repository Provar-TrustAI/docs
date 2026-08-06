/**
 * Video recording for Tier-2 demos.
 *
 * The Remotion project in ../../pipeline is an overlay COMPOSITOR — it takes an existing
 * screen recording (`staticFile(videoFile)`) and layers click ripples, zoom, and captions
 * onto it. Nothing in the repo produced that recording, which is why `pnpm render` had no
 * input and had never been run (DEV-6188).
 *
 * Playwright already drives the app for screenshots, so it is the natural recorder. A demo
 * script opens a context with `recordVideo`, drives the flow, and writes the result where
 * the pipeline can find it: `pipeline/public/<name>.webm`.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const PUBLIC_DIR = path.resolve(__dirname, "../../pipeline/public");

export interface Recording {
  page: Page;
  browser: Browser;
  /** Close the context (flushes the file) and move it to pipeline/public/<name>.webm */
  finish: (name: string) => Promise<string>;
}

export async function startRecording(): Promise<Recording> {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: PUBLIC_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  return {
    page,
    browser,
    async finish(name: string) {
      const video = page.video();
      if (!video) {
        throw new Error("No video recorded — recordVideo was not enabled on the context.");
      }
      await context.close(); // required: flushes the webm to disk
      const src = await video.path();
      const dest = path.join(PUBLIC_DIR, `${name}.webm`);
      fs.renameSync(src, dest);
      await browser.close();
      return dest;
    },
  };
}
