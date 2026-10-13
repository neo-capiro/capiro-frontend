import { z } from "zod";
import {
  calendarHearingSchema,
  captureSchema,
  committeeRowSchema,
} from "./legiwatch-calendar-schemas";

const textOrNull = z.string().nullable();
export const followConfigBody = z
  .object({
    clientIds: z.array(z.uuid()).optional(),
    notifyOnScheduleChange: z.boolean().optional(),
    notifyOnHearingStarting: z.boolean().optional(),
    notifyOnTranscriptReady: z.boolean().optional(),
    notifyOnHighPriorityMatch: z.boolean().optional(),
  })
  .strict();
export const followStateSchema = z.object({
  hearingId: z.string(),
  following: z.boolean(),
  clientIds: z.array(z.string()),
  clients: z.array(
    z.object({ id: z.string(), name: textOrNull, archived: z.boolean() }),
  ),
  notifyOnScheduleChange: z.boolean(),
  notifyOnHearingStarting: z.boolean(),
  notifyOnTranscriptReady: z.boolean(),
  notifyOnHighPriorityMatch: z.boolean(),
  createdAt: textOrNull,
  updatedAt: textOrNull,
  createdCaptureDemand: z.literal(false),
});
export const attendanceSchema = z.object({
  hearingId: z.string().optional(),
  state: z.enum([
    "AUTOMATIC_AVAILABLE",
    "AUTOMATIC_PENDING_PREFLIGHT",
    "BROWSER_ONLY",
    "NO_PUBLIC_STREAM",
    "CLOSED_SESSION",
    "NOT_ELIGIBLE",
    "SCHEDULED",
    "CAPTURING",
    "PROCESSING",
    "COMPLETE",
    "FAILED",
  ]),
  reasonCode: z.string(),
  message: z.string(),
  canRequest: z.boolean(),
  availableModes: z.array(z.enum(["automatic", "browser"])),
  consentRequired: z.boolean(),
  scheduled: z.boolean(),
  browserAvailable: z.boolean(),
  automaticAvailable: z.boolean(),
});
export type AttendanceAssessment = z.infer<typeof attendanceSchema>;
export const participationSchema = z.object({
  scheduled: z.boolean(),
  scheduledByUser: z.boolean(),
  scheduledByRule: z.boolean(),
  followed: z.boolean(),
  notifyOnStart: z.boolean(),
  notifyOnMention: z.boolean(),
  notifyOnUpdates: z.boolean(),
  clientIds: z.array(z.string()),
  scheduledByRuleId: textOrNull.optional(),
  watchlistId: textOrNull.optional(),
  updatedAt: textOrNull.optional(),
});
export const browserJoinSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("ATTACH_CANONICAL"),
    hearingId: z.string(),
    captureId: z.string(),
    captureStatus: z.string(),
    reasonCode: z.string(),
  }),
  z.object({
    mode: z.literal("BROWSER_CAPTURE"),
    hearingId: z.string(),
    title: z.string(),
    sourceType: z.string(),
    audioSource: z.literal("browser_mic"),
    recordingPolicy: z.literal("transcript_only"),
    sourceUrl: z.string(),
    sourceKind: z.string().optional(),
    committeeId: z.string().optional(),
    reasonCode: z.string(),
  }),
  z.object({
    mode: z.literal("BLOCKED"),
    hearingId: z.string(),
    reasonCode: z.string(),
    message: z.string(),
  }),
]);
export const transcriptSegmentSchema = z.object({
  id: z.string(),
  sequence: z.number(),
  startMs: z.number(),
  endMs: z.number(),
  text: z.string(),
  speakerLabel: textOrNull,
  speakerName: textOrNull,
  confidence: z.number().nullable(),
  isFinal: z.boolean(),
  hasGapBefore: z.boolean(),
  revision: z.number(),
});
export const transcriptPageSchema = z.object({
  hearingId: z.string(),
  capture: captureSchema.nullable(),
  items: z.array(transcriptSegmentSchema),
  total: z.number(),
  nextCursor: textOrNull,
  resumeCursor: textOrNull.optional(),
  hasMore: z.boolean(),
});
export const sourceDocumentSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  label: z.string().optional(),
  sourceUrl: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  path: z.string().optional(),
  segmentId: z.string().nullable().optional(),
  startMs: z.number().nullable().optional(),
  documentType: z.string().optional(),
  kind: z.string().optional(),
});
export const hearingDetailSchema = z.object({
  hearing: z.object({
    id: z.string(),
    title: z.string(),
    chamber: z.string(),
    committeeName: textOrNull,
    committeeSystemCode: textOrNull,
    subcommitteeSystemCode: textOrNull,
    calendarDate: z.string(),
    scheduledStart: textOrNull,
    time: textOrNull,
    timeZone: textOrNull,
    location: textOrNull,
    officialPageUrl: textOrNull,
    eventStatus: z.string(),
    eventType: textOrNull,
    visibility: z.string(),
    witnesses: z.array(z.string()),
  }),
  committee: committeeRowSchema.nullable(),
  followState: followStateSchema,
  attendanceState: attendanceSchema,
  transcriptSummary: z.object({
    available: z.boolean(),
    segmentCount: z.number(),
    transcriptPath: z.string(),
  }),
  intelligenceSummary: z.object({
    total: z.number(),
    byType: z.array(z.object({ insightType: z.string(), count: z.number() })),
  }),
  sources: z.array(sourceDocumentSchema),
  availableActions: z.record(z.string(), z.boolean()),
  calendarExportPath: z.string(),
});
export type HearingDetail = z.infer<typeof hearingDetailSchema>;
export const roomSchema = z.object({
  event: calendarHearingSchema,
  participation: participationSchema,
  capture: captureSchema.nullable(),
  browser: browserJoinSchema,
  witnesses: z.array(z.string()),
  documents: z.array(sourceDocumentSchema),
  transcriptDisclaimer: z.string(),
  asOf: z.string(),
});
export const archiveResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  chamber: z.string(),
  committeeName: textOrNull,
  committeeSystemCode: textOrNull,
  calendarDate: textOrNull,
  scheduledStart: textOrNull,
  time: textOrNull,
  timeZone: textOrNull,
  location: textOrNull,
  officialPageUrl: textOrNull,
  eventStatus: z.string(),
  eventType: textOrNull,
  witnesses: z.array(z.string()),
  captureStatus: textOrNull,
  intelligenceCount: z.number(),
  matchTier: z.number().nullable(),
  detailPath: z.string(),
  transcript: z.object({
    available: z.boolean(),
    segmentCount: z.number(),
    officialTranscriptId: textOrNull,
    gapSeconds: z.number().nullable(),
  }),
  transcriptHit: z
    .object({
      segmentId: z.string(),
      startMs: z.number(),
      speakerName: textOrNull,
      snippet: z.string(),
    })
    .nullable(),
});
export const archivePageSchema = z.object({
  rows: z.array(archiveResultSchema),
  total: z.number(),
  corpusTotal: z.number().optional(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
  query: textOrNull,
  matchMode: z.enum(["all-terms", "partial"]).nullable(),
});
export const notificationSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  hearingId: textOrNull,
  committeeSystemCode: textOrNull,
  clientId: textOrNull,
  title: z.string(),
  body: textOrNull,
  deepLink: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});
export const notificationsPageSchema = z.object({
  rows: z.array(notificationSchema),
  total: z.number(),
  unread: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
});
export const notificationPreferencesSchema = z.object({
  committeeEmailEnabled: z.boolean(),
  emailAddress: textOrNull,
});
export const briefSchema = z.object({
  title: z.string(),
  mode: z.enum(["preparation", "recap"]),
  sections: z.array(z.object({ name: z.string(), content: z.string() })),
  keyMoments: z.array(
    z.object({
      startMs: z.number().optional(),
      speaker: z.string().optional(),
      summary: z.string(),
    }),
  ),
  sources: z.array(sourceDocumentSchema),
  lowConfidence: z.boolean(),
});
export const insightSchema = z.object({
  id: z.string(),
  insightType: z.string(),
  title: z.string(),
  summary: z.string(),
  speakerName: textOrNull.optional(),
  confidence: z.number().nullable().optional(),
  preliminary: z.boolean(),
  evidence: z.object({
    segmentId: z.string(),
    sequence: z.number(),
    startMs: z.number(),
    endMs: z.number(),
    text: z.string().nullable(),
  }),
  entities: z.array(
    z.object({
      entityType: z.string(),
      label: z.string(),
      canonicalId: textOrNull.optional(),
    }),
  ),
  relevance: z.array(
    z.object({
      id: z.string(),
      clientId: z.string(),
      clientName: z.string().nullable(),
      insightId: z.string(),
      score: z.number(),
      rationale: z.string(),
      matchedOn: z.array(z.object({ kind: z.string(), value: z.string() })),
    }),
  ),
});
export const intelligenceSchema = z.object({
  hearingId: z.string(),
  status: z.enum(["READY", "PROCESSING", "DEGRADED", "FAILED", "EMPTY"]),
  sourceBoundary: z.string(),
  items: z.array(insightSchema),
  summary: z.object({
    total: z.number(),
    returned: z.number(),
    preliminary: z.number(),
    evidenceSegments: z.number(),
    clientRelevant: z.number(),
    byType: z.record(z.string(), z.number()),
  }),
  hasMore: z.boolean(),
  nextCursor: textOrNull.optional(),
  disclaimer: z.string(),
});
