import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { config as proxyConfig } from "../src/proxy";

const app = join(__dirname, "../src/app");
function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? routeFiles(path)
      : entry.name === "route.ts"
        ? [path]
        : [];
  });
}
/** The URL path a route file answers, its dynamic segments kept as written. */
const routePath = (file: string) =>
  "/" + relative(app, file).split(sep).slice(0, -1).join("/");
/** Literal and `/:path*` matcher entries, the only two forms the proxy uses. */
const matches = (matcher: string, path: string) =>
  matcher.endsWith("/:path*")
    ? path === matcher.slice(0, -"/:path*".length) ||
      path.startsWith(matcher.slice(0, -":path*".length))
    : path === matcher;

describe("Clerk proxy coverage", () => {
  it("every route handler that calls Clerk's server auth is on the proxy matcher", () => {
    // auth() throws when clerkMiddleware did not run for the request; each proxy then answers its own
    // pre-dispatch refusal, so a missing entry fails every signed-in call (the Office editor's 502 REFUSED).
    const routes = routeFiles(app)
      .filter((file) =>
        readFileSync(file, "utf8").includes('from "@clerk/nextjs/server"'),
      )
      .map(routePath);
    expect(routes).toContain("/api/meri/office/[operation]");
    expect(
      routes.filter(
        (path) => !proxyConfig.matcher.some((entry) => matches(entry, path)),
      ),
    ).toEqual([]);
  });
});
