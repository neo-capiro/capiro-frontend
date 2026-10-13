import { z } from "zod";
import { defineOperation } from "../contracts";
import { hearingIdParams } from "./legiwatch-calendar-schemas";

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceType: z.string(),
  audioSource: z.string(),
  recordingPolicy: z.string(),
  status: z.string(),
  consentStatus: z.string(),
  sourceUrl: z.string().nullable(),
  hearingId: z.string().nullable(),
  committeeId: z.string().nullable(),
  clientId: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});
export type BrowserHearingSession = z.infer<typeof sessionSchema>;
const epochSchema = z.object({
  id: z.string(),
  startMs: z.number(),
  durableEndMs: z.number(),
  durableSequence: z.number(),
  durableBytes: z.number(),
  state: z.string(),
  complete: z.boolean(),
  reason: z.string().nullable(),
  decodedDurationMs: z.number().nullable(),
  playable: z.boolean(),
});
export const recordingManifestSchema = z.object({
  recordingPolicy: z.string(),
  recording: z
    .object({
      id: z.string(),
      state: z.string(),
      playbackAvailability: z
        .enum(["available", "expired", "permission_unavailable"])
        .optional(),
      originAt: z.string(),
      expiresAt: z.string(),
      transcriptState: z.string(),
      analysisState: z.string(),
      epochs: z.array(epochSchema),
    })
    .nullable(),
});
const params = z.object({ params: hearingIdParams }).strict();
const source =
  "apps/intel-api/src/hearing/hearing.controller.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const recording =
  "apps/intel-api/src/hearing/recording/recording.controller.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const ticketSchema = z.object({
  ticket: z.string().min(1).max(2000),
  expiresAt: z.iso.datetime(),
});
export const legiwatchSessionOperations = {
  "legiwatch.session.transcript": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/hearings/:id/transcript",
    request: z
      .object({
        params: hearingIdParams,
        query: z
          .object({
            offset: z.number().int().min(0).max(100000).optional(),
            limit: z.number().int().min(1).max(500).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      items: z.array(
        z.object({
          id: z.string(),
          startMs: z.number(),
          endMs: z.number(),
          text: z.string(),
          speakerLabel: z.string().optional(),
          resolvedSpeakerName: z.string().optional(),
          confidence: z.number().optional(),
        }),
      ),
      nextOffset: z.number().nullable(),
      hasMore: z.boolean(),
    }),
    source:
      "apps/intel-api/src/hearing/hearing.controller.ts; post-hearing.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace",
  }),
  "legiwatch.session.list": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/hearings/history",
    request: z
      .object({
        query: z
          .object({
            cursor: z.string().optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      items: z.array(sessionSchema),
      total: z.number(),
      hasMore: z.boolean(),
      nextCursor: z.string().nullable(),
    }),
    source,
  }),
  "legiwatch.session": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/hearings/:id",
    request: params,
    response: sessionSchema,
    source,
  }),
  "legiwatch.session.create": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/hearings",
    request: z
      .object({
        body: z
          .object({
            title: z.string().max(300),
            sourceType: z.enum([
              "hearing",
              "markup",
              "meeting",
              "webinar",
              "agency_session",
            ]),
            audioSource: z.literal("browser_mic"),
            recordingPolicy: z.literal("transcript_only").optional(),
            sourceUrl: z.string().max(2000).optional(),
            consentAttestation: z.string().max(2000).optional(),
            clientId: z.string().optional(),
            hearingId: z.string().optional(),
            committeeId: z.string().optional(),
          })
          .strict(),
      })
      .strict(),
    response: sessionSchema,
    source,
  }),
  "legiwatch.session.consent": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/hearings/:id/consent",
    request: z
      .object({
        params: hearingIdParams,
        body: z.object({ attestation: z.string().min(1).max(2000) }).strict(),
      })
      .strict(),
    response: sessionSchema,
    source,
  }),
  "legiwatch.session.wsTicket": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/hearings/:id/ws-ticket",
    request: params,
    upstreamResponse: ticketSchema,
    response: ticketSchema.extend({ socketUrl: z.url() }),
    websocket: {
      path: "/live",
      sessionParam: "id",
      sessionQuery: "sessionId",
      ticketField: "ticket",
      ticketQuery: "ticket",
    },
    source,
  }),
  "legiwatch.recording": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/hearings/:id/recording",
    request: params,
    response: recordingManifestSchema,
    source: recording,
  }),
  "legiwatch.recording.capability": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/hearings/:id/recording/capability",
    request: params,
    response: z.object({
      available: z.boolean(),
      retentionDays: z.number().nullable(),
      reason: z.string().nullable(),
    }),
    source: recording,
  }),
  "legiwatch.recording.enable": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/hearings/:id/recording/enable",
    request: params,
    response: z.object({ recordingPolicy: z.literal("audio_and_transcript") }),
    source: recording,
  }),
  "legiwatch.recording.playback": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/hearings/:id/recording/epochs/:epochId/playback",
    request: z
      .object({
        params: hearingIdParams
          .extend({ epochId: z.string().min(1).max(200) })
          .strict(),
      })
      .strict(),
    response: z.object({
      url: z.url(),
      expiresAt: z.string(),
      epochId: z.string(),
      startMs: z.number(),
      durationMs: z.number(),
    }),
    source: recording,
  }),
} as const;
