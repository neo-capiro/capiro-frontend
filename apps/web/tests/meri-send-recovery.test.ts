import { createElement, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { moveDraftToNewConversation } from "../src/shared/meri-conversations/new-conversation-draft";
import {
  readFirstChatIntent,
  type FirstChatScope,
} from "../src/shared/meri-conversations/first-chat-intent";
import { createInitialDraftOwner } from "../src/shared/meri-conversations/initial-draft";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { composerAvailability } from "../src/features/meri/conversation/MeriLiveConversation";
import { ORIGINAL_INPUT_CLOSED } from "../src/features/meri/conversation/skill-refusal";

// Acceptance 2 Nov: a first message whose conversation can no longer take it (its original input expired or belongs
// to another message) left the thread locked.

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
