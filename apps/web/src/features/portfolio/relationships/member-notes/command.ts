import { z } from "zod";
import { ApiError } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  memberNoteInputSchema,
  memberNoteReceiptSchema,
  memberReferenceSchema,
} from "./contracts";

export const memberNoteCommandSchema = memberNoteInputSchema
  .extend({
    schemaVersion: z.literal(1),
    requestId: z.uuid(),
    kind: z.literal("note"),
  })
  .strict();
export const memberNoteRefusalSchema = z
  .object({
    schemaVersion: z.literal(1),
    code: z.literal("DIRECTORY_NOTE_REFUSED"),
    requestId: z.uuid(),
    memberId: z.string().min(1),
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.union([z.literal(400), z.literal(404), z.literal(409)]),
    message: z.string().min(1).max(500),
  })
  .strict();
export const retainedNoteSchema = z
  .object({
    member: memberReferenceSchema,
    input: memberNoteCommandSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    refusal: memberNoteRefusalSchema.optional(),
  })
  .strict();
export type RetainedNote = z.infer<typeof retainedNoteSchema>;
export function memberNoteRefusal(error: unknown, attempt: RetainedNote) {
  if (!(error instanceof ApiError)) return;
  const parsed = memberNoteRefusalSchema.safeParse(error.details);
  if (
    parsed.success &&
    parsed.data.status === error.status &&
    parsed.data.requestId === attempt.input.requestId &&
    parsed.data.memberId === attempt.member.id &&
    parsed.data.payloadDigest === attempt.payloadDigest
  )
    return parsed.data;
}
export const memberNoteCommandReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  requestId: z.uuid(),
  tenantId: z.string().min(1),
  actorUserId: z.string().min(1),
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  note: memberNoteReceiptSchema,
});
export async function prepareMemberNote(
  actor: ClientWriter,
  member: z.infer<typeof memberReferenceSchema>,
  text: string,
  requestId = crypto.randomUUID(),
): Promise<RetainedNote> {
  const selected = memberReferenceSchema.parse(member);
  const input = memberNoteCommandSchema.parse({
    schemaVersion: 1,
    requestId,
    kind: "note",
    directoryContactName: selected.name,
    body: text,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        "directory-member-note",
        1,
        actor.tenantId,
        actor.userId,
        input.requestId,
        selected.id,
        input.directoryContactName,
        input.body,
      ]),
    ),
  );
  return {
    member: selected,
    input,
    payloadDigest: Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
export function requireMemberNoteReceipt(
  value: z.infer<typeof memberNoteCommandReceiptSchema>,
  actor: ClientWriter,
  attempt: RetainedNote,
) {
  const note = value.note;
  if (
    value.requestId !== attempt.input.requestId ||
    value.tenantId !== actor.tenantId ||
    value.actorUserId !== actor.userId ||
    value.payloadDigest !== attempt.payloadDigest ||
    note.id !== attempt.input.requestId ||
    note.directoryContactId !== attempt.member.id ||
    note.directoryContactName !== attempt.input.directoryContactName ||
    note.body !== attempt.input.body ||
    note.createdBy.id !== actor.userId
  )
    throw new ApiError(
      502,
      "The Directory note receipt does not match this saved command. Recover the original save before starting another note.",
    );
  return note;
}
