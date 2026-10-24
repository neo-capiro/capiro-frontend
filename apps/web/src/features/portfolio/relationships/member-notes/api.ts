import type { ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { memberDetailSchema } from "../directory-contracts";
import {
  memberNoteCommandReceiptSchema,
  requireMemberNoteReceipt,
  type RetainedNote,
} from "./command";

export async function createMemberNote(
  api: ApiClient,
  actor: ClientWriter,
  attempt: RetainedNote,
  guard: () => void,
  signal: AbortSignal,
  beforeDispatch: () => Promise<void>,
) {
  guard();
  signal.throwIfAborted();
  const id = encodeURIComponent(attempt.member.id);
  // A current UI observation; Core also validates the canonical member before
  // committing the immutable note and audit together.
  await api.request(
    "core",
    `directory/members/${id}`,
    memberDetailSchema.refine(
      (value) => value.id === attempt.member.id,
      "Member identity mismatch",
    ),
    { signal },
  );
  guard();
  signal.throwIfAborted();
  await beforeDispatch();
  guard();
  signal.throwIfAborted();
  const value = await api.request(
    "core",
    `directory/members/${id}/note-commands`,
    memberNoteCommandReceiptSchema,
    {
      method: "POST",
      body: attempt.input,
      signal,
    },
  );
  guard();
  return requireMemberNoteReceipt(value, actor, attempt);
}

export async function recoverMemberNote(
  api: ApiClient,
  actor: ClientWriter,
  attempt: RetainedNote,
  guard: () => void,
  signal: AbortSignal,
) {
  guard();
  signal.throwIfAborted();
  const value = await api.request(
    "core",
    `directory/members/${encodeURIComponent(attempt.member.id)}/note-commands/${attempt.input.requestId}`,
    memberNoteCommandReceiptSchema,
    { signal },
  );
  guard();
  return requireMemberNoteReceipt(value, actor, attempt);
}
