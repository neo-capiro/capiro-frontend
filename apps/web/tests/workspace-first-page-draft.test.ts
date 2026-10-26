import { expect, it } from "vitest";
import {
  captureFirstPage,
  editSummaryCell,
  firstPageChanges,
  toggleSummaryColumn,
  visibleSummaryColumns,
} from "../src/features/modules/workspace/hillday/first-page-draft";
import { firstPageDocument } from "./workspace-first-page-fixture";

it("edits one cell while retaining sparse facts, title and every untouched override", () => {
  const document = firstPageDocument();
  const draft = captureFirstPage(document);
  const next = editSummaryCell(draft, "meeting-one", "office", "Manual office");
  expect(firstPageChanges(next)).toEqual({
    ...document.firstPage,
    rows: [
      {
        meetingId: "meeting-one",
        member: "Manual member",
        room: "Manual room",
        office: "Manual office",
      },
      { meetingId: "meeting-two", minutes: "45" },
    ],
  });
  expect(firstPageChanges(draft)).toBeNull();
  expect(next.captured.updatedAt).toBe(document.updatedAt);
});

it("opening and reverting edits emit no replacement and do not freeze derived cells", () => {
  const document = firstPageDocument();
  document.firstPage = null;
  const draft = captureFirstPage(document);
  expect(firstPageChanges(draft)).toBeNull();
  const edited = editSummaryCell(draft, "meeting-two", "room", "New room");
  expect(firstPageChanges(edited)).toEqual({
    rows: [{ meetingId: "meeting-two", room: "New room" }],
  });
  expect(
    firstPageChanges(editSummaryCell(edited, "meeting-two", "room", "201")),
  ).toBeNull();
  expect(
    firstPageChanges({ ...draft, title: "Temporary", dateline: "New date" }),
  ).toEqual({ title: "Temporary", dateline: "New date" });
});

it("retains an intentional empty cell and existing title/dateline overrides", () => {
  const document = firstPageDocument();
  document.firstPage!.dateline = document.cover.dateline;
  const draft = editSummaryCell(
    captureFirstPage(document),
    "meeting-one",
    "room",
    "",
  );
  expect(firstPageChanges(draft)).toMatchObject({
    title: document.cover.title,
    dateline: document.cover.dateline,
    rows: [
      { meetingId: "meeting-one", room: "", member: "Manual member" },
      { meetingId: "meeting-two", minutes: "45" },
    ],
  });
});

it("keeps canonical column order, one visible column and no-op toggles", () => {
  const initial = captureFirstPage(firstPageDocument());
  expect(visibleSummaryColumns(initial)).toEqual([
    "time",
    "member",
    "office",
    "room",
    "minutes",
  ]);
  let draft = toggleSummaryColumn(initial, "staffLead");
  expect(visibleSummaryColumns(draft)).toEqual([
    "time",
    "member",
    "office",
    "room",
    "minutes",
    "staffLead",
  ]);
  expect(firstPageChanges(toggleSummaryColumn(draft, "staffLead"))).toBeNull();
  for (const column of [
    "staffLead",
    "minutes",
    "office",
    "member",
    "time",
  ] as const)
    draft = toggleSummaryColumn(draft, column);
  expect(visibleSummaryColumns(draft)).toEqual(["room"]);
  expect(toggleSummaryColumn(draft, "room")).toBe(draft);
  expect(firstPageChanges(draft)?.hiddenColumns).toEqual([
    "time",
    "member",
    "office",
    "minutes",
    "staffLead",
  ]);
});

it("refuses unknown or removed meeting identities instead of adding an override", () => {
  const document = firstPageDocument();
  document.summary = document.summary.slice(1);
  const draft = captureFirstPage(document);
  expect(() =>
    editSummaryCell(draft, "meeting-one", "room", "Changed"),
  ).toThrow("not in the displayed document");
  expect(() =>
    editSummaryCell(draft, "foreign-meeting", "room", "Changed"),
  ).toThrow("not in the displayed document");
});

it("captures the original revision and produces detached payloads as input changes", () => {
  const document = firstPageDocument();
  const draft = captureFirstPage(document);
  document.updatedAt = "2026-10-26T10:00:00.000Z";
  document.firstPage!.facts![0]!.value = "Later read";
  const edited = editSummaryCell(
    draft,
    "meeting-two",
    "room",
    "Submitted room",
  );
  const payload = firstPageChanges(edited);
  const later = editSummaryCell(edited, "meeting-two", "room", "Later input");
  expect(draft.captured.updatedAt).toBe("2026-10-26T09:00:00.000Z");
  expect(payload?.facts).toEqual([{ key: "Lead", value: "Manual lead" }]);
  expect(payload?.rows?.[1]?.room).toBe("Submitted room");
  expect(firstPageChanges(later)?.rows?.[1]?.room).toBe("Later input");
  expect(payload).not.toHaveProperty("timeZone");
  expect(payload).not.toHaveProperty("weekStart");
  expect(payload).not.toHaveProperty("sections");
});
