import { createPreviewAccess } from "../src/shared/meri-documents/preview-access";
import {
  previewSource,
  previewResponse,
  previewPublication,
} from "./meri-preview-revision-fixtures";
import { expect, it, vi } from "vitest";
import {
  bootstrapLibrarySession,
  libraryOriginClient,
  listLibraryContexts,
} from "../src/shared/meri-documents/library-session";
import { ActionSessionUnavailable } from "../src/shared/meri-actions/session-bootstrap";
import { SessionLifetimeController } from "../src/shared/meri-actions/opaque-session-controller";
import { libraryConnectionPhase } from "../src/features/meri/files/library-connection";
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

it("a saved completed run can request a derived preview explicitly without a new model turn", async () => {
  const f = fixture("completed"),
    original = f.fetcher.getMockImplementation()!,
    source = previewSource();
  source.version.binding = { ...binding };
  source.version.scopes = structuredClone(conversation.scopes);
  source.version.object.scopes = structuredClone(conversation.scopes);
  f.fetcher.mockImplementation(async (url, init) => {
    if (String(url) === "/api/documents/inspect") return Response.json(source);
    if (String(url) === "/api/documents/preview-publish")
      return Response.json(previewPublication(source));
    if (String(url) === "/api/documents/preview") return previewResponse();
    return original(url, init);
  });
  const admitted = await f.open();
  const port = createPreviewAccess(admitted.credential, signal(), f.fetcher);
  expect(
    (await port.publishPreview(previewSource().version.versionId, signal())).ok,
  ).toBe(true);
  expect(
    (await port.readPreview(previewSource().version.versionId, signal())).ok,
  ).toBe(true);
  expect(f.fetcher.mock.calls.map(([url]) => url)).toEqual([
    "/api/conversations/transcript",
    "/api/action-followthrough/session",
    "/api/documents/inspect",
    "/api/documents/preview-publish",
    "/api/documents/inspect",
    "/api/documents/preview",
  ]);
});

it("reports a transcript the control did not answer like an unanswered session issuance, so the owner retries it", async () => {
  const { page, receipt } = fixture("completed");
  const transcript = vi.fn<typeof fetch>(async (url) => {
    if (String(url) === "/api/conversations/transcript")
      return Response.json(
        { error: { code: "CONVERSATION_UNAVAILABLE" } },
        { status: 503 },
      );
    if (String(url) === "/api/action-followthrough/session")
      return Response.json(receipt);
    throw Error("Unexpected request");
  });
  const open = (fetcher: typeof fetch) =>
    bootstrapLibrarySession({
      account,
      clientId,
      conversationId: binding.conversationId,
      signal: signal(),
      fetcher,
    });
  await expect(open(transcript)).rejects.toMatchObject({
    name: "Error",
    status: 503,
  });
  await expect(open(transcript)).rejects.toBeInstanceOf(
    ActionSessionUnavailable,
  );
  // A network failure before any answer (fetch rejects with a TypeError) is the same transient class.
  const network = vi.fn<typeof fetch>(async () => {
    throw new TypeError("Failed to fetch");
  });
  await expect(open(network)).rejects.toBeInstanceOf(ActionSessionUnavailable);
  await expect(open(network)).rejects.toMatchObject({ status: 503 });
  // A refused transcript keeps its own status: 403 is definitive for the owner.
  const refused = vi.fn<typeof fetch>(async (url) => {
    if (String(url) === "/api/conversations/transcript")
      return Response.json(
        { error: { code: "ACCESS_DENIED" } },
        { status: 403 },
      );
    return Response.json(page);
  });
  await expect(open(refused)).rejects.toMatchObject({ status: 403 });
  expect(receipt.credential.startsWith("action_session_")).toBe(true);
});

it("treats a transcript the control never answered before its deadline like an unanswered issuance", async () => {
  vi.useFakeTimers();
  try {
    const silent = vi.fn<typeof fetch>(() => new Promise<Response>(() => {}));
    const opened = bootstrapLibrarySession({
      account,
      clientId,
      conversationId: binding.conversationId,
      signal: signal(),
      fetcher: silent,
    });
    const settled = expect(opened).rejects.toMatchObject({
      status: 408,
      refused: false,
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await settled;
    await expect(opened).rejects.toBeInstanceOf(ActionSessionUnavailable);
    // A request the caller itself cancelled is not reported as unanswered.
    const cancelled = new AbortController();
    const aborted = bootstrapLibrarySession({
      account,
      clientId,
      conversationId: binding.conversationId,
      signal: cancelled.signal,
      fetcher: silent,
    });
    cancelled.abort();
    await expect(aborted).rejects.not.toBeInstanceOf(ActionSessionUnavailable);
  } finally {
    vi.useRealTimers();
  }
});

it("a transcript 401 is definitive at once: the session owner does not ask again", async () => {
  vi.useFakeTimers();
  const transcript = vi.fn<typeof fetch>(async () =>
    Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 }),
  );
  const issue = vi.fn((lifetime: AbortSignal) =>
    bootstrapLibrarySession({
      account,
      clientId,
      conversationId: binding.conversationId,
      signal: lifetime,
      fetcher: transcript,
    }),
  );
  const host = new SessionLifetimeController({
    issue,
    createPort: () => ({ dispose: () => undefined }),
    retryDelaysMs: [1_000, 3_000],
  });
  const detach = host.attach();
  try {
    const connected = host.connect();
    await vi.advanceTimersByTimeAsync(10_000);
    await connected;
    expect(host.getSnapshot().status).toBe("unavailable");
    expect(host.getIssuanceStatus()).toBe(401);
    expect(issue).toHaveBeenCalledOnce();
    expect(transcript).toHaveBeenCalledOnce();
    expect(libraryConnectionPhase("unavailable", undefined, 401, true)).toBe(
      "lost",
    );
  } finally {
    detach();
    vi.useRealTimers();
  }
});
