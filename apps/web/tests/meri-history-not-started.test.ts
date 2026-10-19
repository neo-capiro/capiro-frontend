import { expect, it } from "vitest";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";
import { historyNotStarted } from "../src/shared/meri-conversations/history-queries";

it("reads Meri's NOT_FOUND before the first run as an empty history, not a failure", () => {
  expect(
    historyNotStarted(new ConversationHistoryUnavailable(404, "NOT_FOUND")),
  ).toBe(true);
});

it("keeps every other history refusal explicit", () => {
  for (const error of [
    new ConversationHistoryUnavailable(404, "HISTORY_UNAVAILABLE"),
    new ConversationHistoryUnavailable(502, "STORE_CORRUPT"),
    new ConversationHistoryUnavailable(403, "MEMBERSHIP_CHANGED"),
    new Error("Conversation client mismatch"),
    null,
  ])
    expect(historyNotStarted(error)).toBe(false);
});
