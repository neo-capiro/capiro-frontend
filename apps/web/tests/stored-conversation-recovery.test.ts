import { describe, expect, it } from "vitest";
import { storedConversationNeedsNewChat } from "../src/shared/meri-conversations/stored-conversation-recovery";

describe("storedConversationNeedsNewChat", () => {
  it("rotates a stored conversation exactly once when Meri refuses its session", () => {
    expect(storedConversationNeedsNewChat("unavailable", true, false)).toBe(
      true,
    );
    expect(storedConversationNeedsNewChat("unavailable", true, true)).toBe(
      false,
    );
  });
  it("never rotates a conversation created in this page load", () => {
    expect(storedConversationNeedsNewChat("unavailable", false, false)).toBe(
      false,
    );
  });
  it("leaves connecting, expired and ready sessions alone", () => {
    for (const status of ["idle", "connecting", "expired", "ready"] as const)
      expect(storedConversationNeedsNewChat(status, true, false)).toBe(false);
  });
});
