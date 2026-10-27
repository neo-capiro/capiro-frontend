import { expect, it } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
import {
  savedNoteFixture,
  withheldNote,
  noteConversationId,
  noteId,
  noteViewer,
} from "./meri-saved-note-fixture";

async function receive(item: unknown) {
  const page = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({
      conversationId: noteConversationId,
      intents: [item],
      next: null,
    }),
    { request: { conversationId: noteConversationId, limit: 50 } },
  );
  if (!("intents" in page)) throw Error("Saved-note fixture refused");
  return intentRows(page.intents, Date.now(), noteViewer)[0]!;
}

it("keeps General and meeting notes distinct from Documents, memory and approvals", async () => {
  for (const destination of ["general", "meeting"] as const) {
    const row = await receive(savedNoteFixture(destination));
    expect(row.status).toBe("Note saved");
    expect(row.result).toContainEqual({
      label: "Destination",
      value: destination === "general" ? "General note" : "Meeting note",
    });
    expect(row.result).toContainEqual({
      label: "Note reference",
      value: noteId(destination === "general" ? 43 : 40),
    });
    expect(row.result.some((f) => f.label === "Meeting note reference")).toBe(
      destination === "meeting",
    );
    expect(JSON.stringify(row)).not.toMatch(
      /Document reference|memory|note body text/,
    );
    expect(row.proposal).toBeNull();
    expect(row.decision).toBe("closed");
  }
});

it("preserves client storage, scanning, indexing and private readiness independently", async () => {
  const expected = {
    indexing: "Note saved · indexing pending",
    indexed: "Note saved and indexed",
    private: "Private note saved",
    scanning: "Note stored · scanning pending",
    unavailable: "Stored note unavailable",
  } as const;
  for (const [readiness, status] of Object.entries(expected)) {
    const item = savedNoteFixture(
      "client_document",
      "saved",
      readiness as keyof typeof expected,
    );
    const row = await receive(item);
    expect(row.status).toBe(status);
    expect(row.result).toContainEqual({
      label: "Document reference",
      value: noteId(42),
    });
    expect(row.result).toContainEqual({
      label: "Existing result reused",
      value: "false",
    });
    expect(row.proposal).toBeNull();
    expect(row.decision).toBe("closed");
    if (readiness === "scanning" || readiness === "unavailable")
      expect(row.tone).toBe("warning");
  }
});

it("UNKNOWN, WARN, BLOCK and terminal failure carry no receipt or decision", async () => {
  const expected = {
    unknown: "Save uncertain",
    withheld: "Save withheld",
    blocked: "Save blocked",
    failed: "Save not confirmed",
  } as const;
  for (const [status, label] of Object.entries(expected)) {
    const row = await receive(
      savedNoteFixture("general", status as keyof typeof expected),
    );
    expect(row.status).toBe(label);
    expect(row.title).toBe("Note");
    expect(row.result).toEqual([]);
    expect(row.fields).toEqual([]);
    expect(row.decision).toBe("closed");
    expect(row.proposal).toBeNull();
  }
  const row = await receive(withheldNote());
  expect(row.status).toBe("Unavailable");
  expect(row.result).toEqual([]);
  expect(row.proposal).toBeNull();
});

it("the physical public receiver refuses expanded, foreign and contradictory saved-note history", async () => {
  const original = savedNoteFixture();
  const invalid: unknown[] = [
    {
      ...original,
      result: { ...original.result, body: "private body must not cross" },
    },
    {
      ...original,
      result: {
        ...original.result,
        binding: { ...original.result.binding, conversationId: noteId(99) },
      },
    },
    { ...original, result: { ...original.result, documentId: noteId(42) } },
    { ...original, result: { ...original.result, status: "unknown" } },
  ];
  for (const item of invalid) await expect(receive(item)).rejects.toThrow();
});
