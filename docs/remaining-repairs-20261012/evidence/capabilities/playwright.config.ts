import { defineConfig } from "@playwright/test";
import base from "/workspace/capiro-remaining-capabilities/apps/web/playwright.config";
export default defineConfig({...base, testDir: "/workspace/capiro-remaining-capabilities/apps/web/tests/browser", webServer: undefined, workers: 1, retries: 0,
 outputDir: "/tmp/capiro-remaining-capabilities-evidence/" + (process.env.CAPABILITY_RUN || "browser-after") + "/artifacts",
 reporter: [["list"], ["json", {outputFile: "/tmp/capiro-remaining-capabilities-evidence/" + (process.env.CAPABILITY_RUN || "browser-after") + "/results.json"}]],
});
