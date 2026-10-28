import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Focused harness for the upload consumer.
 *
 * By default nothing is redirected: the installed `@capiro/meri-contracts` 0.1.26 package exports
 * every canonical family this join uses, including `uploads-application`, so the suite exercises
 * the physical installed public exports exactly as the application resolves them.
 *
 * Set `MERI_CONTRACTS_DIST` to an explicit dist directory only to qualify a different producer
 * artifact. That opt-in is never the default and never falls back to a stale 0.1.25 source tree.
 */
const families = [
  "conversation-application",
  "conversation-history",
  "conversation-initial-input",
  "conversation-input",
  "conversation-lifecycle",
  "conversation-session",
  "conversation-sources",
  "conversation-usage",
  "uploads-application",
] as const;

const explicitArtifacts = process.env.MERI_CONTRACTS_DIST?.trim();

const alias = explicitArtifacts
  ? Object.fromEntries(
      families.map((family) => [
        `@capiro/meri-contracts/${family}`,
        join(explicitArtifacts, `${family}.mjs`),
      ]),
    )
  : undefined;

export default defineConfig({
  // Keep the run's cache out of the source tree this checkout has to stay clean for.
  cacheDir: join(tmpdir(), "mf15-uploads-vitest"),
  ...(alias ? { resolve: { alias } } : {}),
  test: {
    root: fileURLToPath(new URL("./", import.meta.url)),
    include: ["**/*.test.ts"],
    environment: "node",
  },
});
