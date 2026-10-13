import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  calendarExportSchema,
  calendarHearingSchema,
  calendarPageSchema,
  calendarQuerySchema,
  committeeDetailSchema,
  committeeParams,
  committeesPageSchema,
  hearingIdParams,
  officialDateSchema,
  stateCommitteeSchema,
} from "./legiwatch-calendar-schemas";

const source =
  "apps/api/src/live-hearings/live-hearings.controller.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const wave1 =
  "apps/api/src/live-hearings/legiwatch-wave1.controller.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const empty = z.object({}).strict();
export const legiwatchCalendarOperations = {
  "legiwatch.calendar": defineOperation({
    service: "core",
    method: "GET",
    path: "/legiwatch/live-hearings/calendar",
    request: z.object({ query: calendarQuerySchema.optional() }).strict(),
    response: calendarPageSchema,
    source,
  }),
  "legiwatch.live": defineOperation({
    service: "core",
    method: "GET",
    path: "/legiwatch/live-hearings/live",
    request: empty,
    response: z.object({
      rows: z.array(calendarHearingSchema),
      items: z.array(calendarHearingSchema).optional(),
      asOf: z.string(),
    }),
    source,
  }),
  "legiwatch.committees": defineOperation({
    service: "core",
    method: "GET",
    path: "/legiwatch/live-hearings/committees",
    request: empty,
    response: committeesPageSchema,
    source,
  }),
  "legiwatch.committee": defineOperation({
    service: "core",
    method: "GET",
    path: "/legiwatch/live-hearings/committees/:id",
    request: z.object({ params: committeeParams }).strict(),
    response: committeeDetailSchema,
    source,
  }),
  "legiwatch.stateCommittees": defineOperation({
    service: "core",
    method: "GET",
    path: "/legiwatch/live-hearings/state-committees",
    request: z
      .object({
        query: z.object({ session: z.string().optional() }).strict().optional(),
      })
      .strict(),
    response: z.array(stateCommitteeSchema),
    source,
  }),
  "legiwatch.calendarCoverage": defineOperation({
    service: "core",
    method: "GET",
    path: "/legiwatch/live-hearings/calendar/coverage",
    request: z.object({ query: calendarQuerySchema.optional() }).strict(),
    response: z.object({
      rows: z.array(
        z.object({
          chamber: z.string(),
          session: z.string().nullable(),
          status: z.string(),
          from: officialDateSchema,
          to: officialDateSchema,
          checkedAt: z.string(),
          items: z.number(),
        }),
      ),
      asOf: z.string(),
    }),
    source,
  }),
  "legiwatch.calendarExport": defineOperation({
    service: "core",
    method: "GET",
    path: "/legiwatch/live-hearings/events/:id/calendar-export",
    request: z
      .object({
        params: hearingIdParams,
        query: z
          .object({ dateOnlyReminder: z.enum(["true", "false"]).optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: calendarExportSchema,
    source: wave1,
  }),
  "legiwatch.calendarExportBulk": defineOperation({
    service: "core",
    method: "POST",
    path: "/legiwatch/live-hearings/calendar-export/bulk",
    request: z
      .object({
        body: calendarQuerySchema
          .extend({ dateOnlyReminder: z.boolean().optional() })
          .strict(),
      })
      .strict(),
    response: z.object({
      ics: z.string(),
      filename: z.string(),
      includedCount: z.number(),
      skipped: z.array(z.object({ id: z.string(), reason: z.string() })),
    }),
    source: wave1,
  }),
} as const;
