import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, realpathSync, readFileSync } from "node:fs";
const app = fileURLToPath(new URL("../../", import.meta.url));
const port = Number(process.env.CAPIRO_COMPONENT_TEST_PORT ?? 5191);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error("Invalid component harness port");
const navigation = path.join(app, "tests/browser/navigation.tsx");
const externalDependencies = process.env.CAPIRO_COMPONENT_DEPENDENCIES;
if (externalDependencies && !path.isAbsolute(externalDependencies))
  throw new Error("CAPIRO_COMPONENT_DEPENDENCIES must be absolute");
const retainedDependencies = externalDependencies
  ? realpathSync(externalDependencies)
  : undefined;
// Worktree dependency installs may be junctions outside this checkout. Vite
// resolves font imports to the real path, so allow the installed dependency
// directory as well as the test application root.
const dependencies = [
  path.join(app, "node_modules"),
  path.join(app, "../..", "node_modules"),
  ...(retainedDependencies ? [retainedDependencies] : []),
]
  .filter((directory) => existsSync(directory))
  .map((directory) => realpathSync(directory));
const geistFonts = dependencies
  .map((directory) => path.join(directory, "geist", "dist", "fonts"))
  .find((directory) => existsSync(directory));
if (!geistFonts) throw new Error("Geist test fonts are not installed");
const uiRoot = path.join(app, "../../packages/ui");
const uiExports = JSON.parse(
  readFileSync(path.join(uiRoot, "package.json"), "utf8"),
).exports;
const server = await createServer({
  configFile: false,
  root: path.join(app, "tests/browser"),
  cacheDir: path.join(app, "test-results/portfolio-browser-vite"),
  publicDir: path.join(app, "public"),
  // Vite resolves browser imports itself; Node's donor hook alone is not enough.
  // Existing application aliases win, and UI exports stay in this exact tree.
  plugins: retainedDependencies
    ? [
        {
          name: "existing-component-dependencies",
          async resolveId(source, importer, options) {
            if (
              !importer ||
              source.startsWith(".") ||
              source.startsWith("/") ||
              source.startsWith("\0") ||
              source.includes(":")
            )
              return null;
            return this.resolve(
              source,
              path.join(retainedDependencies, "../package.json"),
              { ...options, skipSelf: true },
            );
          },
        },
      ]
    : [],
  resolve: {
    alias: [
      { find: "@", replacement: path.join(app, "src") },
      ...Object.entries(uiExports).map(([entry, target]) => ({
        find: `@capiro/ui/${entry.slice(2)}`,
        replacement: path.join(uiRoot, target),
      })),
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
    port,
    strictPort: true,
    fs: { allow: [app, uiRoot, ...dependencies] },
  },
});
await server.listen();
console.log(`Test-only component server: http://127.0.0.1:${port}`);
