import type { IntentsItem } from "@capiro/meri-client/intents";
import { canonicalSha256 } from "./meri-action-wire-fixtures";

// Synthetic examples from the actual note author's contract and mounted-owner
// tests. No private body crosses the result. These cases use S3's frozen
// generated public receiver, not a frontend-local schema.
export const noteId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const noteConversationId = noteId(1);
export const noteViewer = { tenantId: noteId(80), actorId: noteId(81) };
export type SavedNoteItem = Extract<
  IntentsItem,
  { kind: "saved_note"; result: unknown }
>;
type Result = SavedNoteItem["result"];
export function savedNoteFixture(
  destination: NonNullable<Result["destination"]> = "general",
  status: Result["status"] = "saved",
  readiness: NonNullable<Result["readiness"]> = "ready",
): SavedNoteItem {
  const createdAt = new Date(Date.now() - 1000).toISOString();
  const body = "note body text";
  const saved = status === "saved";
  const client = saved && destination === "client_document";
  const meeting = saved && destination === "meeting";
  return {
    deliveryId: "sdk:" + "1".repeat(64),
    operation: { id: "save_note", version: "0.2.0" },
    createdAt,
    state: "prepared",
    kind: "saved_note",
    result: {
      status,
      operation: "save_note",
      binding: {
        ...noteViewer,
        conversationId: noteConversationId,
        runId: noteId(2),
        attemptId: noteId(3),
        workerId: noteId(4),
        writerFence: 1,
      },
      scopes: [
        {
          tenantId: noteViewer.tenantId,
          kind: "client",
          resourceId: noteId(5),
          policyRevision: "p1",
        },
      ],
      bodyHash: canonicalSha256({ body, length: body.length }),
      bodyLength: body.length,
      proposalId: noteId(20),
      policyOutcome:
        status === "withheld"
          ? "WARN"
          : status === "blocked"
            ? "BLOCK"
            : "PASS",
      createdAt,
      expiresAt: new Date(Date.now() + 50000).toISOString(),
      recordedAt: createdAt,
      destination: saved ? destination : null,
      noteId: saved ? noteId(client ? 42 : meeting ? 40 : 43) : null,
      meetingNoteId: meeting ? noteId(41) : null,
      documentId: client ? noteId(42) : null,
      location: client
        ? "https://core.invalid/files?attachmentId=" + noteId(42)
        : null,
      indexingStatus: client
        ? readiness === "indexed"
          ? "indexed"
          : readiness === "private"
            ? "not_indexed"
            : "pending"
        : null,
      readiness: saved ? readiness : null,
      reused: client ? false : null,
      generatedAt: saved ? createdAt : null,
      ...(saved ? {} : { errorCode: "note_" + status }),
    },
  };
}
export function withheldNote(item = savedNoteFixture()): IntentsItem {
  return {
    state: item.state,
    kind: item.kind,
    operation: item.operation,
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    withheld: true,
  };
}
