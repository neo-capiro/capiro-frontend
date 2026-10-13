import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrapActionSession } from "../src/shared/meri-actions/session-bootstrap";

const now = 1_800_000_000_000;
const clientId = "10000000-0000-4000-8000-000000000001";
const conversationId = "10000000-0000-4000-8000-000000000002";
const runId = "10000000-0000-4000-8000-000000000003";
const otherId = "10000000-0000-4000-8000-000000000004";
const receipt = () => ({
  credential: `action_session_${"x".repeat(43)}`,
  expiresAtMs: now + 60_000,
  context: {
    tenantId: "tenant-native",
    actorId: "actor-native-é",
    conversationId,
    runId,
    selectedClientId: clientId,
  },
});
const signal = () => new AbortController().signal;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}
afterEach(() => vi.useRealTimers());

describe("Meri bootstrap captures hints without inventing authority", () => {
  it("uses only the literal same-origin session POST and returns a frozen server context", async () => {
    const native = receipt();
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        Response.json(native),
    );
    const received = await bootstrapActionSession(
      { clientId, conversationId, runId },
      signal(),
      fetcher,
      () => now,
    );
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("/api/action-followthrough/session");
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ conversationId, runId, clientId }),
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
    });
    expect(Object.keys(init!.headers!)).toEqual(["Content-Type"]);
    expect(received).toEqual(native);
    expect(Object.isFrozen(received)).toBe(true);
    expect(Object.isFrozen(received.context)).toBe(true);
    expect(received.context.actorId).not.toBe("clerk-browser-user");
  });
  it("allows omitted hints so the actual host selects context rather than constructing local IDs", async () => {
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        Response.json(receipt()),
    );
    expect(
      (await bootstrapActionSession({}, signal(), fetcher, () => now)).context
        .runId,
    ).toBe(runId);
    expect(fetcher.mock.calls[0]![1]!.body).toBe("{}");
  });
  it.each([
    { clientId: "not-a-uuid" },
    { conversationId: "not-a-uuid" },
    { runId: "not-a-uuid" },
    { clientId, tenantId: "browser-tenant" },
    { actorId: "browser-actor", approval: "approved" },
  ])(
    "rejects malformed or authority-bearing hints before fetch %j",
    async (hints) => {
      const fetcher = vi.fn(async () => Response.json(receipt()));
      await expect(
        bootstrapActionSession(hints, signal(), fetcher, () => now),
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each(["clientId", "conversationId", "runId"] as const)(
    "rejects a coherent server receipt for the wrong captured %s",
    async (key) => {
      const hints = { clientId, conversationId, runId };
      const native = receipt();
      if (key === "clientId") native.context.selectedClientId = otherId;
      else native.context[key] = otherId;
      await expect(
        bootstrapActionSession(
          hints,
          signal(),
          async () => Response.json(native),
          () => now,
        ),
      ).rejects.toThrow("Action context mismatch");
    },
  );
  it("captures hint values before a held request and refuses post-dispatch substitution", async () => {
    const hold = deferred<Response>();
    const hints = { clientId, conversationId, runId };
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) => hold.promise,
    );
    const pending = bootstrapActionSession(hints, signal(), fetcher, () => now);
    hints.clientId = otherId;
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string).clientId).toBe(
      clientId,
    );
    hold.resolve(
      Response.json({
        ...receipt(),
        context: { ...receipt().context, selectedClientId: otherId },
      }),
    );
    await expect(pending).rejects.toThrow("Action context mismatch");
  });
});

describe("Meri bootstrap admits only the bounded canonical receipt", () => {
  it.each([
    { credential: "native-clerk-token" },
    { credential: `action_session_${"x".repeat(44)}` },
    { credential: `action_session_${"x".repeat(42)}+` },
    { expiresAtMs: now },
    { expiresAtMs: now - 1 },
    { expiresAtMs: now + 300_001 },
    { expiresAtMs: now + 0.5 },
    { expiresAtMs: Number.MAX_SAFE_INTEGER + 1 },
    { authority: "browser-approved" },
    { context: { ...receipt().context, actorId: "" } },
    { context: { ...receipt().context, selectedClientId: "not-a-uuid" } },
    { context: { ...receipt().context, approval: "approved" } },
  ])("rejects malformed/expired/expanded receipt %j", async (change) => {
    const fetcher = vi.fn(async () =>
      Response.json({ ...receipt(), ...change }),
    );
    await expect(
      bootstrapActionSession({}, signal(), fetcher, () => now),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("uses the clock after receiving, so a receipt expiring during a held fetch is rejected", async () => {
    const hold = deferred<Response>();
    let current = now;
    const pending = bootstrapActionSession(
      {},
      signal(),
      () => hold.promise,
      () => current,
    );
    current = now + 60_000;
    hold.resolve(Response.json(receipt()));
    await expect(pending).rejects.toThrow("Action session is unavailable");
  });
  it.each([401, 403, 409, 502])(
    "keeps session error %s separate from action outcomes without leaking credentials",
    async (status) => {
      const fetcher = vi.fn(async () =>
        Response.json(
          {
            error: {
              code: "PRIVATE_SESSION_DETAIL",
              credential: receipt().credential,
            },
          },
          { status },
        ),
      );
      await expect(
        bootstrapActionSession({}, signal(), fetcher, () => now),
      ).rejects.toThrow(/^Action session unavailable$/);
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it("decodes a split UTF-8 sequence without corrupting the returned actor", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(receipt()));
    const split = bytes.indexOf(0xc3) + 1;
    expect(split).toBeGreaterThan(0);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, split));
        controller.enqueue(bytes.slice(split));
        controller.close();
      },
    });
    const actual = await bootstrapActionSession(
      {},
      signal(),
      async () =>
        new Response(stream, {
          headers: { "Content-Type": "application/json" },
        }),
      () => now,
    );
    expect(actual.context.actorId).toBe(receipt().context.actorId);
  });
  it.each([
    () =>
      new Response(new Uint8Array([0xc3, 0x28]), {
        headers: { "Content-Type": "application/json" },
      }),
    () =>
      new Response(JSON.stringify(receipt()), {
        headers: { "Content-Type": "text/plain" },
      }),
    () =>
      new Response(JSON.stringify(receipt()), {
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "4097",
        },
      }),
    () =>
      new Response(" ".repeat(4096) + JSON.stringify(receipt()), {
        headers: { "Content-Type": "application/json" },
      }),
  ])(
    "rejects invalid encoding/type/declared or streamed byte overflow without retry",
    async (reply) => {
      const fetcher = vi.fn(async () => reply());
      await expect(
        bootstrapActionSession({}, signal(), fetcher, () => now),
      ).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
});

describe("Meri bootstrap cancellation and deadline", () => {
  it("releases the response body when advertised size is refused before reading", async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream<Uint8Array>({ cancel }), {
      headers: { "Content-Type": "application/json", "Content-Length": "4097" },
    });
    try {
      await expect(
        bootstrapActionSession(
          {},
          signal(),
          async () => response,
          () => now,
        ),
      ).rejects.toThrow("receiving limit");
      expect(cancel).toHaveBeenCalledOnce();
    } finally {
      await response.body?.cancel();
    }
  });
  it("never fetches after an already disposed lifetime", async () => {
    const lifetime = new AbortController();
    lifetime.abort();
    const fetcher = vi.fn(async () => Response.json(receipt()));
    await expect(
      bootstrapActionSession({}, lifetime.signal, fetcher, () => now),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects a late valid receipt after principal/client disposal without another fetch", async () => {
    const lifetime = new AbortController();
    const hold = deferred<Response>();
    let receivingSignal!: AbortSignal;
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        receivingSignal = init!.signal!;
        return hold.promise;
      },
    );
    const pending = bootstrapActionSession(
      { clientId },
      lifetime.signal,
      fetcher,
      () => now,
    );
    const rejected = expect(pending).rejects.toThrow();
    lifetime.abort();
    await rejected;
    expect(receivingSignal.aborted).toBe(true);
    hold.resolve(Response.json(receipt()));
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("deadline includes a parked fetch and never automatically reissues bootstrap", async () => {
    vi.useFakeTimers();
    const hold = deferred<Response>();
    let receivingSignal!: AbortSignal;
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        receivingSignal = init!.signal!;
        return hold.promise;
      },
    );
    const rejected = expect(
      bootstrapActionSession({}, signal(), fetcher, () => now),
    ).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(30_000);
    await rejected;
    expect(receivingSignal.aborted).toBe(true);
    hold.resolve(Response.json(receipt()));
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("deadline cancels a stalled response body even after successful headers", async () => {
    vi.useFakeTimers();
    const entered = deferred<void>();
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        entered.resolve();
      },
      cancel,
    });
    const fetcher = vi.fn(
      async () =>
        new Response(stream, {
          headers: { "Content-Type": "application/json" },
        }),
    );
    const rejected = expect(
      bootstrapActionSession({}, signal(), fetcher, () => now),
    ).rejects.toThrow();
    await entered.promise;
    await vi.advanceTimersByTimeAsync(30_000);
    await rejected;
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
