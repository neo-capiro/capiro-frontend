import { afterEach, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";
import {
  clearMeriConversationRecovery,
  discardMeriConversationRecovery,
} from "../src/shared/meri-conversations/conversation-recovery";
import { createInitialDraftOwner } from "../src/shared/meri-conversations/initial-draft";
import { conversationTurnJournal } from "../src/shared/meri-conversations/turn-journal";
import {
  syncMeriTabIdentity,
  TabJournalUnavailable,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { context } from "../test/browser/meri-conversation-fixtures";

const scope = { ...context, clientId: context.selectedClientId };
const account = { tenantId: context.tenantId, actorId: context.actorId };
const message = new TabJournalUnavailable().message;
const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach((dispose) => dispose()));
function memoryStorage() {
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
  syncMeriTabIdentity("synthetic-discard", storage);
  return { storage, values };
}

// 2 Nov preview: a General thread whose message this tab could not recover (an unresolved cancellation leaves
// no request to compare, so fresh history never settles it) showed "This tab could not safely save or recover
// the message" with no pending turn to check, and every typed prompt stayed in the box. The person can always
// give it up: the conversation's message records start again empty and a new message can be written and sent.
it("discarding an unrecoverable message unlocks the draft, the run's request and the next turn", () => {
  const { storage, values } = memoryStorage();
  const cache = new QueryClient();
  cleanup.push(() => cache.clear());
  const other = { ...context, conversationId: "other-conversation" };
  const draft = createInitialDraftOwner(scope, storage);
  draft.edit("Earlier text");
  const journal = conversationIntentJournal(cache, context, storage);
  journal.write({
    submit: {
      requestId: "a0000000-0000-4000-8000-00000000000a",
      prompt: "Earlier text",
      state: "observed",
    },
    cancel: "unknown",
  });
  conversationIntentJournal(cache, other, storage).write({
    submit: {
      requestId: "b0000000-0000-4000-8000-00000000000b",
      prompt: "Another conversation",
      state: "unknown",
    },
  });
  // Access loss retires the scope; the unresolved cancellation leaves an unreadable request record.
  clearMeriConversationRecovery(cache, scope, storage);
  const blocked = conversationIntentJournal(cache, context, storage);
  expect(blocked.recoveryBlocked).toBe(true);
  expect(draft.error()).toBe(message);
  // Typing still works in the mounted page, but every command stays locked.
  expect(() => draft.edit("New message the person typed")).toThrow(
    TabJournalUnavailable,
  );
  expect(draft.draft()).toBe("New message the person typed");

  discardMeriConversationRecovery(cache, scope, storage);

  // Every owner of the discarded records stops; fresh ones start empty and unlocked.
  expect(() => blocked.write({})).toThrow(TabJournalUnavailable);
  const fresh = conversationIntentJournal(cache, context, storage);
  expect(fresh.recoveryBlocked).toBe(false);
  expect(fresh.current()).toBe(true);
  expect(fresh.read()).toEqual({});
  const freshDraft = createInitialDraftOwner(scope, storage);
  expect(freshDraft.error()).toBeUndefined();
  freshDraft.edit(draft.draft());
  expect(freshDraft.draft()).toBe("New message the person typed");
  const turn = conversationTurnJournal(
    cache,
    account,
    context.selectedClientId,
    context.conversationId,
    storage,
  );
  expect(turn.recoveryBlocked).toBe(false);
  expect(turn.current()).toBe(true);
  // A new message can be recorded for the run again.
  expect(
    fresh.write({
      submit: {
        requestId: "c0000000-0000-4000-8000-00000000000c",
        prompt: "New message the person typed",
        state: "pending",
      },
    }),
  ).toBe(true);
  // Nothing of another conversation is touched.
  expect(
    conversationIntentJournal(cache, other, storage).read().submit?.prompt,
  ).toBe("Another conversation");
  expect([...values.keys()].some((key) => key.includes("other-conversation"))).toBe(true);
});
