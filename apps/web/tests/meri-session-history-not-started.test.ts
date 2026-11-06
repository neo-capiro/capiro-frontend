import { expect, it } from "vitest";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import { EMPTY_HISTORY_SCHEMA } from "@capiro/meri-contracts/conversation-application";
import {
  binding,
  context,
  scopes,
} from "../test/browser/meri-conversation-fixtures";

it.each([200, 404, 403, 503])(
  "only successful explicit empty history has no run (HTTP %s)",
  async (status) => {
    const body =
      status === 200
        ? { schema: EMPTY_HISTORY_SCHEMA, binding, scopes }
        : {
            error: {
              code:
                status === 404
                  ? "NOT_FOUND"
                  : status === 403
                    ? "SESSION_REFUSED"
                    : "CONVERSATION_UNAVAILABLE",
            },
          };
    const client = createMeriConversation({
      context,
      credential: `action_session_${"s".repeat(43)}`,
      expiresAtMs: Date.now() + 60_000,
      signal: new AbortController().signal,
      isCurrent: () => true,
      onAccessLost: () => {},
      fetchImpl: async () => Response.json(body, { status }),
    });
    try {
      if (status === 200) {
        const snapshot = await client.history();
        expect(snapshot.status).toBe("ready");
        expect(snapshot.observation).toBeNull();
        expect(snapshot.acceptedRequest).toBeNull();
      } else {
        await expect(client.history()).rejects.toThrow();
        expect(client.getSnapshot().status).not.toBe("ready");
      }
      expect(() => client.openChat()).toThrow();
      await expect(client.cancel()).rejects.toThrow();
    } finally {
      client.dispose();
    }
  },
);
