import { z } from "zod";

export const workspaceId = z.uuid();
export const emptyWorkspaceRequest = z.object({}).strict();
export const documentParams = z.object({ id: workspaceId }).strict();
export const sourceStatus = z.object({
  source: z.string(),
  status: z.enum(["ok", "partial", "unavailable"]),
  detail: z.string().nullable(),
});
export const libraryDocument = z.object({
  id: workspaceId,
  kind: z.enum(["hillday", "draft"]),
  name: z.string(),
  blueprint: z.string(),
  client: z.string().nullable(),
  clientId: workspaceId.nullable().optional(),
  clientAssociation: z.literal("held").optional(),
  status: z.string(),
  updatedAt: z.string(),
  owner: z.object({ id: z.string(), name: z.string(), initials: z.string() }),
  route: z.string(),
});
export const workspaceClient = z.object({
  id: workspaceId,
  name: z.string(),
  mono: z.string(),
  description: z.string().nullable(),
  objectiveCount: z.number().nullable(),
  officeCount: z.number(),
  hasLogo: z.boolean(),
});
export const calendarEvent = z.object({
  eventId: z.string(),
  subject: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  timeZone: z.string(),
  location: z.string().nullable(),
  kind: z.enum(["hill", "internal"]),
  source: z.string(),
  clientId: z.string().nullable(),
  attendees: z.array(
    z.object({
      address: z.string(),
      name: z.string().nullable(),
      responseStatus: z.string().nullable(),
    }),
  ),
  reason: z.object({
    kind: z.enum([
      "tagged",
      "matched",
      "tagged_and_matched",
      "internal",
      "manual",
    ]),
    detail: z.string(),
    matchedAddresses: z.array(z.string()),
  }),
});
export const office = z.object({
  memberId: z.string().nullable(),
  member: z.string().nullable(),
  memberName: z.string().nullable(),
  chamber: z.string().nullable(),
  party: z.string().nullable(),
  state: z.string().nullable(),
  committees: z.array(z.string()),
  bio: z.string().nullable(),
  officeLocation: z.string().nullable(),
});
export const resolution = z.object({
  documentId: workspaceId,
  status: z.enum(["clean", "partial"]),
  resolvedAt: z.string().nullable(),
  sources: z.array(sourceStatus),
  meetings: z.array(
    z.object({
      meetingId: z.string(),
      eventId: z.string(),
      state: z.enum(["clean", "partial"]),
      needsConfirmation: z.boolean(),
      office: office.extend({
        room: z.string().nullable(),
        derivedFrom: z.string().nullable(),
        alternatives: z.array(office),
      }),
      attendees: z.array(
        z.object({
          attendeeId: z.string(),
          address: z.string().nullable(),
          state: z.enum(["resolved", "unresolved", "stale", "scheduler"]),
          stafferId: z.string().nullable(),
          name: z.string().nullable(),
          role: z.string().nullable(),
          detail: z.string(),
          manual: z.boolean(),
        }),
      ),
    }),
  ),
});
export const carrySelection = z
  .object({
    committees: z.boolean(),
    bio: z.boolean(),
    issueAreas: z.array(z.string()).max(64),
    staffers: z.array(z.string()).max(64),
  })
  .strict();
export const thread = z.object({
  id: z.string(),
  subject: z.string(),
  participants: z.array(z.string()),
  messageCount: z.number(),
  lastMessageAt: z.string().nullable(),
  ageDays: z.number().nullable(),
  clientTagged: z.boolean(),
});
export const meetingContext = z.object({
  meetingId: z.string(),
  member: office.nullable(),
  units: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["committees", "issue_area", "bio", "staffer"]),
      label: z.string(),
      selected: z.boolean(),
      defaultSelected: z.boolean(),
      detail: z.string().nullable(),
      known: z.boolean(),
    }),
  ),
  threads: z.array(thread),
  lookbackDays: z.number(),
  sources: z.array(sourceStatus),
  record: z
    .object({
      note: z.string(),
      carry: carrySelection,
      threadIds: z.array(z.string()),
      lookbackDays: z.number().nullable(),
      savedAt: z.string(),
      savedBy: z.string(),
    })
    .nullable(),
});
const summaryColumns = [
  "time",
  "member",
  "office",
  "room",
  "minutes",
  "staffLead",
] as const;
const coverKeys = [
  "Sponsor",
  "Prepared by",
  "Meetings",
  "Date",
  "Lead",
  "Revision",
] as const;
export const firstPage = z
  .object({
    title: z.string().max(200).optional(),
    dateline: z.string().max(1000).optional(),
    facts: z
      .array(
        z
          .object({ key: z.enum(coverKeys), value: z.string().max(500) })
          .strict(),
      )
      .max(6)
      .optional(),
    rows: z
      .array(
        z
          .object({
            meetingId: z.string(),
            time: z.string().max(80).optional(),
            member: z.string().max(300).optional(),
            office: z.string().max(300).optional(),
            room: z.string().max(500).optional(),
            minutes: z.string().max(40).optional(),
            staffLead: z.string().max(300).optional(),
          })
          .strict(),
      )
      .max(80)
      .optional(),
    hiddenColumns: z.array(z.enum(summaryColumns)).max(5).optional(),
  })
  .strict();
export const hillDayDocument = z.object({
  id: workspaceId,
  name: z.string(),
  status: z.enum(["draft", "generating", "generated", "partial", "delivered"]),
  client: z.object({
    id: workspaceId,
    name: z.string(),
    mono: z.string(),
    hasLogo: z.boolean(),
  }),
  firm: z.object({ name: z.string() }),
  owner: z.object({ id: z.string(), name: z.string(), initials: z.string() }),
  timeZone: z.string(),
  weekStart: z.iso.date().nullable().optional(),
  lookbackDays: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
  meetingCount: z.number(),
  cover: z.object({
    title: z.string(),
    dateline: z.string(),
    facts: z.array(z.object({ k: z.string(), v: z.string() })),
  }),
  firstPage: firstPage.nullable(),
  summary: z.array(
    z.object({
      sectionId: z.string(),
      meetingId: z.string(),
      time: z.string(),
      member: z.string(),
      office: z.string(),
      room: z.string(),
      minutes: z.string(),
      staffLead: z.string(),
    }),
  ),
  summaryColumns: z.array(z.enum(summaryColumns)),
  sections: z.array(
    z.object({
      sectionId: z.string(),
      meetingId: z.string(),
      eventId: z.string(),
      number: z.number(),
      time: z.string(),
      duration: z.string(),
      member: z.string(),
      subline: z.string(),
      focus: z.string().nullable(),
      background: z.string().nullable(),
      status: z.enum(["pending", "done", "unavailable"]),
      reason: z.string().nullable(),
      facts: z.array(z.object({ k: z.string(), v: z.string() })),
      flags: z.array(z.object({ kind: z.string(), detail: z.string() })),
      edited: z.object({
        focus: z.boolean(),
        background: z.boolean(),
        at: z.string().nullable(),
      }),
    }),
  ),
  provenance: z.object({
    generatedAt: z.string().nullable(),
    model: z.string().nullable(),
    sourceCounts: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        count: z.number(),
        detail: z.string().nullable(),
      }),
    ),
    corrections: z.array(z.string()),
    failedUnits: z.number(),
    quality: z.number().nullable(),
    totalSources: z.number(),
  }),
  generation: z.object({
    lastJobId: z.string().nullable(),
    status: z.string().nullable(),
  }),
});
export type WorkspaceLibraryDocument = z.infer<typeof libraryDocument>;
export type WorkspaceClient = z.infer<typeof workspaceClient>;
export type HillDayDocument = z.infer<typeof hillDayDocument>;
export type HillDayEvent = z.infer<typeof calendarEvent>;
export type HillDayResolution = z.infer<typeof resolution>;
export type HillDayContext = z.infer<typeof meetingContext>;
