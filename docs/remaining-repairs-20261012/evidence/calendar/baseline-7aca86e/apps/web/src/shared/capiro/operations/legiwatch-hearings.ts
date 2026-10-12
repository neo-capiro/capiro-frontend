import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  captureSchema,
  hearingIdParams,
  officialDateSchema,
} from "./legiwatch-calendar-schemas";
import {
  archivePageSchema,
  attendanceSchema,
  briefSchema,
  browserJoinSchema,
  followConfigBody,
  followStateSchema,
  hearingDetailSchema,
  intelligenceSchema,
  notificationPreferencesSchema,
  notificationsPageSchema,
  roomSchema,
  transcriptPageSchema,
} from "./legiwatch-hearing-schemas";

const base = "/legiwatch/live-hearings";
const source =
  "apps/api/src/live-hearings/legiwatch-wave1.controller.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const phase7 =
  "apps/api/src/live-hearings/live-hearings-phase7.controller.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const paramsRequest = z.object({ params: hearingIdParams }).strict();
export const legiwatchHearingOperations = {
  "legiwatch.hearing": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/events/:id/detail-v2`,
    request: z
      .object({
        params: hearingIdParams,
        query: z.object({ clientId: z.uuid().optional() }).strict().optional(),
      })
      .strict(),
    response: hearingDetailSchema,
    source,
  }),
  "legiwatch.room": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/events/:id/room`,
    request: paramsRequest,
    response: roomSchema,
    source: phase7,
  }),
  "legiwatch.follow.read": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/events/:id/follow-config`,
    request: paramsRequest,
    response: followStateSchema,
    source,
  }),
  "legiwatch.follow.update": defineOperation({
    service: "core",
    method: "PUT",
    path: `${base}/events/:id/follow-config`,
    request: z
      .object({ params: hearingIdParams, body: followConfigBody })
      .strict(),
    response: followStateSchema,
    source,
  }),
  "legiwatch.follow.remove": defineOperation({
    service: "core",
    method: "DELETE",
    path: `${base}/events/:id/follow-config`,
    request: paramsRequest,
    response: followStateSchema,
    source,
  }),
  "legiwatch.attendance": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/events/:id/attendance`,
    request: paramsRequest,
    response: attendanceSchema,
    source,
  }),
  "legiwatch.attendance.request": defineOperation({
    service: "core",
    method: "PUT",
    path: `${base}/events/:id/attendance`,
    request: z
      .object({
        params: hearingIdParams,
        body: z
          .object({
            mode: z.enum(["automatic", "browser"]).optional(),
            consentAcknowledged: z.boolean().optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      hearingId: z.string(),
      requestedMode: z.enum(["automatic", "browser"]),
      attendance: attendanceSchema,
      oneCanonicalCapture: z.literal(true),
    }),
    source,
  }),
  "legiwatch.attendance.cancel": defineOperation({
    service: "core",
    method: "DELETE",
    path: `${base}/events/:id/attendance`,
    request: paramsRequest,
    response: z.object({ attendance: attendanceSchema }),
    source,
  }),
  "legiwatch.browserJoin": defineOperation({
    service: "core",
    method: "POST",
    path: `${base}/events/:id/join-browser`,
    request: paramsRequest,
    response: browserJoinSchema,
    source: phase7,
  }),
  "legiwatch.transcript": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/events/:id/transcript`,
    request: z
      .object({
        params: hearingIdParams,
        query: z
          .object({
            cursor: z.string().optional(),
            limit: z.number().int().min(1).max(500).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: transcriptPageSchema,
    source: phase7,
  }),
  "legiwatch.intelligence": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/events/:id/intelligence-v2`,
    request: z
      .object({
        params: hearingIdParams,
        query: z
          .object({
            clientId: z.uuid().optional(),
            cursor: z.string().optional(),
            limit: z.number().int().min(1).max(500).optional(),
            onlyRelevant: z.boolean().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: intelligenceSchema,
    source:
      "apps/api/src/live-hearings/live-hearings-phase8.controller.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace",
  }),
  "legiwatch.archive": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/archive/search`,
    request: z
      .object({
        query: z
          .object({
            temporalScope: z.enum(["past", "all"]).optional(),
            q: z.string().max(400).optional(),
            from: officialDateSchema.optional(),
            to: officialDateSchema.optional(),
            committee: z.string().optional(),
            clientId: z.uuid().optional(),
            hasTranscript: z.boolean().optional(),
            page: z.number().int().min(1).optional(),
            pageSize: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: archivePageSchema,
    source,
  }),
  "legiwatch.recordings": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/server-sessions`,
    request: z
      .object({
        query: z
          .object({
            q: z.string().optional(),
            page: z.number().int().min(1).optional(),
            pageSize: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      rows: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          committeeName: z.string(),
          date: z.string(),
          startsAt: z.string().nullable(),
          eventStatus: z.string(),
          capture: captureSchema.nullable(),
        }),
      ),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    }),
    source: phase7,
  }),
  "legiwatch.notifications": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/notifications`,
    request: z
      .object({
        query: z
          .object({
            unreadOnly: z.boolean().optional(),
            page: z.number().int().min(1).optional(),
            pageSize: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: notificationsPageSchema,
    source,
  }),
  "legiwatch.notifications.read": defineOperation({
    service: "core",
    method: "POST",
    path: `${base}/notifications/:id/read`,
    request: paramsRequest,
    response: z.object({ read: z.literal(true) }),
    source,
  }),
  "legiwatch.notifications.readAll": defineOperation({
    service: "core",
    method: "POST",
    path: `${base}/notifications/read-all`,
    request: z.object({}).strict(),
    response: z.object({ read: z.number() }),
    source,
  }),
  "legiwatch.notificationPreferences": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/notification-preferences`,
    request: z.object({}).strict(),
    response: notificationPreferencesSchema,
    source,
  }),
  "legiwatch.notificationPreferences.update": defineOperation({
    service: "core",
    method: "PUT",
    path: `${base}/notification-preferences`,
    request: z
      .object({
        body: z.object({ committeeEmailEnabled: z.boolean() }).strict(),
      })
      .strict(),
    response: notificationPreferencesSchema,
    source,
  }),
  "legiwatch.brief.generate": defineOperation({
    service: "core",
    method: "POST",
    path: `${base}/events/:id/actions/brief/generate`,
    request: z
      .object({
        params: hearingIdParams,
        body: z
          .object({
            clientId: z.uuid().optional(),
            focus: z.string().max(600).optional(),
          })
          .strict(),
      })
      .strict(),
    response: briefSchema,
    timeoutMs: 420000,
    source,
  }),
} as const;
