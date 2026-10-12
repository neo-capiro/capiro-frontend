import { defineConfig } from "/workspace/capiro-next-delete/node_modules/@playwright/test";
export default defineConfig({
  testDir: "/tmp/capiro-next-delete-evidence",
  testMatch: process.env.DELETE_SUITE || "guarded.spec.ts",
  outputDir: process.env.DELETE_OUTPUT || "/tmp/capiro-next-delete-evidence/browser-green",
  webServer: undefined, workers: 1, retries: 0, timeout: 45000,
  reporter: [["list"], ["json", { outputFile: process.env.DELETE_REPORT || "/tmp/capiro-next-delete-evidence/browser-green.json" }]],
  use: { baseURL: process.env.DELETE_BASE_URL || "http://127.0.0.1:5299", viewport: {width:1440,height:1040}, trace:"on", screenshot:"only-on-failure", launchOptions:{executablePath:"/usr/bin/chromium",args:["--disable-dev-shm-usage"]} }
});
