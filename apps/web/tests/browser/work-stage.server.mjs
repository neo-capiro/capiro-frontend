/**
 * SOURCE STAGE ONLY test-only server: the same synthetic component host as tests/browser/server.mjs,
 * plus the two canonical conversation contract families resolved to the frozen successor generated
 * public files (work/m7-work-selector-20261028/packages/contracts/dist). It exists so the mounted
 * composer can be exercised before the successor physical package is installed; the product build and
 * the default browser suite keep the installed immutable 0.1.26 package.
 */
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, realpathSync } from "node:fs";
const app = fileURLToPath(new URL("../../", import.meta.url));
const frozen = fileURLToPath(
  new URL(
    "../../../../../m7-work-selector-20261028/packages/contracts/dist/",
    import.meta.url,
  ),
);
const navigation = path.join(app, "tests/browser/navigation.tsx");
const dependencies = [
  path.join(app, "node_modules"),
  path.join(app, "../..", "node_modules"),
]
  .filter((directory) => existsSync(directory))
  .map((directory) => realpathSync(directory));
const geistFonts = dependencies
  .map((directory) => path.join(directory, "geist", "dist", "fonts"))
  .find((directory) => existsSync(directory));
if (!geistFonts) throw new Error("Geist test fonts are not installed");
const server = await createServer({
  configFile: false,
  root: path.join(app, "tests/browser"),
  publicDir: path.join(app, "public"),
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
      { find: "@", replacement: path.join(app, "src") },
      {
        find: "@test-geist-sans",
        replacement: path.join(
          geistFonts,
          "geist-sans",
          "Geist-Variable.woff2",
        ),
      },
      {
        find: "@test-geist-mono",
        replacement: path.join(
          geistFonts,
          "geist-mono",
          "GeistMono-Variable.woff2",
        ),
      },
      { find: "next/link", replacement: navigation },
      { find: "next/navigation", replacement: navigation },
      {
        find: "next/image",
        replacement: path.join(app, "test/browser/image.tsx"),
      },
      {
        find: "@clerk/nextjs",
        replacement: path.join(app, "tests/browser/clerk.tsx"),
      },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5192,
    strictPort: true,
    fs: { allow: [app, path.join(app, "../../packages/ui"), ...dependencies] },
  },
});
await server.listen();
console.log("Work-stage component server: http://127.0.0.1:5192");
