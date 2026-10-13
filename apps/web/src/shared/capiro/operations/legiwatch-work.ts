import { z } from "zod";
import { defineOperation } from "../contracts";
import { hearingIdParams } from "./legiwatch-calendar-schemas";
import { sourceDocumentSchema } from "./legiwatch-hearing-schemas";

export const hearingContextSchema = z.object({
  id: z.string(),
  title: z.string(),
  chamber: z.string(),
  committeeName: z.string().nullable(),
  calendarDate: z.string(),
  scheduledStart: z.string().nullable(),
  eventStatus: z.string(),
  detailPath: z.string(),
  officialPageUrl: z.string().nullable(),
  witnesses: z.array(z.string()).optional(),
});
export const briefPrefillSchema = z.object({
  draft: z.object({ docTitle: z.string(), client: z.string().optional() }),
  context: z.object({
    source: z.literal("legiwatch-hearing"),
    hearing: hearingContextSchema,
    client: z.object({ id: z.string(), name: z.string() }).nullable(),
    findings: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        summary: z.string(),
        insightType: z.string(),
        evidenceText: z.string().nullable(),
        speakerName: z.string().nullable(),
        segmentId: z.string().nullable(),
        startMs: z.number().nullable(),
      }),
    ),
  }),
  sources: z.array(sourceDocumentSchema),
});
const reviewedBrief = z
  .object({
    title: z.string().max(300),
    mode: z.enum(["preparation", "recap"]),
    sections: z
      .array(
        z
          .object({ name: z.string().max(200), content: z.string().max(50000) })
          .strict(),
      )
      .max(30),
    sources: z.array(sourceDocumentSchema).max(300).optional(),
    clientName: z.string().max(200).optional(),
    clientId: z.uuid(),
  })
  .strict();
const source =
  "apps/api/src/live-hearings/legiwatch-wave1.controller.ts + legiwatch-wave1.dto.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const legiwatchWorkOperations = {
  "legiwatch.brief.prefill": defineOperation({
    service: "core",
    method: "POST",
    path: "/legiwatch/live-hearings/events/:id/actions/brief-prefill",
    request: z
      .object({
        params: hearingIdParams,
        body: z
          .object({
            clientId: z.uuid().optional(),
            insightIds: z.array(z.string()).optional(),
          })
          .strict(),
      })
      .strict(),
    response: briefPrefillSchema,
    source,
  }),
  "legiwatch.brief.saveToClient": defineOperation({
    service: "core",
    method: "POST",
    path: "/legiwatch/live-hearings/events/:id/actions/brief/save-to-client",
    request: z
      .object({ params: hearingIdParams, body: reviewedBrief })
      .strict(),
    response: z.object({ attachmentId: z.string(), fileName: z.string() }),
    source,
  }),
  "legiwatch.saveItem": defineOperation({
    service: "core",
    method: "POST",
    path: "/legiwatch/live-hearings/events/:id/saved-items",
    request: z
      .object({
        params: hearingIdParams,
        body: z
          .object({
            kind: z.enum(["moment", "finding", "hearing"]),
            segmentId: z.string().optional(),
            insightId: z.string().optional(),
            clientId: z.uuid().optional(),
            note: z.string().max(2000).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      id: z.string().nullable(),
      hearingId: z.string(),
      kind: z.string(),
      saved: z.literal(true),
    }),
    source,
  }),
  "legiwatch.outreach.prefill": defineOperation({
    service: "core",
    method: "POST",
    path: "/legiwatch/live-hearings/events/:id/actions/outreach-prefill",
    request: z
      .object({
        params: hearingIdParams,
        body: z
          .object({
            clientId: z.uuid(),
            insightId: z.string().optional(),
            segmentId: z.string().optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      clientId: z.string(),
      clientName: z.string().nullable(),
      status: z.literal("staged"),
      autoSend: z.literal(false),
      context: z.object({
        source: z.literal("legiwatch-hearing"),
        hearing: hearingContextSchema,
      }),
      sources: z.array(sourceDocumentSchema),
    }),
    source,
  }),
} as const;
