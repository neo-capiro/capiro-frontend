import { createServer } from "/workspace/capiro-p1-successor/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, realpathSync } from "node:fs";
const app = "/workspace/capiro-next-work/apps/web";
const navigation = path.join(app, "tests/browser/navigation.tsx");
// Worktree dependency installs may be junctions outside this checkout. Vite
// resolves font imports to the real path, so allow the installed dependency
// directory as well as the test application root.
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
  cacheDir: "/tmp/capiro-next-work-evidence/vite-cache",
  root: path.join(app, "tests/browser"),
  publicDir: path.join(app, "public"),
  resolve: {
    alias: [
      ...(process.env.WORK_OWNER_BASELINE === "1" ? [{ find: "@/features/portfolio/work/WorkPage", replacement: "/tmp/capiro-next-work-evidence/source-before/WorkPage.tsx" }] : []),
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
        find: "@clerk/nextjs",
        replacement: path.join(app, "test/browser/clerk.tsx"),
      },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: Number(process.env.WORK_OWNER_PORT ?? 5208),
    strictPort: true,
    fs: { allow: [app, path.join(app, "../../packages/ui"), ...dependencies, "/tmp/capiro-next-work-evidence/source-before"] },
  },
});
await server.listen();
console.log("Test-only component server: Work owner isolated fixture (port from WORK_OWNER_PORT)");
