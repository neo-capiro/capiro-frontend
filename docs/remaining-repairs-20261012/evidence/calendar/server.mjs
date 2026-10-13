import { createServer } from "/workspace/capiro-remaining-calendar/node_modules/vite/dist/node/index.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, realpathSync, readFileSync } from "node:fs";
const app = "/workspace/capiro-remaining-calendar/apps/web";
const source = process.env.CALENDAR_SOURCE_ROOT || path.join(app, "src");
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
  plugins: process.env.CALENDAR_DETAIL_BASELINE ? [{ name: "immutable-calendar-draft-baseline", enforce: "pre", load(id) { if (id.split("?")[0] === path.join(source, "features/portfolio/calendar/MeetingDetail.tsx")) return readFileSync(process.env.CALENDAR_DETAIL_BASELINE, "utf8"); } }] : [],
  root: path.join(app, "tests/browser"),
  publicDir: path.join(app, "public"),
  resolve: {
    alias: [
      { find: "@", replacement: source },
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
    fs: { allow: [source, app, path.join(app, "../../packages/ui"), ...dependencies] },
  },
});
await server.listen();
console.log("Test-only component server: http://127.0.0.1:5191");
