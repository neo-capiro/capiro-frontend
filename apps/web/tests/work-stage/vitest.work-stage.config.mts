import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Exercise the mounted Work surface against the physically installed contract release, just like
 * the application. No sibling checkout or unpublished generated contract files are required.
 */
export default defineConfig({
  resolve: {
    alias: [
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
