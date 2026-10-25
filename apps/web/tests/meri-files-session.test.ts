import { expect, it, vi } from "vitest";
import { bootstrapFileSession } from "../src/app/meri/files/MeriFilesHost";
import { createApiClient } from "../src/shared/portfolio/api/http";
import type {
  FirstChatCoreRequest,
  FirstChatV2Request,
} from "../src/shared/capiro/operations/meri-first-chat";

const account = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
};
const clientId = "33333333-3333-4333-8333-333333333333";
const context = {
  ...account,
  selectedClientId: clientId,
  conversationId: "55555555-5555-4555-8555-555555555555",
  runId: "66666666-6666-4666-8666-666666666666",
};
function setup() {
  const controller = new AbortController();
  const clock = { now: 100_000 };
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  const page = {
    run: {
      binding: {
        ...account,
        conversationId: context.conversationId,
        runId: context.runId,
        attemptId: "77777777-7777-4777-8777-777777777777",
        workerId: "88888888-8888-4888-8888-888888888888",
        writerFence: 1,
      },
      state: "running",
      scopes: [
        {
          tenantId: account.tenantId,
          kind: "client",
          resourceId: clientId,
          policyRevision: "policy1",
        },
      ],
      createdAt: "2026-10-25T00:00:00Z",
      policyRevision: "policy1",
      versions: {
        imageDigest: "sha256:" + "a".repeat(64),
        sdk: "0.3.295",
        cli: "2.1.295",
        contracts: "0.1.0",
        skillsDigest: "b".repeat(64),
        checkpointFormat: "0.1.0",
      },
    },
    request: {
      requestId: "99999999-9999-4999-8999-999999999999",
      prompt: "Synthetic request",
      skill: null,
      window: null,
      windowRequest: null,
    },
    events: [] as unknown[],
    nextSequence: 1,
    hasMore: false,
    lastSequence: 1,
  };
  page.events.push({
    contractVersion: "0.1.0",
    eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    binding: page.run.binding,
    scopes: page.run.scopes,
    sequence: 1,
    createdAt: page.run.createdAt,
    type: "run.status",
    data: { state: "running", reasonCode: null },
  });
  const issued = { ...context };
  const current = { ...account };
  const calls: Array<{ url: string; body: unknown }> = [];
  const history = vi.fn(async () => Response.json(page));
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
    if (String(url).endsWith("/history")) return history();
    if (!String(url).endsWith("/session"))
      throw new Error("Unexpected dispatch");
    return Response.json({
      credential: `action_session_${"a".repeat(43)}`,
      expiresAtMs: 160_000,
      context: issued,
    });
  });
  const createOrReuse = vi.fn(
    async (body: FirstChatCoreRequest | FirstChatV2Request) => ({
      ...body,
      ...account,
      conversationId: context.conversationId,
    }),
  );
  const connect = () =>
    bootstrapFileSession({
      api: createApiClient(fetcher),
      account,
      clientId,
      signal: controller.signal,
      firstChat: { storage, createOrReuse },
      fetcher,
      now: () => clock.now,
    });
  return {
    connect,
    history,
    createOrReuse,
    page,
    issued,
    current,
    controller,
    calls,
    clock,
  };
}
it("allows an existing persisted run through the canonical history receiver without creating a document or run", async () => {
  const c = setup();
  const session = await c.connect();
  expect(session.context).toEqual(context);
  expect(c.calls.map((call) => call.url)).toEqual([
    "/api/backend/core/me",
    "/api/action-followthrough/session",
    "/api/conversations/history",
  ]);
  expect(c.calls[1]?.body).toEqual({
    clientId,
    conversationId: context.conversationId,
  });
  expect(c.calls[2]?.body).toEqual({ limit: 1 });
});
it.each([
  ["NOT_FOUND", 404],
  ["SESSION_REFUSED", 401],
  ["CONVERSATION_UNAVAILABLE", 503],
] as const)(
  "withholds generation when canonical history answers %s",
  async (code, status) => {
    const c = setup();
    c.history.mockResolvedValueOnce(
      Response.json({ error: { code } }, { status }),
    );
    await expect(c.connect()).rejects.toThrow();
    expect(c.calls).toHaveLength(3);
  },
);
it("withholds a cancelled persisted run", async () => {
  const c = setup();
  c.page.run.state = "cancelled";
  await expect(c.connect()).rejects.toThrow("no available saved run");
});
it.each(["tenantId", "actorId", "conversationId", "runId"] as const)(
  "rejects a persisted history page for another %s",
  async (key) => {
    const c = setup();
    c.page.run.binding[key] = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await expect(c.connect()).rejects.toThrow();
  },
);
it("rejects another client's persisted history", async () => {
  const c = setup();
  c.page.run.scopes[0]!.resourceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  await expect(c.connect()).rejects.toThrow();
});
it.each(["tenantId", "actorId"] as const)(
  "refuses changed current %s before bootstrap",
  async (key) => {
    const c = setup();
    c.current[key] = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await expect(c.connect()).rejects.toThrow("account changed");
    expect(c.createOrReuse).not.toHaveBeenCalled();
    expect(c.history).not.toHaveBeenCalled();
  },
);
it.each(["tenantId", "actorId", "selectedClientId", "conversationId"] as const)(
  "refuses changed session %s before history",
  async (key) => {
    const c = setup();
    c.issued[key] = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await expect(c.connect()).rejects.toThrow();
    expect(c.history).not.toHaveBeenCalled();
  },
);
it("a scope switch during history cannot mount a document workflow from the stale page", async () => {
  const c = setup();
  c.history.mockImplementationOnce(async () => {
    c.controller.abort();
    return Response.json(c.page);
  });
  await expect(c.connect()).rejects.toThrow();
});
it("a lost bootstrap acknowledgement retains its original request on reconnect", async () => {
  const c = setup();
  c.createOrReuse.mockRejectedValueOnce(
    new Error("Synthetic lost acknowledgement"),
  );
  await expect(c.connect()).rejects.toThrow("lost acknowledgement");
  expect(c.history).not.toHaveBeenCalled();
  await c.connect();
  expect(c.createOrReuse.mock.calls[0]?.[0]).toEqual(
    c.createOrReuse.mock.calls[1]?.[0],
  );
});

it("an expired session cannot reach history or any document operation", async () => {
  const c = setup();
  c.clock.now = 160_000;
  await expect(c.connect()).rejects.toThrow("unavailable");
  expect(c.history).not.toHaveBeenCalled();
  expect(c.calls.map((call) => call.url)).toEqual([
    "/api/backend/core/me",
    "/api/action-followthrough/session",
  ]);
});
it("a history transport failure remains unknown and does not trigger another bootstrap, session or effect", async () => {
  const c = setup();
  const failure = new Error("Synthetic history response lost");
  c.history.mockRejectedValueOnce(failure);
  await expect(c.connect()).rejects.toBe(failure);
  expect(c.createOrReuse).toHaveBeenCalledOnce();
  expect(c.calls.map((call) => call.url)).toEqual([
    "/api/backend/core/me",
    "/api/action-followthrough/session",
    "/api/conversations/history",
  ]);
});
