import { z } from "zod";
import type { EffectiveDateRecord } from "@/shared/federal-register/effective-dates";
import { validDay } from "@/shared/portfolio/date/civil";
import {
  preparationListSchema,
  preparationSchema,
  type Preparation,
} from "./preparation/schema";
import {
  artifactActorSchema,
  artifactMetadataSchema,
} from "./artifacts/metadata";
const lifecycleArtifactSchema = artifactMetadataSchema
  .pick({ id: true, meetingId: true, clientId: true, status: true })
  .partial({ meetingId: true, clientId: true, status: true });
export { prepItemSchema } from "./preparation/schema";
const meetingShape = (preps: z.ZodType<Preparation[]>) =>
  z.object({
    id: z.string(),
    subject: z.string(),
    updatedAt: z.iso.datetime().optional(),
    description: z.string().nullable(),
    location: z.string().nullable(),
    startsAt: z.string(),
    endsAt: z.string(),
    status: z.string(),
    joinLink: z.string().nullable(),
    visibility: z.enum(["private", "shared"]),
    isVirtual: z.boolean(),
    meri: z.string().nullable(),
    client: z.object({ id: z.string(), name: z.string() }).nullable(),
    attendees: z.array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string().nullable(),
        role: z.string().nullable(),
      }),
    ),
    preps,
    notes: z.array(lifecycleArtifactSchema).optional(),
    debriefs: z.array(lifecycleArtifactSchema).optional(),
  });

const meetingProvenance = (
  meeting: z.infer<ReturnType<typeof meetingShape>>,
  ctx: z.RefinementCtx,
) => {
  for (const kind of ["notes", "debriefs"] as const) {
    meeting[kind]?.forEach((artifact, index) => {
      if (
        (artifact.meetingId !== undefined &&
          artifact.meetingId !== meeting.id) ||
        (artifact.clientId !== undefined &&
          artifact.clientId !== (meeting.client?.id ?? null))
      ) {
        ctx.addIssue({
          code: "custom",
          path: [kind, index],
          message: "Artifact belongs to another meeting or client",
        });
      }
    });
  }
  meeting.preps.forEach((prep, index) => {
    // `null`/absent attribution is UNKNOWN provenance, not another record: preps
    // written before the client stamp existed carry `clientId: null` while the
    // enclosing meeting is client-scoped, and that one row used to fail the whole
    // payload — the drawer showed "Meeting unavailable" and notes, debriefs, edit
    // and join were unreachable (B0). A prep that names a different meeting or
    // client is still a contract violation; parseMeeting() degrades that one prep
    // instead of blanking the meeting.
    if (prep.meetingId != null && prep.meetingId !== meeting.id) {
      ctx.addIssue({
        code: "custom",
        path: ["preps", index, "meetingId"],
        message: "Preparation belongs to another meeting",
      });
    }
    if (
      prep.clientId != null &&
      prep.clientId !== (meeting.client?.id ?? null)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["preps", index, "clientId"],
        message: "Preparation belongs to another client",
      });
    }
  });
};
export const meetingSchema = meetingShape(
  z.array(preparationSchema),
).superRefine(meetingProvenance);
/**
 * Read a meeting payload without letting one unusable prep hide the meeting.
 *
 * The strict contract stays the gate: a prep naming another meeting or client is
 * still invalid. But the drawer must not be all-or-nothing (B0), so on a failure
 * that the preps explain, the meeting is re-read with only the preps it can prove
 * and the count of dropped preps is returned so the Preparation panel can say so.
 * Any other contract failure is still a failure.
 */
export function parseMeeting(payload: unknown): {
  meeting: Meeting;
  unusablePreps: number;
} {
  const parsed = meetingSchema.safeParse(payload);
  if (parsed.success) return { meeting: parsed.data, unusablePreps: 0 };
  const source = payload as { preps?: unknown } | null;
  const preps = Array.isArray(source?.preps) ? source.preps : [];
  const meetingId = (source as { id?: unknown } | null)?.id;
  const clientId =
    (source as { client?: { id?: unknown } | null } | null)?.client?.id ?? null;
  const usable = preps.filter((prep) => {
    const row = prep as { meetingId?: unknown; clientId?: unknown };
    return (
      (row.meetingId == null || row.meetingId === meetingId) &&
      (row.clientId == null || row.clientId === clientId)
    );
  });
  const retried = meetingSchema.safeParse({ ...(source ?? {}), preps: usable });
  if (retried.success && preps.length !== usable.length)
    return {
      meeting: retried.data,
      unusablePreps: preps.length - usable.length,
    };
  throw new Error(
    "The service returned an unexpected response. Please retry or contact support.",
  );
}
export type Meeting = z.infer<typeof meetingSchema>;
/**
 * The calendar LIST contract (D5). Identical to `meetingSchema` except that prep rows are
 * the metadata projection Core returns for a list; only `fetchMeetings` parses with this.
 * Detail reads keep `meetingSchema`, where a prep body is required.
 */
export const meetingListSchema = meetingShape(
  z.array(preparationListSchema),
).superRefine(meetingProvenance);
export const hearingSchema = z.object({
  id: z.string(),
  canonicalEventId: z.string().nullish(),
  title: z.string(),
  date: z.string(),
  startsAt: z.string().nullable(),
  timezone: z.string(),
  eventStatus: z.string(),
  officialPageUrl: z.string().nullable(),
});
export const hearingPageSchema = z.object({
  rows: z.array(hearingSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
const plannerDay = z.string().refine((value) => Boolean(validDay(value)));
const plannerTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const plannerZone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
});
export const taskSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    status: z.string(),
    archived: z.boolean(),
    dueOn: plannerDay.nullable(),
    startOn: plannerDay.nullable(),
    dueTime: plannerTime.nullish(),
    startTime: plannerTime.nullish(),
    timeZone: plannerZone.nullish(),
    clientId: z.string().nullable(),
  })
  .superRefine((task, ctx) => {
    for (const [time, date] of [
      ["startTime", "startOn"],
      ["dueTime", "dueOn"],
    ] as const) {
      if (task[time] && (!task[date] || !task.timeZone))
        ctx.addIssue({
          code: "custom",
          path: [time],
          message: "A timed Planner task requires its source date and timezone",
        });
    }
  });
export const taskPageSchema = z.object({
  items: z.array(taskSchema),
  nextCursor: z.string().nullable(),
});
export const deadlineSchema = z.object({
  id: z.string(),
  documentNumber: z.string(),
  title: z.string(),
  commentEndDate: z.string().nullable(),
  effectiveDate: z.string().nullable(),
  htmlUrl: z.string().nullable(),
});
export type CalendarKind =
  | "meeting"
  | "hearing"
  | "planner"
  | "deadline"
  | "government";
export interface CalendarItem {
  key: string;
  kind: CalendarKind;
  sourceId: string;
  title: string;
  day: string;
  startAt?: string;
  endAt?: string;
  timeZone: string;
  clientId?: string;
  status?: string;
  href?: string;
  provenance: string;
  effectiveDate?: EffectiveDateRecord;
  meeting?: Meeting;
}
export interface CalendarFeed {
  items: CalendarItem[];
  limitations: string[];
}
export const noteSchema = z.object({
  id: z.string(),
  // Native serializers emit these echoes; legacy full GET projections omit them.
  meetingId: z.string().min(1).optional(),
  clientId: z.string().nullable().optional(),
  body: z.string().nullable(),
  restricted: z.boolean(),
  confidential: z.boolean(),
  status: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sharedAt: z.string().nullable().optional(),
  metadataVersion: z.literal(1).optional(),
  revision: z.iso.datetime().optional(),
  sharingKnown: z.boolean().optional(),
  approvalKnown: z.boolean().optional(),
  approvedAt: z.iso.datetime().nullable().optional(),
  approvedByUserId: z.string().nullable().optional(),
  sharedByUserId: z.string().nullable().optional(),
  authorUserId: z.string().nullable().optional(),
  author: artifactActorSchema.optional(),
  approvedBy: artifactActorSchema.optional(),
  sharedBy: artifactActorSchema.optional(),
  capabilities: z
    .object({
      edit: z.boolean(),
      approve: z.boolean(),
      share: z.boolean(),
      unshare: z.boolean(),
    })
    .optional(),
});
export function meetingArtifactListSchema(
  meetingId: string | null,
  clientId?: string | null,
) {
  return z
    .array(noteSchema)
    .refine(
      (rows) =>
        new Set(rows.map((row) => row.id)).size === rows.length &&
        rows.every(
          (row) =>
            (row.meetingId === undefined || row.meetingId === meetingId) &&
            (clientId === undefined ||
              row.clientId === undefined ||
              row.clientId === clientId),
        ),
      "Saved artifacts do not match the requested meeting and client.",
    );
}
