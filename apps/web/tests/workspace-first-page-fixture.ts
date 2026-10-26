import type { HillDayDocument } from "../src/shared/capiro/operations/workspace-schemas";

export function firstPageDocument(): HillDayDocument {
  return {
    id: "51000000-0000-4000-8000-000000000001",
    name: "Synthetic Hill Day",
    status: "generated",
    client: {
      id: "30000000-0000-4000-8000-000000000001",
      name: "Synthetic client",
      mono: "SC",
      hasLogo: false,
    },
    firm: { name: "Synthetic firm" },
    owner: { id: "test-user", name: "Test User", initials: "TU" },
    timeZone: "America/New_York",
    weekStart: "2026-10-26",
    lookbackDays: 30,
    updatedAt: "2026-10-26T09:00:00.000Z",
    createdAt: "2026-10-25T00:00:00.000Z",
    meetingCount: 2,
    cover: {
      title: "Synthetic schedule",
      dateline: "October 26 · 2 meetings",
      facts: [{ k: "Lead", v: "Manual lead" }],
    },
    firstPage: {
      title: "Synthetic schedule",
      facts: [{ key: "Lead", value: "Manual lead" }],
      rows: [
        {
          meetingId: "meeting-one",
          member: "Manual member",
          room: "Manual room",
        },
        { meetingId: "meeting-two", minutes: "45" },
      ],
      hiddenColumns: ["staffLead"],
    },
    summary: [
      {
        meetingId: "meeting-one",
        sectionId: "meeting-one",
        time: "9:00 AM",
        member: "Manual member",
        office: "CA · District 1",
        room: "Manual room",
        minutes: "30",
        staffLead: "Test Staff",
      },
      {
        meetingId: "meeting-two",
        sectionId: "meeting-two",
        time: "10:00 AM",
        member: "Second member",
        office: "NY · District 2",
        room: "201",
        minutes: "45",
        staffLead: "Second Staff",
      },
    ],
    summaryColumns: ["time", "member", "office", "room", "minutes"],
    sections: [],
    provenance: {
      generatedAt: null,
      model: null,
      sourceCounts: [],
      corrections: [],
      failedUnits: 0,
      quality: null,
      totalSources: 0,
    },
    generation: { lastJobId: null, status: null },
  };
}
