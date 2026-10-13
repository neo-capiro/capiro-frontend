import { defineConfig } from "vitest/config";
export default defineConfig({
 root: "/workspace/capiro-remaining-capabilities/apps/web", cacheDir: "/tmp/capiro-remaining-capabilities-evidence/vitest-cache",
 resolve: { alias: { "@": "/workspace/capiro-remaining-capabilities/apps/web/src" } },
 test: { include: ["tests/capability-writer.test.ts", "tests/registration-writer.test.ts"], environment: "node", maxWorkers: 1 }
});
