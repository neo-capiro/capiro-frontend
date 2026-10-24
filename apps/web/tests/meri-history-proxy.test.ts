import { describe, expect, it, vi } from "vitest";
import { conversationHistoryMetadata as protocol } from "@capiro/meri-contracts/conversation-history";
import {
  conversationHistoryRoute,
  proxyConversationHistory,
} from "../src/shared/meri-conversations/history-proxy";
import type { ConversationProxyConfig } from "../src/shared/meri-conversations/proxy";
import {
  ConversationHistoryUnavailable,
  listConversations,
} from "../src/shared/meri-conversations/history-client";

// Synthetic byte-boundary controls. All fetches are injected; none calls a real identity/provider.
const origin = "https://frontend.example";
const config = {
  enabled: true,
  baseUrl: "https://meri.example",
  frontendOrigin: origin,
};
const token = async () => "synthetic-native-membership";
const conversationId = "30000000-0000-4000-8000-000000000003";
const sourceRunId = "40000000-0000-4000-8000-000000000004";
const input = (
  path = "list",
  body: unknown = {},
  headers: Record<string, string> = {},
) =>
  new Request(`${origin}/api/conversations/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
  });
const json = (body: unknown, status = 200) => Response.json(body, { status });
const emptyList = {
  schema: "meri.conversation-list/1",
  conversations: [],
  nextBefore: null,
};

describe("synthetic native history proxy", () => {
  it("allocates only the three exact canonical routes", () => {
    expect(conversationHistoryRoute("list")).toBe("list");
    expect(conversationHistoryRoute("transcript")).toBe("transcript");
    expect(conversationHistoryRoute("next-turn")).toBe("nextTurn");
    for (const path of [
      "history",
      "events",
      "list/",
      "%6cist",
      "list?limit=1",
      "../list",
    ])
      expect(conversationHistoryRoute(path)).toBeUndefined();
  });

  it.each([
    { Origin: "https://foreign.example" },
    { Authorization: "Bearer action_session_synthetic" },
    { "Last-Event-ID": "2" },
    { "X-Meri-Resume-Sequence": "2" },
    { "Content-Encoding": "gzip" },
    { "Sec-Fetch-Site": "cross-site" },
  ] as Record<string, string>[])(
    "rejects browser authority/cursor/origin substitution before reading native credentials: %o",
    async (headers) => {
      const credential = vi.fn(token),
        fetcher = vi.fn(async () => json(emptyList));
      const response = await proxyConversationHistory(
        input("list", {}, headers),
        "list",
        config,
        credential,
        fetcher,
      );
      expect(response.status).toBe(400);
      expect(credential).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("rejects selectors in query strings and closed-body identity fields", async () => {
    const fetcher = vi.fn(async () => json(emptyList));
    for (const request of [
      input("list?tenantId=chosen"),
      input("list", { tenantId: "chosen" }),
    ])
      expect(
        (
          await proxyConversationHistory(
            request,
            "list",
            config,
            token,
            fetcher,
          )
        ).status,
      ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails unavailable without configuration, token or a POST", async () => {
    const fetcher = vi.fn(async () => json(emptyList));
    expect(
      (
        await proxyConversationHistory(
          input(),
          "list",
          { enabled: false },
          token,
          fetcher,
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await proxyConversationHistory(
          input(),
          "list",
          { enabled: true, baseUrl: "http://meri.example" },
          token,
          fetcher,
        )
      ).status,
    ).toBe(503);
    for (const bad of [
      { enabled: true, baseUrl: config.baseUrl },
      { ...config, frontendOrigin: "https://frontend.example/private" },
      { ...config, frontendOrigin: "https://foreign.example" },
    ])
      expect(
        (await proxyConversationHistory(input(), "list", bad, token, fetcher))
          .status,
      ).toBe(503);
    expect(
      (
        await proxyConversationHistory(
          input(),
          "list",
          config,
          async () => null,
          fetcher,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await proxyConversationHistory(
          new Request(`${origin}/api/conversations/list`),
          "list",
          config,
          token,
          fetcher,
        )
      ).status,
    ).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends native membership only server-side and admits the direct public envelope", async () => {
    const fetcher = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer synthetic-native-membership",
        );
        expect(new Headers(init?.headers).get("origin")).toBe(origin);
        expect(new Headers(init?.headers).has("cookie")).toBe(false);
        expect(init?.credentials).toBe("omit");
        expect(init?.redirect).toBe("error");
        return json(emptyList);
      },
    );
    const response = await proxyConversationHistory(
      input(),
      "list",
      config,
      token,
      fetcher,
    );
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      `${config.baseUrl}${protocol.routes.list.path}`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(emptyList);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.has("authorization")).toBe(false);
  });

  it("does not trust forwarded host or dispatch for a request URL outside the configured origin", async () => {
    const credential = vi.fn(token);
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) => json(emptyList),
    );
    const forwarded = input(
      "list",
      {},
      { "X-Forwarded-Host": "foreign.example" },
    );
    expect(
      (
        await proxyConversationHistory(
          forwarded,
          "list",
          config,
          credential,
          fetcher,
        )
      ).status,
    ).toBe(200);
    expect(new Headers(fetcher.mock.calls[0]![1]!.headers).get("origin")).toBe(
      origin,
    );
    fetcher.mockClear();
    credential.mockClear();
    const mismatched = new Request(
      "https://foreign.example/api/conversations/list",
      {
        method: "POST",
        body: "{}",
        headers: {
          Origin: "https://foreign.example",
          "Content-Type": "application/json",
        },
      },
    );
    expect(
      (
        await proxyConversationHistory(
          mismatched,
          "list",
          config,
          credential,
          fetcher,
        )
      ).status,
    ).toBe(503);
    expect(credential).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects an untrusted successful envelope and suppresses upstream error details", async () => {
    for (const payload of [
      { ...emptyList, private: "secret" },
      { error: { code: "PRODUCT_UNAVAILABLE", field: "private.detail" } },
    ]) {
      const response = await proxyConversationHistory(
        input(),
        "list",
        config,
        token,
        async () => json(payload, "error" in payload ? 502 : 200),
      );
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        error: { code: "PRODUCT_UNAVAILABLE" },
      });
    }
  });

  it("marks an indeterminate dispatched reservation UNKNOWN without inventing a target", async () => {
    const response = await proxyConversationHistory(
      input("next-turn", { conversationId, sourceRunId }),
      "nextTurn",
      config,
      token,
      async () => {
        throw Error("synthetic lost ACK");
      },
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: { code: "PRODUCT_UNAVAILABLE", outcome: "UNKNOWN" },
    });
  });

  it("never dispatches after abort while native credentials are still resolving", async () => {
    const controller = new AbortController();
    const request = new Request(input(), { signal: controller.signal });
    const fetcher = vi.fn(async () => json(emptyList));
    const response = await proxyConversationHistory(
      request,
      "list",
      config,
      async () => {
        controller.abort();
        return token();
      },
      fetcher,
    );
    expect(response.status).toBe(502);
    expect(fetcher).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: { code: "PRODUCT_UNAVAILABLE" },
    });
  });

  it("bounds the complete response before public JSON admission", async () => {
    const response = await proxyConversationHistory(
      input(),
      "list",
      config,
      token,
      async () =>
        new Response("{}", {
          headers: {
            "Content-Type": "application/json",
            "Content-Length": String(protocol.limits.responseBytes + 1),
          },
        }),
    );
    expect(response.status).toBe(502);
  });
});

describe("synthetic native history browser client", () => {
  it("sends same-origin JSON without a native or opaque Authorization header", async () => {
    const fetcher = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        expect(url).toBe(protocol.routes.list.path);
        expect(init?.credentials).toBe("same-origin");
        expect(new Headers(init?.headers).has("authorization")).toBe(false);
        return json(emptyList);
      },
    );
    await expect(
      listConversations({}, new AbortController().signal, fetcher),
    ).resolves.toEqual(emptyList);
  });

  it("classifies access denial before admitting any service error body", async () => {
    await expect(
      listConversations({}, new AbortController().signal, async () =>
        json({ error: { code: "MEMBERSHIP_REVOKED" } }, 403),
      ),
    ).rejects.toMatchObject({
      status: 403,
      code: "CONVERSATION_ACCESS_DENIED",
    });
    expect(
      new ConversationHistoryUnavailable(403, "MEMBERSHIP_REVOKED").message,
    ).toBe("Conversation history unavailable");
  });
});

describe("standalone bind address behind the ALB", () => {
  // Next builds request.url from HOSTNAME/PORT (https://0.0.0.0:5188), never the public host.
  const publicOrigin = "https://portfolio-preview.app.capiro.ai";
  const configured: ConversationProxyConfig = {
    ...config,
    requestOrigin: publicOrigin,
    frontendOrigin: publicOrigin,
  };
  const bound = (headers: Record<string, string> = {}) =>
    new Request("https://0.0.0.0:5188/api/conversations/list", {
      method: "POST",
      body: "{}",
      headers: {
        Origin: publicOrigin,
        "Content-Type": "application/json",
        Host: "portfolio-preview.app.capiro.ai",
        "X-Forwarded-Proto": "https",
        ...headers,
      },
    });
  it("admits the configured public origin although request.url names the bind address", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(emptyList));
    const response = await proxyConversationHistory(
      bound(),
      "list",
      configured,
      token,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(new Headers(fetcher.mock.calls[0]![1]!.headers).get("origin")).toBe(
      publicOrigin,
    );
    expect(await response.json()).toEqual(emptyList);
  });

  it("refuses a browser/upstream public-origin configuration split before native auth", async () => {
    const credential = vi.fn(token);
    const fetcher = vi.fn();
    const response = await proxyConversationHistory(
      bound(),
      "list",
      { ...configured, frontendOrigin: origin },
      credential,
      fetcher,
    );
    expect(response.status).toBe(503);
    expect(credential).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  const refusals: [ConversationProxyConfig, Record<string, string>][] = [
    [config, {}],
    [configured, { Origin: "https://foreign.example" }],
    [configured, { Origin: "https://0.0.0.0:5188" }],
    [configured, { Origin: "null" }],
    [{ ...config, requestOrigin: null }, {}],
  ];
  it.each(refusals)(
    "refuses %o with %o before native credentials",
    async (proxyConfig, headers) => {
      const credential = vi.fn(token),
        fetcher = vi.fn();
      const response = await proxyConversationHistory(
        bound(headers),
        "list",
        proxyConfig,
        credential,
        fetcher,
      );
      expect(response.status).toBe(400);
      expect(credential).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
