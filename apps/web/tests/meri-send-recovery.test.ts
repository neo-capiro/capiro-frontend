import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { moveDraftToNewConversation } from "../src/shared/meri-conversations/new-conversation-draft";
import {
  readFirstChatIntent,
  type FirstChatScope,
} from "../src/shared/meri-conversations/first-chat-intent";
import { createInitialDraftOwner } from "../src/shared/meri-conversations/initial-draft";
import { submissionIdentity } from "../src/shared/meri-conversations/query-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { composerAvailability } from "../src/features/meri/conversation/MeriLiveConversation";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import { ORIGINAL_INPUT_CLOSED } from "../src/features/meri/conversation/skill-refusal";
import type { useLiveRun } from "../src/features/meri/conversation/useLiveRun";

// Acceptance 2 Nov: a first message whose conversation can no longer take it (its original input expired or belongs
// to another message) left the thread locked; a leftover capture made Enter do nothing; an uncertain request that
// a retry could only fail again had no way out.

const buttons = vi.hoisted(() => [] as Array<{ children: ReactNode }>);
vi.mock("@capiro/ui/button", () => ({
  Button: (props: { onClick: () => void; children: ReactNode }) => {
    buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  },
}));
afterEach(() => {
  buttons.length = 0;
  vi.unstubAllGlobals();
});

const tenantId = "10000000-0000-4000-8000-000000000001";
const actorId = "10000000-0000-4000-8000-000000000002";
const closed = "20000000-0000-4000-8000-000000000003";
const opened = "20000000-0000-4000-8000-000000000004";
function memory(): TabStorage {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  syncMeriTabIdentity("synthetic-send-recovery", storage);
  return storage;
}

it("moves the unsent first message to a new conversation of the same scope as its unsent draft, sending nothing", async () => {
  const storage = memory();
  const scope: FirstChatScope = {
    tenantId,
    actorId,
    scopeKind: "general",
    clientId: null,
  };
  const bodies: unknown[] = [];
  const createOrReuse = vi.fn(async (body: { requestId: string }) => {
    bodies.push(body);
    return {
      schemaVersion: 2,
      requestId: body.requestId,
      conversationId: opened,
      tenantId,
      actorId,
      scopeKind: "general",
      clientId: null,
    };
  });
  const moved = await moveDraftToNewConversation({
    scope,
    currentConversationId: closed,
    draft: "Summarize the attached PDF",
    intentStorage: storage,
    tabStorage: storage,
    signal: new AbortController().signal,
    createOrReuse,
  });
  expect(moved).toEqual({ conversationId: opened });
  expect(createOrReuse).toHaveBeenCalledOnce();
  expect(bodies[0]).toMatchObject({ schemaVersion: 2, scopeKind: "general" });
  expect(readFirstChatIntent(scope, storage)).toMatchObject({
    state: "confirmed",
    conversationId: opened,
  });
  const draft = createInitialDraftOwner(
    { tenantId, actorId, clientId: null, conversationId: opened },
    storage,
  );
  expect(draft.draft()).toBe("Summarize the attached PDF");
  // The closed conversation's own draft record is untouched.
  expect(
    createInitialDraftOwner(
      { tenantId, actorId, clientId: null, conversationId: closed },
      storage,
    ).draft(),
  ).toBe("");
});

it("a conversation closed to its first message offers no send in place, only the move", () => {
  const run = {
    intent: {},
    busy: false,
    failure: undefined,
    refusal: { code: ORIGINAL_INPUT_CLOSED },
    snapshot: { status: "ready", observation: null },
  } as never;
  const availability = composerAvailability(
    run,
    null,
    [],
    undefined,
    undefined,
    undefined,
    undefined,
    false,
    false,
  );
  expect(availability.originalClosed).toBe(true);
  expect(availability.initial).toBe(false);
  expect(availability.sendBlocked).toBe(
    "This conversation can no longer start with a new message. Send it in a new conversation.",
  );
  // A conversation with an answered turn is not closed: its next message is an ordinary next turn.
  const answered = composerAvailability(
    run,
    { runState: "failed" } as never,
    [],
    undefined,
    undefined,
    undefined,
    undefined,
    true,
    false,
  );
  expect(answered.originalClosed).toBe(false);
});

it("a capture left on a finished run settles from the run's admitted request instead of swallowing later sends", () => {
  const storage = memory();
  const scope = { tenantId, actorId, clientId: null, conversationId: closed };
  const context = {
    tenantId,
    actorId,
    selectedClientId: null,
    conversationId: closed,
    runId: "30000000-0000-4000-8000-000000000005",
  };
  const request = {
    requestId: "40000000-0000-4000-8000-000000000006",
    prompt: "First question",
  };
  const delivered = createInitialDraftOwner(scope, storage);
  delivered.edit("First question");
  delivered.begin(context, request, "First question");
  expect(delivered.hasPending(context)).toBe(true);
  expect(delivered.settleTerminal(context, request.requestId)).toBe(true);
  expect(delivered.hasPending(context)).toBe(false);
  expect(delivered.draft()).toBe("");
  // Never admitted to this run: released, and the person's text stays.
  const other = createInitialDraftOwner(scope, storage);
  other.edit("Kept text");
  other.begin(context, { ...request, prompt: "Kept text" }, "Kept text");
  expect(
    other.settleTerminal(context, "40000000-0000-4000-8000-0000000000ff"),
  ).toBe(false);
  expect(other.hasPending(context)).toBe(false);
  expect(other.draft()).toBe("Kept text");
  expect(submissionIdentity(request)).toContain(request.requestId);
});

it("an uncertain request whose retry was answered and still failed can be discarded", () => {
  const status = (error: string | undefined, failure?: string) =>
    renderToStaticMarkup(
      createElement(RunStatus, {
        run: {
          snapshot: { status: "ready", observation: null, cancelReceipt: null },
          intent: {
            submit: {
              requestId: "40000000-0000-4000-8000-000000000007",
              prompt: "Hello",
              state: "unknown",
            },
          },
          busy: false,
          error,
          failure,
          refusal: undefined,
          transcript: "loaded",
          observing: "idle",
        } as unknown as ReturnType<typeof useLiveRun>,
        active: false,
        onDiscardUncertain: vi.fn(),
      }),
    );
  expect(status(undefined)).not.toContain("Discard and write a new message");
  expect(status("REQUEST_REPLAY_REFUSED")).toContain(
    "Discard and write a new message",
  );
  // Control not answering keeps only the plain retry.
  expect(status("CONVERSATION_UNAVAILABLE", "unreachable")).not.toContain(
    "Discard and write a new message",
  );
});
