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
const resolveArtifact = () => {
  const pinned =
    process.env.MERI_UPLOAD_CONTRACTS ??
    fileURLToPath(
      new URL(
        "../../../../../../wave5-upload-input-20261028/packages/contracts/dist/uploads-application.mjs",
        import.meta.url,
      ),
    );
  if (!pinned) throw new Error("No uploads-application artifact to bind");
  return pinned;
};

export default defineConfig({
  // Keep the run's cache out of the source tree this checkout has to stay clean for.
  cacheDir: join(tmpdir(), "mf15-uploads-vitest"),
  resolve: {
    alias: {
      "@capiro/meri-contracts/uploads-application": resolveArtifact(),
    },
  },
  test: {
    root: fileURLToPath(new URL("./", import.meta.url)),
    include: ["**/*.test.ts"],
    environment: "node",
  },
});
