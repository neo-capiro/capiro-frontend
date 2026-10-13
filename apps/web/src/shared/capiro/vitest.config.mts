import { defineConfig } from "vitest/config";

export default defineConfig({
  root: new URL("./", import.meta.url).pathname,
  test: {
    include: ["**/*.test.ts", "../../features/**/*.test.ts"],
    environment: "node",
  },
});
