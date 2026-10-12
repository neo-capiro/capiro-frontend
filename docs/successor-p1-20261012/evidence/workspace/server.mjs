import { build, preview } from "/workspace/capiro-p1-workspace/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = "/workspace/capiro-p1-workspace/apps/web";
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
    port: 5298,
    strictPort: true,
    hmr: false,
    fs: { allow: [workspace] },
  },
};
await build({
  ...configuration,
  build: {
    outDir: path.join(app, ".qa/modules-harness"),
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
  build: { outDir: path.join(app, ".qa/modules-harness") },
  preview: { host: "127.0.0.1", port: 5298, strictPort: true },
  logLevel: "warn",
});
console.log(
  "Explicit test-only Modules and Settings harness: http://127.0.0.1:5298",
);
