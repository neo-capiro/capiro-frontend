import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import { proxyIntentsRequest } from "../src/shared/meri-intents/proxy";

const wire = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/meri-intents/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const origin = "https://frontend.example.test";
const config = {
  enabled: true,
  baseUrl: "https://meri.example.test",
  requestOrigin: origin,
};
const credential = `action_session_${"a".repeat(43)}`;
const nativeToken = "synthetic-native-token";
const token = vi.fn(async () => nativeToken);
const request = (
  operation: string,
  body: unknown,
  init: RequestInit = {},
  suffix = "",
) =>
  new Request(`${origin}/api/conversations/intents/${operation}${suffix}`, {
    method: "POST",
    body: JSON.stringify(body),
    ...init,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "x-meri-action-session": credential,
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });
const upstream = (status: number, body: unknown) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
const code = async (response: Response) => (await response.json()).error?.code;

it("forwards exactly the validated list and decide bodies to Meri with the server native token as the bearer", async () => {
  for (const [operation, name] of [
    ["list", "listAwaiting"],
    ["decide", "decideExecuted"],
  ] as const) {
    const exchange = wire(name);
    const fetcher = upstream(exchange.httpStatus, exchange.response);
    const response = await proxyIntentsRequest(
      request(operation, exchange.request),
      operation,
      config,
      token,
      fetcher as unknown as typeof fetch,
    );
    expect(response.status).toBe(exchange.httpStatus);
    expect(await response.json()).toEqual(exchange.response);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      `https://meri.example.test/api/conversations/intents/${operation}`,
    );
    expect(new Headers(init.headers).get("authorization")).toBe(
      `Bearer ${nativeToken}`,
    );
    expect(JSON.parse(String(init.body))).toEqual(exchange.request);
    expect(init).toMatchObject({
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
    });
  }
});

it("admits an empty list through a native membership boundary that refuses the opaque session", async () => {
  const listed = wire("listAwaiting");
  const empty = { ...listed.response, intents: [], next: null };
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const admitted =
      new Headers(init?.headers).get("authorization") ===
      `Bearer ${nativeToken}`;
    return Response.json(
      admitted ? empty : { error: { code: "UNAUTHENTICATED" } },
      { status: admitted ? 200 : 401 },
    );
  });
  const response = await proxyIntentsRequest(
    request("list", listed.request),
    "list",
    config,
    token,
    fetcher,
  );
  expect(response.status).toBe(200);
  expect(
    await receiveIntentsResponse(
      "list",
      response.status,
      await response.text(),
      { request: listed.request },
    ),
  ).toEqual(empty);

  const refused = await proxyIntentsRequest(
    request("list", listed.request),
    "list",
    config,
    async () => credential,
    fetcher,
  );
  expect(refused.status).toBe(401);
  expect(await refused.json()).toEqual({
    error: { code: "UNAUTHENTICATED" },
  });
});

it.each([
  ["list", "listAwaiting", 401, "UNAUTHENTICATED"],
  ["list", "listAwaiting", 403, "MEMBERSHIP_REVOKED"],
  ["decide", "decideExecuted", 401, "UNAUTHENTICATED"],
  ["decide", "decideExecuted", 403, "ACCESS_DENIED"],
] as const)(
  "preserves %s (%s) native authority refusal %i %s",
  async (operation, name, status, refusal) => {
    const body = { error: { code: refusal } };
    const fetcher = upstream(status, body);
    const response = await proxyIntentsRequest(
      request(operation, wire(name).request),
      operation,
      config,
      token,
      fetcher as unknown as typeof fetch,
    );
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);

it("passes Meri's closed refusals through unchanged, including UNKNOWN", async () => {
  const unknown = wire("decideUnknown");
  const response = await proxyIntentsRequest(
    request("decide", unknown.request),
    "decide",
    config,
    token,
    upstream(502, unknown.response) as unknown as typeof fetch,
  );
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    error: { code: "APPROVAL_DECISION_UNKNOWN", outcome: "UNKNOWN" },
  });
});

it("refuses before forwarding: wrong route, method, query, origin, browser bearer, disabled, no session or token, invalid body", async () => {
  const body = wire("decideExecuted").request,
    never = vi.fn();
  const cases: [Promise<Response>, number][] = [
    [
      proxyIntentsRequest(
        request("approve", body),
        "approve",
        config,
        token,
        never,
      ),
      404,
    ],
    [
      proxyIntentsRequest(
        new Request(`${origin}/api/conversations/intents/list`, {
          method: "GET",
        }),
        "list",
        config,
        token,
        never,
      ),
      405,
    ],
    [
      proxyIntentsRequest(
        request("decide", body, {}, "?x=1"),
        "decide",
        config,
        token,
        never,
      ),
      400,
    ],
    [
      proxyIntentsRequest(
        request("decide", body, {
          headers: { Origin: "https://other.example.test" },
        }),
        "decide",
        config,
        token,
        never,
      ),
      400,
    ],
    [
      proxyIntentsRequest(
        request("decide", body, { headers: { Authorization: "Bearer x" } }),
        "decide",
        config,
        token,
        never,
      ),
      400,
    ],
    [
      proxyIntentsRequest(
        request("decide", body),
        "decide",
        { ...config, enabled: false },
        token,
        never,
      ),
      503,
    ],
    [
      proxyIntentsRequest(
        request("decide", body, {
          headers: { "x-meri-action-session": "nope" },
        }),
        "decide",
        config,
        token,
        never,
      ),
      401,
    ],
    [
      proxyIntentsRequest(
        request("decide", body),
        "decide",
        config,
        async () => null,
        never,
      ),
      401,
    ],
    [
      proxyIntentsRequest(
        request("decide", { ...body, decision: "maybe" }),
        "decide",
        config,
        token,
        never,
      ),
      400,
    ],
    [
      proxyIntentsRequest(
        request("decide", { ...body, tenantId: "other" }),
        "decide",
        config,
        token,
        never,
      ),
      400,
    ],
    [
      proxyIntentsRequest(
        request("decide", body),
        "decide",
        config,
        async () => {
          throw new Error("token");
        },
        never,
      ),
      503,
    ],
  ];
  for (const [pending, status] of cases) {
    const response = await pending;
    expect(response.status).toBe(status);
    expect(await code(response)).toBe("FRONTEND_INTENTS_UNAVAILABLE");
  }
  expect(never).not.toHaveBeenCalled();
});

it("reports a forwarded exchange it could not complete as 502, never as a decision", async () => {
  const body = wire("decideExecuted").request;
  const html = vi.fn(
    async () =>
      new Response("<html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
  );
  const lost = vi.fn(async () => {
    throw new TypeError("network");
  });
  for (const fetcher of [html, lost]) {
    const response = await proxyIntentsRequest(
      request("decide", body),
      "decide",
      config,
      token,
      fetcher as unknown as typeof fetch,
    );
    expect(response.status).toBe(502);
    expect(await code(response)).toBe("FRONTEND_INTENTS_UNAVAILABLE");
  }
});
