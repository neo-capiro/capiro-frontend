import { describe, expect, it } from "vitest";
import { meetingSchema } from "../src/features/portfolio/calendar/contracts";
import { fetchMeetings } from "../src/features/portfolio/calendar/feeds";
import type { ApiClient } from "../src/shared/portfolio/api/http";

const meeting = {
  id: "meeting-a",
  subject: "Synthetic lifecycle meeting",
  description: null,
  location: null,
  startsAt: "2026-10-12T12:00:00Z",
  endsAt: "2026-10-12T13:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "private",
  isVirtual: false,
  meri: null,
  client: { id: "client-a", name: "Synthetic client" },
  attendees: [],
  preps: [],
};
const note = {
  id: "note-a",
  meetingId: meeting.id,
  clientId: "client-a",
  status: "draft",
};
const debrief = {
  id: "debrief-a",
  meetingId: meeting.id,
  clientId: "client-a",
  status: "generated",
};

describe("native meeting lifecycle metadata", () => {
  it("retains supplied note/debrief lifecycle states without turning omission into empty", () => {
    const saved = meetingSchema.parse({
      ...meeting,
      notes: [note],
      debriefs: [debrief],
    });
    expect(saved).toMatchObject({ notes: [note], debriefs: [debrief] });
    const unknown = meetingSchema.parse(meeting);
    expect(unknown).not.toHaveProperty("notes");
    expect(unknown).not.toHaveProperty("debriefs");
  });
  for (const kind of ["notes", "debriefs"] as const)
    for (const mismatch of [
      { meetingId: "foreign-meeting" },
      { clientId: "foreign-client" },
    ])
      it(`refuses ${kind} metadata from ${JSON.stringify(mismatch)}`, () => {
        expect(
          meetingSchema.safeParse({
            ...meeting,
            [kind]: [{ ...(kind === "notes" ? note : debrief), ...mismatch }],
          }).success,
        ).toBe(false);
      });
  it("keeps lifecycle material with the canonical calendar occurrence", async () => {
    const native = { ...meeting, notes: [note], debriefs: [debrief] };
    const api = {
      request: async (
        _service: string,
        _path: string,
        schema: { parse: (value: unknown) => unknown },
      ) => schema.parse([native]),
    } as unknown as ApiClient;
    const feed = await fetchMeetings(
      api,
      "2026-10-01T00:00:00Z",
      "2026-11-01T00:00:00Z",
      "UTC",
      "client-a",
    );
    expect(feed.items[0]).toMatchObject({
      sourceId: meeting.id,
      meeting: { id: meeting.id, notes: [note], debriefs: [debrief] },
    });
  });
});

describe("meeting lifecycle decisions", () => {
  it("uses exact start/end boundaries and never advances cancelled or invalid meetings", async () => {
    const { meetingStage } =
      await import("../src/features/portfolio/calendar/lifecycle");
    const row = meetingSchema.parse(meeting);
    expect(meetingStage(row, Date.parse(row.startsAt) - 1)).toBe("upcoming");
    expect(meetingStage(row, Date.parse(row.startsAt))).toBe("live");
    expect(meetingStage(row, Date.parse(row.endsAt))).toBe("completed");
    expect(
      meetingStage({ ...row, status: " Cancelled " }, Date.parse(row.endsAt)),
    ).toBe("cancelled");
    expect(meetingStage({ ...row, startsAt: "invalid" }, Date.now())).toBe(
      "unknown",
    );
  });
  it("missing metadata is unavailable and generated material does not imply approval", async () => {
    const { matchesMeetingFilter, meetingMaterials } =
      await import("../src/features/portfolio/calendar/lifecycle");
    const row = meetingSchema.parse({ ...meeting, debriefs: [] });
    expect(
      matchesMeetingFilter(row, "needs-debrief", Date.parse(row.endsAt)),
    ).toBe(true);
    expect(
      matchesMeetingFilter(
        meetingSchema.parse(meeting),
        "needs-debrief",
        Date.parse(row.endsAt),
      ),
    ).toBe(false);
    expect(
      meetingMaterials(
        meetingSchema.parse({ ...meeting, debriefs: [debrief] }),
      ),
    ).toMatchObject({ notes: "Status unavailable", debrief: "Generated" });
  });
});
