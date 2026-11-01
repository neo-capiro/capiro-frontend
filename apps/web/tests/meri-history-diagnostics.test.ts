import { expect, it, vi } from "vitest";
import { proxyConversationRequest } from "../src/shared/meri-conversations/proxy";
import {
  createHistoryTransportDiagnostics,
  historyTraceHeader,
} from "../src/shared/meri-conversations/history-diagnostics";

const trace = `h1_${"a".repeat(32)}`;
const config = {
  enabled: true,
  baseUrl: "https://control.example.test",
  frontendOrigin: "https://app.example.test",
};
const request = (path = "history") =>
  new Request(`${config.frontendOrigin}/api/conversations/${path}`, {
    method: "POST",
    headers: {
      origin: config.frontendOrigin,
      "content-type": "application/json",
      "x-meri-action-session": `action_session_${"s".repeat(43)}`,
      [historyTraceHeader]: "browser-controlled-secret",
    },
    body: JSON.stringify(path === "history" ? { after: 0, limit: 100 } : {}),
  });
const harness = (write?: (line: string) => void) => {
  const lines: string[] = [];
  const begin = createHistoryTransportDiagnostics({
    write:
      write ??
      ((line) => {
        lines.push(line);
      }),
    newTrace: () => trace,
  });
  return { lines, begin };
};

for (const status of [200, 401, 403, 404, 502])
  it(`preserves upstream ${status} bytes and headers while replacing browser correlation`, async () => {
    const h = harness(),
      body = '{ "syntheticContent": "never-log-this" }';
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        expect(headers.get(historyTraceHeader)).toBe(trace);
        expect(headers.get("authorization")).toBe(
          `Bearer action_session_${"s".repeat(43)}`,
        );
        return new Response(body, {
          status,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        });
      },
    );
    const result = await proxyConversationRequest(
      request(),
      "history",
      config,
      async () => "native-secret",
      fetcher,
      h.begin,
    );
    expect(result.status).toBe(status);
    expect(await result.text()).toBe(body);
    expect([...result.headers]).toEqual([
      ["cache-control", "no-store"],
      ["content-type", "application/json"],
      ["x-content-type-options", "nosniff"],
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(h.lines.map((line) => JSON.parse(line))).toEqual([
      {
        event: "MERI_HISTORY_FE",
        trace,
        stage: "receive",
        outcome: "upstream_response",
        status,
        upstreamStatus: status,
      },
    ]);
  });

for (const kind of ["fetch", "receive"] as const)
  it(`distinguishes ${kind} failure without logging its error or payload`, async () => {
    const h = harness();
    const fetcher = vi.fn(async () => {
      if (kind === "fetch")
        throw new Error("https://secret.invalid/token raw-stack-content");
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error("private response-reader failure"));
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const result = await proxyConversationRequest(
      request(),
      "history",
      config,
      async () => "native-secret",
      fetcher,
      h.begin,
    );
    expect(result.status).toBe(502);
    expect(await result.json()).toEqual({
      error: { code: "CONVERSATION_UNAVAILABLE" },
    });
    expect(h.lines.map((line) => JSON.parse(line))).toEqual([
      {
        event: "MERI_HISTORY_FE",
        trace,
        stage: kind,
        outcome: "failure",
        status: 502,
        upstreamStatus: kind === "fetch" ? 0 : 200,
      },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

it("keeps local refusal distinct and does not fetch", async () => {
  const h = harness(),
    fetcher = vi.fn();
  const result = await proxyConversationRequest(
    request(),
    "history",
    config,
    async () => null,
    fetcher,
    h.begin,
  );
  expect(result.status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
  expect(JSON.parse(h.lines[0]!)).toMatchObject({
    stage: "session",
    outcome: "local_response",
    upstreamStatus: 0,
  });
});

it("does not add tracing to other conversation routes", async () => {
  const begin = vi.fn();
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    expect(new Headers(init?.headers).has(historyTraceHeader)).toBe(false);
    return Response.json({});
  });
  expect(
    (
      await proxyConversationRequest(
        request("cancel"),
        "cancel",
        config,
        async () => "native",
        fetcher,
        begin,
      )
    ).status,
  ).toBe(200);
  expect(begin).not.toHaveBeenCalled();
});

it("diagnostic sink or randomness failure cannot change transport results", async () => {
  for (const begin of [
    harness(() => {
      throw Error("sink failure");
    }).begin,
    createHistoryTransportDiagnostics({
      newTrace() {
        throw Error("random failure");
      },
    }),
  ]) {
    const result = await proxyConversationRequest(
      request(),
      "history",
      config,
      async () => "native",
      async () => Response.json({ ok: true }),
      begin,
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ ok: true });
  }
});

it("bounds volume, emits once, closes enum fields and ignores later stage updates", () => {
  let time = 0;
  const lines: string[] = [],
    begin = createHistoryTransportDiagnostics({
      write: (line) => {
        lines.push(line);
      },
      now: () => time,
      newTrace: () => trace,
    });
  for (let i = 0; i < 25; i++) {
    const d = begin()!;
    d.stage("secret" as never);
    d.received(900);
    d.finish(502, "failure");
    d.stage("fetch");
    d.finish(200, "response");
  }
  expect(lines).toHaveLength(21);
  expect(lines[20]).toBe("MERI_HISTORY_FE_SUPPRESSED");
  expect(JSON.parse(lines[0]!)).toMatchObject({
    stage: "request",
    upstreamStatus: 0,
  });
  time = 60_000;
  begin()!.finish(200, "response");
  expect(lines).toHaveLength(22);
});

it("generates fresh opaque correlation rather than business identifiers", () => {
  const begin = createHistoryTransportDiagnostics();
  const a = begin()!.trace,
    b = begin()!.trace;
  expect(a).toMatch(/^h1_[0-9a-f]{32}$/);
  expect(b).not.toBe(a);
});

it("identifies a configuration 502 before dispatch without adding response headers", async () => {
  const h = harness(),
    fetcher = vi.fn();
  const result = await proxyConversationRequest(
    request(),
    "history",
    { ...config, enabled: false },
    async () => "native",
    fetcher,
    h.begin,
  );
  expect(fetcher).not.toHaveBeenCalled();
  expect(result.status).toBe(502);
  expect(result.headers.has(historyTraceHeader)).toBe(false);
  expect(JSON.parse(h.lines[0]!)).toMatchObject({
    stage: "configuration",
    outcome: "local_response",
    status: 502,
    upstreamStatus: 0,
  });
});
