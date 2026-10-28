import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Focused harness for the upload consumer before the package freeze.
 *
 * The vendored `@capiro/meri-contracts` 0.1.25 tarball predates the published
 * `uploads-application` export, so this one alias resolves the canonical specifier against the
 * pinned producer artifact and lets the suite exercise the real public receivers. Point
 * MERI_UPLOAD_CONTRACTS at another artifact to test a different producer revision, and delete the
 * alias once the frozen package export resolves from node_modules.
 */
const artifact = (family: string) => {
  if (family === "uploads-application" && process.env.MERI_UPLOAD_CONTRACTS)
    return process.env.MERI_UPLOAD_CONTRACTS;
  const file = `${family}.mjs`;
  const pinned = process.env.MERI_CONTRACTS_DIST
    ? join(process.env.MERI_CONTRACTS_DIST, file)
    : fileURLToPath(
        new URL(
          `../../../../../../wave5-upload-input-20261028/packages/contracts/dist/${file}`,
          import.meta.url,
        ),
      );
  if (!pinned) throw new Error(`No ${family} artifact to bind`);
  return pinned;
};

/**
 * The canonical families this join resolves against the pinned producer artifact: the uploads wire,
 * the conversation input this app submits, its initial allocation, the history it recovers from and
 * the session/lifecycle/usage readers around them. Nothing else is redirected.
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

export default defineConfig({
  // Keep the run's cache out of the source tree this checkout has to stay clean for.
  cacheDir: join(tmpdir(), "mf15-uploads-vitest"),
  resolve: {
    alias: Object.fromEntries(
      families.map((family) => [
        `@capiro/meri-contracts/${family}`,
        artifact(family),
      ]),
    ),
  },
  test: {
    root: fileURLToPath(new URL("./", import.meta.url)),
    include: ["**/*.test.ts"],
    environment: "node",
  },
});
