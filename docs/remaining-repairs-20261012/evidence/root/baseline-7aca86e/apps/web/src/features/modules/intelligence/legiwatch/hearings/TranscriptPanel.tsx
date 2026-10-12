"use client";
import { useEffect, useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { timecode } from "../components";
import styles from "../legiwatch.module.css";

export function TranscriptPanel({
  hearingId,
  live = false,
}: {
  hearingId: string;
  live?: boolean;
}) {
  const [cursor, setCursor] = useState<string | undefined>();
  const result = useCapiroQuery("legiwatch.transcript", {
    params: { id: hearingId },
    query: { cursor, limit: 250 },
  });
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(result.reload, 10000);
    return () => clearInterval(timer);
  }, [live, result.reload]);
  return (
    <section className={styles.card}>
      <div className={styles.row}>
        <h2>{live ? "Live transcript" : "Transcript"}</h2>
        <ActionButton onClick={result.reload}>Refresh</ActionButton>
      </div>
      <p className={styles.description}>
        Machine-generated transcript. Verify consequential quotations against
        the official recording or transcript.
      </p>
      <StatusPanel
        loading={result.loading}
        error={result.error}
        onRetry={result.reload}
        empty={
          !result.loading && !result.error && !result.data?.items.length
            ? "Transcript is not available yet"
            : undefined
        }
      >
        {result.data && (
          <>
            {result.data.capture?.transcriptGapSeconds ? (
              <p className={styles.gap}>
                {result.data.capture.transcriptGapSeconds} seconds of transcript
                gaps are recorded.
              </p>
            ) : null}
            <div className={styles.transcript}>
              {result.data.items.map((segment) => (
                <div key={segment.id}>
                  {segment.hasGapBefore && (
                    <p className={styles.gap}>
                      A transcript gap precedes this segment.
                    </p>
                  )}
                  <article className={styles.segment}>
                    <span className={styles.timecode}>
                      {timecode(segment.startMs)}
                    </span>
                    <div>
                      <div className={styles.row}>
                        <strong>
                          {segment.speakerName ||
                            (segment.speakerLabel
                              ? `Speaker ${segment.speakerLabel}`
                              : "Unattributed speaker")}
                        </strong>
                        {!segment.isFinal && <Badge>Preliminary</Badge>}
                      </div>
                      <p>{segment.text}</p>
                      {segment.confidence !== null && (
                        <p className={styles.description}>
                          Transcription confidence:{" "}
                          {Math.round(segment.confidence * 100)}%
                        </p>
                      )}
                    </div>
                  </article>
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              {cursor && (
                <ActionButton onClick={() => setCursor(undefined)}>
                  Start of transcript
                </ActionButton>
              )}
              <ActionButton
                disabled={!result.data.hasMore || !result.data.nextCursor}
                onClick={() => setCursor(result.data?.nextCursor ?? undefined)}
              >
                Next transcript page
              </ActionButton>
            </div>
          </>
        )}
      </StatusPanel>
    </section>
  );
}
