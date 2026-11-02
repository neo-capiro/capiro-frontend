import { expect, it } from "vitest";
import {
  captureMediaPlan,
  supportsVideoRecording,
  verifyVideoEpoch,
  VIDEO_MIME,
  TRANSCRIPTION_MIME,
} from "./capture-media";
import { hearingWsMessageSchema } from "./ws-messages";

const compatible = {
  available: true,
  videoAvailable: true,
  recordingProtocols: [1, 2],
  videoMimeType: VIDEO_MIME,
};
it("never offers or silently downgrades video against old, unavailable or unknown backends", () => {
  for (const capability of [
    undefined,
    { available: true },
    { ...compatible, videoAvailable: false },
    { available: false, recordingProtocols: [2], videoMimeType: VIDEO_MIME },
    { ...compatible, recordingProtocols: [1] },
  ]) {
    expect(supportsVideoRecording(capability)).toBe(false);
    expect(() =>
      captureMediaPlan(true, "audio_and_transcript", capability, () => true),
    ).toThrow("not available");
  }
  expect(
    captureMediaPlan(
      false,
      "audio_and_transcript",
      { available: true },
      () => true,
    ),
  ).toMatchObject({ recordingProtocol: 1, mimeType: TRANSCRIPTION_MIME });
});
it("requires retention and both codecs for video while preserving explicit audio capture", () => {
  expect(
    captureMediaPlan(true, "audio_and_transcript", compatible, () => true),
  ).toEqual({
    recordingProtocol: 2,
    mimeType: VIDEO_MIME,
    transcriptionMimeType: TRANSCRIPTION_MIME,
  });
  expect(() =>
    captureMediaPlan(true, "transcript_only", compatible, () => true),
  ).toThrow();
  expect(() =>
    captureMediaPlan(
      true,
      "audio_and_transcript",
      compatible,
      (mime) => mime !== VIDEO_MIME,
    ),
  ).toThrow("No audio-only fallback");
});
it("requires exact server epoch confirmation before sending video and preserves wire capability fields", () => {
  for (const epoch of [
    {},
    { recordingProtocol: 1 },
    { recordingProtocol: 2, mimeType: TRANSCRIPTION_MIME },
  ])
    expect(() => verifyVideoEpoch(epoch)).toThrow("Keep this session");
  const epoch = hearingWsMessageSchema.parse({
    type: "recording_epoch",
    recordingId: "synthetic-recording",
    epochId: "synthetic-epoch",
    startMs: 0,
    recordingProtocol: 2,
    mimeType: VIDEO_MIME,
  });
  expect(epoch.type).toBe("recording_epoch");
  if (epoch.type === "recording_epoch")
    expect(() => verifyVideoEpoch(epoch)).not.toThrow();
});
