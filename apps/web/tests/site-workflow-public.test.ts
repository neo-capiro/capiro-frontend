import { expect, it } from "vitest";
import {
  receiveConversationRequest,
  type ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";
const selection = {
  siteId: "synthetic-site",
  workflowId: "synthetic-task",
  version: 2,
  manifestSha256: "a".repeat(64),
};
const input: ConversationSubmitRequest = {
  requestId: "10000000-0000-4000-8000-000000000001",
  prompt: "Read selected filings",
  siteWorkflow: selection,
};
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
it("the installed public receiver retains the exact admin workflow selection", () => {
  expect(
    receiveConversationRequest("submit", bytes(input)).siteWorkflow,
  ).toEqual(selection);
});
it("the installed public receiver refuses authority-bearing or malformed workflow choices", () => {
  for (const siteWorkflow of [
    null,
    { ...selection, version: 0 },
    { ...selection, manifestSha256: "different" },
    { ...selection, cookie: "synthetic" },
    { ...selection, origins: ["https://example.invalid"] },
  ])
    expect(() =>
      receiveConversationRequest("submit", bytes({ ...input, siteWorkflow })),
    ).toThrow();
});
it("ordinary conversations do not acquire a selected workflow", () => {
  const { siteWorkflow, ...ordinary } = input;
  void siteWorkflow;
  expect(
    receiveConversationRequest("submit", bytes(ordinary)).siteWorkflow,
  ).toBeUndefined();
});
