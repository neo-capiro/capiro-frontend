import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
const port = Number(process.env.CAPIRO_BROWSER_TEST_PORT ?? 5197);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid browser harness port");
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  workers: 1,
  fullyParallel: false,
  outputDir: "../../test-results/modules-browser",
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/modules-browser-results.json" }],
  ],
  use: {
    baseURL,
    viewport: { width: 1440, height: 1040 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.CAPIRO_QA_CHROMIUM_EXECUTABLE ||
        process.env.CAPIRO_TEST_CHROMIUM ||
        undefined,
      args: process.env.CAPIRO_QA_CHROMIUM_EXECUTABLE
        ? ["--no-sandbox", "--disable-dev-shm-usage"]
        : [],
    },
  },
  webServer: {
    command: `"${process.execPath}" "${fileURLToPath(new URL("./server.mjs", import.meta.url))}"`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
