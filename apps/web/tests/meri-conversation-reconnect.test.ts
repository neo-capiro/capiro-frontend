import { afterEach, expect, it, vi } from "vitest";
import { ConversationHostController } from "../src/shared/meri-conversations/host-controller";

const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-native-user",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000001",
  runId: "30000000-0000-4000-8000-000000000001",
};
const exactHints = {
  clientId: context.selectedClientId,
  conversationId: context.conversationId,
  runId: context.runId,
};
const account = { tenantId: context.tenantId, actorId: context.actorId };
function session(observed = context, ttl = 100) {
  return Response.json({
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + ttl,
    context: observed,
  });
}
function clock() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-15T12:00:00Z"));
}
afterEach(() => vi.useRealTimers());

it("same-host expiry reconnect sends its exact admitted conversation/run", async () => {
  clock();
  const bodies: unknown[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    expect(url).toBe("/api/action-followthrough/session");
    bodies.push(JSON.parse(init!.body as string));
    return session();
  });
  const host = new ConversationHostController({
    hints: { clientId: context.selectedClientId },
    account,
    fetcher,
  });
  const detach = host.attach();
  try {
    await host.connect();
    expect(host.getSnapshot().status).toBe("ready");
    await vi.advanceTimersByTimeAsync(101);
    expect(host.getSnapshot().status).toBe("expired");
    await host.connect();
    expect(host.getSnapshot().status).toBe("ready");
    expect(bodies).toEqual([
      { clientId: context.selectedClientId },
      exactHints,
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  } finally {
    detach();
  }
});

it("a different reconnect run is refused without replacing the original binding", async () => {
  clock();
  const bodies: unknown[] = [];
  const onBound = vi.fn();
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    bodies.push(JSON.parse(init!.body as string));
    return session(
      bodies.length === 2
        ? { ...context, runId: "30000000-0000-4000-8000-000000000002" }
        : context,
    );
  });
  const host = new ConversationHostController({
    hints: { clientId: context.selectedClientId },
    account,
    fetcher,
    onBound,
  });
  const detach = host.attach();
  try {
    await host.connect();
    await vi.advanceTimersByTimeAsync(101);
    await host.connect();
    expect(host.getSnapshot().status).toBe("unavailable");
    expect(onBound).toHaveBeenCalledTimes(1);
    await host.connect();
    expect(host.getSnapshot().status).toBe("ready");
    expect(bodies).toEqual([
      { clientId: context.selectedClientId },
      exactHints,
      exactHints,
    ]);
    expect(onBound).toHaveBeenCalledTimes(2);
  } finally {
    detach();
  }
});

it("a refused first account cannot install reconnect hints", async () => {
  clock();
  const bodies: unknown[] = [];
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    bodies.push(JSON.parse(init!.body as string));
    return session(
      bodies.length === 1 ? { ...context, actorId: "foreign-user" } : context,
    );
  });
  const host = new ConversationHostController({
    hints: { clientId: context.selectedClientId },
    account,
    fetcher,
  });
  const detach = host.attach();
  try {
    await host.connect();
    expect(host.getSnapshot().status).toBe("unavailable");
    await host.connect();
    expect(host.getSnapshot().status).toBe("ready");
    expect(bodies).toEqual([
      { clientId: context.selectedClientId },
      { clientId: context.selectedClientId },
    ]);
  } finally {
    detach();
  }
});
