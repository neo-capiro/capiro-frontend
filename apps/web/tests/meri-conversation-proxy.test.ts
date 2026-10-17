import { afterEach, expect, it, vi } from "vitest";
import {
  conversationApplicationMetadata as protocol,
  receiveConversationRequest,
  receiveConversationResponse,
} from "@capiro/meri-contracts/conversation-application";
import {
  proxyConversationRequest,
  type ConversationProxyConfig,
} from "../src/shared/meri-conversations/proxy";
import { boundedConversationStream } from "../src/shared/meri-conversations/stream";

const origin = "https://frontend.example.test";
const config = {
  enabled: true,
  baseUrl: "https://meri.example.test",
  frontendOrigin: origin,
};
const authorization = `Bearer action_session_${"a".repeat(43)}`;
const conversationId = "10000000-0000-4000-8000-000000000001";
const reconnect = `events/${conversationId}/stream`;
const payloads = {
  "input/allocate": {
    requestId: "20000000-0000-4000-8000-000000000002",
    prompt: "Initial proposal",
  },
  "input/admit": {
    requestId: "20000000-0000-4000-8000-000000000002",
    prompt: "A ? question",
  },
  submit: {
    requestId: "20000000-0000-4000-8000-000000000002",
    prompt: "A € question",
  },
  history: { after: 2, limit: 10 },
  cancel: {},
  events: { command: { conversationId, intent: "view.subscribe" } },
};
const request = (path = "submit", init: RequestInit = {}, suffix = "") =>
  new Request(`${origin}/api/conversations/${path}${suffix}`, {
    method: path === reconnect ? "GET" : "POST",
    ...(path === reconnect
      ? {}
      : {
          body: JSON.stringify(payloads[path as keyof typeof payloads] ?? {}),
        }),
    ...init,
    headers: {
      authorization,
      ...(path === reconnect
        ? {}
        : { Origin: origin, "Content-Type": "application/json" }),
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });
const nativeToken = vi.fn(async () => "synthetic-designated-token");
const jsonResponse = () =>
  new Response('{ "error": { "code": "SESSION_CHANGED" } }', {
    status: 403,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

for (const path of [
  "submit",
  "history",
  "cancel",
  "events",
  "input/admit",
  "input/allocate",
] as const)
  it(`forwards exact admitted ${path} bytes, opaque session and owner status without native bearer leakage`, async () => {
    const raw = ` ${JSON.stringify(payloads[path])} `;
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.body).toEqual(new TextEncoder().encode(raw));
        expect(new Headers(init?.headers).get("authorization")).toBe(
          authorization,
        );
        expect(new Headers(init?.headers).get("origin")).toBe(origin);
        expect(init).toMatchObject({
          method: "POST",
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
        });
        return jsonResponse();
      },
    );
    const response = await proxyConversationRequest(
      request(path, { body: raw }),
      path,
      config,
      nativeToken,
      fetcher,
    );
    expect(fetcher.mock.calls[0]![0]).toBe(
      `${config.baseUrl}/api/conversations/${path}`,
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(response.status).toBe(403);
    expect(await response.text()).toBe(
      '{ "error": { "code": "SESSION_CHANGED" } }',
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

it("reconnect forwards the configured frontend origin and cursor, without a body or content type", async () => {
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(Object.fromEntries(new Headers(init?.headers))).toEqual({
      authorization,
      origin,
      "x-meri-resume-sequence": "7",
    });
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  });
  const response = await proxyConversationRequest(
    request(reconnect, { headers: { "x-meri-resume-sequence": "7" } }),
    reconnect,
    config,
    nativeToken,
    fetcher,
  );
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(fetcher.mock.calls[0]![0]).toBe(
    `${config.baseUrl}/api/conversations/${reconnect}`,
  );
});

for (const path of [
  "v1/execution/start",
  "control",
  "session",
  "events/not-uuid/stream",
  "events",
  "submit",
])
  it(`refuses unregistered or wrong-method route ${path} without authentication or fetch`, async () => {
    const fetcher = vi.fn();
    const response = await proxyConversationRequest(
      request(path, { method: "PUT" }),
      path,
      config,
      nativeToken,
      fetcher,
    );
    expect([404, 405]).toContain(response.status);
    expect(nativeToken).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

const invalidPosts: RequestInit[] = [
  { headers: { Origin: "https://foreign.example.test" } },
  { headers: { "Content-Encoding": "gzip" } },
  { headers: { "Last-Event-ID": "7" } },
  { headers: { "x-meri-resume-sequence": "7" } },
  { headers: { "Content-Type": "text/plain" } },
  { headers: { "Content-Length": "01" } },
  { headers: { "Content-Length": "131073" } },
];
for (const change of invalidPosts)
  it(`refuses conflicting POST transport ${JSON.stringify(change)} without dispatch`, async () => {
    const fetcher = vi.fn();
    expect(
      (
        await proxyConversationRequest(
          request("submit", change),
          "submit",
          config,
          nativeToken,
          fetcher,
        )
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

const invalidReconnectHeaders: Record<string, string>[] = [
  { "x-meri-resume-sequence": "01" },
  { "x-meri-resume-sequence": "9007199254740992" },
  { "Content-Type": "application/json" },
  { "Content-Length": "1" },
  { "Last-Event-ID": "1" },
  { Origin: "https://foreign.example.test" },
];
for (const headers of invalidReconnectHeaders)
  it(`refuses invalid reconnect transport ${JSON.stringify(headers)}`, async () => {
    const fetcher = vi.fn();
    expect(
      (
        await proxyConversationRequest(
          request(reconnect, { headers }),
          reconnect,
          config,
          nativeToken,
          fetcher,
        )
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

it("rejects query claims and mismatched local path without invoking owner", async () => {
  const fetcher = vi.fn();
  for (const incoming of [
    request("submit", {}, "?tenantId=claimed"),
    request("cancel"),
  ])
    expect(
      (
        await proxyConversationRequest(
          incoming,
          "submit",
          config,
          nativeToken,
          fetcher,
        )
      ).status,
    ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});

for (const path of [
  "submit",
  "history",
  "cancel",
  "events",
  "input/admit",
  "input/allocate",
] as const)
  it(`SDK refuses extra authority in ${path} before owner dispatch`, async () => {
    const fetcher = vi.fn();
    const response = await proxyConversationRequest(
      request(path, {
        body: JSON.stringify({ ...payloads[path], tenantId: "claimed" }),
      }),
      path,
      config,
      nativeToken,
      fetcher,
    );
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

it("disabled/invalid HTTPS configuration fails with a public SDK error and no token/owner read", async () => {
  const fetcher = vi.fn();
  const admitted = receiveConversationRequest(
    "submit",
    new TextEncoder().encode(JSON.stringify(payloads.submit)),
  );
  for (const bad of [
    { enabled: false },
    { ...config, baseUrl: "http://meri.example.test" },
    { ...config, baseUrl: "https://meri.example.test/private" },
    { enabled: true, baseUrl: config.baseUrl },
    { ...config, frontendOrigin: "https://frontend.example.test/private" },
    { ...config, frontendOrigin: "https://foreign.example.test" },
  ]) {
    const response = await proxyConversationRequest(
      request(),
      "submit",
      bad,
      nativeToken,
      fetcher,
    );
    expect(response.status).toBe(502);
    expect(
      await receiveConversationResponse(
        "submit",
        response.status,
        new Uint8Array(await response.arrayBuffer()),
        admitted,
      ),
    ).toEqual({ error: { code: "CONVERSATION_UNAVAILABLE" } });
  }
  expect(nativeToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("never derives upstream Origin from forwarded headers or a mismatched request URL", async () => {
  const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
    jsonResponse(),
  );
  const first = await proxyConversationRequest(
    request("submit", {
      headers: { "X-Forwarded-Host": "foreign.example.test" },
    }),
    "submit",
    config,
    nativeToken,
    fetcher,
  );
  expect(first.status).toBe(403);
  expect(new Headers(fetcher.mock.calls[0]![1]!.headers).get("origin")).toBe(
    origin,
  );
  fetcher.mockClear();
  nativeToken.mockClear();
  const mismatched = new Request(
    "https://foreign.example.test/api/conversations/submit",
    {
      method: "POST",
      body: JSON.stringify(payloads.submit),
      headers: {
        Authorization: authorization,
        Origin: "https://foreign.example.test",
        "Content-Type": "application/json",
      },
    },
  );
  expect(
    (
      await proxyConversationRequest(
        mismatched,
        "submit",
        config,
        nativeToken,
        fetcher,
      )
    ).status,
  ).toBe(502);
  expect(nativeToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("both designated Clerk token and exact opaque session are required", async () => {
  const fetcher = vi.fn();
  expect(
    (
      await proxyConversationRequest(
        request(),
        "submit",
        config,
        async () => null,
        fetcher,
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await proxyConversationRequest(
        request("submit", {
          headers: { authorization: "Bearer native-token" },
        }),
        "submit",
        config,
        nativeToken,
        fetcher,
      )
    ).status,
  ).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});

it("caps actual request bytes and invalid UTF8 before native dispatch", async () => {
  const fetcher = vi.fn();
  for (const body of [
    "x".repeat(protocol.limits.requestBytes + 1),
    new Uint8Array([255]),
  ])
    expect(
      (
        await proxyConversationRequest(
          request("submit", { body }),
          "submit",
          config,
          nativeToken,
          fetcher,
        )
      ).status,
    ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});

it("preserves JSON body bytes and safe protocol headers but not upstream cookies", async () => {
  const bytes = new TextEncoder().encode('{"uninterpreted":"€"}');
  const response = await proxyConversationRequest(
    request(),
    "submit",
    config,
    nativeToken,
    async () =>
      new Response(bytes, {
        status: 202,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(bytes.length),
          "Cache-Control": "private, no-store",
          "Set-Cookie": "upstream-secret",
          "Retry-After": "1",
        },
      }),
  );
  expect(response.status).toBe(202);
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  expect(response.headers.get("content-length")).toBe(String(bytes.length));
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(response.headers.get("retry-after")).toBe("1");
});

it("streams exact opaque split UTF8 bytes and protocol version without SSE parsing", async () => {
  const bytes = new TextEncoder().encode('data: {"notParsed":"€"}\n\n');
  const response = await proxyConversationRequest(
    request("events"),
    "events",
    config,
    nativeToken,
    async () =>
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(bytes.slice(0, 21));
            c.enqueue(bytes.slice(21));
            c.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "x-vercel-ai-ui-message-stream": "v1",
            "Cache-Control": "no-store",
          },
        },
      ),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
});

it("client cancellation after stream response aborts only observation and cancels upstream", async () => {
  const client = new AbortController();
  const cancelled = vi.fn();
  let upstreamSignal: AbortSignal | undefined;
  const response = await proxyConversationRequest(
    request("events", { signal: client.signal }),
    "events",
    config,
    nativeToken,
    async (_url, init) => {
      upstreamSignal = init?.signal ?? undefined;
      return new Response(
        new ReadableStream({ pull() {}, cancel: cancelled }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  );
  const receiving = response.text();
  client.abort();
  await expect(receiving).rejects.toThrow();
  expect(upstreamSignal?.aborted).toBe(true);
  expect(cancelled).toHaveBeenCalledOnce();
});

it("downstream stream disposal cancels upstream without durable cancel request", async () => {
  const cancelled = vi.fn();
  const fetcher = vi.fn(
    async () =>
      new Response(new ReadableStream({ pull() {}, cancel: cancelled }), {
        headers: { "Content-Type": "text/event-stream" },
      }),
  );
  const response = await proxyConversationRequest(
    request("events"),
    "events",
    config,
    nativeToken,
    fetcher,
  );
  await response.body!.cancel();
  expect(cancelled).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledOnce();
});

it("stream deadline remains active after headers and cancels a held reader", async () => {
  vi.useFakeTimers();
  const cancelled = vi.fn();
  const response = await proxyConversationRequest(
    request("events"),
    "events",
    config,
    nativeToken,
    async () =>
      new Response(new ReadableStream({ pull() {}, cancel: cancelled }), {
        headers: { "Content-Type": "text/event-stream" },
      }),
  );
  const receiving = response.text();
  const rejected = expect(receiving).rejects.toThrow("interrupted");
  await vi.advanceTimersByTimeAsync(30_000);
  await rejected;
  expect(cancelled).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it("bounds noncooperative authentication and fetch header waits without retry", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn();
  const first = proxyConversationRequest(
    request(),
    "submit",
    config,
    () => new Promise(() => {}),
    fetcher,
  );
  await vi.advanceTimersByTimeAsync(30_000);
  expect((await first).status).toBe(502);
  expect(fetcher).not.toHaveBeenCalled();
  const held = vi.fn(() => new Promise<Response>(() => {}));
  const second = proxyConversationRequest(
    request(),
    "submit",
    config,
    nativeToken,
    held,
  );
  await vi.advanceTimersByTimeAsync(30_000);
  expect((await second).status).toBe(502);
  expect(held).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it("stream byte budget cancels excessive upstream without modifying bytes", async () => {
  const cancelled = vi.fn();
  const source = new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(new Uint8Array(5));
        c.enqueue(new Uint8Array(6));
      },
      cancel: cancelled,
    }),
  );
  const stop = vi.fn();
  const body = boundedConversationStream(
    source,
    new AbortController().signal,
    stop,
    30_000,
    10,
  );
  await expect(new Response(body).arrayBuffer()).rejects.toThrow("limit");
  expect(cancelled).toHaveBeenCalledOnce();
  expect(stop).toHaveBeenCalledOnce();
});

for (const response of [
  () => new Response("oops", { headers: { "Content-Type": "text/html" } }),
  () =>
    new Response("{}", {
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(protocol.limits.responseBytes + 1),
      },
    }),
  () =>
    new Response("{}", {
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
      },
    }),
])
  it("unusable upstream returns SDK unavailable without retry", async () => {
    const fetcher = vi.fn(async () => response());
    expect(
      (
        await proxyConversationRequest(
          request(),
          "submit",
          config,
          nativeToken,
          fetcher,
        )
      ).status,
    ).toBe(502);
    expect(fetcher).toHaveBeenCalledOnce();
  });

// Behind the ALB, Next builds request.url from HOSTNAME/PORT (https://0.0.0.0:5188).
const publicOrigin = "https://portfolio-preview.app.capiro.ai";
const configuredPublic: ConversationProxyConfig = {
  ...config,
  requestOrigin: publicOrigin,
  frontendOrigin: publicOrigin,
};
const bound = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://0.0.0.0:5188/api/conversations/${path}`, {
    method: path === reconnect ? "GET" : "POST",
    ...(path === reconnect ? {} : { body: JSON.stringify(payloads.submit) }),
    headers: {
      authorization,
      Host: "portfolio-preview.app.capiro.ai",
      "X-Forwarded-Proto": "https",
      ...(path === reconnect
        ? {}
        : { Origin: publicOrigin, "Content-Type": "application/json" }),
      ...headers,
    },
  });

it("admits a submit from the configured public origin at the bind address", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => jsonResponse());
  const response = await proxyConversationRequest(
    bound("submit"),
    "submit",
    configuredPublic,
    nativeToken,
    fetcher,
  );
  expect(fetcher).toHaveBeenCalledOnce();
  expect(response.status).toBe(403);
  expect(new Headers(fetcher.mock.calls[0]![1]!.headers).get("origin")).toBe(
    publicOrigin,
  );
});

it("refuses a browser/upstream public-origin configuration split before dispatch", async () => {
  const fetcher = vi.fn();
  const token = vi.fn(nativeToken);
  const response = await proxyConversationRequest(
    bound("submit"),
    "submit",
    { ...configuredPublic, frontendOrigin: origin },
    token,
    fetcher,
  );
  expect(response.status).toBe(502);
  expect(token).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("admits an Origin-less reconnect at the bind address and refuses a bind-address Origin", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      }),
  );
  const admitted = await proxyConversationRequest(
    bound(reconnect),
    reconnect,
    configuredPublic,
    nativeToken,
    fetcher,
  );
  expect(admitted.status).toBe(204);
  const refused = vi.fn();
  const response = await proxyConversationRequest(
    bound(reconnect, { Origin: "https://0.0.0.0:5188" }),
    reconnect,
    configuredPublic,
    nativeToken,
    refused,
  );
  expect(response.status).toBe(400);
  expect(refused).not.toHaveBeenCalled();
});

const boundRefusals: [ConversationProxyConfig, Record<string, string>][] = [
  [config, {}],
  [configuredPublic, { Origin: "https://foreign.example.test" }],
  [configuredPublic, { Origin: "https://0.0.0.0:5188" }],
  [configuredPublic, { Origin: "null" }],
  [{ ...config, requestOrigin: null }, {}],
];
for (const [proxyConfig, headers] of boundRefusals)
  it(`refuses bind-address submit ${JSON.stringify({ requestOrigin: proxyConfig.requestOrigin, ...headers })} without dispatch`, async () => {
    const fetcher = vi.fn();
    const response = await proxyConversationRequest(
      bound("submit", headers),
      "submit",
      proxyConfig,
      nativeToken,
      fetcher,
    );
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
