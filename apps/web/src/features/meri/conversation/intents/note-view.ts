import type { IntentsItem } from "@capiro/meri-client/intents";
import type { IntentField, IntentRow } from "./intent-view-types";

type SavedNoteItem = Extract<IntentsItem, { kind: "saved_note" }>;
type SavedNoteResult = Extract<SavedNoteItem, { result: unknown }>["result"];

const destinations = {
  general: "General note",
  meeting: "Meeting note",
  client_document: "Client Files document",
} as const;

function savedNoteReceipt(result: SavedNoteResult): readonly IntentField[] {
  return [
    ...(result.destination
      ? [{ label: "Destination", value: destinations[result.destination] }]
      : []),
    ...(result.noteId
      ? [{ label: "Note reference", value: result.noteId }]
      : []),
    ...(result.meetingNoteId
      ? [{ label: "Meeting note reference", value: result.meetingNoteId }]
      : []),
    ...(result.documentId
      ? [{ label: "Document reference", value: result.documentId }]
      : []),
    ...(result.location
      ? [{ label: "Recorded location", value: result.location }]
      : []),
    ...(typeof result.reused === "boolean"
      ? [{ label: "Existing result reused", value: String(result.reused) }]
      : []),
  ];
}

/** Direct policy-approved save history. This row never creates a second approval or resends a note. */
export function savedNoteRow(item: SavedNoteItem): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Note",
    proposal: null,
    decision: "closed" as const,
    fields: [],
    result: [],
  };
  if ("withheld" in item)
    return {
      ...base,
      status: "Unavailable",
      tone: "neutral",
      detail: "This note is unavailable with your current access.",
    };
  const result = item.result;
  if (result.status === "saved") {
    const looks = {
      ready: {
        status: "Note saved",
        tone: "success",
        detail: "The note owner confirmed the saved note.",
      },
      indexing: {
        status: "Note saved · indexing pending",
        tone: "neutral",
        detail:
          "The note is stored in Files. Search indexing is not confirmed.",
      },
      indexed: {
        status: "Note saved and indexed",
        tone: "success",
        detail: "The note owner confirmed storage and search indexing.",
      },
      private: {
        status: "Private note saved",
        tone: "success",
        detail:
          "The note is stored privately and excluded from shared knowledge.",
      },
      scanning: {
        status: "Note stored · scanning pending",
        tone: "warning",
        detail:
          "The note is stored, but scanning has not confirmed it is ready.",
      },
      unavailable: {
        status: "Stored note unavailable",
        tone: "warning",
        detail:
          "The owner returned a stored reference but did not confirm readiness.",
      },
    } satisfies Record<
      NonNullable<SavedNoteResult["readiness"]>,
      Pick<IntentRow, "status" | "tone" | "detail">
    >;
    return {
      ...base,
      ...(result.readiness ? looks[result.readiness] : looks.unavailable),
      title: "Saved note",
      result: savedNoteReceipt(result),
    };
  }
  if (result.status === "unknown")
    return {
      ...base,
      status: "Save uncertain",
      tone: "warning",
      detail:
        "The note may already have been saved. Refresh only reads its recorded status; the note will not be sent again.",
    };
  if (result.status === "withheld")
    return {
      ...base,
      status: "Save withheld",
      tone: "neutral",
      detail:
        "This note requires a review that is not available here. No save has been confirmed.",
    };
  if (result.status === "blocked")
    return {
      ...base,
      status: "Save blocked",
      tone: "danger",
      detail: "The current policy blocked this note save.",
    };
  return {
    ...base,
    status: "Save not confirmed",
    tone: "warning",
    detail:
      "No saved-note result was confirmed. Refresh to read its recorded status.",
  };
}
