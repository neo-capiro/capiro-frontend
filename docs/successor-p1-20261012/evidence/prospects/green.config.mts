import { defineConfig } from "/workspace/capiro-prospect-current-read/node_modules/@playwright/test/index.mjs";
export default defineConfig({
 testDir: "/workspace/capiro-prospect-current-read/apps/web/tests/browser",
 testMatch: "**/prospect-current-read.spec.ts",
 workers: 1, fullyParallel: false, retries: 0,
 outputDir: "/tmp/capiro-prospect-current-read-20261012/green-artifacts",
 reporter: [["list"], ["json", {outputFile: "/tmp/capiro-prospect-current-read-20261012/green-results.json"}]],
 use: {baseURL: "http://127.0.0.1:5299", viewport: {width: 1440, height: 1040}, screenshot: "only-on-failure", trace: "retain-on-failure", launchOptions: {executablePath: "/usr/bin/chromium", args: ["--disable-dev-shm-usage"]}},
 webServer: undefined,
});
