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
  const transcript = {
    schema: "meri.conversation-transcript/1",
    conversation: {
      conversationId: context.conversationId,
      owner: { ...account },
      scopes: page.run.scopes,
      createdAt: page.run.createdAt,
      policyRevision: "policy1",
    },
    latestRun: page.run,
    latestSequenceBase: 0,
    turns: [
      {
        run: page.run,
        request: page.request,
        promptLineage: {
          kind: "submission",
          logicalRequestId: page.request.requestId,
          sourceBinding: null,
          sourceRequestId: null,
        },
        sequenceBase: 0,
        sequenceEnd: null,
        lastSequence: 1,
      },
    ],
    events: page.events.map((event) => ({ sequence: 1, event })),
    nextSequence: 1,
    lastSequence: 1,
    hasMore: false,
    pendingTurn: null as unknown,
  };
  const calls: Array<{ url: string; body: unknown }> = [];
  const history = vi.fn(async () => Response.json(page));
  const readTranscript = vi.fn(async () => Response.json(transcript));
  const fetcher: typeof fetch = vi.fn(async (url, init) => {
    calls.push({
      url: String(url),
      body: init?.body ? await new Response(init.body).json() : null,
    });
    if (String(url).endsWith("/me"))
      return Response.json({
        user: { id: current.actorId, email: null },
        tenant: { id: current.tenantId, name: "Synthetic" },
        role: "standard_user",
      });
    if (String(url).endsWith("/transcript")) return readTranscript();
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
    transcript,
    readTranscript,
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
    "/api/conversations/transcript",
    "/api/action-followthrough/session",
    "/api/conversations/history",
  ]);
  expect(c.calls[1]?.body).toEqual({
    conversationId: context.conversationId,
    limit: 1,
  });
  expect(c.calls[2]?.body).toEqual({
    clientId,
    conversationId: context.conversationId,
    runId: context.runId,
  });
  expect(c.calls[3]?.body).toEqual({ limit: 1 });
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
    expect(c.calls).toHaveLength(4);
  },
);
it("withholds a cancelled persisted run", async () => {
  const c = setup();
  c.page.run.state = "cancelled";
  await expect(c.connect()).rejects.toThrow("no available saved run");
  expect(c.calls).toHaveLength(2);
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
it.each([
  "tenantId",
  "actorId",
  "selectedClientId",
  "conversationId",
  "runId",
] as const)("refuses changed session %s before history", async (key) => {
  const c = setup();
  c.issued[key] = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  await expect(c.connect()).rejects.toThrow();
  expect(c.history).not.toHaveBeenCalled();
});
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
    "/api/conversations/transcript",
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
    "/api/conversations/transcript",
    "/api/action-followthrough/session",
    "/api/conversations/history",
  ]);
});

it("pins a completed conversation's saved run instead of requesting a successor", async () => {
  const c = setup();
  c.page.run.state = "completed";
  const session = await c.connect();
  expect(session.context.runId).toBe(context.runId);
  expect(c.calls.map((call) => call.url)).toEqual([
    "/api/backend/core/me",
    "/api/conversations/transcript",
    "/api/action-followthrough/session",
    "/api/conversations/history",
  ]);
  expect(c.calls[2]?.body).toEqual({
    clientId,
    conversationId: context.conversationId,
    runId: context.runId,
  });
});

it("does not issue a document session when a successor is already reserved", async () => {
  const c = setup();
  c.page.run.state = "completed";
  c.transcript.pendingTurn = {
    sourceBinding: c.page.run.binding,
    targetBinding: {
      ...c.page.run.binding,
      runId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      workerId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      writerFence: 2,
    },
    state: "RESERVED",
  };
  await expect(c.connect()).rejects.toThrow("no available saved run");
  expect(c.calls).toHaveLength(2);
  expect(c.history).not.toHaveBeenCalled();
});

it.each([
  ["CONVERSATION_NOT_FOUND", 404],
  ["UNAUTHENTICATED", 401],
  ["CONVERSATION_ACCESS_DENIED", 403],
  ["CONVERSATION_UNAVAILABLE", 503],
] as const)(
  "does not bootstrap an unstarted or unavailable conversation after transcript %s",
  async (code, status) => {
    const c = setup();
    c.readTranscript.mockResolvedValueOnce(
      Response.json({ error: { code } }, { status }),
    );
    await expect(c.connect()).rejects.toThrow();
    expect(c.calls).toHaveLength(2);
    expect(c.history).not.toHaveBeenCalled();
  },
);

it.each(["tenantId", "actorId", "conversationId", "selectedClientId"] as const)(
  "rejects a valid transcript from another %s before session issuance",
  async (key) => {
    const c = setup();
    const foreign = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    if (key === "selectedClientId") c.page.run.scopes[0]!.resourceId = foreign;
    else if (key === "conversationId") {
      c.transcript.conversation.conversationId = foreign;
      c.page.run.binding.conversationId = foreign;
    } else {
      c.transcript.conversation.owner[key] = foreign;
      c.page.run.binding[key] = foreign;
      if (key === "tenantId") c.page.run.scopes[0]!.tenantId = foreign;
    }
    await expect(c.connect()).rejects.toThrow();
    expect(c.calls).toHaveLength(2);
    expect(c.history).not.toHaveBeenCalled();
  },
);

it("a context switch during transcript read stops before session issuance", async () => {
  const c = setup();
  c.readTranscript.mockImplementationOnce(async () => {
    c.controller.abort();
    return Response.json(c.transcript);
  });
  await expect(c.connect()).rejects.toThrow();
  expect(c.calls).toHaveLength(2);
  expect(c.history).not.toHaveBeenCalled();
});

it("a lost transcript response never falls back to implicit session selection", async () => {
  const c = setup();
  const failure = new Error("Synthetic transcript response lost");
  c.readTranscript.mockRejectedValueOnce(failure);
  await expect(c.connect()).rejects.toBe(failure);
  expect(c.readTranscript).toHaveBeenCalledOnce();
  expect(c.calls).toHaveLength(2);
  expect(c.history).not.toHaveBeenCalled();
});

it("rejects a different run selected between transcript and issuance", async () => {
  const c = setup();
  c.issued.runId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await expect(c.connect()).rejects.toThrow("Action context mismatch");
  expect(c.calls).toHaveLength(3);
  expect(c.history).not.toHaveBeenCalled();
});

it("still rechecks cancellation in saved history after transcript selection", async () => {
  const c = setup();
  c.history.mockImplementationOnce(async () => {
    c.page.run.state = "cancelled";
    return Response.json(c.page);
  });
  await expect(c.connect()).rejects.toThrow("no available saved run");
  expect(c.calls).toHaveLength(4);
});
