import { afterEach, describe, expect, it, vi } from "vitest";
import { BROWSER_VIEWER_SCHEMA as schema } from "@capiro/meri-contracts/browser-viewer";
import { createBrowserViewerTransport } from "../src/shared/meri-browser/transport";
import { BrowserViewerController } from "../src/shared/meri-browser/viewer-controller";
import { proxyBrowserViewerRequest } from "../src/shared/meri-browser/proxy";
const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const context = {
  tenantId: id(1),
  actorId: id(2),
  conversationId: id(3),
  runId: id(4),
  selectedClientId: null,
};
const credential = `action_session_${"a".repeat(43)}`;
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=";
const signal = () => new AbortController().signal;
const lifetimes: AbortController[] = [];
afterEach(() => {
  lifetimes.splice(0).forEach((life) => life.abort());
  vi.useRealTimers();
});
function fixture() {
  const lifetime = new AbortController();
  lifetimes.push(lifetime);
  let user = true,
    sequence = 10,
    lostInput = false,
    access = true;
  const lease = {
    viewerId: id(7),
    leaseEpoch: 1,
    expiresAtMs: 90000,
    connectRequestId: id(8),
  };
  const lost = vi.fn(),
    images = {
      create: vi.fn(() => `blob:frame-${sequence++}`),
      revoke: vi.fn(),
    };
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const route = String(url).split("/").at(-1),
      request = JSON.parse(String(init?.body));
    const base = {
      schema,
      context,
      ownerId: id(5),
      requestId: request.requestId,
    };
    if (route === "read")
      return Response.json({
        schema,
        context,
        binding: {
          tenantId: context.tenantId,
          actorId: context.actorId,
          conversationId: context.conversationId,
          runId: context.runId,
          attemptId: id(20),
          workerId: id(21),
          writerFence: 1,
        },
        checkpoint: {
          checkpointId: context.runId,
          checkpointSha256: "a".repeat(64),
        },
        ownerId: id(5),
        state: user ? "user" : "returning",
        lease: user ? lease : null,
        pages: user ? [{ pageId: id(9), origin: "https://example.test" }] : [],
      });
    if (route === "frame")
      return Response.json({
        ...base,
        viewerId: lease.viewerId,
        leaseEpoch: lease.leaseEpoch,
        frame: {
          frameId: "F".repeat(43),
          pageId: id(9),
          width: 1,
          height: 1,
          image: { mimeType: "image/png", data: png },
        },
      });
    if (route === "input") {
      if (lostInput) throw new Error("lost ACK");
      return Response.json({
        ...base,
        viewerId: lease.viewerId,
        leaseEpoch: 1,
        accepted: true,
      });
    }
    if (route === "release") {
      user = false;
      return Response.json({
        ...base,
        viewerId: lease.viewerId,
        leaseEpoch: 1,
        state: "returning",
      });
    }
    if (route === "ticket")
      return Response.json({
        ...base,
        ticket: "T".repeat(43),
        expiresAtMs: 5000,
      });
    if (route === "connect") {
      lease.connectRequestId = request.requestId;
      return Response.json({ ...base, state: "user", lease });
    }
    throw new Error("Unexpected route");
  });
  const transport = createBrowserViewerTransport({
    credential,
    context: { ...context, scopeKind: "general" } as typeof context,
    lifetime: lifetime.signal,
    isCurrent: () => access,
    onAccessLost: lost,
    fetcher,
  });
  const controller = new BrowserViewerController({
    transport,
    lifetime: lifetime.signal,
    expiresAtMs: 100000,
    now: () => 1000,
    uuid: () => id(sequence++),
    images,
  });
  return {
    controller,
    transport,
    fetcher,
    lifetime,
    images,
    lost,
    loseInput: () => {
      lostInput = true;
    },
    revoke: () => {
      access = false;
    },
    routes: () =>
      fetcher.mock.calls.map((call) => String(call[0]).split("/").at(-1)),
  };
}
describe("session-bound browser viewer", () => {
  it("admits a received image but refuses input until that exact frame was displayed", async () => {
    const f = fixture();
    await f.controller.refresh();
    expect(f.controller.getSnapshot().status).toBe("ready");
    await f.controller.input([{ type: "text", text: "private" }]);
    expect(f.routes()).toEqual(["read", "frame"]);
    f.controller.displayed("wrong");
    expect(f.controller.getSnapshot().displayed).toBe(false);
    f.controller.displayed("F".repeat(43));
    await f.controller.input([{ type: "text", text: "private" }]);
    expect(f.routes()).toEqual(["read", "frame", "input", "read", "frame"]);
    const sent = JSON.parse(String(f.fetcher.mock.calls[2]![1]!.body));
    expect(sent).toMatchObject({
      frameId: "F".repeat(43),
      pageId: id(9),
      leaseEpoch: 1,
      events: [{ type: "text", text: "private" }],
    });
    expect(f.controller.getSnapshot()).not.toHaveProperty("events");
  });
  it("recovers a lost input ACK by reading; it never repeats the input", async () => {
    const f = fixture();
    await f.controller.refresh();
    f.controller.displayed("F".repeat(43));
    f.loseInput();
    await f.controller.input([
      { type: "key", action: "down", key: "Enter", shift: false },
    ]);
    expect(f.controller.getSnapshot()).toMatchObject({
      status: "recovery",
      imageUrl: null,
      displayed: false,
    });
    await f.controller.refresh();
    expect(f.routes().filter((route) => route === "input")).toHaveLength(1);
    expect(f.controller.getSnapshot().status).toBe("ready");
  });
  it("return control ends input and stays paused without dispatching resume", async () => {
    const f = fixture();
    await f.controller.refresh();
    await f.controller.release();
    expect(f.controller.getSnapshot()).toMatchObject({
      current: { state: "returning" },
      imageUrl: null,
    });
    expect(f.routes()).toEqual(["read", "frame", "release", "read"]);
  });
  it("session loss clears frame bytes and revokes the displayed URL immediately", async () => {
    const f = fixture();
    await f.controller.refresh();
    f.lifetime.abort();
    expect(f.images.revoke).toHaveBeenCalledOnce();
    expect(f.controller.getSnapshot()).toMatchObject({
      status: "expired",
      current: null,
      frame: null,
      imageUrl: null,
    });
    await f.controller.takeControl();
    expect(f.routes()).toEqual(["read", "frame"]);
  });
  it("rejects mismatched account responses and checks currentness again after receiving", async () => {
    const f = fixture();
    f.fetcher.mockImplementationOnce(async () =>
      Response.json({
        schema,
        context: { ...context, tenantId: id(99) },
        ownerId: null,
        state: "agent",
        lease: null,
        pages: [],
      }),
    );
    await expect(f.transport.request("read", {}, signal())).rejects.toThrow();
    f.fetcher.mockImplementationOnce(async () => {
      f.revoke();
      return Response.json({
        schema,
        context,
        binding: {
          tenantId: context.tenantId,
          actorId: context.actorId,
          conversationId: context.conversationId,
          runId: context.runId,
          attemptId: id(20),
          workerId: id(21),
          writerFence: 1,
        },
        checkpoint: {
          checkpointId: context.runId,
          checkpointSha256: "a".repeat(64),
        },
        ownerId: null,
        state: "agent",
        lease: null,
        pages: [],
      });
    });
    await expect(f.transport.request("read", {}, signal())).rejects.toThrow();
    expect(f.transport.pending()).toBe(false);
  });
  it("consumes a ticket once and follows connection with a current-state read", async () => {
    const f = fixture();
    await f.controller.takeControl();
    expect(f.routes()).toEqual(["ticket", "connect", "read", "frame"]);
    const init = f.fetcher.mock.calls[0]![1]!;
    expect(init).toMatchObject({
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
    });
    expect(new Headers(init.headers).get("x-meri-action-session")).toBe(
      credential,
    );
  });
});
describe("browser viewer forwarding", () => {
  const origin = "https://app.example.test",
    config = {
      enabled: true,
      baseUrl: "https://meri.example.test",
      requestOrigin: origin,
    };
  const request = (route = "read", extra: Record<string, string> = {}) =>
    new Request(`${origin}/api/meri/browser/${route}`, {
      method: "POST",
      headers: {
        origin,
        "Content-Type": "application/json",
        "x-meri-action-session": credential,
        ...extra,
      },
      body: JSON.stringify({ schema }),
    });
  it("requires native sign-in as well as the opaque Meri session", async () => {
    const fetcher = vi.fn();
    const response = await proxyBrowserViewerRequest(
      request(),
      "read",
      config,
      async () => null,
      fetcher,
    );
    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses cross-origin, caller credentials and unlisted operations before forwarding", async () => {
    const fetcher = vi.fn();
    for (const [req, route] of [
      [request("read", { origin: "https://other.test" }), "read"],
      [request("read", { authorization: "Bearer injected" }), "read"],
      [request("resume"), "resume"],
    ] as const) {
      const response = await proxyBrowserViewerRequest(
        req,
        route,
        config,
        async () => "native",
        fetcher,
      );
      expect([400, 404]).toContain(response.status);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses only the configured endpoint and prevents caching of frames", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({
        schema,
        context,
        binding: {
          tenantId: context.tenantId,
          actorId: context.actorId,
          conversationId: context.conversationId,
          runId: context.runId,
          attemptId: id(20),
          workerId: id(21),
          writerFence: 1,
        },
        checkpoint: {
          checkpointId: context.runId,
          checkpointSha256: "a".repeat(64),
        },
        ownerId: null,
        state: "agent",
        lease: null,
        pages: [],
      }),
    );
    const response = await proxyBrowserViewerRequest(
      request(),
      "read",
      config,
      async () => "native",
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetcher.mock.calls[0]![0]).toBe(
      "https://meri.example.test/api/meri/browser/read",
    );
    expect(fetcher.mock.calls[0]![1]!.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: `Bearer ${credential}`,
    });
  });
});
