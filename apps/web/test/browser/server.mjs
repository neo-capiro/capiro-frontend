import { build, createServer, preview } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = fileURLToPath(new URL("../../", import.meta.url));
const workspace = path.resolve(app, "../..");
const local = (name) => path.join(app, "test/browser", name);
const port = Number(process.env.CAPIRO_BROWSER_TEST_PORT ?? "5197");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid browser qualification port");
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
    preview: { host: "127.0.0.1", port, strictPort: true },
    logLevel: "warn",
  });
  console.log(
    `Explicit test-only Modules and Settings harness: http://127.0.0.1:${port}`,
  );
}
