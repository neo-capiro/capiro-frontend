import { expect, it } from "vitest";
import { unavailableResources } from "../src/shared/meri-resources/unavailable";

it("unavailable copy preserves source reception and does not claim personal preferences are unstored", () => {
  expect(unavailableResources.runs.missing).toContain(
    "conversation-lifecycle/0.1.0 already exports",
  );
  expect(unavailableResources.runs.summary).not.toContain("Stop are shown");
  expect(unavailableResources.newConversation.missing).toContain(
    "idempotent new-conversation consumer already exists",
  );
  expect(unavailableResources.conversationHistory.missing).toContain(
    "published conversation transcript",
  );
  expect(unavailableResources.approvals.missing).toContain(
    "conversation intent list and decision consumers already exist",
  );
  expect(unavailableResources.memory.missing).toContain(
    "personal owner-memory review route already exists",
  );
  expect(unavailableResources.preferences.summary).toContain(
    "can be saved when their connection is enabled",
  );
  expect(unavailableResources.preferences.summary).not.toMatch(
    /nothing is (saved|stored)/i,
  );
});
