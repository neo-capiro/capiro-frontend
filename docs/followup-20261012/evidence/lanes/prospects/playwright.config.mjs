import { defineConfig } from "/workspace/capiro-next-prospect-files/node_modules/@playwright/test/index.mjs";
export default defineConfig({
  testDir: "/workspace/capiro-next-prospect-files/apps/web/tests/browser",
  outputDir: process.env.PROSPECT_SEARCH_OUTPUT ?? "/tmp/capiro-next-prospect-files-evidence/browser-artifacts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  reporter: [["list"], ["json", {outputFile: process.env.PROSPECT_SEARCH_REPORT ?? "/tmp/capiro-next-prospect-files-evidence/browser-results.json"}]],
  use: {
    baseURL: `http://127.0.0.1:${process.env.PROSPECT_FILES_PORT ?? 5299}`,
    viewport: {width: 1440, height: 1040},
    launchOptions: {executablePath: "/usr/bin/chromium", args: ["--disable-dev-shm-usage"]},
    screenshot: "only-on-failure", trace: "retain-on-failure"
  },
  webServer: undefined
});
