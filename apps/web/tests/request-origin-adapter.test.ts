import { expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import { createServer, request as httpRequest } from "node:http";
import { once } from "node:events";
import NextNodeServer from "next/dist/server/next-server";
import { NodeNextRequest } from "next/dist/server/base-http/node";
import { NextRequestAdapter } from "next/dist/server/web/spec-extension/adapters/next-request";
import { getRequestMeta } from "next/dist/server/request-meta";
import { z } from "zod";
import { defineOperation } from "../src/shared/capiro/contracts";
import {
  handleCapiroRequest,
  handlePublicPlannerFormRequest,
  handlePublicOnboardRequest,
} from "../src/shared/capiro/gateway";
import { readCapiroConfig } from "../src/shared/capiro/config";
import { readRequestOrigin } from "../src/shared/request-origin";
import { readConfig } from "../src/shared/portfolio/config/config";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";

const publicOrigin = "https://portfolio-preview.app.capiro.ai";
type StandaloneMetaContext = {
  fetchHostname: string;
  port: number;
  nextConfig: { experimental: { trustHostHeader: boolean } };
};
const attachRequestMeta = (
  NextNodeServer.prototype as unknown as {
    attachRequestMeta: (
      this: StandaloneMetaContext,
      request: NodeNextRequest,
      parsed: { query: Record<string, unknown> },
      upgrade: boolean,
    ) => void;
  }
).attachRequestMeta;
const config = {
  services: { core: "https://upstream.example/api" },
  authConfigured: true,
  issues: [],
};
const registry = {
  "synthetic.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/synthetic",
    source: "local test only",
    request: z
      .object({ body: z.object({ label: z.string() }).strict() })
      .strict(),
    response: z.object({ ok: z.boolean() }),
  }),
};

function adaptedRequest(origin: string | null = publicOrigin, hostile = false) {
  const raw = Readable.from([JSON.stringify({ body: { label: "synthetic" } })]);
  Object.assign(raw, {
    method: "POST",
    url: "/api/capiro/synthetic.create",
    headers: {
      host: hostile ? "hostile.example" : "portfolio-preview.app.capiro.ai",
      "x-forwarded-host": hostile
        ? "hostile.example"
        : "portfolio-preview.app.capiro.ai",
      "x-forwarded-proto": "https",
      "x-forwarded-port": "443",
      "content-type": "application/json",
      ...(origin === null ? {} : { origin }),
    },
  });
  const request = new NodeNextRequest(raw as never);
  // Invoke the actual installed Next server method with standalone runtime fields.
  const server = {
    fetchHostname: "0.0.0.0",
    port: 5188,
    nextConfig: { experimental: { trustHostHeader: false } },
  };
  attachRequestMeta.call(server, request, { query: {} }, false);
  const web = NextRequestAdapter.fromNodeNextRequest(
    request,
    new AbortController().signal,
  );
  return { web, initialUrl: getRequestMeta(request, "initURL") };
}

it("reproduces the PR50 public-browser/bind-origin denial before auth or dispatch", async () => {
  const { web, initialUrl } = adaptedRequest();
  expect(initialUrl).toBe("https://0.0.0.0:5188/api/capiro/synthetic.create");
  expect(new URL(web.url).origin).toBe("https://0.0.0.0:5188");
  expect(web.headers.get("origin")).toBe(publicOrigin);
  const auth = vi.fn(async () => "synthetic-token");
  const upstream = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
  const response = await handleCapiroRequest(
    web,
    "synthetic.create",
    registry,
    config,
    auth,
    upstream,
  );
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({
    message: "Request origin is not allowed.",
  });
  expect(auth).not.toHaveBeenCalled();
  expect(upstream).not.toHaveBeenCalled();
});

it("admits the canonical public origin through the actual adapter with trusted auth and stubbed upstream", async () => {
  const auth = vi.fn(async () => "synthetic-token");
  const upstream = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
  const configured = readRequestOrigin(publicOrigin, []);
  const response = await handleCapiroRequest(
    adaptedRequest().web,
    "synthetic.create",
    registry,
    { ...config, requestOrigin: configured },
    auth,
    upstream,
  );
  expect(response.status).toBe(200);
  expect(auth).toHaveBeenCalledTimes(1);
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(upstream.mock.calls[0]![0]).toEqual(
    new URL("https://upstream.example/api/synthetic"),
  );
});

it.each([
  null,
  "null",
  "https://hostile.example",
  "https://0.0.0.0:5188",
  `${publicOrigin}/`,
  `${publicOrigin} https://hostile.example`,
])(
  "rejects missing/null/foreign/malformed Origin %s before body/auth/upstream despite hostile forwarded headers",
  async (origin) => {
    const request = adaptedRequest(origin, true).web;
    const auth = vi.fn(async () => "synthetic-token");
    const upstream = vi.fn(async () => Response.json({ ok: true }));
    const response = await handleCapiroRequest(
      request,
      "synthetic.create",
      registry,
      { ...config, requestOrigin: publicOrigin },
      auth,
      upstream,
    );
    expect(response.status).toBe(403);
    expect(request.bodyUsed).toBe(false);
    expect(auth).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  },
);

it.each([
  "",
  " ",
  "null",
  "https://user:pass@app.example",
  "https://app.example/path",
  "https://app.example?x=y",
  "https://app.example#x",
  "https://app.example?",
  "https://app.example#",
  "http://app.example",
  "https://*.example",
  "https://0.0.0.0:5188",
])(
  "invalid configured origin %s fails closed rather than reverting to request URL",
  async (value) => {
    const configured = readCapiroConfig({ CAPIRO_REQUEST_ORIGIN: value });
    expect(configured.requestOrigin).toBeNull();
    expect(
      configured.issues.some((issue) =>
        issue.startsWith("CAPIRO_REQUEST_ORIGIN"),
      ),
    ).toBe(true);
    const auth = vi.fn(async () => "synthetic-token");
    const upstream = vi.fn(async () => Response.json({ ok: true }));
    const response = await handleCapiroRequest(
      adaptedRequest().web,
      "synthetic.create",
      registry,
      { ...config, requestOrigin: configured.requestOrigin },
      auth,
      upstream,
    );
    expect(response.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  },
);

it("keeps browser Origin authoritative only by equality, never hostile Host or forwarded headers", async () => {
  const auth = vi.fn(async () => null);
  const upstream = vi.fn();
  const response = await handleCapiroRequest(
    adaptedRequest(publicOrigin, true).web,
    "synthetic.create",
    registry,
    { ...config, requestOrigin: publicOrigin },
    auth,
    upstream,
  );
  expect(response.status).toBe(401);
  expect(auth).toHaveBeenCalledTimes(1);
  expect(upstream).not.toHaveBeenCalled();
});

it("keeps both public capability mutation surfaces fail closed before body/dispatch", async () => {
  const upstream = vi.fn();
  for (const [key, handler] of [
    ["public-form.submit", handlePublicPlannerFormRequest],
    ["public-onboard.consent", handlePublicOnboardRequest],
  ] as const) {
    const request = adaptedRequest("https://hostile.example", true).web;
    const response = await handler(
      request,
      key,
      { ...config, requestOrigin: publicOrigin },
      upstream,
    );
    expect(response.status).toBe(403);
    expect(request.bodyUsed).toBe(false);
    expect(upstream).not.toHaveBeenCalled();
  }
});

it("Portfolio shares the validated origin owner and preserves pre-auth denial", async () => {
  const configured = readConfig({
    CAPIRO_REQUEST_ORIGIN: publicOrigin,
    CORE_API_BASE_URL: "https://upstream.example/api",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YQ==",
    CLERK_SECRET_KEY: "sk_test_synthetic",
  });
  const auth = vi.fn(async () => "synthetic-token");
  const upstream = vi.fn(async () => Response.json({ ok: true }));
  const accepted = await proxyRequest(
    adaptedRequest().web,
    "core",
    ["clients"],
    configured,
    auth,
    upstream,
  );
  expect(accepted.status).toBe(200);
  auth.mockClear();
  upstream.mockClear();
  const denied = await proxyRequest(
    adaptedRequest("https://hostile.example", true).web,
    "core",
    ["clients"],
    configured,
    auth,
    upstream,
  );
  expect(denied.status).toBe(403);
  expect(auth).not.toHaveBeenCalled();
  expect(upstream).not.toHaveBeenCalled();
  expect(
    readConfig({ CAPIRO_REQUEST_ORIGIN: "https://app.example/path" })
      .requestOrigin,
  ).toBeNull();
});

it("allows explicit loopback development origin and leaves unset configuration unchanged", () => {
  expect(readRequestOrigin(undefined, [])).toBeUndefined();
  expect(readRequestOrigin("http://127.0.0.1:5188", [])).toBe(
    "http://127.0.0.1:5188",
  );
  expect(readRequestOrigin(`${publicOrigin}/`, [])).toBe(publicOrigin);
});

it("carries a synthetic local HTTP proxy request through Next server metadata, adapter and gateway", async () => {
  const auth = vi.fn(async () => "synthetic-token");
  const upstream = vi.fn(async () => Response.json({ ok: true }));
  let derived = "";
  const server = createServer(async (raw, response) => {
    const request = new NodeNextRequest(raw);
    attachRequestMeta.call(
      {
        fetchHostname: "0.0.0.0",
        port: 5188,
        nextConfig: { experimental: { trustHostHeader: false } },
      },
      request,
      { query: {} },
      false,
    );
    const web = NextRequestAdapter.fromNodeNextRequest(
      request,
      new AbortController().signal,
    );
    derived = new URL(web.url).origin;
    const rejected = await handleCapiroRequest(
      web,
      "synthetic.create",
      registry,
      config,
      auth,
      upstream,
    );
    response.writeHead(rejected.status, { "content-type": "application/json" });
    response.end(await rejected.text());
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing local test listener");
    const observed = await new Promise<{ status: number; body: string }>(
      (resolve, reject) => {
        const req = httpRequest(
          {
            hostname: "127.0.0.1",
            port: address.port,
            path: "/api/capiro/synthetic.create",
            method: "POST",
            headers: {
              Host: "portfolio-preview.app.capiro.ai",
              Origin: publicOrigin,
              "X-Forwarded-Host": "portfolio-preview.app.capiro.ai",
              "X-Forwarded-Proto": "https",
              "X-Forwarded-Port": "443",
              "Content-Type": "application/json",
            },
          },
          (res) => {
            let body = "";
            res.on("data", (chunk) => {
              body += chunk;
            });
            res.on("end", () => resolve({ status: res.statusCode!, body }));
          },
        );
        req.on("error", reject);
        req.end(JSON.stringify({ body: { label: "synthetic" } }));
      },
    );
    expect(derived).toBe("https://0.0.0.0:5188");
    expect(observed).toEqual({
      status: 403,
      body: JSON.stringify({ message: "Request origin is not allowed." }),
    });
    expect(auth).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
