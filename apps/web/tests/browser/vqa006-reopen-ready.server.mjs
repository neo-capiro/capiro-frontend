/**
 * Test-only synthetic host for the VQA006 mounted readiness lifecycle. It serves the real product
 * modules of this checkout (vite dev transform); no application release build is produced.
 */
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, realpathSync } from "node:fs";

const app = fileURLToPath(new URL("../../", import.meta.url));
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
  define: {
    "process.env.NEXT_PUBLIC_MERI_SELECTED_TAB_EXTENSION_ID": "undefined",
  },
  optimizeDeps: { entries: ["vqa006-reopen-ready.html"] },
  cacheDir: path.join(app, "test-results/vqa006-vite-cache"),
  root: path.join(app, "tests/browser"),
  publicDir: path.join(app, "public"),
  resolve: {
    alias: [
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
    port: 19417,
    strictPort: true,
    fs: {
      allow: [
        app,
        path.join(app, "../../packages/ui"),
        ...dependencies,
        ...dependencies.map((directory) => path.dirname(directory)),
      ],
    },
  },
});
await server.listen();
console.log(
  "VQA006 synthetic readiness host http://127.0.0.1:19417/vqa006-reopen-ready.html",
);
