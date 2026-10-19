import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { responseHeaders } from "./src/shared/response-headers";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  transpilePackages: ["@capiro/ui"],
  poweredByHeader: false,
  turbopack: { root: fileURLToPath(new URL("../..", import.meta.url)) },
  // Qualification worktrees retain build evidence, not reusable compiler caches.
  experimental: { turbopackFileSystemCacheForBuild: false },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: responseHeaders,
      },
      {
        source: "/it/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};
export default config;
