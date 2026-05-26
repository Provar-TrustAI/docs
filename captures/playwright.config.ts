import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: "*.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
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
