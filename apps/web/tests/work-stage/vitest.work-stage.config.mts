import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * SOURCE STAGE ONLY. This owned config resolves two canonical conversation contract families to the
 * frozen successor generated public files so the Work surface can be exercised before the successor
 * physical package exists. It is not the product configuration: `vitest.config.ts` keeps the installed
 * immutable 0.1.26 package, which must refuse a work definition.
 *
 * Frozen artifact: work/m7-work-selector-20261028/packages/contracts/dist
 * Commit 1f6f2a36fd80a20d288de66cafc67d3cf03aca4a / tree c13586372f2d4965274267b48d0960cdf1c8df58.
 */
const frozen = fileURLToPath(
  new URL(
    "../../../../../m7-work-selector-20261028/packages/contracts/dist/",
    import.meta.url,
  ),
);
export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@capiro/meri-contracts/conversation-input",
        replacement: `${frozen}conversation-input.mjs`,
      },
      {
        find: "@capiro/meri-contracts/conversation-application",
        replacement: `${frozen}conversation-application.mjs`,
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("../../src", import.meta.url)),
      },
    ],
  },
  test: {
    include: ["tests/work-stage/**/*.acceptance.mts"],
    environment: "node",
  },
});
