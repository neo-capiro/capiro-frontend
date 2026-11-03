import { defineConfig } from "@playwright/test";

const port = Number(process.env.CAPIRO_PREFERENCES_NAVIGATION_PORT ?? 5361);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid preferences navigation fixture port");

const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: ".",
  testMatch: "preferences-navigation.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  outputDir: "test-results",
  reporter: [["list"]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 1040 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `"${process.execPath}" ../../../../node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/settings/preferences`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
});
