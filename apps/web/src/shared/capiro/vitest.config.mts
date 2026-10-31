import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // `.pathname` yields `/C:/...` on Windows, which vitest then resolves as `C:/C:/...` and finds
  // no test files. `fileURLToPath` is the platform-correct conversion and matches apps/web/vitest.config.ts.
  root: fileURLToPath(new URL("./", import.meta.url)),
  test: {
    include: ["**/*.test.ts", "../../features/**/*.test.ts"],
    environment: "node",
  },
});
