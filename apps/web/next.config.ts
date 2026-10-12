import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  transpilePackages: ["@capiro/ui"],
  poweredByHeader: false,
  turbopack: { root: fileURLToPath(new URL("../..", import.meta.url)) },
  redirects() {
    // Resolve before the request-time root streams; retain the 307 and query hint.
    return [
      {
        source: "/settings",
        destination: "/settings/personal",
        permanent: false,
      },
    ];
  },
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
