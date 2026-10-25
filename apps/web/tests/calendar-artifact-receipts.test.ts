import { expect, it } from "vitest";
import {
  prepareMeetingCommand,
  type MeetingChange,
} from "../src/features/portfolio/calendar/commands/recovery";
import { meetingReceiptSchema } from "../src/features/portfolio/calendar/commands/receipt";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = { tenantId: id(1), userId: id(2) };
const revision = "2026-10-24T12:00:00.000Z";
for (const operation of [
  "note-create",
  "note-update",
  "note-approve",
  "debrief-create",
  "debrief-update",
  "debrief-approve",
] as const) {
  it(`${operation} requires the exact persisted command and result identity`, async () => {
    const create = operation.endsWith("create"),
      approve = operation.endsWith("approve");
    const change: MeetingChange = {
      operation,
      meetingId: id(3),
      expectedClientId: id(4),
      expectedRevision: revision,
      meeting: null,
      artifacts: [],
      artifact: {
        id: create ? null : id(5),
        revision: create ? null : revision,
        body: approve ? null : "Reviewed draft",
        confidential: approve ? null : false,
      },
    };
    const a = await prepareMeetingCommand(actor, change, id(6));
    const type = operation.startsWith("note-") ? "note" : "debrief";
    const row = {
      schemaVersion: 1,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      requestId: a.input.requestId,
      payloadDigest: a.payloadDigest,
      operation,
      requestedMeetingId: id(3),
      expectedClientId: id(4),
      status: "completed",
      refusal: null,
      createdAt: revision,
      available: true,
      result: {
        meetingId: id(3),
        clientId: id(4),
        revision,
        artifacts: [{ type, id: id(5), revision }],
      },
    };
    const schema = meetingReceiptSchema(actor, a.input, a.payloadDigest);
    expect(schema.safeParse(row).success).toBe(true);
    for (const result of [
      { ...row.result, meetingId: id(9) },
      { ...row.result, clientId: null },
      { ...row.result, artifacts: [] },
      {
        ...row.result,
        artifacts: [
          { type: type === "note" ? "debrief" : "note", id: id(5), revision },
        ],
      },
      { ...row.result, artifacts: [{ type, id: id(5), revision: 2 }] },
    ])
      expect(schema.safeParse({ ...row, result }).success).toBe(false);
    if (!create)
      expect(
        schema.safeParse({
          ...row,
          result: { ...row.result, artifacts: [{ type, id: id(9), revision }] },
        }).success,
      ).toBe(false);
    expect(
      schema.safeParse({ ...row, payloadDigest: "a".repeat(64) }).success,
    ).toBe(false);
    expect(schema.safeParse({ ...row, status: "refused" }).success).toBe(false);
  });
}
it("attachments use integer metadata revisions including zero", async () => {
  const change: MeetingChange = {
    operation: "share",
    meetingId: id(3),
    expectedClientId: id(4),
    expectedRevision: revision,
    meeting: null,
    artifact: null,
    artifacts: [{ type: "attachment", id: id(5), revision: 0 }],
  };
  const a = await prepareMeetingCommand(actor, change, id(6));
  expect(a.input.artifacts[0]!.revision).toBe(0);
  await expect(
    prepareMeetingCommand(
      actor,
      { ...change, artifacts: [{ type: "attachment", id: id(5), revision }] },
      id(6),
    ),
  ).rejects.toThrow();
});
