import { defineConfig } from "@playwright/test";
/**
 * SOURCE STAGE ONLY browser configuration for the Start Work / Delegate consumer. It serves the
 * synthetic composer host on its own port with the two canonical conversation contract families
 * resolved to the frozen successor generated public files, and it matches only `*.stage.ts`, so the
 * default browser suite keeps the installed immutable 0.1.26 package.
 */
export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results/work-stage-browser",
  testMatch: "**/*.stage.ts",
  fullyParallel: false,
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: "test-results/work-stage-browser-results.json" },
    ],
  ],
  use: {
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
            args: [
              "--disable-dev-shm-usage",
              "--use-gl=angle",
              "--use-angle=swiftshader",
              "--enable-unsafe-swiftshader",
            ],
          },
        }
      : {}),
    baseURL: "http://127.0.0.1:5192",
    viewport: { width: 1440, height: 1040 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `"${process.execPath}" tests/browser/work-stage.server.mjs`,
    url: "http://127.0.0.1:5192",
    reuseExistingServer: false,
  },
});
