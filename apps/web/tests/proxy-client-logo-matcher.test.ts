import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "../src/proxy";

/**
 * PR #369 return: the M1 logo route calls Clerk auth(), but "/api/client-logo/:path*" was
 * absent from the proxy matcher, so the handler never saw a session and answered 401 for a
 * signed-in request. These assertions pin the matcher and the public exemptions together,
 * because the fix must not be "make the logo path public".
 */

/** The matcher subset this proxy uses: literal segments plus ":path*" tail wildcards. */
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

const LOGO_URL = "/api/client-logo/5f7c8f9e-0d2a-4a1f-9a55-2b6f7c1d3e4a";
const PUBLIC_EXEMPTIONS = [
  "/api/capiro/public-onboard.",
  "/api/capiro/public-share.",
  "/api/capiro/public-research-share.",
];

describe("proxy matcher covers the authenticated client-logo route", () => {
  it("includes the logo path so Clerk auth() sees the request", () => {
    expect(config.matcher).toContain("/api/client-logo/:path*");
    expect(matches(LOGO_URL, config.matcher)).toBe(true);
  });

  it("keeps every public exemption scoped to its own /api/capiro prefix", () => {
    for (const prefix of PUBLIC_EXEMPTIONS) {
      expect(prefix.startsWith("/api/capiro/public-")).toBe(true);
      // A public exemption is a prefix of the public namespace only; it cannot swallow
      // the logo route or any other /api path.
      expect(LOGO_URL.startsWith(prefix)).toBe(false);
      expect("/api/backend/clients".startsWith(prefix)).toBe(false);
    }
  });

  it("states exactly those three exemptions in the proxy source (no fourth door)", () => {
    const source = readFileSync(
      join(__dirname, "..", "src", "proxy.ts"),
      "utf8",
    );
    // The other startsWith("/api/") in that file is the preview-rejection guard, not a
    // public door; only the public namespace is under test here.
    const exempt = [
      ...source.matchAll(/nextUrl\.pathname\.startsWith\("([^"]+)"\)/g),
    ]
      .map((match) => match[1] ?? "")
      .filter((path) => path.startsWith("/api/capiro/public-"));
    expect(exempt).toEqual(PUBLIC_EXEMPTIONS);
  });
});
