import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import test from "node:test";
import {
  appBrowserHost,
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

/** First rewrite whose host gate and source pattern both accept this request. */
function matched(pathname, host = appBrowserHost) {
  return rewrites.find((rewrite) => {
    const matches = matchHas({ headers: { host } }, {}, rewrite.has);
    if (matches === false) return false;
    return getPathMatch(rewrite.source)(pathname) !== false;
  });
}

test("Next's route validator accepts the rewrite definitions", () => {
  // Limit: this is validator acceptance, not full protocol proof. Matching, host
  // gating and destination compilation are exercised by the tests below.
  assert.doesNotThrow(() => checkCustomRoutes(rewrites, "rewrite"));
  assert.equal(rewrites.length, required.length);
});

test("every rewrite is gated on the app host alone with one fixed destination", () => {
  for (const rewrite of rewrites) {
    assert.deepEqual(rewrite.has, [{ type: "host", value: appBrowserHost }]);
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
});

test("the app host reaches every retained route and keeps its query string", () => {
  for (const path of required) {
    const rewrite = matched(path);
    assert.ok(rewrite, path);
    const params = getPathMatch(rewrite.source)(path);
    assert.notEqual(params, false, path);
    const prepared = prepareDestination({
      appendParamsToQuery: true,
      destination: rewrite.destination,
      params,
      query: { utm_source: "mail", retry: "2" },
    });
    // Next compiles the destination path separately from the parsed external URL.
    assert.equal(prepared.newUrl, path, path);
    assert.equal(prepared.parsedDestination.origin, retainedAppCapabilitiesOrigin, path);
    assert.equal(
      formatUrl({ ...prepared.parsedDestination, pathname: prepared.newUrl }),
      `${retainedAppCapabilitiesOrigin}${path}?utm_source=mail&retry=2`,
      path,
    );
  }
});

test("os and foreign hosts never match, so neither can borrow these routes", () => {
  assert.equal(matchHas({ headers: { host: "os.capiro.ai" } }, {}, rewrites[0].has), false);
  assert.deepEqual(matchHas({ headers: { host: "APP.capiro.ai:443" } }, {}, rewrites[0].has), { host: "app.capiro.ai" });
  for (const path of required) {
    assert.equal(matched(path, "os.capiro.ai"), undefined, path);
    assert.equal(matched(path, "app.capiro.ai.evil.example"), undefined, path);
    assert.equal(matched(path, "first-chat-preview.app-dev.capiro.ai"), undefined, path);
  }
});

test("only the enumerated paths are forwarded", () => {
  for (const path of [
    "/api/conversations/submit",
    "/api/capiro/core.list",
    "/api/engagement/integrations/microsoft/callbackExtra",
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
