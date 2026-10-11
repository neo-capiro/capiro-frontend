import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const appRoot = fileURLToPath(new URL(".", import.meta.url));
// npm workspaces hoists Next to the repository root; the standalone image installs it here.
const turbopackRoot = existsSync(
  new URL("./node_modules/next/package.json", import.meta.url),
)
  ? appRoot
  : fileURLToPath(new URL("../..", import.meta.url));
const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: { root: turbopackRoot },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
