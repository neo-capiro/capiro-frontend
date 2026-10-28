import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
/**
 * QUALIFICATION-ONLY browser configuration for the usage-overview host regression. It serves the
 * synthetic usage host on its own loopback port, resolving the canonical installed
 * `@capiro/meri-contracts/conversation-usage`, and it matches only the usage-overview spec, so the
 * default browser suite and the shipped product keep the installed immutable package.
 */
const port = Number(process.env.CAPIRO_USAGE_OVERVIEW_BROWSER_PORT ?? 5219);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid usage-overview browser port");
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./test/usage-overview-host",
  testMatch: "usage-overview-host.spec.ts",
  outputDir: "./test-results/usage-overview-browser",
  fullyParallel: false,
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: "test-results/usage-overview-browser-results.json" },
    ],
  ],
  use: {
    baseURL,
    viewport: { width: 1440, height: 1040 },
    // Recorded for every case so the bounded synthetic host leaves inspectable visual artifacts.
    screenshot: "on",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.CAPIRO_QA_CHROMIUM_EXECUTABLE ||
        process.env.CAPIRO_TEST_CHROMIUM ||
        undefined,
    },
  },
  webServer: {
    command: `"${process.execPath}" "${fileURLToPath(new URL("./test/usage-overview-host/usage-overview.server.mjs", import.meta.url))}"`,
    // The harness root has no index.html, so readiness is the fixture page itself.
    url: `${baseURL}/settings/usage-overview-host.html`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
