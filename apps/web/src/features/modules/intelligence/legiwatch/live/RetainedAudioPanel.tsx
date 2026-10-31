"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { timecode } from "../components";
import styles from "../legiwatch.module.css";

export function RetainedAudioPanel({
  sessionId,
  capturing,
  onPolicyChanged,
}: {
  sessionId: string;
  capturing: boolean;
  onPolicyChanged: () => void;
}) {
  const manifest = useCapiroQuery("legiwatch.recording", {
    params: { id: sessionId },
  });
  const capability = useCapiroQuery("legiwatch.recording.capability", {
    params: { id: sessionId },
  });
  const enable = useCapiroMutation("legiwatch.recording.enable"),
    playback = useCapiroMutation("legiwatch.recording.playback");
  const [error, setError] = useState<string>();
  async function retain() {
    try {
      await enable.run({ params: { id: sessionId } });
      manifest.reload();
      onPolicyChanged();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not enable retained audio",
      );
    }
  }
  async function play(epochId: string) {
    setError(undefined);
    try {
      await playback.run({ params: { id: sessionId, epochId } });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Playback unavailable",
      );
    }
  }
  return (
    <section className={styles.card}>
      <div className={styles.row}>
        <h2>Recording and saved audio</h2>
        <ActionButton onClick={manifest.reload}>Refresh coverage</ActionButton>
      </div>
      <StatusPanel
        loading={manifest.loading || capability.loading}
        error={manifest.error || capability.error}
        onRetry={() => {
          manifest.reload();
          capability.reload();
        }}
      >
        {manifest.data?.recordingPolicy === "transcript_only" && (
          <>
            <p>
              Transcript only. Audio sent for transcription is not retained for
              replay.
            </p>
            <p className={styles.description}>
              {capability.data?.reason ??
                (capability.data?.retentionDays
                  ? `Retention available for ${capability.data.retentionDays} days.`
                  : "Retention duration was not supplied.")}
            </p>
            <ActionButton
              primary
              disabled={
                capturing || !capability.data?.available || enable.pending
              }
              onClick={() => void retain()}
            >
              {enable.pending
                ? "Enabling…"
                : "Enable retained audio before capture"}
            </ActionButton>
          </>
        )}
        {manifest.data?.recording && (
          <>
            <Badge>{manifest.data.recording.state}</Badge>
            <p className={styles.description}>
              Playback ·{" "}
              {manifest.data.recording.playbackAvailability ??
                "Availability not supplied"}{" "}
              · Expires{" "}
              {new Date(manifest.data.recording.expiresAt).toLocaleString()}
            </p>
            {manifest.data.recording.epochs.map((epoch) => (
              <article className={styles.listItem} key={epoch.id}>
                <div className={styles.row}>
                  <div>
                    <strong>
                      {timecode(epoch.startMs)}–{timecode(epoch.durableEndMs)}
                    </strong>
                    <p className={styles.description}>
                      {epoch.complete
                        ? "Saved epoch complete"
                        : "Partial saved coverage"}{" "}
                      · {epoch.durableBytes.toLocaleString()} durable bytes
                    </p>
                  </div>
                  <ActionButton
                    disabled={!epoch.playable || playback.pending}
                    onClick={() => void play(epoch.id)}
                  >
                    Play saved epoch
                  </ActionButton>
                </div>
                {epoch.reason && <p className={styles.gap}>{epoch.reason}</p>}
              </article>
            ))}
          </>
        )}
        {playback.data && (
          <audio
            key={playback.data.url}
            controls
            src={playback.data.url}
            aria-label="Retained hearing audio"
          />
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </StatusPanel>
    </section>
  );
}
