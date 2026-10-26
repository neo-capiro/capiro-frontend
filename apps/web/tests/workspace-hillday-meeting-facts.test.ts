import { describe, expect, it } from "vitest";
import { workspaceHillDayOperations } from "../src/shared/capiro/operations/workspace-hillday";
import { resolution } from "../src/shared/capiro/operations/workspace-schemas";

const documentId = "53000000-0000-4000-8000-000000000001";
const meetingId = "53000000-0000-4000-8000-000000000002";
const facts = {
  subject: " Synthetic saved subject ",
  startsAt: "2026-11-01T01:30:00-04:00",
  endsAt: "2026-11-01T01:15:00-05:00",
  timeZone: "US/Eastern",
  location: null,
};
const row = { meetingId, eventId: "saved-event", facts };
const meeting = {
  meetingId,
  eventId: row.eventId,
  state: "partial",
  needsConfirmation: false,
  office: {
    memberId: null,
    member: null,
    memberName: null,
    chamber: null,
    party: null,
    state: null,
    committees: [],
    bio: null,
    officeLocation: null,
    room: null,
    derivedFrom: null,
    alternatives: [],
  },
  attendees: [],
};
const original = {
  documentId,
  status: "partial",
  resolvedAt: null,
  sources: [],
  meetings: [],
};
const get = workspaceHillDayOperations["workspace.hillday.resolution"];
const receive = (rows: unknown[] = [row]) =>
  get.response.parse({ ...original, meetingFacts: rows });

describe("Hill Day current GET facts receiving", () => {
  it("uses the existing read route and keeps exact unresolved stored values", () => {
    expect(get.method).toBe("GET");
    expect(get.path).toBe("/hillday/documents/:id/resolution");
    expect(get.request.parse({ params: { id: documentId } })).toEqual({
      params: { id: documentId },
    });
    expect(
      get.request.safeParse({ params: { id: documentId }, body: {} }).success,
    ).toBe(false);
    expect(receive()).toEqual({ ...original, meetingFacts: [row] });
  });

  it("retains resolved rows, null snapshots and original resolution fields", () => {
    const payload = {
      ...original,
      meetings: [meeting],
      meetingFacts: [
        row,
        {
          meetingId: "unresolved-row",
          eventId: "",
          facts: null,
        },
      ],
    };
    expect(get.response.parse(payload)).toEqual(payload);
    expect(
      get.response.safeParse({ ...original, meetingFacts: undefined }).success,
    ).toBe(false);
  });

  it.each([
    ["2026-11-01T01:30:00-0400", "2026-11-01T01:15:00-0500"],
    ["2026-11-01T23:59:00Z", "2026-11-02T00:30:00Z"],
    ["2028-02-29T23:59:59.999Z", "2028-03-01T00:00:00Z"],
  ])("preserves supported boundary instants %s", (startsAt, endsAt) => {
    const value = {
      ...row,
      facts: { ...facts, startsAt, endsAt, location: "" },
    };
    expect(receive([value]).meetingFacts).toEqual([value]);
  });

  it("accepts the actual text bounds and does not cap manual rows or stored event identifiers", () => {
    const values = Array.from({ length: 81 }, (_, index) => ({
      ...row,
      meetingId: `meeting-${index}`,
      eventId: `event-${index}-${"a".repeat(500)}`,
      facts: { ...facts, subject: "a".repeat(240), location: "b".repeat(240) },
    }));
    expect(receive(values).meetingFacts).toEqual(values);
  });

  it("keeps POST and correction receivers unchanged", () => {
    const post = workspaceHillDayOperations["workspace.hillday.resolve"];
    expect(post.response).toBe(resolution);
    expect(post.response.parse({ ...original, meetingFacts: [row] })).toEqual(
      original,
    );
    const event = {
      ...facts,
      subject: "a".repeat(241),
      eventId: row.eventId,
      clientId: null,
      kind: "hill",
      source: "manual",
      attendees: [],
      reason: { kind: "manual", detail: "", matchedAddresses: [] },
    };
    const payload = { resolution: meeting, event };
    expect(
      workspaceHillDayOperations["workspace.hillday.correction"].response.parse(
        payload,
      ),
    ).toEqual(payload);
  });
});

describe("Hill Day stored facts malformed responses", () => {
  it.each([
    { ...row, meetingId: undefined },
    { ...row, eventId: 1 },
    { ...row, eventId: "" },
    { ...row, facts: undefined },
    { ...row, documentId },
    { ...row, facts: {} },
  ])("rejects missing or invented row fields %#", (value) => {
    expect(() => receive([value])).toThrow();
  });

  it.each([
    { subject: " " },
    { subject: "a".repeat(241) },
    { location: undefined },
    { location: "a".repeat(241) },
    { startsAt: "2026-02-30T12:00:00Z" },
    { startsAt: "2026-11-01T01:00:00" },
    { startsAt: "2026-11-01" },
    { startsAt: "2026-11-01T24:00:00Z", endsAt: "2026-11-02T00:30:00Z" },
    { endsAt: "2026-11-01T00:30:00-05:00" },
    { endsAt: "invalid" },
    { timeZone: "Mars/Olympus" },
    { timeZone: "a".repeat(65) },
    { eventId: "invented-snapshot-field" },
  ])("rejects unusable snapshot fields %#", (change) => {
    expect(() =>
      receive([{ ...row, facts: { ...facts, ...change } }]),
    ).toThrow();
  });
});
