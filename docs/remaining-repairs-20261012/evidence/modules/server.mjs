import fs from "node:fs";
import { build, preview } from "/workspace/capiro-remaining-modules/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = "/workspace/capiro-remaining-modules/apps/web";
const workspace = path.resolve(app, "../..");
const local = (name) => path.join(app, "test/browser", name);
const configuration = {
  plugins: process.env.BASELINE ? [{ name: "pinned-baseline", enforce: "pre", load(id) { const rel = path.relative(workspace, id.split("?")[0]); const saved = path.join("/tmp/capiro-remaining-modules-evidence/baseline-source", rel); if (!rel.startsWith("..") && fs.existsSync(saved) && fs.statSync(saved).isFile()) return fs.readFileSync(saved, "utf8"); } }] : [],
  configFile: false,
  root: local("."),
  publicDir: path.join(app, "public"),
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: "@", replacement: path.join(app, "src") },
      { find: "@clerk/nextjs", replacement: local("clerk.tsx") },
      { find: "next/link", replacement: local("navigation.tsx") },
      { find: "next/navigation", replacement: local("navigation.tsx") },
      { find: "next/image", replacement: local("image.tsx") },
      {
        find: "@test-geist-sans",
        replacement: path.join(
          workspace,
          "node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
        ),
      },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5197,
    strictPort: true,
    hmr: false,
    fs: { allow: [workspace] },
  },
};
await build({
  ...configuration,
  build: {
    outDir: path.join("/tmp/capiro-remaining-modules-evidence", process.env.BASELINE ? "harness-red" : "harness-green"),
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    rolldownOptions: {
      onwarn(warning, handler) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") handler(warning);
      },
    },
  },
  logLevel: "warn",
});
await preview({
  ...configuration,
  build: { outDir: path.join("/tmp/capiro-remaining-modules-evidence", process.env.BASELINE ? "harness-red" : "harness-green") },
  preview: { host: "127.0.0.1", port: 5197, strictPort: true },
  logLevel: "warn",
});
console.log(
  "Explicit test-only Modules and Settings harness: http://127.0.0.1:5197",
);
