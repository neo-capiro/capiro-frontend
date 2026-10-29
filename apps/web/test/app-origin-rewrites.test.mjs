import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import util from "node:util";
import {
  appBrowserHost,
  appBrowserHostPattern,
  appOriginRewrites,
  retainedAppCapabilitiesOrigin,
  selectedCoreServiceOrigin,
} from "../src/shared/preview/app-origin-rewrites.ts";

// The framework's own matching/compilation, not a second implementation of it.
const require = createRequire(import.meta.url);
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match");
const { matchHas, prepareDestination } = require(
  "next/dist/shared/lib/router/utils/prepare-destination",
);
const { formatUrl } = require("next/dist/shared/lib/router/utils/format-url");
const { checkCustomRoutes } = require("next/dist/lib/load-custom-routes");
// The framework file this qualification exercises: a task-owned copy of the pinned package
// carrying the corrected bytes, or the resolved package when it already carries them.
const proxyRequestModule = process.env.NEXT_PROXY_PATCHED_PACKAGE
  ? path.join(
      process.env.NEXT_PROXY_PATCHED_PACKAGE,
      "dist/server/lib/router-utils/proxy-request.js",
    )
  : "next/dist/server/lib/router-utils/proxy-request";
const { proxyRequest } = require(proxyRequestModule);
const patchScript = path.resolve(import.meta.dirname, "../../../scripts/patch-next-proxy-error-log.cjs");

const rewrites = appOriginRewrites();
const token = "opaque_token_abc123";
// The one app-host path whose transport owner is the selected Core backend rather
// than the original edge; every other forwarded path keeps the retained origin.
const coreCallbackPath = "/api/clio/mcp-oauth/callback";
const expectedOrigin = (path) =>
  path === coreCallbackPath ? selectedCoreServiceOrigin : retainedAppCapabilitiesOrigin;
const required = [
  "/api/engagement/integrations/microsoft/callback",
  "/api/engagement/integrations/google/callback",
  "/api/engagement/integrations/microsoft/notifications",
  "/api/clio/mcp-oauth/callback",
  "/webhooks/recall",
  "/webhooks/clerk",
  `/api/engagement/newsletter-public/${token}/archive`,
  `/api/engagement/newsletter-public/${token}/unsubscribe`,
  `/api/engagement/newsletter-public/${token}/preferences`,
  `/api/engagement/newsletter-public/${token}/survey`,
  `/workspace-api/newsletters/assets/file/${token}`,
];
// The query a provider or a mail client actually sends through this edge.
const incomingQuery = {
  code: "synthetic-code",
  state: "synthetic-state",
  validationToken: "synthetic-validation-token",
};

/**
 * Mirrors resolve-routes: path params and host-gate params are merged into one
 * object and handed to prepareDestination with appendParamsToQuery.
 */
function resolveRewrite(rewrite, pathname, host = appBrowserHost) {
  const hasParams = matchHas({ headers: { host } }, incomingQuery, rewrite.has);
  if (hasParams === false) return false;
  const pathParams = getPathMatch(rewrite.source)(pathname);
  if (pathParams === false) return false;
  const prepared = prepareDestination({
    appendParamsToQuery: true,
    destination: rewrite.destination,
    params: { ...pathParams, ...hasParams },
    query: incomingQuery,
  });
  return {
    newUrl: prepared.newUrl,
    query: prepared.parsedDestination.query,
    origin: prepared.parsedDestination.origin,
    url: formatUrl({ ...prepared.parsedDestination, pathname: prepared.newUrl }),
  };
}

/** First rewrite whose escaped host gate and source pattern both accept this request. */
function matched(pathname, host = appBrowserHost) {
  return rewrites.find((rewrite) => resolveRewrite(rewrite, pathname, host) !== false);
}

test("Next's route validator accepts the rewrite definitions", () => {
  // Limit: this is validator acceptance, not full protocol proof. Matching, host
  // gating and destination compilation are exercised by the tests below.
  assert.doesNotThrow(() => checkCustomRoutes(rewrites, "rewrite"));
  assert.equal(rewrites.length, required.length);
});

test("every rewrite is gated on the escaped app host with one fixed destination", () => {
  for (const rewrite of rewrites) {
    // A positive, escaped host gate. A `missing` condition would also admit a
    // request that carries no Host header at all.
    assert.deepEqual(rewrite.has, [{ type: "host", value: appBrowserHostPattern }]);
    assert.equal(rewrite.missing, undefined);
    assert.equal(rewrite.destination, `${expectedOrigin(rewrite.source)}${rewrite.source}`);
    const destination = new URL(rewrite.destination.replace(/:[a-z]+/g, "x"));
    assert.equal(destination.origin, expectedOrigin(rewrite.source));
    assert.equal(destination.pathname, rewrite.source.replace(/:[a-z]+/g, "x"));
    assert.equal(destination.search, "");
    assert.equal(destination.hash, "");
    // No catch-all prefix: a forwarded route must name every dynamic segment.
    assert.doesNotMatch(rewrite.source, /\/\*|:path\*/);
  }
  assert.equal(retainedAppCapabilitiesOrigin, "https://os.capiro.ai");
  assert.equal(selectedCoreServiceOrigin, "https://first-chat-preview.app-dev.capiro.ai");
  assert.equal(appBrowserHost, "app.capiro.ai");
  assert.equal(appBrowserHostPattern, "app\\.capiro\\.ai");
});

test("the MCP callback keeps its public app path and is transported to the selected Core", () => {
  const rewrite = matched(coreCallbackPath);
  assert.ok(rewrite, coreCallbackPath);
  // Same exact app-host path, so the registered redirect stays
  // https://app.capiro.ai/api/clio/mcp-oauth/callback — no prefix, suffix or wildcard.
  assert.equal(rewrite.source, coreCallbackPath);
  assert.equal(rewrite.destination, `${selectedCoreServiceOrigin}${coreCallbackPath}`);
  assert.deepEqual(rewrite.has, [{ type: "host", value: appBrowserHostPattern }]);

  const resolved = resolveRewrite(rewrite, coreCallbackPath);
  assert.notEqual(resolved, false);
  assert.equal(resolved.origin, selectedCoreServiceOrigin);
  assert.equal(resolved.newUrl, coreCallbackPath);
  // The framework's own query assembly is unchanged: provider query plus the host param.
  assert.deepEqual(resolved.query, { ...incomingQuery, host: appBrowserHost });
  assert.equal(
    resolved.url,
    `${selectedCoreServiceOrigin}${coreCallbackPath}?code=${incomingQuery.code}&state=${incomingQuery.state}&validationToken=${incomingQuery.validationToken}&host=${appBrowserHost}`,
  );
  // Exactly one forwarded path uses the selected Core origin; the retained edge owns the rest.
  assert.deepEqual(
    rewrites.filter((row) => row.destination.startsWith(selectedCoreServiceOrigin)).map((row) => row.source),
    [coreCallbackPath],
  );
});

test("the host gate is an exact host, not a regex fragment", () => {
  const has = rewrites[0].has;
  const gate = (host) =>
    matchHas(host === undefined ? { headers: {} } : { headers: { host } }, {}, has);
  // Accepted: the app host, case-insensitively and with a port.
  assert.deepEqual(gate("app.capiro.ai"), { host: "app.capiro.ai" });
  assert.deepEqual(gate("APP.capiro.ai:443"), { host: "app.capiro.ai" });
  for (const rejected of [
    "app-capiro.ai", // dot -> hyphen substitution
    "appxcapiroyai", // dot -> x substitution
    "appacapiroaai",
    "os.capiro.ai",
    "portfolio-preview.app.capiro.ai",
    "first-chat-preview.app-dev.capiro.ai",
    "app.capiro.ai.evil.example",
    "app.capiro.ai.example",
    "xapp.capiro.ai",
    undefined, // no Host header at all
  ])
    assert.equal(gate(rejected), false, String(rejected));
});

test("the app host reaches every forwarded route with the real query assembly", () => {
  const original = `code=${incomingQuery.code}&state=${incomingQuery.state}&validationToken=${incomingQuery.validationToken}`;
  for (const path of required) {
    const rewrite = matched(path);
    assert.ok(rewrite, path);
    const resolved = resolveRewrite(rewrite, path);
    assert.notEqual(resolved, false, path);
    assert.equal(resolved.newUrl, path, path);
    assert.equal(resolved.origin, expectedOrigin(path), path);
    if (rewrite.source.includes(":")) {
      // A dynamic token is consumed by the destination path, so appendParamsToQuery
      // adds nothing and the original query is forwarded unchanged.
      assert.deepEqual(resolved.query, { ...incomingQuery }, path);
      assert.equal(resolved.url, `${expectedOrigin(path)}${path}?${original}`, path);
    } else {
      // A static host-gated route acquires the host param from matchHas, so the
      // framework appends an extra host field. The known controllers ignore
      // query.host, but this is not byte-identical to the original query.
      assert.deepEqual(resolved.query, { ...incomingQuery, host: appBrowserHost }, path);
      assert.deepEqual(Object.keys(resolved.query), [...Object.keys(incomingQuery), "host"], path);
      assert.equal(
        resolved.url,
        `${expectedOrigin(path)}${path}?${original}&host=${appBrowserHost}`,
        path,
      );
    }
  }
});

test("os, previous-portfolio, foreign and suffixed hosts never match these routes", () => {
  for (const path of required) {
    for (const host of [
      "os.capiro.ai",
      "portfolio-preview.app.capiro.ai",
      "app.capiro.ai.evil.example",
      "app-capiro.ai",
      "appxcapiroyai",
      "first-chat-preview.app-dev.capiro.ai",
    ])
      assert.equal(matched(path, host), undefined, `${host}${path}`);
  }
});

test("only the enumerated paths are forwarded", () => {
  for (const path of [
    "/api/conversations/submit",
    "/api/capiro/core.list",
    "/api/engagement/integrations/microsoft/callbackExtra",
    "/api/engagement/integrations/microsoft/callback/extra",
    "/api/engagement/newsletter-public/token/other",
    "/workspace-api/newsletters/assets/file",
    "/workspace-api/other",
    "/intel-api/legiwatch/reports",
    "/webhooks/other",
    "/webhooks/recall/events",
    "/newsletter/capitol.png",
    "/",
  ])
    assert.equal(matched(path), undefined, path);
});

test("Next's external-rewrite proxy keeps the raw signed body, query and headers", async () => {
  // Loopback-only: Next's own proxyRequest, the function a matched external rewrite
  // uses, against a local listener that records exactly what arrived.
  const raw = '{"type":"invoice.paid","data":{"id":"evt_synthetic"}}';
  const received = [];
  const target = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      received.push({
        url: req.url,
        body: Buffer.concat(chunks).toString("utf8"),
        forwardedHost: req.headers["x-forwarded-host"],
        signature: req.headers["svix-signature"],
      });
      res.writeHead(204).end();
    });
  });
  await new Promise((resolve) => target.listen(0, "127.0.0.1", resolve));
  const front = http.createServer((req, res) => {
    const incoming = new URL(req.url, "http://app.capiro.ai");
    proxyRequest(
      req,
      res,
      {
        protocol: "http:",
        hostname: "127.0.0.1",
        port: String(target.address().port),
        pathname: incoming.pathname,
        query: Object.fromEntries(incoming.searchParams),
      },
      null,
      null,
      5000,
    );
  });
  await new Promise((resolve) => front.listen(0, "127.0.0.1", resolve));
  try {
    const status = await new Promise((resolve, reject) => {
      const request = http.request(
        {
          hostname: "127.0.0.1",
          port: front.address().port,
          path: "/webhooks/clerk?retry=2",
          method: "POST",
          headers: {
            Host: appBrowserHost,
            "Content-Type": "application/json",
            "svix-signature": "v1,synthetic",
            "Content-Length": Buffer.byteLength(raw),
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode));
        },
      );
      request.on("error", reject);
      request.end(raw);
    });
    assert.equal(status, 204);
    assert.deepEqual(received, [
      {
        url: "/webhooks/clerk?retry=2",
        body: raw,
        forwardedHost: appBrowserHost,
        signature: "v1,synthetic",
      },
    ]);
  } finally {
    front.close();
    target.close();
  }
});

test("an upstream transport failure leaks no target path, query, fragment or capability token", async () => {
  assert.ok(
    process.env.NEXT_PROXY_PATCHED_PACKAGE,
    "set NEXT_PROXY_PATCHED_PACKAGE to a task-owned package copy carrying the corrected proxy file",
  );
  // Values that exist only in this synthetic request.
  const sentinels = {
    code: "SENTINEL-CODE-9f3a",
    state: "SENTINEL-STATE-4c11",
    validationToken: "SENTINEL-VALIDATION-77bd",
    capability: "SENTINEL-CAPABILITY-2ab6",
    fragment: "SENTINEL-FRAGMENT-51ee",
  };
  // A port that was bound and released, so the upstream refuses the connection.
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const upstreamPort = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));

  const records = [];
  const rejections = [];
  const originalConsoleError = console.error;
  console.error = (...args) =>
    records.push(args.map((value) => util.inspect(value, { depth: 6 })).join(" "));
  const front = http.createServer((req, res) => {
    proxyRequest(
      req,
      res,
      {
        protocol: "http:",
        hostname: "127.0.0.1",
        port: String(upstreamPort),
        pathname: `/api/engagement/newsletter-public/${sentinels.capability}/unsubscribe`,
        query: {
          code: sentinels.code,
          state: sentinels.state,
          validationToken: sentinels.validationToken,
        },
        hash: `#${sentinels.fragment}`,
      },
      null,
      null,
      5000,
    ).catch((error) => {
      // router-server's outer catch logs the rejected error a second time.
      rejections.push(error);
      console.error(error);
    });
  });
  await new Promise((resolve) => front.listen(0, "127.0.0.1", resolve));
  let status;
  let body;
  try {
    const response = await new Promise((resolve, reject) => {
      const request = http.request(
        {
          hostname: "127.0.0.1",
          port: front.address().port,
          path: `/api/engagement/newsletter-public/${sentinels.capability}/unsubscribe?code=${sentinels.code}`,
          method: "POST",
          headers: { Host: appBrowserHost, "Content-Length": 0 },
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        },
      );
      request.on("error", reject);
      request.end();
    });
    status = response.status;
    body = response.body;
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    console.error = originalConsoleError;
    front.close();
  }

  // The failure outcome is unchanged: the framework's 500 body plus one rejection.
  assert.equal(status, 500);
  assert.equal(body, "Internal Server Error");
  assert.equal(rejections.length, 1);

  // Both records — the proxy sink and the downstream router rejection — are sanitized.
  assert.ok(records.length >= 2, `expected both failure records, saw ${records.length}`);
  const logged = records.join("\n");
  for (const [name, value] of Object.entries(sentinels))
    assert.ok(!logged.includes(value), `the ${name} sentinel reached a log record`);
  assert.ok(
    !logged.includes("/api/engagement/newsletter-public"),
    "the target path reached a log record",
  );
  assert.ok(
    logged.includes("Failed to proxy http://127.0.0.1:"),
    "the fixed upstream origin label is missing",
  );
  assert.ok(logged.includes("ProxyUpstreamError"), "the bounded error class is missing");
  assert.match(logged, /ECONNREFUSED|PROXY_UPSTREAM_FAILURE/, "the bounded error code is missing");

  // The propagated error keeps no raw upstream object, cause, message or stack.
  const [error] = rejections;
  assert.equal(error.name, "ProxyUpstreamError");
  assert.equal(error.message, "Upstream proxy request failed");
  assert.match(error.code, /^[A-Z][A-Z0-9_]{2,31}$/);
  assert.equal(error.cause, undefined);
  assert.ok(!util.inspect(error, { depth: 6 }).includes("127.0.0.1:"), "origin leaked into the error");
  assert.ok(!String(error.stack).includes("127.0.0.1:"), "origin leaked into the stack");
});

test("the deterministic correction refuses unexpected framework bytes", () => {
  assert.ok(
    process.env.NEXT_PROXY_PATCHED_PACKAGE,
    "set NEXT_PROXY_PATCHED_PACKAGE to a task-owned package copy carrying the corrected proxy file",
  );
  const relative = "dist/server/lib/router-utils/proxy-request.js";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "next-proxy-patch-"));
  try {
    fs.mkdirSync(path.join(dir, path.dirname(relative)), { recursive: true });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ name: "next", version: "16.4.1" }),
    );
    const file = path.join(dir, relative);
    const run = () => spawnSync(process.execPath, [patchScript, "--package", dir], { encoding: "utf8" });

    // A different framework build is refused and left byte-identical.
    const unexpected = '"use strict";\n// unexpected framework build\n';
    fs.writeFileSync(file, unexpected);
    const refused = run();
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /refusing to edit an unexpected file/);
    assert.equal(fs.readFileSync(file, "utf8"), unexpected);

    // The expected corrected bytes are recognised and left untouched (idempotent step).
    fs.copyFileSync(path.join(process.env.NEXT_PROXY_PATCHED_PACKAGE, relative), file);
    const before = fs.readFileSync(file);
    const again = run();
    assert.equal(again.status, 0);
    assert.match(again.stdout, /already corrected/);
    assert.deepEqual(fs.readFileSync(file), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the app host keeps exactly the eleven forwarded routes", () => {
  assert.deepEqual(
    rewrites.map((rewrite) => rewrite.source).sort(),
    [...required]
      .map((path) =>
        path
          .replace(`/api/engagement/newsletter-public/${token}`, "/api/engagement/newsletter-public/:token")
          .replace(`/workspace-api/newsletters/assets/file/${token}`, "/workspace-api/newsletters/assets/file/:token"),
      )
      .sort(),
  );
});
