/**
 * QUALIFICATION-ONLY browser server for the usage-overview host fixture: a loopback component host
 * that reuses the existing test/browser transport leaves (Clerk, next/*, Geist). It adds no contract
 * alias: `@capiro/meri-contracts/conversation-usage` resolves from the canonical installed package,
 * exactly as the shipped product and the default browser suite resolve it.
 */
import { build, preview } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = fileURLToPath(new URL("../../", import.meta.url));
const workspace = path.resolve(app, "../..");
const root = fileURLToPath(new URL("./", import.meta.url));
const browser = path.join(app, "test/browser");
const page = "settings/usage-overview-host.html";
const outDir = path.join(app, ".qa/usage-overview-harness");
const port = Number(process.env.CAPIRO_USAGE_OVERVIEW_BROWSER_PORT ?? "5219");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid usage-overview browser port");
const configuration = {
  configFile: false,
  root,
  publicDir: path.join(app, "public"),
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: "@", replacement: path.join(app, "src") },
      {
        find: "@clerk/nextjs/legacy",
        replacement: path.join(browser, "clerk-legacy.ts"),
      },
      {
        find: "@clerk/nextjs/errors",
        replacement: path.join(browser, "clerk-errors.ts"),
      },
      { find: "@clerk/nextjs", replacement: path.join(browser, "clerk.tsx") },
      { find: "next/link", replacement: path.join(browser, "navigation.tsx") },
      {
        find: "next/navigation",
        replacement: path.join(browser, "navigation.tsx"),
      },
      { find: "next/image", replacement: path.join(browser, "image.tsx") },
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
    port,
    strictPort: true,
    hmr: false,
    fs: { allow: [workspace] },
  },
};
await build({
  ...configuration,
  build: {
    outDir,
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    rolldownOptions: {
      input: { [page.replace(/\.html$/, "")]: path.join(root, page) },
      onwarn(warning, handler) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") handler(warning);
      },
    },
  },
  logLevel: "warn",
});
await preview({
  ...configuration,
  build: { outDir },
  preview: { host: "127.0.0.1", port, strictPort: true },
  logLevel: "warn",
});
console.log(
  `Explicit test-only usage-overview host harness: http://127.0.0.1:${port}/${page}`,
);
