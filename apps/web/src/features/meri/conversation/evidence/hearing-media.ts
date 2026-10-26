import type {
  HearingMediaReadResponse,
  HearingMediaReadRequest,
} from "@capiro/meri-contracts/conversation-sources";

export type HearingMedia = HearingMediaReadResponse["current"]["media"];
export type HearingManifest = NonNullable<HearingMedia["manifest"]>;
export type HearingPlayback = NonNullable<HearingMedia["playback"]>;
export type HearingPlaybackSelection = NonNullable<
  HearingMediaReadRequest["playback"]
>;

export function recordingTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((seconds / 60) % 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export const hasRetainedAudio = (
  epoch: HearingManifest["epochs"][number],
  now: number,
) =>
  epoch.state !== "expired" &&
  Date.parse(epoch.expiresAt) > now &&
  epoch.durableBytes > 0 &&
  epoch.durableEndMs > epoch.startMs;
