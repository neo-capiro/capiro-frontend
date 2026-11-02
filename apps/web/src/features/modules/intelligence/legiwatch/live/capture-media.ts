export const VIDEO_MIME = "video/webm;codecs=vp8,opus";
export const TRANSCRIPTION_MIME = "audio/webm;codecs=opus";
export type RecordingCapability = {
  available: boolean;
  videoAvailable?: boolean;
  recordingProtocols?: number[];
  videoMimeType?: string;
};
export function supportsVideoRecording(
  capability?: RecordingCapability | null,
) {
  return (
    capability?.available === true &&
    capability.videoAvailable === true &&
    capability.recordingProtocols?.includes(2) === true &&
    capability.videoMimeType === VIDEO_MIME
  );
}
export function captureMediaPlan(
  video: boolean,
  policy: string,
  capability: RecordingCapability | undefined,
  supported: (mime: string) => boolean,
) {
  if (video) {
    if (
      policy !== "audio_and_transcript" ||
      !supportsVideoRecording(capability)
    )
      throw new Error(
        "Video recording is not available from this backend. This session has not started video or fallen back to audio.",
      );
    if (!supported(VIDEO_MIME) || !supported(TRANSCRIPTION_MIME))
      throw new Error(
        "This browser cannot record the required VP8 video and Opus audio. No audio-only fallback was started.",
      );
    return {
      mimeType: VIDEO_MIME,
      recordingProtocol: 2 as const,
      transcriptionMimeType: TRANSCRIPTION_MIME,
    };
  }
  const mimeType = [TRANSCRIPTION_MIME, "audio/webm"].find(supported);
  if (!mimeType) throw new Error("This browser cannot record WebM/Opus audio.");
  return {
    mimeType,
    recordingProtocol:
      policy === "audio_and_transcript" ? (1 as const) : undefined,
    transcriptionMimeType: undefined,
  };
}
export function verifyVideoEpoch(message: {
  recordingProtocol?: number;
  mimeType?: string;
}) {
  if (message.recordingProtocol !== 2 || message.mimeType !== VIDEO_MIME)
    throw new Error(
      "The backend did not confirm video recording. No media was sent. Keep this session and check its recording coverage before retrying.",
    );
}
