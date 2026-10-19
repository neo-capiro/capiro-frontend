import { build, preview } from "/workspace/capiro-p1-billing/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = "/workspace/capiro-p1-billing/apps/web";
const workspace = path.resolve(app, "../..");
const local = (name) => path.join(app, "test/browser", name);
const configuration = {
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
    port: 5199,
    strictPort: true,
    hmr: false,
    fs: { allow: [workspace] },
  },
};
await build({
  ...configuration,
  build: {
    outDir: "/tmp/capiro-p1-billing/harness",
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
  build: { outDir: "/tmp/capiro-p1-billing/harness" },
  preview: { host: "127.0.0.1", port: 5199, strictPort: true },
  logLevel: "warn",
});
console.log(
  "Explicit test-only Modules and Settings harness: http://127.0.0.1:5199",
);
