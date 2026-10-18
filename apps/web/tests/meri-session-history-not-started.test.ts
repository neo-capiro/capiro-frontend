import { expect, it } from "vitest";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import { historyNotStarted } from "../src/features/meri/conversation/run-commands";

it("reads the session history's NOT_FOUND before the first run as an empty transcript", () => {
  expect(historyNotStarted(new ConversationUnavailable("NOT_FOUND"))).toBe(
    true,
  );
});

it("keeps every other history failure explicit", () => {
  for (const cause of [
    new ConversationUnavailable("SESSION_REFUSED"),
    new ConversationUnavailable("expired-session"),
    new ConversationUnavailable("CONVERSATION_UNAVAILABLE"),
    new Error("NOT_FOUND"),
    undefined,
  ])
    expect(historyNotStarted(cause)).toBe(false);
});
