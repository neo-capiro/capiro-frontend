import { z } from "zod";

export const hearingIdParams = z
  .object({ id: z.string().min(1).max(200) })
  .strict();
export const committeeParams = z
  .object({ id: z.string().min(1).max(160) })
  .strict();
export const officialDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Provide a valid official calendar date.");
export const calendarQuerySchema = z
  .object({
    jurisdiction: z.enum(["US", "FL", "ALL"]).optional(),
    session: z.string().optional(),
    stateCommitteeId: z.string().optional(),
    from: officialDateSchema.optional(),
    to: officialDateSchema.optional(),
    q: z.string().optional(),
    committee: z.string().optional(),
    subcommittee: z.string().optional(),
    chamber: z
      .enum(["house", "senate", "joint", "House", "Senate", "Joint"])
      .optional(),
    eventType: z.string().optional(),
    eventStatus: z
      .enum(["scheduled", "postponed", "canceled", "in_progress", "completed"])
      .optional(),
    captureState: z
      .enum([
        "not_covered",
        "discovered",
        "stream_ready",
        "capturing",
        "captured",
        "no_public_stream",
        "blocked",
      ])
      .optional(),
    streamState: z
      .enum([
        "unknown",
        "none",
        "live_only",
        "archived",
        "embedded_third_party",
      ])
      .optional(),
    following: z.boolean().optional(),
    followState: z.enum(["scheduled", "unscheduled"]).optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(200).optional(),
    sort: z.enum(["asc", "desc"]).optional(),
  })
  .strict();
export const captureSchema = z.object({
  id: z.string(),
  status: z.string(),
  capturedSeconds: z.number(),
  transcriptGapSeconds: z.number(),
  reconnectCount: z.number(),
  scheduledStart: z.string().nullable(),
  actualStart: z.string().nullable(),
  actualEnd: z.string().nullable(),
  failureCode: z.string().nullable(),
  failureDetail: z.string().nullable().optional(),
  resolutionState: z.string().nullable().optional(),
  resolutionReasonCode: z.string().nullable().optional(),
  resolutionReference: z.string().nullable().optional(),
  terminalReasonCode: z.string().nullable().optional(),
});
export const calendarHearingSchema = z.object({
  id: z.string(),
  title: z.string(),
  congress: z.number().nullable(),
  geographicJurisdiction: z.string().nullable().optional(),
  legislativeSession: z.string().nullable().optional(),
  stateCommitteeId: z.string().nullable().optional(),
  chamber: z.string(),
  committeeName: z.string(),
  subcommitteeName: z.string().nullable().optional(),
  committeeSystemCode: z.string().nullable(),
  subcommitteeSystemCode: z.string().nullable(),
  date: z.string(),
  startsAt: z.string().nullable(),
  time: z.string().nullable(),
  timezone: z.string(),
  eventType: z.string().nullable(),
  eventStatus: z.string(),
  visibility: z.string(),
  location: z.string().nullable(),
  officialPageUrl: z.string().nullable(),
  officialPlaybackUrl: z.string().nullable(),
  officialPlaybackKind: z
    .enum(["official_player_page", "official_listing_page"])
    .nullable(),
  witnesses: z.array(z.string()),
  streamAvailability: z.string(),
  streamState: z.string(),
  capturePolicy: z.string().nullable(),
  coverageStatus: z.string(),
  calendarRevision: z.number().optional(),
  calendarCheckedAt: z.string().nullable().optional(),
  calendarCheckState: z.string().optional(),
  timePrecision: z.string().nullable().optional(),
  following: z.boolean().optional(),
  lastOfficialUpdateAt: z.string().nullable(),
  sourceRevision: z.number(),
  capture: captureSchema.nullable(),
  streamCandidates: z.array(
    z.object({
      provider: z.string(),
      officialPageUrl: z.string().nullable(),
      hasMediaUrl: z.boolean(),
      mediaType: z.string().nullable(),
      resolutionState: z.string(),
      capturePolicy: z.string(),
      priority: z.number(),
      failureReason: z.string().nullable(),
    }),
  ),
  subscription: z
    .object({
      notifyOnStart: z.boolean(),
      notifyOnMention: z.boolean(),
      scheduledByUser: z.boolean(),
      scheduledByRuleId: z.string().nullable(),
      clientIds: z.array(z.string()),
      watchlistId: z.string().nullable(),
    })
    .nullable(),
});
export type CalendarHearing = z.infer<typeof calendarHearingSchema>;
export const calendarPageSchema = z.object({
  rows: z.array(calendarHearingSchema),
  items: z.array(calendarHearingSchema).optional(),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export const calendarExportSchema = z.object({
  ics: z.string(),
  filename: z.string(),
  googleUrl: z.string(),
  outlookUrl: z.string(),
  detailUrl: z.string(),
  uid: z.string(),
  allDay: z.boolean(),
});
export const committeeMemberSchema = z.object({
  id: z.string(),
  bioguideId: z.string(),
  name: z.string(),
  party: z.string().nullable(),
  side: z.string(),
  rank: z.number().nullable(),
  role: z.string().nullable(),
});
export const committeeRowSchema = z.object({
  systemCode: z.string(),
  thomasId: z.string(),
  name: z.string(),
  chamber: z.string(),
  parentSystemCode: z.string().nullable(),
  parentName: z.string().nullable(),
  officialUrl: z.string().nullable(),
  jurisdiction: z.string().nullable(),
  isSubcommittee: z.boolean(),
  lastSyncedAt: z.string(),
  upcomingEventCount: z.number(),
  recentEventCount: z.number(),
  sourceHealth: z.string(),
  lastSourceSuccessAt: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  sourceHealthInheritedFrom: z.string().nullable(),
  chair: committeeMemberSchema.nullable().optional(),
  rankingMember: committeeMemberSchema.nullable().optional(),
  following: z.boolean().optional(),
  clientExposureCount: z.number().optional(),
});
export type CommitteeRow = z.infer<typeof committeeRowSchema>;
export const committeesPageSchema = z.object({
  rows: z.array(committeeRowSchema),
  total: z.number(),
  parentCount: z.number(),
  subcommitteeCount: z.number(),
  asOf: z.string(),
});
export const stateCommitteeSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.string(),
  chamber: z.string(),
  legislativeSession: z.string().nullable(),
  officialSourceKey: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  lastSyncedAt: z.string(),
});
export const sourceUpdateSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  updateType: z.string(),
  sourceUrl: z.string().nullable(),
  summary: z.string().nullable(),
  publishedAt: z.string().nullable(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  hearingId: z.string().nullable(),
  inheritedFromParent: z.boolean().optional(),
});
export const committeeDetailSchema = committeeRowSchema.extend({
  members: z.array(committeeMemberSchema),
  subcommittees: z.array(committeeRowSchema),
  upcomingEvents: z.array(calendarHearingSchema),
  recentEvents: z.array(calendarHearingSchema),
  liveEvent: calendarHearingSchema.nullable(),
  updates: z.array(sourceUpdateSchema),
  asOf: z.string(),
});
