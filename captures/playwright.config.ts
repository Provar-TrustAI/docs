import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: "*.ts",  // shared helpers live in ../lib, outside testDir
  fullyParallel: false,
  retries: 0,
  workers: 1,
  // Captures are slow by nature: 2x DPI, real data loads, and several
  // interactions before the shot. The 30s default tore contexts down
  // mid-script and reported "Target page has been closed", which reads
  // like a crash rather than a timeout.
  timeout: 180_000,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    screenshot: "off", // we take screenshots manually in each script
  },
  projects: [
    {
      name: "captures",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 },
    },
  ],
});
