import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import test from "node:test";
import {
  appBrowserHost,
  appBrowserHostPattern,
  appOriginRewrites,
  retainedAppCapabilitiesOrigin,
} from "../src/shared/preview/app-origin-rewrites.ts";

// The framework's own matching/compilation, not a second implementation of it.
const require = createRequire(import.meta.url);
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match");
const { matchHas, prepareDestination } = require(
  "next/dist/shared/lib/router/utils/prepare-destination",
);
const { formatUrl } = require("next/dist/shared/lib/router/utils/format-url");
const { checkCustomRoutes } = require("next/dist/lib/load-custom-routes");

const rewrites = appOriginRewrites();
const token = "opaque_token_abc123";
const required = [
  "/api/engagement/integrations/microsoft/callback",
  "/api/engagement/integrations/google/callback",
  "/api/engagement/integrations/microsoft/notifications",
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
    assert.equal(rewrite.destination, `${retainedAppCapabilitiesOrigin}${rewrite.source}`);
    const destination = new URL(rewrite.destination.replace(/:[a-z]+/g, "x"));
    assert.equal(destination.origin, retainedAppCapabilitiesOrigin);
    assert.equal(destination.search, "");
    assert.equal(destination.hash, "");
    // No catch-all prefix: a forwarded route must name every dynamic segment.
    assert.doesNotMatch(rewrite.source, /\/\*|:path\*/);
  }
  assert.equal(retainedAppCapabilitiesOrigin, "https://os.capiro.ai");
  assert.equal(appBrowserHost, "app.capiro.ai");
  assert.equal(appBrowserHostPattern, "app\\.capiro\\.ai");
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

test("the app host reaches every retained route with the real query assembly", () => {
  const original = `code=${incomingQuery.code}&state=${incomingQuery.state}&validationToken=${incomingQuery.validationToken}`;
  for (const path of required) {
    const rewrite = matched(path);
    assert.ok(rewrite, path);
    const resolved = resolveRewrite(rewrite, path);
    assert.notEqual(resolved, false, path);
    assert.equal(resolved.newUrl, path, path);
    assert.equal(resolved.origin, retainedAppCapabilitiesOrigin, path);
    if (rewrite.source.includes(":")) {
      // A dynamic token is consumed by the destination path, so appendParamsToQuery
      // adds nothing and the original query is forwarded unchanged.
      assert.deepEqual(resolved.query, { ...incomingQuery }, path);
      assert.equal(resolved.url, `${retainedAppCapabilitiesOrigin}${path}?${original}`, path);
    } else {
      // A static host-gated route acquires the host param from matchHas, so the
      // framework appends an extra host field. The known controllers ignore
      // query.host, but this is not byte-identical to the original query.
      assert.deepEqual(resolved.query, { ...incomingQuery, host: appBrowserHost }, path);
      assert.deepEqual(Object.keys(resolved.query), [...Object.keys(incomingQuery), "host"], path);
      assert.equal(
        resolved.url,
        `${retainedAppCapabilitiesOrigin}${path}?${original}&host=${appBrowserHost}`,
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
  const { proxyRequest } = require("next/dist/server/lib/router-utils/proxy-request");
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

test("the app host keeps exactly the ten forwarded routes", () => {
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
