import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: /vqa006.*\.spec\.ts/,
  outputDir: "./test-results/vqa006-mounted",
  timeout: 20000,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "./test-results/vqa006-mounted-results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:19417",
    viewport: { width: 1100, height: 700 },
  },
  webServer: {
    command: `"${process.execPath}" tests/browser/vqa006-reopen-ready.server.mjs`,
    url: "http://127.0.0.1:19417/vqa006-reopen-ready.html",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
