import { defineConfig } from "/workspace/capiro-p1-successor/node_modules/@playwright/test/index.mjs";
import base from "/workspace/capiro-next-work/apps/web/playwright.config.ts";
export default defineConfig({
  ...base,
  testDir: "/workspace/capiro-next-work/apps/web/tests/browser",
  testMatch: ["work-owners.spec.ts"],
  workers: 1,
  webServer: undefined,
  outputDir: process.env.WORK_OWNER_OUTPUT ?? "/tmp/capiro-next-work-evidence/browser-after",
  reporter: [["list"], ["json", {outputFile: process.env.WORK_OWNER_RESULTS ?? "/tmp/capiro-next-work-evidence/browser-after.json"}]],
  use: {...base.use, baseURL: "http://127.0.0.1:" + (process.env.WORK_OWNER_PORT ?? "5208")},
});
