import { build, preview } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = fileURLToPath(new URL("../../", import.meta.url));
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
      { find: "@clerk/nextjs/legacy", replacement: local("clerk-legacy.ts") },
      { find: "@clerk/nextjs/errors", replacement: local("clerk-errors.ts") },
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
    outDir: path.join(app, ".qa/modules-harness"),
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    rolldownOptions: {
      input: {
        main: local("index.html"),
        authLifecycle: local("auth-lifecycle.html"),
      },
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
  preview: { host: "127.0.0.1", port: 5197, strictPort: true },
  logLevel: "warn",
});
console.log(
  "Explicit test-only Modules and Settings harness: http://127.0.0.1:5197",
);
