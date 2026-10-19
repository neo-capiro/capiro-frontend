import { defineConfig } from "/workspace/capiro-p1-workspace/node_modules/@playwright/test/index.mjs";
export default defineConfig({
 testDir: "/workspace/capiro-p1-workspace/apps/web/test/browser",
 testMatch: ["**/prospect-draft-pending-edit.spec.ts", "**/prospect-workspace.spec.ts", "**/prospect-draft-restart-acceptance.spec.ts"],
 workers: 1, fullyParallel: false, retries: 0,
 outputDir: "/tmp/capiro-p1-workspace-20261012/focused-artifacts",
 reporter: [["list"], ["json", {outputFile: "/tmp/capiro-p1-workspace-20261012/focused-results.json"}]],
 use: {baseURL: "http://127.0.0.1:5298", viewport: {width: 1440, height: 1040}, screenshot: "only-on-failure", trace: "retain-on-failure", launchOptions: {executablePath: "/usr/bin/chromium", args: ["--disable-dev-shm-usage"]}},
 webServer: undefined,
});
