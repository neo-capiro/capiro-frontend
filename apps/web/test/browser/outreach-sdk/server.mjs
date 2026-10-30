import { createRequire } from "node:module";
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syntheticOutreach } from "./fixture.mjs";
const here = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(here, ".."),
  repo = path.resolve(root, "../../../..");
const require = createRequire(path.join(repo, "apps/web/package.json"));
const sharedNames = [
  "@capiro/shared",
  "@capiro/shared/newsletter",
  "@capiro/shared/newsletter-render",
  "@capiro/shared/workspace-template-studio",
];
const server = await createServer({
  configFile: false,
  root,
  publicDir: path.resolve(root, "../../public"),
  cacheDir: path.join(repo, ".qa/outreach-sdk-vite"),
  optimizeDeps: {
    entries: ["outreach-sdk/index.html"],
    include: [
      "@capiro/shared",
      "@capiro/shared/newsletter",
      "@capiro/shared/newsletter-render",
      "@capiro/shared/workspace-template-studio",
    ],
  },
  esbuild: { jsx: "automatic" },
  plugins: [syntheticOutreach()],
  resolve: {
    alias: [
      ...sharedNames.map((name) => ({
        find: new RegExp("^" + name + "$"),
        replacement: require.resolve(name),
      })),
      { find: "@", replacement: path.resolve(root, "../../src") },
      {
        find: "@clerk/nextjs/legacy",
        replacement: path.join(root, "clerk-legacy.ts"),
      },
      {
        find: "@clerk/nextjs/errors",
        replacement: path.join(root, "clerk-errors.ts"),
      },
      { find: "@clerk/nextjs", replacement: path.join(root, "clerk.tsx") },
      { find: "next/link", replacement: path.join(root, "navigation.tsx") },
      {
        find: "next/navigation",
        replacement: path.join(root, "navigation.tsx"),
      },
      { find: "next/image", replacement: path.join(root, "image.tsx") },
      {
        find: "@test-geist-sans",
        replacement: path.join(
          repo,
          "node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
        ),
      },
    ],
  },
  server: {
    host: "0.0.0.0",
    port: 5307,
    strictPort: true,
    hmr: false,
    fs: {
      allow: [repo, "/opt/codex-gates/scratch/hermes-w3-closeout-20261026"],
    },
  },
  logLevel: "warn",
});
await server.listen();
console.log(
  "Synthetic Outreach integration at http://127.0.0.1:5307/modules/engagement?view=outreach",
);
