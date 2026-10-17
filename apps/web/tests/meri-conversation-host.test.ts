import { afterEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ConversationHostController } from "../src/shared/meri-conversations/host-controller";
import {
  conversationIntentJournal,
  conversationSelectionOwner,
} from "../src/shared/meri-conversations/query-journal";
import { readConversationConfig } from "../src/shared/meri-conversations/config";
import {
  readOpaqueSessionConfig,
  readMeriConnectionConfig,
} from "../src/shared/meri-actions/connection-config";
const clientId = "10000000-0000-4000-8000-000000000001";
const context = {
  tenantId: "native-tenant",
  actorId: "native-user",
  conversationId: "20000000-0000-4000-8000-000000000001",
  runId: "30000000-0000-4000-8000-000000000001",
  selectedClientId: clientId,
};
const account = { tenantId: context.tenantId, actorId: context.actorId };
const receipt = {
  credential: `action_session_${"s".repeat(43)}`,
  expiresAtMs: Date.now() + 60000,
  context,
};
afterEach(() => vi.useRealTimers());
it("keeps activation closed until auth, HTTPS origin and explicit flag all exist", () => {
  const env = {
    CORE_API_BASE_URL: "https://core.example.test/api",
    MERI_API_BASE_URL: "https://meri.example.test",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_YXBw",
    CLERK_SECRET_KEY: "sk_test_fixture",
    MERI_CONVERSATION_WORKFLOW_ENABLED: "true",
  };
  expect(readConversationConfig(env).enabled).toBe(true);
  expect(readOpaqueSessionConfig(env).enabled).toBe(true);
  expect(readMeriConnectionConfig(env).actionEnabled).toBe(false);
  expect(readMeriConnectionConfig(env).documentEnabled).toBe(false);
  for (const change of [
    { MERI_CONVERSATION_WORKFLOW_ENABLED: "false" },
    { MERI_CONVERSATION_WORKFLOW_ENABLED: "TRUE" },
    { MERI_API_BASE_URL: "" },
    { MERI_API_BASE_URL: "http://localhost:3000" },
    { MERI_API_BASE_URL: "https://meri.example.test/private" },
    { CLERK_SECRET_KEY: "" },
    { MERI_API_BASE_URL: "https://user:pass@meri.example.test" },
  ])
    expect(readConversationConfig({ ...env, ...change }).enabled).toBe(false);
});
it("bootstraps only existing allowed client hints and binds native Core user/tenant before ready", async () => {
  const calls: unknown[] = [];
  const host = new ConversationHostController({
    hints: { clientId },
    account,
    fetcher: async (url, init) => {
      calls.push([url, JSON.parse(String(init?.body))]);
      return Response.json(receipt);
    },
  });
  const detach = host.attach();
  try {
    await host.connect();
    expect(host.getSnapshot().status).toBe("ready");
    expect(calls).toEqual([
      ["/api/action-followthrough/session", { clientId }],
    ]);
    expect(JSON.stringify(host.getSnapshot())).not.toContain(
      receipt.credential,
    );
  } finally {
    detach();
  }
});
for (const changes of [
  { actorId: "clerk-user" },
  { tenantId: "foreign-tenant" },
  { selectedClientId: context.conversationId },
])
  it(`refuses mismatched observed session ${JSON.stringify(changes)}`, async () => {
    const host = new ConversationHostController({
      hints: { clientId },
      account,
      fetcher: async () =>
        Response.json({ ...receipt, context: { ...context, ...changes } }),
    });
    const detach = host.attach();
    try {
      await host.connect();
      expect(host.getSnapshot().status).toBe("unavailable");
    } finally {
      detach();
    }
  });
it("pins account and hints before an asynchronous bootstrap response", async () => {
  const mutable = { ...account },
    hints = { clientId };
  let release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  const host = new ConversationHostController({
    hints,
    account: mutable,
    fetcher: async () => {
      await held;
      return Response.json(receipt);
    },
  });
  const detach = host.attach();
  try {
    const pending = host.connect();
    mutable.actorId = "other-user";
    hints.clientId = context.conversationId;
    release();
    await pending;
    expect(host.getSnapshot().status).toBe("ready");
  } finally {
    detach();
  }
});
it("late bootstrap cannot repopulate detached host or create conversation calls", async () => {
  let release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  const host = new ConversationHostController({
    hints: { clientId },
    account,
    fetcher: async () => {
      await held;
      return Response.json(receipt);
    },
  });
  const detach = host.attach();
  const pending = host.connect();
  detach();
  release();
  await pending;
  expect(host.getSnapshot().status).toBe("idle");
});
it("expiry and reentrant client refusal dispose before admitting ready state", async () => {
  vi.useFakeTimers();
  const host = new ConversationHostController({
    hints: { clientId },
    account,
    fetcher: async () =>
      Response.json({ ...receipt, expiresAtMs: Date.now() + 100 }),
    onBound: () => host.setClientAvailable(false),
  });
  const detach = host.attach();
  try {
    await host.connect();
    expect(host.getSnapshot().status).toBe("unavailable");
    await vi.advanceTimersByTimeAsync(200);
    expect(host.getSnapshot().status).toBe("unavailable");
  } finally {
    detach();
  }
});
it("scoped journal retains original uncertain input immutably and never resurrects a cleared cache", () => {
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context),
    input = {
      requestId: context.runId,
      prompt: "Original actual user input",
      state: "pending" as const,
    };
  journal.write({ submit: input });
  input.prompt = "mutated";
  expect(journal.read().submit).toMatchObject({
    prompt: "Original actual user input",
    state: "unknown",
  });
  cache.clear();
  journal.write({ submit: { ...input, state: "observed" } });
  expect(cache.getQueryCache().getAll()).toHaveLength(0);
  cache.clear();
});
it("reopening uses only previously observed conversation/run selectors, scoped to account/client", () => {
  const cache = new QueryClient(),
    first = conversationSelectionOwner(cache, account, clientId);
  expect(first.hints).toEqual({ clientId });
  first.record(context);
  expect(conversationSelectionOwner(cache, account, clientId).hints).toEqual({
    clientId,
    conversationId: context.conversationId,
    runId: context.runId,
  });
  expect(
    conversationSelectionOwner(
      cache,
      { ...account, actorId: "other" },
      clientId,
    ).hints,
  ).toEqual({ clientId });
  cache.clear();
  first.record(context);
  expect(cache.getQueryCache().getAll()).toHaveLength(0);
});
// Clerk's auth() prefers a bearer Authorization header to the session cookie and would read the
// opaque session as signed out, so the browser carries it only in the proxy's own header.
it("sends the opaque session only in X-Meri-Action-Session, never as a browser bearer", async () => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const host = new ConversationHostController({
    hints: { clientId },
    account,
    fetcher: async (url, init) => {
      calls.push({
        url: String(url),
        headers: Object.fromEntries(new Headers(init?.headers)),
      });
      return calls.length === 1
        ? Response.json(receipt)
        : Response.json(
            { error: { code: "SESSION_CHANGED" } },
            { status: 403 },
          );
    },
  });
  const detach = host.attach();
  try {
    await host.connect();
    const snapshot = host.getSnapshot();
    if (snapshot.status !== "ready") throw new Error(snapshot.status);
    await snapshot.port.history().catch(() => undefined);
    expect(calls.map((call) => call.url)).toEqual([
      "/api/action-followthrough/session",
      "/api/conversations/history",
    ]);
    expect(calls[1]!.headers["x-meri-action-session"]).toBe(receipt.credential);
    for (const call of calls)
      expect(call.headers).not.toHaveProperty("authorization");
  } finally {
    detach();
  }
});
