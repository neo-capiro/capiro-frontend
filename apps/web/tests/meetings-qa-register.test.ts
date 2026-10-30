// Meetings QA register (2026-10-30) regressions: B0 (one legacy prep must not blank
// the meeting drawer) and B3 (Sync calendar must accept a caller-scoped connection
// list that does not echo the owner).
import { describe, expect, it } from "vitest";
import {
  meetingSchema,
  parseMeeting,
} from "../src/features/portfolio/calendar/contracts";
import { fetchOwnedCalendarConnections } from "../src/features/portfolio/calendar/sync/api";
import type { ApiClient } from "../src/shared/portfolio/api/http";

const storedPrep = {
  id: "prep-1",
  status: "approved",
  summary: "Synthetic summary",
  agenda: ["Synthetic agenda"],
  talkingPoints: [],
  risks: [],
  followUps: [],
  createdAt: "2026-10-11T12:00:00Z",
  provider: "openai",
  model: "gpt-4.1-mini",
};

const meeting = {
  id: "meeting-1",
  subject: "Synthetic meeting",
  description: null,
  location: null,
  startsAt: "2026-10-12T12:00:00Z",
  endsAt: "2026-10-12T13:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "private",
  isVirtual: false,
  meri: null,
  client: { id: "client-1", name: "Synthetic client" },
  attendees: [],
  preps: [] as unknown[],
};

describe("B0 — a stored legacy prep cannot blank the meeting", () => {
  it("parses a prep stored with clientId: null on a client-scoped meeting", () => {
    const payload = {
      ...meeting,
      preps: [{ ...storedPrep, meetingId: "meeting-1", clientId: null }],
    };
    const read = parseMeeting(payload);
    expect(read.unusablePreps).toBe(0);
    expect(read.meeting.preps).toHaveLength(1);
    expect(read.meeting.preps[0]?.clientId).toBeNull();
    expect(read.meeting.notes ?? []).toEqual([]);
  });

  it("keeps the meeting and drops only a prep that names another client", () => {
    const usable = {
      ...storedPrep,
      meetingId: "meeting-1",
      clientId: "client-1",
    };
    const foreign = {
      ...storedPrep,
      id: "prep-2",
      meetingId: "meeting-1",
      clientId: "client-2",
    };
    const read = parseMeeting({ ...meeting, preps: [usable, foreign] });
    expect(read.unusablePreps).toBe(1);
    expect(read.meeting.preps.map((prep) => prep.id)).toEqual(["prep-1"]);
  });

  it("still refuses a payload that is broken for any other reason", () => {
    const broken = { ...meeting, subject: undefined };
    expect(() => parseMeeting(broken)).toThrow(/unexpected response/i);
    // The strict contract is unchanged for a prep naming another meeting.
    expect(
      meetingSchema.safeParse({
        ...meeting,
        preps: [{ ...storedPrep, meetingId: "another-meeting" }],
      }).success,
    ).toBe(false);
  });
});

function apiReturning(rows: unknown): ApiClient {
  return {
    request: (async () => rows) as ApiClient["request"],
  };
}

describe("B3 — Sync calendar accepts a caller-scoped connection list", () => {
  const connection = {
    id: "6ff4a4c5-0a2b-4a4e-9d1e-2c5f1a0b7e11",
    provider: "microsoft_365",
    accountEmail: "fixture@example.test",
    displayName: null,
    status: "connected",
    lastSyncAt: null,
  };

  it("accepts a connection that does not echo createdByUserId", async () => {
    const rows = await fetchOwnedCalendarConnections(
      apiReturning([connection]),
      "user-1",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.createdByUserId).toBeUndefined();
  });

  it("accepts a connection it can prove belongs to the caller", async () => {
    await expect(
      fetchOwnedCalendarConnections(
        apiReturning([{ ...connection, createdByUserId: "user-1" }]),
        "user-1",
      ),
    ).resolves.toHaveLength(1);
  });

  it("refuses a connection that states another owner, with one accurate message", async () => {
    await expect(
      fetchOwnedCalendarConnections(
        apiReturning([{ ...connection, createdByUserId: "user-2" }]),
        "user-1",
      ),
    ).rejects.toThrow(/did not match your account/i);
  });
});
