import { expect, it, vi } from "vitest";
import { installPlatform } from "./command-recovery-platform";
import { standaloneTaskRecovery } from "../src/shared/meri-actions/task-recovery";
import { bootstrapTaskRecoverySession } from "../src/shared/meri-actions/task-recovery-session";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { readFirstChatIntent } from "../src/shared/meri-conversations/first-chat-intent";
import type {
  FirstChatCoreRequest,
  FirstChatV2Request,
} from "../src/shared/capiro/operations/meri-first-chat";

installPlatform();
const context = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
  selectedClientId: "33333333-3333-4333-8333-333333333333",
  conversationId: "55555555-5555-4555-8555-555555555555",
  runId: "66666666-6666-4666-8666-666666666666",
};
const account = { tenantId: context.tenantId, actorId: context.actorId };
const scope = { ...account, clientId: context.selectedClientId };
function setup() {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  const current = { ...account };
  const issued = { ...context };
  const receipt = (body: FirstChatCoreRequest | FirstChatV2Request) => ({
    ...body,
    ...current,
    conversationId: context.conversationId,
  });
  const calls: Array<{ url: string; body: unknown }> = [];
  const createOrReuse = vi.fn(
    async (body: FirstChatCoreRequest | FirstChatV2Request) => {
      expect(readFirstChatIntent(scope, storage)).toMatchObject({
        requestId: body.requestId,
      });
      return receipt(body);
    },
  );
  const fetcher: typeof fetch = vi.fn(async (url, init) => {
    calls.push({
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (String(url).endsWith("/me"))
      return Response.json({
        user: { id: current.actorId, email: null },
        tenant: { id: current.tenantId, name: "Synthetic" },
        role: "standard_user",
      });
    return Response.json({
      credential: `action_session_${"a".repeat(43)}`,
      expiresAtMs: 160_000,
      context: issued,
    });
  });
  const api = createApiClient(fetcher);
  const connect = (
    kind: "create" | "update" = "create",
    signal = new AbortController().signal,
  ) =>
    bootstrapTaskRecoverySession(
      api,
      kind,
      scope.clientId,
      signal,
      fetcher,
      () => 100_000,
      account,
      () => ({ storage, createOrReuse }),
    );
  return { connect, calls, createOrReuse, receipt, current, issued, storage };
}
it.each(["create", "update"] as const)(
  "fresh %s resolves a verified Core conversation before session issuance",
  async (kind) => {
    const c = setup();
    const session = await c.connect(kind);
    expect(session.context).toEqual(context);
    expect(c.createOrReuse).toHaveBeenCalledOnce();
    expect(c.calls.map((call) => call.url)).toEqual([
      "/api/backend/core/me",
      "/api/action-followthrough/session",
    ]);
    expect(c.calls[1]?.body).toEqual({
      clientId: scope.clientId,
      conversationId: context.conversationId,
    });
    expect(readFirstChatIntent(scope, c.storage)).toMatchObject({
      state: "confirmed",
      conversationId: context.conversationId,
    });
  },
);
it.each(["create", "update"] as const)(
  "saved %s context wins without creating or selecting another conversation",
  async (kind) => {
    const c = setup();
    const saved = {
      requestId: "77777777-7777-4777-8777-777777777777",
      context,
      prepare: { synthetic: true },
      executing: true,
    };
    const journal = standaloneTaskRecovery(kind, context, () => undefined);
    await journal.reserve(saved);
    vi.spyOn(c.storage, "getItem").mockImplementation(() => {
      throw new Error("Fresh-chat storage must not be used for saved recovery");
    });
    await c.connect(kind);
    expect(c.createOrReuse).not.toHaveBeenCalled();
    expect(c.calls[1]?.body).toEqual({
      clientId: scope.clientId,
      conversationId: context.conversationId,
    });
    expect(await journal.load()).toEqual(saved);
  },
);
it("lost bootstrap acknowledgement retries the original scoped request without issuing a session early", async () => {
  const c = setup();
  c.createOrReuse.mockRejectedValueOnce(
    new Error("Synthetic lost acknowledgement"),
  );
  await expect(c.connect()).rejects.toThrow("lost acknowledgement");
  expect(c.calls).toHaveLength(1);
  const pending = readFirstChatIntent(scope, c.storage);
  expect(pending?.state).toBe("pending");
  await c.connect();
  expect(c.createOrReuse.mock.calls[0]?.[0]).toEqual(
    c.createOrReuse.mock.calls[1]?.[0],
  );
  expect(c.createOrReuse.mock.calls[1]?.[0].requestId).toBe(pending?.requestId);
  expect(c.calls.filter((call) => call.url.endsWith("/session"))).toHaveLength(
    1,
  );
});
it.each(["tenantId", "actorId"] as const)(
  "changed current %s refuses before bootstrap or session",
  async (key) => {
    const c = setup();
    c.current[key] = "88888888-8888-4888-8888-888888888888";
    await expect(c.connect()).rejects.toThrow("account changed");
    expect(c.createOrReuse).not.toHaveBeenCalled();
    expect(c.calls).toHaveLength(1);
  },
);
it.each(["tenantId", "actorId", "clientId", "requestId"] as const)(
  "foreign bootstrap %s cannot become session authority",
  async (key) => {
    const c = setup();
    c.createOrReuse.mockImplementationOnce(async (body) => ({
      ...c.receipt(body),
      [key]: "88888888-8888-4888-8888-888888888888",
    }));
    await expect(c.connect()).rejects.toThrow();
    expect(c.calls).toHaveLength(1);
    expect(readFirstChatIntent(scope, c.storage)?.state).toBe("pending");
  },
);
it.each(["tenantId", "actorId", "selectedClientId", "conversationId"] as const)(
  "changed issued %s refuses the new session",
  async (key) => {
    const c = setup();
    c.issued[key] = "88888888-8888-4888-8888-888888888888";
    await expect(c.connect()).rejects.toThrow();
  },
);
it("denied Core bootstrap does not fall back to an unscoped session", async () => {
  const c = setup();
  c.createOrReuse.mockRejectedValueOnce(new Error("Synthetic denied"));
  await expect(c.connect()).rejects.toThrow("denied");
  expect(c.calls).toHaveLength(1);
});
it("account/client switch aborts a delayed receipt before it can issue a session", async () => {
  const c = setup();
  const controller = new AbortController();
  c.createOrReuse.mockImplementationOnce(async (body) => {
    controller.abort();
    return c.receipt(body);
  });
  await expect(c.connect("update", controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(c.calls).toHaveLength(1);
  expect(readFirstChatIntent(scope, c.storage)?.state).toBe("pending");
});
it("unavailable intent storage prevents both bootstrap and session dispatch", async () => {
  const c = setup();
  vi.spyOn(c.storage, "setItem").mockImplementation(() => {
    throw new Error("Storage unavailable");
  });
  await expect(c.connect()).rejects.toThrow("safely recovered");
  expect(c.createOrReuse).not.toHaveBeenCalled();
  expect(c.calls).toHaveLength(1);
});
