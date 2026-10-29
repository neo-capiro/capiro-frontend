import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Pinned Clerk (7.9.14) requires middleware request metadata for auth(). A route handler
// that calls auth() outside the matcher therefore receives no auth context, so every
// such handler must be covered by the proxy matcher.
const require = createRequire(import.meta.url);
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match");

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "../src/app");
const proxySource = readFileSync(resolve(here, "../src/proxy.ts"), "utf8");

function routeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

/** Filesystem route -> concrete request path ('[id]' -> 'sample', groups dropped). */
function requestPath(file) {
  const segments = relative(appDir, dirname(file))
    .split(sep)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment))
    .map((segment) => segment.replace(/^\[\.{0,3}/, "").replace(/\]$/, "") || "sample")
    .map((segment) => (segment.startsWith("[") ? "sample" : segment));
  return `/${segments.join("/")}`;
}

/** The matcher strings, in file order, read from the module that Next consumes. */
function matcherEntries() {
  const block = proxySource.match(/matcher:\s*\[([\s\S]*?)\]/)?.[1];
  assert.ok(block, "proxy.ts exports a matcher array");
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

const entries = matcherEntries();
const covers = (path) => entries.some((entry) => getPathMatch(entry)(path) !== false);

test("every route handler that calls Clerk auth() is covered by the proxy matcher", () => {
  const guards = routeFiles(appDir).filter((file) => /\bauth\(\)/.test(readFileSync(file, "utf8")));
  assert.ok(guards.length > 0, "at least one auth()-guarded route exists");
  const uncovered = guards.map(requestPath).filter((path) => !covers(path));
  assert.deepEqual(uncovered, [], `matcher misses auth()-guarded routes: ${uncovered.join(", ")}`);
  // The two omissions reported by release review are covered explicitly.
  assert.ok(covers("/api/uploads/doc-upload"), "/api/uploads/*");
  assert.ok(covers("/api/meri/notifications"), "/api/meri/notifications");
});

test("the added coverage does not widen the matcher to public or callback paths", () => {
  // No blanket /api/:path* (or wildcard middleware) is introduced.
  assert.equal(entries.some((entry) => /^\/api\/:path\*$/.test(entry)), false);
  assert.equal(entries.some((entry) => /^\/(\(\.\*\)|:path\*)$/.test(entry)), false);
  for (const path of [
    "/api/webhooks/clerk",
    "/api/webhooks/recall",
    "/api/clio/mcp-oauth/callback",
    "/api/engagement/integrations/microsoft/callback",
    "/api/engagement/newsletter-public/sample/archive",
    "/workspace-api/newsletters/assets/file/sample",
    "/newsletter/capitol.png",
  ])
    assert.equal(covers(path), false, path);
});

test("the matcher still covers the existing authenticated surfaces", () => {
  for (const path of [
    "/",
    "/clients",
    "/accept-invite",
    "/register",
    "/api/capiro/core.list",
    "/api/conversations/submit",
    "/api/documents/sample",
    "/api/task-commands/sample",
    "/api/settings/sample",
    "/api/memory/owner/candidates",
  ])
    assert.ok(covers(path), path);
});
