import { defineConfig } from "/workspace/capiro-remaining-profile/node_modules/@playwright/test";
export default defineConfig({
  testDir: "/tmp/capiro-remaining-profile-evidence",
  testMatch: process.env.PROFILE_SUITE || "guarded.spec.ts",
  outputDir: process.env.PROFILE_OUTPUT || "/tmp/capiro-remaining-profile-evidence/browser-green",
  webServer: undefined, workers: 1, retries: 0, timeout: 30000,
  reporter: [["list"], ["json", { outputFile: process.env.PROFILE_REPORT || "/tmp/capiro-remaining-profile-evidence/browser-green.json" }]],
  use: { baseURL: process.env.PROFILE_BASE_URL || "http://127.0.0.1:5299", viewport: {width:1440,height:1040}, trace:"on", screenshot:"only-on-failure", launchOptions:{executablePath:"/usr/bin/chromium",args:["--disable-dev-shm-usage"]} }
});
