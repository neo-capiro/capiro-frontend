import { describe, expect, it } from "vitest";
import { conversationRetryHints } from "../src/features/meri/conversation/conversation-retry-hints";
import { historyUnstarted } from "../src/shared/meri-conversations/history-queries";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";

const clientId = "10000000-0000-4000-8000-000000000001";
const conversationId = "20000000-0000-4000-8000-000000000001";

describe("an explicit retry after a lost session", () => {
  it("re-opens a never-started conversation without the run the service refused", () => {
    // Only an issuance with no exact run reaches Meri's re-preparation of a never-started
    // original; the pinned run itself is refused (INITIAL_BINDING_EXPIRED). `unstarted` is the
    // durable owner's NOT_FOUND (no run at all) with no submission retained in this tab.
    expect(
      conversationRetryHints({
        accessLost: true,
        unstarted: true,
        clientId,
        conversationId,
      }),
    ).toEqual({ clientId, conversationId });
  });

  it("never broadens to another client or another conversation", () => {
    const hints = conversationRetryHints({
      accessLost: true,
      unstarted: true,
      clientId,
      conversationId,
    });
    expect(hints).not.toHaveProperty("runId");
    expect(Object.values(hints!)).toEqual([clientId, conversationId]);
  });

  it("keeps the exact run of a started conversation, even after access loss", () => {
    // A conversation-scope issuance on a finished run would reserve its successor in Meri's
    // next-run owner; the exact run binds it read-only. Started or ambiguous keeps the pin.
    expect(
      conversationRetryHints({
        accessLost: true,
        unstarted: false,
        clientId,
        conversationId,
      }),
    ).toBeUndefined();
  });

  it("keeps the exact binding for a retry that did not lose access", () => {
    // Renewal, expiry and every other reconnect keep their exact admitted run.
    expect(
      conversationRetryHints({
        accessLost: false,
        unstarted: true,
        clientId,
        conversationId,
      }),
    ).toBeUndefined();
  });

  it("keeps the exact binding when no conversation is known", () => {
    // A missing conversation must never be replaced by a broader selection.
    expect(
      conversationRetryHints({
        accessLost: true,
        unstarted: true,
        clientId,
        conversationId: undefined,
      }),
    ).toBeUndefined();
  });

  it("recovers a never-started General conversation at conversation scope", () => {
    expect(
      conversationRetryHints({
        accessLost: true,
        unstarted: true,
        clientId: null,
        conversationId,
      }),
    ).toEqual({ clientId: null, conversationId });
  });
});

describe("the durable owner's never-started answer", () => {
  it("is the transcript's NOT_FOUND on an owned zero-run conversation", () => {
    expect(
      historyUnstarted(new ConversationHistoryUnavailable(404, "NOT_FOUND")),
    ).toBe(true);
  });

  it("is not a missing, foreign or trashed conversation, nor any other failure", () => {
    for (const cause of [
      new ConversationHistoryUnavailable(404, "CONVERSATION_NOT_FOUND"),
      new ConversationHistoryUnavailable(403, "ACCESS_DENIED"),
      new ConversationHistoryUnavailable(401, "UNAUTHENTICATED"),
      new ConversationHistoryUnavailable(503, "CONVERSATION_UNAVAILABLE"),
      new Error("NOT_FOUND"),
      undefined,
    ])
      expect(historyUnstarted(cause)).toBe(false);
  });
});
