import { fileURLToPath } from "node:url";
import canonical from "../../apps/web/test/browser/playwright.config";

export default {
  ...canonical,
  testDir: fileURLToPath(
    new URL("../../apps/web/test/browser/", import.meta.url),
  ),
  testMatch: [
    "**/settings-mutations.spec.ts",
    "**/planner-comments-formatting.spec.ts",
    "**/planner-markdown.spec.ts",
    "**/unified-task-detail.spec.ts",
    "**/engagement-team-workload.spec.ts",
    "**/desktop-detail-content.spec.ts",
    "**/selected-meeting-desktop-parity.spec.ts",
    "**/meeting-detail-current.spec.ts",
  ],
  grep: [
    /settings-mutations\.spec\.ts/,
    /planner-comments-formatting\.spec\.ts/,
    /planner-markdown\.spec\.ts/,
    /engagement-team-workload\.spec\.ts/,
    /selected-meeting-desktop-parity\.spec\.ts/,
    /meeting-detail-current\.spec\.ts/,
    /Desktop task comment|Desktop native comment|Desktop comment completion/,
    /Desktop Engagement task denial leaves the independent office report readable/,
  ],
  grepInvert: /phone/,
  workers: 1,
  retries: 0,
  timeout: 15_000,
  globalTimeout: 240_000,
  webServer: { ...canonical.webServer, stdout: "pipe", stderr: "pipe" },
};
