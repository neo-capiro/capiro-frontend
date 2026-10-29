import { afterEach, describe, expect, it, vi } from "vitest";
import { readActionConfig } from "../src/shared/meri-actions/config";
import { proxyActionRequest } from "../src/shared/meri-actions/proxy";

const origin = "https://frontend.example.test";
const actionSession = `action_session_${"a".repeat(43)}`;
/** What Meri receives; the browser never sends a bearer to the proxy. */
const actionBearer = `Bearer ${actionSession}`;
const env = {
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "sk_test_synthetic",
  MERI_ACTION_WORKFLOW_ENABLED: "true",
};
const config = readActionConfig(env);
const request = (operation = "query", init: RequestInit = {}, suffix = "") =>
  new Request(`${origin}/api/action-followthrough/${operation}${suffix}`, {
    method: "POST",
    body: "{}",
    ...init,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Meri-Action-Session": actionSession,
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });

it("routine management bootstrap forwards only the exact public path with the native identity token", async () => {
  const native = vi.fn(async () => "native-management"),
    fetcher = vi.fn<typeof fetch>(async (path, init) => {
      expect(path).toBe("https://meri.example.test/api/routines/session");
      expect(init?.headers).toMatchObject({
        Authorization: "Bearer native-management",
      });
      expect(JSON.parse(String(init?.body))).toEqual({ clientId: null });
      return Response.json({ receipt: "synthetic" });
    });
  expect(
    (
      await proxyActionRequest(
        request("routine-session", {
          body: JSON.stringify({ clientId: null }),
        }),
        "routine-session",
        config,
        native,
        fetcher,
      )
    ).status,
  ).toBe(200);
  expect(native).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledOnce();
});

it.each([
  { clientId: null, conversationId: "forged" },
  { clientId: null, runId: "forged" },
  { clientId: null, versions: {} },
  { clientId: null, policyRevision: "forged" },
])(
  "management proxy rejects extra selectors before forwarding %j",
  async (body) => {
    const fetcher = vi.fn<typeof fetch>();
    expect(
      (
        await proxyActionRequest(
          request("routine-session", { body: JSON.stringify(body) }),
          "routine-session",
          config,
          async () => "native",
          fetcher,
        )
      ).status,
    ).toBe(502);
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("a management credential is forwarded only for admitted routine operations, never ordinary action execution", async () => {
  const credential = `routine_session_${"m".repeat(43)}`,
    fetcher = vi.fn<typeof fetch>(async (_path, init) => {
      expect(init?.headers).toMatchObject({
        Authorization: `Bearer ${credential}`,
      });
      return Response.json({});
    });
  const managementRequest = (route: string) => {
    const input = request(route);
    input.headers.set("X-Meri-Action-Session", credential);
    return input;
  };
  expect(
    (
      await proxyActionRequest(
        managementRequest("routine-list"),
        "routine-list",
        config,
        async () => "native",
        fetcher,
      )
    ).status,
  ).toBe(200);
  expect(fetcher).toHaveBeenCalledOnce();
  for (const route of ["query", "draft", "prepare", "execute"])
    expect(
      (
        await proxyActionRequest(
          managementRequest(route),
          route,
          config,
          async () => "native",
          fetcher,
        )
      ).status,
    ).toBe(401);
  expect(fetcher).toHaveBeenCalledOnce();
});

it("rejects duplicate opaque session headers without sending anything to Meri", async () => {
  const input = request("query");
  input.headers.append("X-Meri-Action-Session", actionSession);
  const native = vi.fn(async () => "native-token");
  const fetcher = vi.fn<typeof fetch>();
  await expectUnavailable(
    await proxyActionRequest(input, "query", config, native, fetcher),
    401,
  );
  expect(native).toHaveBeenCalledOnce();
  expect(fetcher).not.toHaveBeenCalled();
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}
async function expectUnavailable(response: Response, status: number) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({
    error: { code: "FRONTEND_ACTION_UNAVAILABLE" },
  });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
}
afterEach(() => vi.useRealTimers());

describe("Meri action configuration and exact admission", () => {
  it.each([undefined, "false", "TRUE", "1", " true "])(
    "stays off for nonliteral opt-in %s without authentication or fetch",
    async (enabled) => {
      const token = vi.fn(async () => "native-token");
      const fetcher = vi.fn(async () => Response.json({}));
      const disabled = readActionConfig({
        ...env,
        MERI_ACTION_WORKFLOW_ENABLED: enabled,
      });
      expect(disabled.enabled).toBe(false);
      await expectUnavailable(
        await proxyActionRequest(request(), "query", disabled, token, fetcher),
        503,
      );
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each([
    { MERI_API_BASE_URL: undefined },
    { MERI_API_BASE_URL: "http://remote.example.test" },
    { MERI_API_BASE_URL: "https://user:secret@meri.example.test" },
    { MERI_API_BASE_URL: "https://meri.example.test?tenant=browser" },
    { CLERK_SECRET_KEY: undefined },
    { CLERK_SECRET_KEY: "sk_live_other" },
    { CORE_API_BASE_URL: undefined },
  ])("fails configuration closed for %j", (change) => {
    expect(readActionConfig({ ...env, ...change }).enabled).toBe(false);
  });
  it.each(["approve", "QUERY", "%71uery", "query/execute", "../execute"])(
    "refuses unallocated operation %s before credentials",
    async (operation) => {
      const token = vi.fn(async () => "native-token");
      const fetcher = vi.fn(async () => Response.json({}));
      await expectUnavailable(
        await proxyActionRequest(request(), operation, config, token, fetcher),
        404,
      );
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["method", { method: "PUT" }, "", 405],
    ["query", {}, "?clientId=browser", 400],
    ["compression", { headers: { "Content-Encoding": "gzip" } }, "", 400],
    [
      "foreign origin",
      { headers: { Origin: "https://foreign.test" } },
      "",
      400,
    ],
    ["missing origin", { headers: { Origin: "" } }, "", 400],
  ] as const)(
    "refuses %s before credentials",
    async (_name, init, suffix, status) => {
      const token = vi.fn(async () => "native-token");
      const fetcher = vi.fn(async () => Response.json({}));
      await expectUnavailable(
        await proxyActionRequest(
          request("query", init, suffix),
          "query",
          config,
          token,
          fetcher,
        ),
        status,
      );
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("does not broaden a decoded operation into an encoded path alias", async () => {
    const token = vi.fn(async () => "native-token");
    const fetcher = vi.fn(async () => Response.json({}));
    await expectUnavailable(
      await proxyActionRequest(
        request("%71uery"),
        "query",
        config,
        token,
        fetcher,
      ),
      400,
    );
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("Meri proxy credentials, response dispositions and bounded bodies", () => {
  it.each(["session", "query", "draft", "prepare", "execute"])(
    "forwards only the allocated %s route and correct bearer without ambient headers",
    async (operation) => {
      const token = vi.fn(async () => "native-capiro-template-token");
      const text =
        '{"error":{"code":"COMMAND_COMMIT_UNCERTAIN","outcome":"UNKNOWN"}}';
      const fetcher = vi.fn<typeof fetch>(
        async () =>
          new Response(text, {
            status: 502,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": "private=upstream",
              Location: "https://private.test",
              "X-Provider-Secret": "private",
            },
          }),
      );
      const response = await proxyActionRequest(
        request(operation, {
          headers: {
            Cookie: "native-session=browser",
            "X-Tenant-Id": "browser-tenant",
            "X-Approval": "approved",
            "X-Native-Token": "browser-native",
          },
        }),
        operation,
        config,
        token,
        fetcher,
      );
      expect(response.status).toBe(502);
      expect(await response.text()).toBe(text);
      expect(token).toHaveBeenCalledOnce();
      expect(fetcher).toHaveBeenCalledOnce();
      const [url, init] = fetcher.mock.calls[0]!;
      expect(url).toBe(
        `https://meri.example.test/api/action-followthrough/${operation}`,
      );
      expect(init).toMatchObject({
        method: "POST",
        body: "{}",
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            operation === "session"
              ? "Bearer native-capiro-template-token"
              : actionBearer,
        },
      });
      expect(Object.keys(init!.headers!)).toHaveLength(2);
      expect(init!.signal).toBeInstanceOf(AbortSignal);
      expect([...response.headers.keys()].sort()).toEqual([
        "cache-control",
        "content-type",
        "x-content-type-options",
      ]);
    },
  );
  it.each([
    "native-token",
    "action_session_short",
    `Bearer action_session_${"a".repeat(43)}`,
    `action_session_${"a".repeat(44)}`,
    "",
  ])(
    "does not substitute native credentials for an invalid action session %s",
    async (session) => {
      const fetcher = vi.fn(async () => Response.json({}));
      await expectUnavailable(
        await proxyActionRequest(
          request("execute", { headers: { "X-Meri-Action-Session": session } }),
          "execute",
          config,
          async () => "native-token",
          fetcher,
        ),
        401,
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  // Clerk's auth() prefers a bearer Authorization header to the session cookie and would read the
  // opaque session as signed out, so the proxy never admits a browser bearer on any route.
  it.each(["session", "query", "execute"])(
    "refuses a browser Authorization header on %s before Clerk or dispatch",
    async (operation) => {
      const token = vi.fn(async () => "native-token");
      const fetcher = vi.fn(async () => Response.json({}));
      for (const bearer of [actionBearer, "Bearer native-token", "Basic abc"])
        await expectUnavailable(
          await proxyActionRequest(
            request(operation, { headers: { Authorization: bearer } }),
            operation,
            config,
            token,
            fetcher,
          ),
          400,
        );
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("requires the current native session even when an action bearer is present", async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    await expectUnavailable(
      await proxyActionRequest(
        request(),
        "query",
        config,
        async () => null,
        fetcher,
      ),
      401,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { body: '{"tenantId":"browser-authority"}' },
    { body: '{"clientId":"not-a-uuid"}' },
    { body: "{}", headers: { "Content-Type": "text/plain" } },
    { body: "{}", headers: { "Content-Length": "4097" } },
    { body: JSON.stringify({ clientId: "é".repeat(2100) }) },
    { body: " ".repeat(4096) + "{}" },
  ] as RequestInit[])(
    "refuses invalid/oversized session body before upstream dispatch %j",
    async (init) => {
      const fetcher = vi.fn(async () => Response.json({}));
      await expectUnavailable(
        await proxyActionRequest(
          request("session", init),
          "session",
          config,
          async () => "native-token",
          fetcher,
        ),
        502,
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each([
    () =>
      new Response(new Uint8Array([0xc3, 0x28]), {
        headers: { "Content-Type": "application/json" },
      }),
    () => new Response("{}", { headers: { "Content-Type": "text/html" } }),
    () =>
      new Response("{}", {
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "4097",
        },
      }),
  ])(
    "withholds malformed upstream bodies without inventing a dispatch outcome",
    async (reply) => {
      const fetcher = vi.fn(async () => reply());
      await expectUnavailable(
        await proxyActionRequest(
          request("session"),
          "session",
          config,
          async () => "native-token",
          fetcher,
        ),
        502,
      );
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it.each([
    { "Content-Type": "text/html" },
    { "Content-Type": "application/json", "Content-Length": "4097" },
  ] as Record<string, string>[])(
    "releases an upstream body rejected by its headers %j",
    async (responseHeaders) => {
      const cancel = vi.fn();
      const upstream = new Response(
        new ReadableStream<Uint8Array>({ cancel }),
        {
          headers: responseHeaders,
        },
      );
      try {
        await expectUnavailable(
          await proxyActionRequest(
            request("session"),
            "session",
            config,
            async () => "native-token",
            async () => upstream,
          ),
          502,
        );
        expect(cancel).toHaveBeenCalledOnce();
      } finally {
        await upstream.body?.cancel();
      }
    },
  );
});

describe("Meri proxy request lifetime", () => {
  it("does not authenticate or dispatch an already cancelled request", async () => {
    const lifetime = new AbortController();
    lifetime.abort();
    const token = vi.fn(async () => "native-token");
    const fetcher = vi.fn(async () => Response.json({}));
    await expectUnavailable(
      await proxyActionRequest(
        request("query", { signal: lifetime.signal }),
        "query",
        config,
        token,
        fetcher,
      ),
      502,
    );
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("deadline releases a parked native-token lookup and forbids its late dispatch", async () => {
    vi.useFakeTimers();
    const hold = deferred<string>();
    const fetcher = vi.fn(async () => Response.json({}));
    const pending = proxyActionRequest(
      request(),
      "query",
      config,
      () => hold.promise,
      fetcher,
    );
    await vi.advanceTimersByTimeAsync(30_000);
    await expectUnavailable(await pending, 502);
    hold.resolve("late-native-token");
    await Promise.resolve();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("aborts a parked dispatched request without manufacturing NOT_DISPATCHED or retrying", async () => {
    const lifetime = new AbortController();
    const entered = deferred<AbortSignal>();
    const hold = deferred<Response>();
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        entered.resolve(init!.signal!);
        return hold.promise;
      },
    );
    const pending = proxyActionRequest(
      request("execute", { signal: lifetime.signal }),
      "execute",
      config,
      async () => "native-token",
      fetcher,
    );
    const signal = await entered.promise;
    lifetime.abort();
    await expectUnavailable(await pending, 502);
    expect(signal.aborted).toBe(true);
    hold.resolve(Response.json({ privateLateReceipt: true }));
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("deadline cancels a parked response stream after headers without leaking upstream state", async () => {
    vi.useFakeTimers();
    const entered = deferred<void>();
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull() {
          entered.resolve();
        },
        cancel,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
    const fetcher = vi.fn(async () => response);
    const pending = proxyActionRequest(
      request(),
      "query",
      config,
      async () => "native-token",
      fetcher,
    );
    await entered.promise;
    await vi.advanceTimersByTimeAsync(30_000);
    await expectUnavailable(await pending, 502);
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe("standalone bind address behind the ALB", () => {
  // Next builds request.url from HOSTNAME/PORT (https://0.0.0.0:5188), never the public host.
  const publicOrigin = "https://app.capiro.ai";
  const configured = readActionConfig({
    ...env,
    CAPIRO_REQUEST_ORIGIN: publicOrigin,
  });
  const bound = (headers: Record<string, string> = {}) =>
    new Request("https://0.0.0.0:5188/api/action-followthrough/session", {
      method: "POST",
      body: "{}",
      headers: {
        Origin: publicOrigin,
        "Content-Type": "application/json",
        Host: "app.capiro.ai",
        "X-Forwarded-Proto": "https",
        ...headers,
      },
    });
  it("admits the configured public origin although request.url names the bind address", async () => {
    expect(configured.requestOrigin).toBe(publicOrigin);
    const token = vi.fn(async () => "native-token");
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({}));
    const response = await proxyActionRequest(
      bound(),
      "session",
      configured,
      token,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(token).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("still compares against request.url when no origin is configured", async () => {
    const token = vi.fn(async () => "native-token");
    const fetcher = vi.fn();
    await expectUnavailable(
      await proxyActionRequest(bound(), "session", config, token, fetcher),
      400,
    );
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["https://foreign.test", "https://0.0.0.0:5188", "null", ""])(
    "rejects Origin %s against the configured origin despite a matching Host",
    async (value) => {
      const token = vi.fn(async () => "native-token");
      const fetcher = vi.fn();
      await expectUnavailable(
        await proxyActionRequest(
          bound({ Origin: value }),
          "session",
          configured,
          token,
          fetcher,
        ),
        400,
      );
      expect(token).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("fails closed on an invalid configured origin", async () => {
    const invalid = readActionConfig({
      ...env,
      CAPIRO_REQUEST_ORIGIN: "https://0.0.0.0:5188",
    });
    expect(invalid.requestOrigin).toBeNull();
    const fetcher = vi.fn();
    await expectUnavailable(
      await proxyActionRequest(
        bound({ Origin: "https://0.0.0.0:5188" }),
        "session",
        invalid,
        vi.fn(async () => "native-token"),
        fetcher,
      ),
      400,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
