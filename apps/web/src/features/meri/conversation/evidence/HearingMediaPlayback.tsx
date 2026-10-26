"use client";
import { useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { NativeHearingSourceEvent } from "@capiro/meri-contracts/conversation-sources";
import type { ConversationReads } from "../../../../shared/meri-conversations/current-reads";
import { useCurrentRead } from "./useCurrentRead";
import { recordingTime, type HearingPlaybackSelection } from "./hearing-media";
import ui from "../../ui/meri-ui.module.css";

const RecordedAudioPlayer = dynamic(() => import("./RecordedAudioPlayer"), {
  ssr: false,
  loading: () => <p role="status">Loading audio controls…</p>,
});

export function HearingMediaPlayback({
  event,
  reads,
  selection,
  rangeEndMs,
  onNext,
  onExpired,
  onUnavailable,
  onSourceInvalidated,
}: {
  event: NativeHearingSourceEvent;
  reads: ConversationReads;
  selection: HearingPlaybackSelection;
  rangeEndMs: number;
  onNext: (positionMs: number) => void;
  onExpired: () => void;
  onUnavailable: () => void;
  onSourceInvalidated: () => void;
}) {
  const read = useCallback(
    (signal: AbortSignal) =>
      reads
        .hearingMedia(event.binding.runId, event.eventId, selection, signal)
        .then((response) => ({ response, receivedAt: Date.now() })),
    [reads, event.binding.runId, event.eventId, selection],
  );
  const result = useCurrentRead(JSON.stringify(selection), read);
  const playback = result.value?.response.current.media.playback;
  const receivedAt = result.value?.receivedAt ?? 0;
  const expiresAt = playback
    ? Math.min(Date.parse(playback.expiresAt), receivedAt + 60_000)
    : 0;
  useEffect(() => {
    if (!playback) return;
    const timer = setTimeout(onExpired, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [playback, expiresAt, onExpired]);
  useEffect(() => {
    if (
      result.error === "SOURCE_REFERENCE_STALE" ||
      result.error === "SOURCE_REFERENCE_NOT_FOUND"
    )
      onSourceInvalidated();
  }, [result.error, onSourceInvalidated]);
  if (result.loading) return <p role="status">Checking recording access…</p>;
  if (!playback || expiresAt <= receivedAt)
    return (
      <div role="status">
        <p>
          This recording segment is unavailable with current access. Coverage
          may contain gaps.
        </p>
        <button type="button" className={ui.outline} onClick={result.reload}>
          Check segment again
        </button>
      </div>
    );
  return (
    <div>
      <p>
        Loaded segment: {recordingTime(playback.startMs)}–
        {recordingTime(playback.endMs)} on the recording timeline.
      </p>
      <RecordedAudioPlayer
        playback={playback}
        positionMs={selection.positionMs}
        onUnavailable={onUnavailable}
      />
      {playback.endMs < rangeEndMs && (
        <button
          type="button"
          className={ui.outline}
          onClick={() => onNext(playback.endMs)}
        >
          Load next segment
        </button>
      )}
    </div>
  );
}
