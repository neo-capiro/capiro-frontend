import { defineConfig } from "@playwright/test";

const port = Number(process.env.CAPIRO_KEYBOARD_FOCUS_PORT ?? 5362);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid preferences keyboard focus fixture port");

const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: ".",
  testMatch: "preferences-keyboard-focus.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  // Evidence belongs outside the checkout so no run overwrites earlier results.
  outputDir:
    process.env.VQA014_RESULTS_DIR ?? "../../test-results/keyboard-focus",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: `${process.env.VQA014_RESULTS_DIR ?? "../../test-results/keyboard-focus"}/report.json`,
      },
    ],
  ],
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
