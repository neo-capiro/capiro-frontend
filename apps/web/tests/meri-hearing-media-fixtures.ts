import type { HearingMediaReadResponse } from "@capiro/meri-contracts/conversation-sources";
import saved from "./meri-hearing-source-fixtures.json" with { type: "json" };

/** Synthetic owner data; tests serve the audio bytes and never contact a provider. */
export function hearingMediaFixture(
  positionMs: number | null = null,
  expiresAt = new Date(Date.now() + 60_000).toISOString(),
): HearingMediaReadResponse {
  const event = saved.published.event as HearingMediaReadResponse["event"];
  return {
    schemaVersion: "meri.hearing-media-read/1",
    event,
    current: {
      source: {
        hearingId: event.data.selection.hearingId,
        recordId: event.data.source.recordId,
        contentHash: event.data.source.provenance.contentHash,
      },
      media:
        positionMs === null
          ? {
              manifest: {
                hearingId: event.data.selection.hearingId,
                mode: "server",
                format: "audio/wav",
                epochs: [
                  {
                    id: "synthetic-epoch",
                    startMs: 30_000,
                    durableEndMs: 70_000,
                    durableBytes: 1_280_044,
                    state: "retained",
                    transcriptState: "unavailable",
                    expiresAt,
                    reason: null,
                  },
                ],
              },
              playback: null,
            }
          : {
              manifest: null,
              playback: {
                epochId: "synthetic-epoch",
                partId:
                  positionMs < 50_000
                    ? "synthetic-part-one"
                    : "synthetic-part-two",
                startMs: positionMs < 50_000 ? 30_000 : 50_000,
                endMs: positionMs < 50_000 ? 50_000 : 70_000,
                url: "https://media.example.test/synthetic.wav",
                expiresAt,
              },
            },
    },
  };
}
