import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { retainedNoteSchema, type RetainedNote } from "./command";

export const memberNoteRecoveryContract = {
  schema: retainedNoteSchema,
  requestId: (value: RetainedNote) => value.input.requestId,
  validateUpdate: (previous: RetainedNote, next: RetainedNote) => {
    if (
      JSON.stringify(previous.input) !== JSON.stringify(next.input) ||
      JSON.stringify(previous.member) !== JSON.stringify(next.member) ||
      previous.payloadDigest !== next.payloadDigest ||
      (previous.refusal &&
        JSON.stringify(previous.refusal) !== JSON.stringify(next.refusal))
    )
      throw new Error("The original Directory note command cannot change.");
  },
};
export function memberNoteRecoveryScope(actor: ClientWriter, memberId: string) {
  return JSON.stringify([
    "directory-member-note",
    actor.tenantId,
    actor.userId,
    memberId,
  ]);
}
