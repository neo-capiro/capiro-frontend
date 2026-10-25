import { z } from "zod";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { commandSchema, type MeetingCommand } from "./input";

const reference = z
  .object({
    type: z.enum(["note", "debrief", "prep", "attachment"]),
    id: z.uuid(),
    revision: z.union([
      z.iso.datetime(),
      z.number().int().min(0).max(2147483647),
    ]),
  })
  .strict()
  .refine(
    (item) =>
      (item.type === "attachment") === (typeof item.revision === "number"),
  );
const receipt = z
  .object({
    schemaVersion: z.literal(1),
    tenantId: z.uuid(),
    actorUserId: z.uuid(),
    requestId: z.uuid(),
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    operation: commandSchema.shape.operation,
    requestedMeetingId: z.uuid().nullable(),
    expectedClientId: z.uuid().nullable(),
    status: z.enum(["completed", "refused"]),
    result: z
      .object({
        meetingId: z.uuid(),
        clientId: z.uuid().nullable(),
        revision: z.iso.datetime(),
        artifacts: z.array(reference).max(50),
      })
      .strict()
      .nullable(),
    refusal: z
      .object({
        code: z.literal("MEETING_COMMAND_REFUSED"),
        message: z.string().min(1).max(500),
      })
      .strict()
      .nullable(),
    createdAt: z.iso.datetime(),
    available: z.boolean(),
  })
  .strict();
export type MeetingReceipt = z.infer<typeof receipt>;

export function meetingReceiptSchema(
  actor: ClientWriter,
  input: MeetingCommand,
  digest: string,
) {
  return receipt.refine((value) => {
    if (
      value.tenantId !== actor.tenantId.toLowerCase() ||
      value.actorUserId !== actor.userId.toLowerCase() ||
      value.requestId !== input.requestId ||
      value.payloadDigest !== digest ||
      value.operation !== input.operation ||
      value.requestedMeetingId !== input.meetingId ||
      value.expectedClientId !== input.expectedClientId
    )
      return false;
    if (value.status === "refused")
      return (
        value.result === null && value.refusal !== null && !value.available
      );
    if (!value.result || value.refusal !== null) return false;
    const result = value.result;
    const target = input.meeting?.assignClient
      ? input.meeting.clientId
      : input.expectedClientId;
    if (
      (input.meetingId && result.meetingId !== input.meetingId) ||
      result.clientId !== target
    )
      return false;
    if (input.meeting) return result.artifacts.length === 0;
    if (input.artifact) {
      const item = result.artifacts[0];
      return (
        result.artifacts.length === 1 &&
        item?.type ===
          (input.operation.startsWith("note-") ? "note" : "debrief") &&
        (!input.artifact.id || item.id === input.artifact.id)
      );
    }
    return (
      result.artifacts.length === input.artifacts.length &&
      new Set(result.artifacts.map((item) => `${item.type}:${item.id}`))
        .size === result.artifacts.length &&
      input.artifacts.every((item) =>
        result.artifacts.some(
          (saved) => saved.type === item.type && saved.id === item.id,
        ),
      )
    );
  }, "The meeting outcome does not match the saved action.");
}
