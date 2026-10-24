import { expect, it } from "vitest";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";
import { historyNotStarted } from "../src/shared/meri-conversations/history-queries";

it.each(["NOT_FOUND", "CONVERSATION_NOT_FOUND"])(
  "presents canonical 404 %s as empty history without granting admission",
  (code) => {
    expect(
      historyNotStarted(new ConversationHistoryUnavailable(404, code)),
    ).toBe(true);
  },
);

it("keeps every other history refusal explicit", () => {
  for (const error of [
    new ConversationHistoryUnavailable(404, "HISTORY_UNAVAILABLE"),
    new ConversationHistoryUnavailable(403, "CONVERSATION_NOT_FOUND"),
    new ConversationHistoryUnavailable(401, "NOT_FOUND"),
    new ConversationHistoryUnavailable(502, "CONVERSATION_NOT_FOUND"),
    { status: 404, code: "CONVERSATION_NOT_FOUND" },
    new ConversationHistoryUnavailable(502, "STORE_CORRUPT"),
    new ConversationHistoryUnavailable(403, "MEMBERSHIP_CHANGED"),
    new Error("Conversation client mismatch"),
    null,
  ])
    expect(historyNotStarted(error)).toBe(false);
});
