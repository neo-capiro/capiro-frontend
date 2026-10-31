import { describe, expect, it } from "vitest";
import { preparationSchema } from "../src/features/portfolio/calendar/preparation/schema";
import {
  meetingSchema,
  parseMeeting,
} from "../src/features/portfolio/calendar/contracts";
import { meetingMaterials } from "../src/features/portfolio/calendar/lifecycle";

const MEETING = "00000000-0000-4000-8000-000000000005";
const PREP = "00000000-0000-4000-8000-000000000009";

/** Exactly what the calendar LIST now returns for a prep: identity + lifecycle only. */
const metadataPrep = {
  id: PREP,
  meetingId: MEETING,
  clientId: null,
  status: "approved",
  provider: "anthropic",
  model: "synthetic-model",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  sharedAt: null,
  sharedByUserId: null,
};

function meetingPayload(preps: unknown[]) {
  return {
    id: MEETING,
    subject: "Metadata-only list row",
    startsAt: "2026-10-12T13:00:00.000Z",
    endsAt: "2026-10-12T14:00:00.000Z",
    status: "scheduled",
    description: null,
    location: null,
    joinLink: null,
    visibility: "private",
    isVirtual: false,
    meri: null,
    client: null,
    attendees: [],
    preps,
    notes: [],
    debriefs: [],
    attachments: [],
  };
}

describe("D5 — the calendar list parses metadata-only preps", () => {
  it("accepts a prep row with no body and defaults the body fields", () => {
    const parsed = preparationSchema.parse(metadataPrep);

    expect(parsed.status).toBe("approved");
    expect(parsed.summary).toBeNull();
    expect(parsed.agenda).toEqual([]);
    expect(parsed.talkingPoints).toEqual([]);
    expect(parsed.risks).toEqual([]);
    expect(parsed.followUps).toEqual([]);
  });

  it("parses a whole list meeting whose prep carries metadata only", () => {
    const payload = meetingPayload([metadataPrep]);

    expect(() => meetingSchema.parse(payload)).not.toThrow();
    const read = parseMeeting(payload);
    expect(read.meeting.id).toBe(MEETING);
    expect(read.meeting.preps[0]?.status).toBe("approved");
    expect(read.unusablePreps).toBe(0);
  });

  it("keeps the lifecycle labels the list reads from that metadata", () => {
    const read = parseMeeting(meetingPayload([metadataPrep]));

    expect(meetingMaterials(read.meeting).prep).toBe("Approved");
  });

  it("still parses the detail read, where the body is present", () => {
    const detailPrep = {
      ...metadataPrep,
      summary: "Detail summary",
      agenda: ["Detail agenda"],
    };
    const parsed = meetingSchema.parse(meetingPayload([detailPrep]));

    expect(parsed.preps[0]?.summary).toBe("Detail summary");
    expect(parsed.preps[0]?.agenda).toEqual(["Detail agenda"]);
  });
});
