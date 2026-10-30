import { build, createServer, preview } from "vite";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import path from "node:path";

const app = fileURLToPath(new URL("../../", import.meta.url));
const workspace = path.resolve(app, "../..");
const local = (name) => path.join(app, "test/browser", name);
// Every harness page under test/browser is a build entry. Listing only a subset left
// the remaining fixture pages served by the SPA fallback shell instead of mounting.
const harnessPages = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return harnessPages(target);
    return entry.name.endsWith(".html")
      ? [path.relative(local("."), target)]
      : [];
  });
const harnessEntries = harnessPages(local("."));
const port = Number(process.env.CAPIRO_BROWSER_TEST_PORT ?? "5197");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid browser qualification port");
const configuration = {
  configFile: false,
  root: local("."),
  publicDir: path.join(app, "public"),
  esbuild: { jsx: "automatic" },
  // The fixture has no Next build step, so Next's public env substitution is reproduced for the
  // exact key a production component reads. Synthetic unconfigured value; no other env access.
  define: {
    "process.env.NEXT_PUBLIC_MERI_SELECTED_TAB_EXTENSION_ID":
      JSON.stringify(""),
  },
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
    port,
    strictPort: true,
    hmr: false,
    fs: { allow: [workspace] },
  },
};
// Opt-in test-only path (CAPIRO_BROWSER_TEST_DEV=1) for the strict-effects case:
// the standard Vite development server serves the development React build, which
// is the only build in which StrictMode actually replays effects. Default
// behaviour (build + preview, production React) is unchanged.
if (process.env.CAPIRO_BROWSER_TEST_DEV === "1") {
  const server = await createServer({ ...configuration, logLevel: "warn" });
  await server.listen();
  console.log(
    `Explicit test-only Modules and Settings harness (development, strict-effects): http://127.0.0.1:${port}`,
  );
} else {
  await build({
    ...configuration,
    build: {
      outDir: path.join(app, ".qa/modules-harness"),
      emptyOutDir: true,
      minify: false,
      sourcemap: true,
      rolldownOptions: {
        input: Object.fromEntries(
          harnessEntries.map((page) => [
            page.replace(/\.html$/, ""),
            local(page),
          ]),
        ),
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
    preview: { host: "127.0.0.1", port, strictPort: true },
    logLevel: "warn",
  });
  console.log(
    `Explicit test-only Modules and Settings harness: http://127.0.0.1:${port}`,
  );
}
