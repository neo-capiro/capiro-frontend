import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "../src/proxy";

/**
 * The firm-logo route calls Clerk auth(), so it must be in the proxy matcher or Clerk never runs
 * and a signed-in request gets 401 — the exact defect returned on the client-logo route (#369).
 * The route is one exact path because the tenant comes from the session, so the matcher entry is
 * exact too: it must not become a wildcard that sweeps other /api paths under Clerk handling.
 */
function matcherPattern(entry: string): RegExp {
  const source = entry
    .split("/")
    .map((segment) =>
      segment === ":path*"
        ? ".*"
        : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("/");
  return new RegExp(`^${source}$`);
}

const matches = (pathname: string, entries: string[]) =>
  entries.some((entry) => matcherPattern(entry).test(pathname));

const FIRM_LOGO_URL = "/api/firm-logo";
const PUBLIC_EXEMPTIONS = [
  "/api/capiro/public-onboard.",
  "/api/capiro/public-share.",
  "/api/capiro/public-research-share.",
];

describe("proxy matcher covers the authenticated firm-logo route", () => {
  it("includes the exact logo path so Clerk auth() sees the request", () => {
    expect(config.matcher).toContain("/api/firm-logo");
    expect(matches(FIRM_LOGO_URL, config.matcher)).toBe(true);
  });

  it("does not widen the entry into a wildcard over other /api paths", () => {
    // The route exists only at the exact path; a wildcard would pull unrelated API paths
    // into Clerk handling and would still not reach any handler.
    expect(matches("/api/firm-logo/anything", config.matcher)).toBe(false);
    expect(matches("/api/firm-logos", config.matcher)).toBe(false);
  });

  it("keeps the client-logo route and every public exemption exactly as they were", () => {
    expect(config.matcher).toContain("/api/client-logo/:path*");
    const source = readFileSync(join(__dirname, "..", "src", "proxy.ts"), "utf8");
    const exempt = [
      ...source.matchAll(/nextUrl\.pathname\.startsWith\("([^"]+)"\)/g),
    ]
      .map((match) => match[1] ?? "")
      .filter((path) => path.startsWith("/api/capiro/public-"));
    expect(exempt).toEqual(PUBLIC_EXEMPTIONS);
    for (const prefix of PUBLIC_EXEMPTIONS)
      expect(FIRM_LOGO_URL.startsWith(prefix)).toBe(false);
  });
});
