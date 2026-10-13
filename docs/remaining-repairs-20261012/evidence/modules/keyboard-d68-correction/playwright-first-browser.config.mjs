import { defineConfig } from "/workspace/capiro-remaining-modules/node_modules/@playwright/test/index.mjs";
export default defineConfig({
 testDir: "/workspace/capiro-remaining-modules/apps/web/test/browser",
 testMatch: /remaining-modules.spec.ts/,
 grep: /MS08 scope and grouping controls remain keyboard operable at phone width/,
 timeout: 60000, workers: 1, retries: 0, fullyParallel: false,
 outputDir: "/tmp/capiro-remaining-modules-evidence/keyboard-d68-correction/browser-green",
 reporter: [["list"], ["json", { outputFile: "/tmp/capiro-remaining-modules-evidence/keyboard-d68-correction/browser-green.json" }]],
 use: { baseURL: "http://127.0.0.1:5197", viewport: { width: 1440, height: 1040 }, screenshot: "only-on-failure", trace: "on", launchOptions: { executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] } },
 webServer: undefined
});
