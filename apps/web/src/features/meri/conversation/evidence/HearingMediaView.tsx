"use client";
import { useCallback, useEffect, useId, useState } from "react";
import type { NativeHearingSourceEvent } from "@capiro/meri-contracts/conversation-sources";
import type { ConversationReads } from "../../../../shared/meri-conversations/current-reads";
import { useCurrentRead } from "./useCurrentRead";
import { HearingMediaPlayback } from "./HearingMediaPlayback";
import type { HearingPlaybackSelection } from "./hearing-media";
import { HearingRecordingRanges } from "./HearingRecordingRanges";
import ui from "../../ui/meri-ui.module.css";
import styles from "./hearing-media.module.css";

type HearingMediaViewProps = {
  event: NativeHearingSourceEvent;
  reads: ConversationReads;
  onSourceInvalidated: () => void;
};

export function HearingMediaView(props: HearingMediaViewProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  if (open) return <HearingMediaCoverage {...props} />;
  return (
    <section className={styles.recording} aria-labelledby={titleId}>
      <h3 id={titleId}>Hearing recording</h3>
      <p>
        Check current access to retained hearing audio. Captions are
        unavailable.
      </p>
      <button
        type="button"
        className={ui.outline}
        onClick={() => setOpen(true)}
      >
        Check recording coverage
      </button>
    </section>
  );
}

function useHearingMediaCoverage({
  event,
  reads,
  onSourceInvalidated,
}: HearingMediaViewProps) {
  const read = useCallback(
    (signal: AbortSignal) =>
      reads
        .hearingMedia(event.binding.runId, event.eventId, null, signal)
        .then((response) => ({ response, receivedAt: Date.now() })),
    [reads, event.binding.runId, event.eventId],
  );
  const result = useCurrentRead(event.eventId, read);
  const [active, setActive] = useState<{
    request: HearingPlaybackSelection;
    generation: number;
  }>();
  const [notice, setNotice] = useState<string>();
  const onExpired = useCallback(() => {
    setActive(undefined);
    setNotice(
      "Playback access expired. Load the recording again to check access.",
    );
  }, []);
  const onUnavailable = useCallback(() => {
    setActive(undefined);
    setNotice(
      "This recording could not be played. Load it again to check access.",
    );
  }, []);
  useEffect(() => {
    if (
      result.error === "SOURCE_REFERENCE_STALE" ||
      result.error === "SOURCE_REFERENCE_NOT_FOUND"
    )
      onSourceInvalidated();
  }, [result.error, onSourceInvalidated]);
  const epochs = result.value?.response.current.media.manifest?.epochs ?? [];
  const select = (request: HearingPlaybackSelection) => {
    setNotice(undefined);
    setActive((current) => ({
      request,
      generation: (current?.generation ?? 0) + 1,
    }));
  };
  const refresh = () => {
    setActive(undefined);
    setNotice(undefined);
    result.reload();
  };
  const next = (positionMs: number) => {
    if (active) select({ ...active.request, positionMs });
  };
  return {
    result,
    active,
    notice,
    epochs,
    onExpired,
    onUnavailable,
    select,
    refresh,
    next,
  };
}

function HearingMediaCoverage(props: HearingMediaViewProps) {
  const titleId = useId();
  const { event, reads, onSourceInvalidated } = props;
  const coverage = useHearingMediaCoverage(props);
  const { result, active, notice, epochs } = coverage;
  return (
    <section className={styles.recording} aria-labelledby={titleId}>
      <h3 id={titleId}>Hearing recording</h3>
      <p>
        Available recording ranges may be partial. They do not locate this
        record or a cited passage in the audio.
      </p>
      <p>Captions are unavailable for this recording.</p>
      {result.loading ? (
        <p role="status">Checking recording coverage…</p>
      ) : (
        <>
          {result.error ? (
            <p role="status">
              Recording coverage is unavailable with current access.
            </p>
          ) : (
            <HearingRecordingRanges
              epochs={epochs}
              receivedAt={result.value?.receivedAt ?? 0}
              onSelect={coverage.select}
            />
          )}
          <button
            type="button"
            className={ui.outline}
            onClick={coverage.refresh}
          >
            Refresh recording coverage
          </button>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
      {active && (
        <HearingMediaPlayback
          key={`${active.request.epochId}:${active.generation}`}
          event={event}
          reads={reads}
          selection={active.request}
          rangeEndMs={
            epochs.find((epoch) => epoch.id === active.request.epochId)
              ?.durableEndMs ?? active.request.positionMs
          }
          onNext={coverage.next}
          onExpired={coverage.onExpired}
          onUnavailable={coverage.onUnavailable}
          onSourceInvalidated={onSourceInvalidated}
        />
      )}
    </section>
  );
}
