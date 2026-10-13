import { z } from "zod";
// Matches apps/intel-api/src/hearing/hearing.types.ts at the pinned backend commit.
const segment = z.object({
  startMs: z.number(),
  endMs: z.number(),
  text: z.string(),
  speakerLabel: z.string().optional(),
  confidence: z.number().optional(),
});
export const hearingWsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("recording_epoch"),
    recordingId: z.string(),
    epochId: z.string(),
    startMs: z.number(),
  }),
  z.object({
    type: z.literal("audio_saved"),
    epochId: z.string(),
    sequence: z.number().int(),
    durableBytes: z.number(),
    durableEndMs: z.number(),
  }),
  z.object({ type: z.literal("interim"), segment }),
  z.object({ type: z.literal("final"), segmentId: z.string(), segment }),
  z.object({
    type: z.literal("card"),
    card: z.object({
      id: z.string(),
      cardType: z.string(),
      title: z.string(),
      body: z.string().optional(),
      startMs: z.number().optional(),
    }),
  }),
  z.object({ type: z.literal("status"), status: z.string() }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    code: z.string().optional(),
  }),
]);
export type LiveSegment = z.infer<typeof segment> & { id: string };
export type LiveCard = Extract<
  z.infer<typeof hearingWsMessageSchema>,
  { type: "card" }
>["card"];
