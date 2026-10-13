import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, realpathSync, writeFileSync } from "node:fs";
const app = "/workspace/capiro-remaining-capabilities/apps/web";
const baseline = process.env.CAPABILITY_BASELINE === "1";
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
  cacheDir: "/tmp/capiro-remaining-capabilities-evidence/vite-cache-" + (baseline ? "baseline" : "candidate"),
  root: path.join(app, "tests/browser"),
  publicDir: path.join(app, "public"),
  resolve: {
    alias: [
      ...(baseline ? [{ find: "@/features/portfolio/capabilities", replacement: "/tmp/capiro-remaining-capabilities-evidence/baseline-source/apps/web/src/features/portfolio/capabilities" }] : []),
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
        replacement: path.join(app, "tests/browser/clerk.tsx"),
      },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5191,
    strictPort: true,
    fs: { allow: ["/tmp/capiro-remaining-capabilities-evidence", app, path.join(app, "../../packages/ui"), ...dependencies] },
  },
});
await server.listen();
console.log("Test-only component server: http://127.0.0.1:5191");

writeFileSync("/tmp/capiro-remaining-capabilities-evidence/server.pid", String(process.pid));
process.on("SIGTERM", async () => { await server.close(); process.exit(0); });
