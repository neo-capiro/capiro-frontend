import { describe, expect, it } from "vitest";
import {
  bindMeetingFacts,
  createFactsDraft,
  prepareFactsChanges,
  savedEndpoint,
  type SavedMeetingFacts,
} from "../src/features/modules/workspace/hillday/meeting-facts-draft";
import { resolutionRead } from "../src/shared/capiro/operations/workspace-schemas";

const facts: SavedMeetingFacts = {
  subject: " Saved subject ",
  location: null,
  timeZone: "America/New_York",
  startsAt: "2026-11-01T01:30:00-0400",
  endsAt: "2026-11-01T01:15:00-0500",
};
const documentId = "53000000-0000-4000-8000-000000000001";

describe("saved meeting facts sparse edits", () => {
  it("retains both raw fold instants and null location for no-op and subject-only edits", () => {
    const draft = createFactsDraft(facts);
    expect(draft.start.time).toBe("01:30:00");
    expect(draft.end.time).toBe("01:15:00");
    expect(prepareFactsChanges(facts, draft)).toMatchObject({
      changes: {},
      errors: [],
      changed: false,
      start: { value: facts.startsAt, offset: "-04:00" },
      end: { value: facts.endsAt, offset: "-05:00" },
    });
    expect(
      prepareFactsChanges(facts, { ...draft, subject: "Changed subject" }),
    ).toMatchObject({ changes: { subject: "Changed subject" }, errors: [] });
    draft.start.time = "01:30:00.000";
    expect(prepareFactsChanges(facts, draft)).toMatchObject({
      changes: {},
      errors: [],
      start: { value: facts.startsAt },
    });
  });
  it("requires an explicit repeated-time occurrence after an edit", () => {
    const draft = createFactsDraft(facts);
    draft.start.time = "01:10:00";
    expect(prepareFactsChanges(facts, draft).start).toMatchObject({
      error: expect.stringContaining("occurrence"),
      choices: [
        { value: "earlier", offset: "-04:00" },
        { value: "later", offset: "-05:00" },
      ],
    });
    draft.start.occurrence = "later";
    expect(prepareFactsChanges(facts, draft)).toMatchObject({
      changes: { startsAt: "2026-11-01T06:10:00Z" },
      errors: [],
    });
    draft.start.occurrence = "earlier";
    expect(prepareFactsChanges(facts, draft).changes.startsAt).toBe(
      "2026-11-01T05:10:00Z",
    );
  });
  it("rejects a spring gap and invalid input without choosing a nearby time", () => {
    const draft = createFactsDraft(facts);
    draft.start = { date: "2026-03-08", time: "02:30:00", occurrence: "later" };
    expect(prepareFactsChanges(facts, draft).start).toMatchObject({
      error:
        "This time does not exist in America/New_York. Choose another time.",
    });
    draft.start.date = "2026-02-30";
    expect(prepareFactsChanges(facts, draft).start.error).toBe(
      "Enter a valid date and time.",
    );
  });
  it("recomputes the zone offset on a new date and compares endpoints as instants", () => {
    const draft = createFactsDraft(facts);
    draft.end = { date: "2026-11-02", time: "01:15:00", occurrence: "" };
    expect(prepareFactsChanges(facts, draft)).toMatchObject({
      changes: { endsAt: "2026-11-02T06:15:00Z" },
      errors: [],
      end: { offset: "-05:00" },
    });
    draft.end = { date: "2026-10-31", time: "01:15:00", occurrence: "" };
    expect(prepareFactsChanges(facts, draft).errors).toContain(
      "End must be after Start.",
    );
  });
  it("preserves sub-millisecond saved values read-only while allowing unrelated text edits", () => {
    const precise = { ...facts, startsAt: "2026-11-01T01:30:00.123456-04:00" };
    expect(savedEndpoint(precise.startsAt, precise.timeZone).editable).toBe(
      false,
    );
    const draft = createFactsDraft(precise);
    draft.location = "New room";
    expect(prepareFactsChanges(precise, draft)).toMatchObject({
      changes: { location: "New room" },
      errors: [],
    });
    expect(savedEndpoint("0000-01-01T00:00:00Z", "UTC").editable).toBe(false);
  });
  it("does not invent clearing or whitespace-as-clear, but permits nonempty location edits", () => {
    const located = { ...facts, location: "Saved room" };
    const draft = createFactsDraft(located);
    for (const location of ["", " "])
      expect(
        prepareFactsChanges(located, { ...draft, location }).errors,
      ).toContain(
        "Enter a nonempty location of up to 240 characters. Clearing a saved location is not supported.",
      );
    expect(
      prepareFactsChanges(located, { ...draft, location: "New room" }).changes,
    ).toEqual({ location: "New room" });
  });
});

describe("current GET meeting-facts binding", () => {
  const response = () =>
    resolutionRead.parse({
      documentId,
      status: "partial",
      resolvedAt: null,
      sources: [],
      meetings: [],
      meetingFacts: [{ meetingId: "meeting", eventId: "event", facts }],
    });
  it("binds an unresolved stored row, including its actual null state", () => {
    const data = response();
    expect(bindMeetingFacts(data, documentId, "meeting", "event")).toEqual(
      facts,
    );
    data.meetingFacts[0]!.facts = null;
    expect(bindMeetingFacts(data, documentId, "meeting", "event")).toBeNull();
  });
  it.each(["document", "meeting", "event", "duplicate", "missing"])(
    "rejects a %s mismatch without guessing a row",
    (kind) => {
      const data = response();
      if (kind === "document")
        data.documentId = "53000000-0000-4000-8000-000000000099";
      if (kind === "meeting") data.meetingFacts[0]!.meetingId = "other";
      if (kind === "event") data.meetingFacts[0]!.eventId = "other";
      if (kind === "duplicate")
        data.meetingFacts.push({ ...data.meetingFacts[0]! });
      if (kind === "missing") data.meetingFacts = [];
      expect(() =>
        bindMeetingFacts(data, documentId, "meeting", "event"),
      ).toThrow(/do not match/);
    },
  );
});
