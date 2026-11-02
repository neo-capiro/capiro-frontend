import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConversationTurn } from "../src/features/meri/conversation/useConversationTurn";
import { conversationTurnJournal } from "../src/shared/meri-conversations/turn-journal";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import { sendRequest } from "../src/features/meri/conversation/run-commands";
import { MONTHLY_CAP_REACHED } from "../src/features/meri/conversation/skill-refusal";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import * as transport from "../src/shared/meri-conversations/history-client";
import {
  binding,
  nextBinding,
  clientId,
  contextFor,
  event,
  status,
} from "../test/browser/meri-conversation-fixtures";
import { conversation, turn } from "../test/browser/meri-history-fixtures";

// R10 (2 Nov): a file the person included for a follow-up message never reached Meri, because the next-turn path
// built its request without the composer's attachments. Actual hook, journals and public receivers; no browser claim.
const account = { tenantId: binding.tenantId, actorId: binding.actorId };
const prompt = "Read the attached file and tell me its codeword";
const uploads: [{ uploadId: string; sha256: string }] = [
  {
    uploadId: "70000000-0000-4000-8000-000000000007",
    sha256: "a".repeat(64),
  },
];
let storage: TabStorage;
beforeEach(() => {
  const values = new Map<string, string>();
  storage = {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    removeItem: (k) => {
      values.delete(k);
    },
  };
  syncMeriTabIdentity("synthetic-signed-in", storage);
  vi.stubGlobal("window", { sessionStorage: storage });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const journal = (cache: QueryClient) =>
  conversationTurnJournal(
    cache,
    account,
    clientId,
    binding.conversationId,
    storage,
  );
function mount(cache: QueryClient) {
  const open = vi.fn();
  let command!: ReturnType<typeof useConversationTurn>;
  function Probe() {
    command = useConversationTurn(
      account,
      clientId,
      binding.conversationId,
      open,
    );
    return null;
  }
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client: cache }, createElement(Probe)),
  );
  return { command, open };
}

it("a follow-up message carries the composer's files to its reserved target, and a reload keeps them", async () => {
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue({
    schema: "meri.conversation-turn/1",
    sourceBinding: binding,
    targetBinding: nextBinding,
    state: "RESERVED",
    replayed: false,
  });
  const cache = new QueryClient(),
    { command, open } = mount(cache),
    capture = vi.fn();
  // The rows leave the composer only once the turn journal holds the files.
  const retainedAtRelease: unknown[] = [];
  const attachments = {
    sendArgument: () => uploads,
    sent: vi.fn(() => retainedAtRelease.push(journal(cache).read()?.uploads)),
  };
  expect(
    await command.start(binding, prompt, capture, undefined, {}, attachments),
  ).toBe(true);
  expect(attachments.sent).toHaveBeenCalledExactlyOnceWith(uploads);
  expect(retainedAtRelease).toEqual([uploads]);
  // The captured message, the opened target and the request the target port submits all name the same files.
  expect(capture.mock.calls[0]![0]).toMatchObject({ prompt, uploads });
  expect(open).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ runId: nextBinding.runId, uploads }),
  );
  const submit = conversationIntentJournal(
    cache,
    contextFor(nextBinding),
    storage,
  ).read().submit;
  expect(submit).toMatchObject({ prompt, uploads, state: "unknown" });
  // A reload restores the retained turn with its files from tab storage, not from this page's memory.
  expect(journal(new QueryClient()).read()).toMatchObject({ prompt, uploads });
  cache.clear();
});

it("a turn that cannot be retained keeps the files in the composer", async () => {
  const reserve = vi.spyOn(transport, "reserveConversationTurn");
  const cache = new QueryClient(),
    { command } = mount(cache),
    attachments = { sendArgument: () => uploads, sent: vi.fn() };
  storage.setItem = () => {
    throw Error("synthetic full storage");
  };
  expect(
    await command.start(binding, prompt, vi.fn(), undefined, {}, attachments),
  ).toBe(false);
  expect(attachments.sent).not.toHaveBeenCalled();
  expect(reserve).not.toHaveBeenCalled();
  cache.clear();
});

it("check and discard of a released follow-up give back its text and its files", async () => {
  for (const path of ["check", "discard"] as const) {
    const cache = new QueryClient(),
      turns = journal(cache);
    turns.discard();
    turns.start(
      binding,
      prompt,
      "a0000000-0000-4000-8000-00000000000b",
      undefined,
      {},
      uploads,
    );
    vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue({
      schema: "meri.conversation-turn/1",
      sourceBinding: binding,
      targetBinding: nextBinding,
      state: "RESERVED",
      replayed: true,
    });
    const { command } = mount(cache),
      restore = vi.fn();
    if (path === "check") await command.check(undefined, restore);
    else await command.discard(nextBinding.runId, restore);
    expect(restore, path).toHaveBeenCalledExactlyOnceWith(prompt, uploads);
    expect(turns.read()).toBeUndefined();
    vi.restoreAllMocks();
    cache.clear();
  }
});

it("a follow-up without files sends none, and a completed turn is acknowledged only with its exact files", async () => {
  const cache = new QueryClient(),
    turns = journal(cache);
  turns.start(binding, prompt, "a0000000-0000-4000-8000-00000000000b");
  expect(turns.read()).not.toHaveProperty("uploads");
  turns.discard();
  turns.start(
    binding,
    prompt,
    "a0000000-0000-4000-8000-00000000000b",
    undefined,
    {},
    uploads,
  );
  const page = async (files: typeof uploads) => {
    const target = turn(
      nextBinding,
      "a0000000-0000-4000-8000-00000000000b",
      prompt,
      2,
      2,
    );
    Object.assign(target.request, { uploads: files });
    return transport.readConversationTranscript(
      { conversationId: binding.conversationId, after: 2, limit: 100 },
      new AbortController().signal,
      async () =>
        Response.json({
          schema: "meri.conversation-transcript/1",
          conversation,
          latestRun: target.run,
          latestSequenceBase: 2,
          turns: [target],
          events: [
            event(1, "The codeword is PELICAN.", nextBinding),
            status(2, "completed", nextBinding),
          ].map((value, index) => ({ sequence: index + 3, event: value })),
          nextSequence: 4,
          lastSequence: 4,
          hasMore: false,
          pendingTurn: null,
        }),
    );
  };
  const other: typeof uploads = [{ ...uploads[0], sha256: "b".repeat(64) }];
  expect(turns.canAcknowledgeCompleted(await page(other))).toBe(false);
  expect(turns.canAcknowledgeCompleted(await page(uploads))).toBe(true);
  cache.clear();
});

it("an admitted message takes its files out of the composer; a refused one offers them again", async () => {
  vi.stubGlobal("crypto", {
    randomUUID: () => "a0000000-0000-4000-8000-00000000000c",
  });
  for (const outcome of ["admitted", "refused"] as const) {
    // Each outcome is its own run, so neither sees the other's retained request.
    const context = contextFor(outcome === "admitted" ? binding : nextBinding);
    const intents = conversationIntentJournal(
      new QueryClient(),
      context,
      storage,
    );
    const sent = vi.fn(),
      offer = vi.fn();
    const port = {
      context,
      getSnapshot: () => ({
        status: "ready",
        submit: "idle",
        observation: null,
      }),
      uploads: { sendArgument: () => uploads, sent, offer },
      submitInitial: vi.fn(async () => {
        if (outcome === "refused")
          throw new ConversationUnavailable(MONTHLY_CAP_REACHED, 429);
      }),
      submit: vi.fn(),
    } as unknown as MeriConversationPort;
    const sending = sendRequest(
      port,
      { read: intents.read, write: (value) => void intents.write(value) },
      prompt,
      false,
      true,
    );
    if (outcome === "refused") await expect(sending).rejects.toThrow();
    else await sending;
    expect(port.submitInitial).toHaveBeenCalledWith(
      expect.objectContaining({ uploads }),
    );
    if (outcome === "admitted") {
      expect(sent).toHaveBeenCalledWith(uploads);
      expect(offer).not.toHaveBeenCalled();
    } else {
      // A refused target submit gives the follow-up's files back to the composer that now shows the message.
      expect(sent).not.toHaveBeenCalled();
      expect(offer).toHaveBeenCalledWith(uploads);
    }
  }
});
