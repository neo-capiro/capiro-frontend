import { expect, it } from "vitest";
import {
  receiveIntentsResponse,
  type IntentsProposal,
} from "@capiro/meri-client/intents";
import {
  intentRow,
  proposalFields,
} from "../src/features/meri/conversation/intents/intent-view";
import { nativeTaskIntent } from "./meri-intents-native-fixtures";
import { memoryIntent } from "./meri-memory-intent-fixture";

const now = Date.parse("2026-10-12T20:00:10.000Z");
const viewer = { tenantId: "tenant", actorId: "actor" };
async function receivedRow(fixture: ReturnType<typeof memoryIntent>) {
  const received = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify(fixture.response),
    { request: fixture.request },
  );
  if ("error" in received) throw Error("Unexpected refusal");
  return intentRow(received.intents[0]!, now, viewer);
}

it("shows every character of a memory proposal and its destination before approval", () => {
  const fixture = nativeTaskIntent();
  const proposal = fixture.response.intents[0].proposal;
  const content = "A long reviewed memory.\n".repeat(100);
  proposal.command.action = "memory.propose";
  proposal.command.arguments = {
    content,
    key: null,
    scope: "personal",
    clientId: null,
    ttlDays: 30,
  };
  const fields = Object.fromEntries(
    proposalFields(proposal as IntentsProposal).map((field) => [
      field.label,
      field.value,
    ]),
  );
  expect(fields["Exact proposed content"]).toBe(content);
  expect(fields.Destination).toBe("Personal memory (private)");
  expect(fields.Effect).toContain("does not activate or publish");
});

it.each([
  ["pending", "Submitted for review"],
  ["approved", "Review approved"],
  ["rejected", "Review rejected"],
  ["withdrawn", "Review withdrawn"],
  ["not_found", "Review unavailable"],
] as const)(
  "shows current %s review separately from submission",
  async (status, expected) => {
    const fixture = memoryIntent(status);
    const row = await receivedRow(fixture);
    expect(row).toMatchObject({
      status: expected,
      decision: "closed",
      title: "Propose a memory for review",
    });
    expect(row.task).toBeUndefined();
    expect(row.fileLinks).toBeUndefined();
    const fields = Object.fromEntries(
      row.result.map((f) => [f.label, f.value]),
    );
    expect(fields.Submitted).toBe("2026-10-12T20:00:00.000Z");
    expect(fields["Review checked"]).toBe("2026-10-12T20:02:00.000Z");
    expect("Published memory reference" in fields).toBe(status === "approved");
    expect(fields["Task created"]).toBeUndefined();
    if (status === "pending")
      expect(row.detail).toContain("does not activate or publish");
    if (status === "not_found")
      expect(row.detail).toContain("does not authorize another submission");
  },
);

it("offers the exact awaiting memory proposal only to its retained approver", async () => {
  const fixture = memoryIntent();
  const item = fixture.response.intents[0];
  item.phase = "awaiting_approval";
  item.decision = null;
  item.execution = null;
  const row = await receivedRow(fixture);
  expect(row.decision).toBe("approvable");
  expect(row.result).toEqual([]);
  expect(intentRow(item, now, { ...viewer, actorId: "other" }).decision).toBe(
    "held",
  );
  expect(intentRow(item, now + 60_000, viewer).decision).toBe("closed");
});

it.each(["candidate", "approval", "publication"])(
  "refuses mismatched %s evidence before presentation",
  async (mismatch) => {
    const fixture = memoryIntent();
    const outcome = fixture.response.intents[0].execution.outcome;
    if (mismatch === "candidate")
      outcome.result.candidateSha256 = "f".repeat(64);
    if (mismatch === "approval")
      outcome.execution.approvalDecisionSha256 = "f".repeat(64);
    if (mismatch === "publication")
      outcome.result.review.publishedMemoryId =
        "clio:00000000-0000-4000-8000-000000000702";
    await expect(receivedRow(fixture)).rejects.toThrow();
  },
);
