import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ConversationNetwork,
  ConversationUnavailable,
  RECONNECT_RENEW_LEAD_MS,
} from "../../../packages/meri-client/src/conversation-network";
import { SessionLifetimeController } from "../src/shared/meri-actions/opaque-session-controller";

// SYNTHETIC: an event-stream (re)connect renews a credential that is about to expire, and a stream 403 SESSION_REFUSED
// (control no longer holds the credential) asks the session owner to renew instead of revoking. No real service.
const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  conversationId: "20000000-0000-4000-8000-000000000002",
  runId: "30000000-0000-4000-8000-000000000003",
  selectedClientId: null,
};
const STREAM =
  "/api/conversations/events/20000000-0000-4000-8000-000000000002/stream";
const envelope = (code: string, status = 403) =>
  new Response(JSON.stringify({ error: { code } }), {
    status,
    headers: { "content-type": "application/json" },
  });
const stream = () =>
  new Response("", {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T14:20:00Z"));
});
afterEach(() => vi.useRealTimers());

function network({
  answer,
  renewal = () => true,
  ttl = 60_000,
  withRenewal = true,
}: {
  answer: () => Response;
  renewal?: (reason: "near-expiry" | "refused") => boolean;
  ttl?: number;
  withRenewal?: boolean;
}) {
  const onAccessLost = vi.fn();
  const requestRenewal = vi.fn(renewal);
  const onDispose = vi.fn();
  const fetchImpl = vi.fn(async () => answer()) as unknown as typeof fetch;
  const owner = new AbortController();
  const net = new ConversationNetwork(
    {
      context,
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + ttl,
      signal: owner.signal,
      isCurrent: () => true,
      onAccessLost,
      ...(withRenewal ? { requestRenewal } : {}),
      fetchImpl,
    },
    onDispose,
  );
  const reconnect = () => net.observe(STREAM, { method: "GET" });
  return { net, reconnect, onAccessLost, requestRenewal, onDispose, fetchImpl };
}
const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (cause) {
    return cause as ConversationUnavailable;
  }
  throw new Error("expected a rejection");
};

it("a reconnect at or near the credential's expiry renews first and dispatches nothing", async () => {
  const n = network({ answer: stream });
  await vi.advanceTimersByTimeAsync(60_000 - RECONNECT_RENEW_LEAD_MS);
  const cause = await rejection(n.reconnect());
  expect(cause.code).toBe("session-renewing");
  expect(n.requestRenewal).toHaveBeenCalledExactlyOnceWith("near-expiry");
  expect(n.fetchImpl).not.toHaveBeenCalled();
  expect(n.onAccessLost).not.toHaveBeenCalled();
  expect(n.onDispose).toHaveBeenCalledOnce();
});

it("well inside its lifetime, or while the owner declines (a write in flight), the reconnect dispatches as before", async () => {
  const fresh = network({ answer: stream });
  await vi.advanceTimersByTimeAsync(60_000 - RECONNECT_RENEW_LEAD_MS - 1);
  expect((await fresh.reconnect()).status).toBe(200);
  expect(fresh.requestRenewal).not.toHaveBeenCalled();
  const busy = network({ answer: stream, renewal: () => false });
  await vi.advanceTimersByTimeAsync(60_000 - 1_000);
  expect((await busy.reconnect()).status).toBe(200);
  expect(busy.requestRenewal).toHaveBeenCalledExactlyOnceWith("near-expiry");
  expect(busy.onAccessLost).not.toHaveBeenCalled();
});

it("a fresh short-lived session is never near expiry: the lead is at most a quarter of its lifetime", async () => {
  const short = network({ answer: stream, ttl: 8_000 });
  expect((await short.reconnect()).status).toBe(200);
  expect(short.requestRenewal).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(6_000);
  expect((await rejection(short.reconnect())).code).toBe("session-renewing");
});

it("a stream 403 SESSION_REFUSED asks for renewal instead of revoking", async () => {
  const n = network({ answer: () => envelope("SESSION_REFUSED") });
  const cause = await rejection(n.reconnect());
  expect(cause).toBeInstanceOf(ConversationUnavailable);
  expect(cause.code).toBe("SESSION_REFUSED");
  expect(cause.status).toBe(403);
  expect(n.requestRenewal).toHaveBeenCalledExactlyOnceWith("refused");
  expect(n.onAccessLost).not.toHaveBeenCalled();
  expect(n.onDispose).toHaveBeenCalledOnce();
  // The disposed connection dispatches nothing more.
  await expect(n.reconnect()).rejects.toBeInstanceOf(ConversationUnavailable);
  expect(n.fetchImpl).toHaveBeenCalledOnce();
});

it("every other stream refusal still revokes: another 403 code, an edge page, a 401, or no owner renewal", async () => {
  for (const answer of [
    () => envelope("SCOPE_REFUSED"),
    () => envelope("SESSION_CHANGED"),
    () =>
      new Response("<html>Forbidden</html>", {
        status: 403,
        headers: { "content-type": "text/html" },
      }),
    () => envelope("SESSION_REFUSED", 401),
  ]) {
    const n = network({ answer });
    await expect(n.reconnect()).rejects.toBeInstanceOf(ConversationUnavailable);
    expect(n.requestRenewal).not.toHaveBeenCalled();
    expect(n.onAccessLost).toHaveBeenCalledOnce();
  }
  const declined = network({
    answer: () => envelope("SESSION_REFUSED"),
    renewal: () => false,
  });
  await expect(declined.reconnect()).rejects.toBeInstanceOf(
    ConversationUnavailable,
  );
  expect(declined.requestRenewal).toHaveBeenCalledExactlyOnceWith("refused");
  expect(declined.onAccessLost).toHaveBeenCalledOnce();
  const unowned = network({
    answer: () => envelope("SESSION_REFUSED"),
    withRenewal: false,
  });
  await expect(unowned.reconnect()).rejects.toBeInstanceOf(
    ConversationUnavailable,
  );
  expect(unowned.onAccessLost).toHaveBeenCalledOnce();
});

function owner(busy: () => boolean) {
  const port = { dispose: vi.fn() };
  let lifetime!: {
    requestRenewal: (reason: "near-expiry" | "refused") => boolean;
  };
  const host = new SessionLifetimeController({
    issue: async () => ({ expiresAtMs: Date.now() + 60_000, context: {} }),
    createPort: (value) => {
      lifetime = value;
      return port;
    },
    busy,
  });
  return { host, port, lifetime: () => lifetime };
}

it("the session owner renews a near-expiry request unless busy, and always renews a refused credential", async () => {
  let busy = true;
  const o = owner(() => busy);
  const detach = o.host.attach();
  try {
    await o.host.connect();
    expect(o.lifetime().requestRenewal("near-expiry")).toBe(false);
    expect(o.host.getSnapshot().status).toBe("ready");
    busy = false;
    expect(o.lifetime().requestRenewal("near-expiry")).toBe(true);
    expect(o.host.getSnapshot().status).toBe("expired");
    expect(o.host.getExpirationReason()).toBe("renewal");
    // A stale port of an ended lifetime cannot end the next one.
    const stale = o.lifetime();
    await o.host.connect();
    expect(stale.requestRenewal("refused")).toBe(false);
    expect(o.host.getSnapshot().status).toBe("ready");
    busy = true;
    expect(o.lifetime().requestRenewal("refused")).toBe(true);
    expect(o.host.getExpirationReason()).toBe("refused");
    expect(o.port.dispose).toHaveBeenCalledTimes(2);
  } finally {
    detach();
  }
});
