import { describe, expect, it } from "vitest";
import { conversationRetryHints } from "../src/features/meri/conversation/conversation-retry-hints";

const clientId = "10000000-0000-4000-8000-000000000001";
const conversationId = "20000000-0000-4000-8000-000000000001";

describe("an explicit retry after a lost session", () => {
  it("re-opens the same conversation without the run the service refused", () => {
    // Only an issuance with no exact run reaches Meri's re-preparation of a never-started
    // original; the pinned run itself is refused (INITIAL_BINDING_EXPIRED).
    expect(
      conversationRetryHints({
        accessLost: true,
        clientId,
        conversationId,
      }),
    ).toEqual({ clientId, conversationId });
  });

  it("never broadens to another client or another conversation", () => {
    const hints = conversationRetryHints({
      accessLost: true,
      clientId,
      conversationId,
    });
    expect(hints).not.toHaveProperty("runId");
    expect(Object.values(hints!)).toEqual([clientId, conversationId]);
  });

  it("keeps the exact binding for a retry that did not lose access", () => {
    // Renewal, expiry and every other reconnect keep their exact admitted run.
    expect(
      conversationRetryHints({
        accessLost: false,
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
        clientId,
        conversationId: undefined,
      }),
    ).toBeUndefined();
  });

  it("recovers a General conversation at conversation scope", () => {
    expect(
      conversationRetryHints({
        accessLost: true,
        clientId: null,
        conversationId,
      }),
    ).toEqual({ clientId: null, conversationId });
  });
});
