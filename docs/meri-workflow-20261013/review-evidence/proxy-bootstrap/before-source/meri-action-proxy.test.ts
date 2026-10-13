import { afterEach, describe, expect, it, vi } from "vitest";
import { readActionConfig } from "../src/shared/meri-actions/config";
import { proxyActionRequest } from "../src/shared/meri-actions/proxy";

const origin = "https://frontend.example.test";
const actionBearer = `Bearer action_session_${"a".repeat(43)}`;
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
      Authorization: actionBearer,
      ...Object.fromEntries(new Headers(init.headers)),
    },
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
      const fetcher = vi.fn(
        async (_url: RequestInfo | URL, _init?: RequestInit) =>
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
    "Bearer native-token",
    "Bearer action_session_short",
    "Basic abc",
    "",
  ])(
    "does not substitute native credentials for an invalid action bearer %s",
    async (authorization) => {
      const fetcher = vi.fn(async () => Response.json({}));
      await expectUnavailable(
        await proxyActionRequest(
          request("execute", { headers: { Authorization: authorization } }),
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
  ])(
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
