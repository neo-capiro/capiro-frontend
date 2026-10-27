import { expect, it, vi } from "vitest";
import {
  bootstrapLibrarySession,
  libraryOriginClient,
  listLibraryContexts,
} from "../src/shared/meri-documents/library-session";
import { conversation, turn } from "../test/browser/meri-history-fixtures";
import {
  binding,
  clientId,
  context,
  runFor,
  status,
} from "../test/browser/meri-conversation-fixtures";

const account = { tenantId: binding.tenantId, actorId: binding.actorId };
const signal = () => new AbortController().signal;
function fixture(state: "completed" | "failed" | "cancelled") {
  const saved = turn();
  saved.run = runFor(state);
  saved.lastSequence = 1;
  const page = {
    schema: "meri.conversation-transcript/1",
    conversation: structuredClone(conversation),
    latestRun: saved.run,
    latestSequenceBase: 0,
    turns: [saved],
    events: [{ sequence: 1, event: status(1, state) }],
    nextSequence: 1,
    lastSequence: 1,
    hasMore: false,
    pendingTurn: null,
  };
  const receipt = {
    credential: `action_session_${"a".repeat(43)}`,
    expiresAtMs: Date.now() + 60_000,
    context: { ...context },
  };
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    if (String(url) === "/api/conversations/transcript")
      return Response.json(page);
    if (String(url) === "/api/action-followthrough/session")
      return Response.json(receipt);
    throw Error("Unexpected allocation or execution request");
  });
  return {
    page,
    receipt,
    fetcher,
    open: () =>
      bootstrapLibrarySession({
        account,
        clientId,
        conversationId: binding.conversationId,
        signal: signal(),
        fetcher,
      }),
  };
}

it.each(["completed", "failed", "cancelled"] as const)(
  "opens an exact saved %s run after reload without first-chat, next-turn, input or model allocation",
  async (state) => {
    const f = fixture(state);
    for (let reload = 0; reload < 2; reload++)
      expect((await f.open()).context.runId).toBe(binding.runId);
    expect(f.fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/conversations/transcript",
      "/api/action-followthrough/session",
      "/api/conversations/transcript",
      "/api/action-followthrough/session",
    ]);
    expect(JSON.parse(String(f.fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      conversationId: binding.conversationId,
      clientId,
      runId: binding.runId,
    });
  },
);

it.each(["actor", "client", "run"])(
  "refuses substituted %s context without selecting a replacement run",
  async (field) => {
    const f = fixture("completed");
    if (field === "actor") f.receipt.context.actorId = "wrong-actor";
    if (field === "client")
      f.receipt.context.selectedClientId = binding.attemptId;
    if (field === "run") f.receipt.context.runId = binding.attemptId;
    await expect(f.open()).rejects.toThrow();
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  },
);

it("stops before session issuance when history is revoked", async () => {
  const f = fixture("completed");
  f.fetcher.mockImplementation(async () => new Response(null, { status: 403 }));
  await expect(f.open()).rejects.toThrow();
  expect(f.fetcher).toHaveBeenCalledOnce();
});

it("retains a continuation for an empty client-filtered discovery page", async () => {
  const row = structuredClone(conversation);
  row.scopes[0]!.resourceId = binding.attemptId;
  const nextBefore = {
    createdAt: row.createdAt,
    conversationId: row.conversationId,
  };
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({
      schema: "meri.conversation-list/1",
      conversations: [row],
      nextBefore,
    }),
  );
  const page = await listLibraryContexts({
    account,
    clientId,
    signal: signal(),
    fetcher,
  });
  expect(page.conversations).toEqual([]);
  expect(page.nextBefore).toEqual(nextBefore);
});

it("retained origin selectors handle existing same-client private scope without treating metadata as authority", () => {
  const row = structuredClone(conversation);
  row.scopes.push({
    tenantId: account.tenantId,
    kind: "private-user",
    resourceId: account.actorId,
    policyRevision: "policy1",
  });
  expect(libraryOriginClient(row, account)).toBe(clientId);
  row.scopes.push({ ...row.scopes[0]!, resourceId: binding.attemptId });
  expect(() => libraryOriginClient(row, account)).toThrow();
});
