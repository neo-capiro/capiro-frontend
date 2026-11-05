"use client";
import { useState } from "react";
import type { TimelineEntry } from "./contracts";
import { statusLabel, timelineDate, timelineIcon } from "./history-model";
import styles from "./history.module.css";

const icons = {
  users: new URL("./assets/users.svg", import.meta.url).href,
  "file-text": new URL("./assets/file-text.svg", import.meta.url).href,
  landmark: new URL("./assets/landmark.svg", import.meta.url).href,
  mail: new URL("./assets/mail.svg", import.meta.url).href,
};
function EventContent({ entry }: { entry: TimelineEntry }) {
  return (
    <>
      <div className={styles.eventMeta}>
        <time dateTime={entry.date ?? undefined}>
          {timelineDate(entry.date)}
        </time>
        <span className={styles.eventType}>{statusLabel(entry.subtype)}</span>
      </div>
      <strong>{entry.title}</strong>
      <p>
        {entry.matterId
          ? (entry.matterTitle ?? "Associated advocacy matter")
          : "Unassigned"}
      </p>
      {(entry.evidenceClass || entry.confidence !== null) && (
        <small>
          {[
            entry.evidenceClass ? `Source: ${entry.evidenceClass}` : null,
            entry.confidence === null
              ? null
              : `${entry.attributionNeedsReview ? "Match confidence" : "Confidence"} ${Math.round(entry.confidence * 100)}%`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </small>
      )}
    </>
  );
}
function TimelineEntries({
  entries,
  onSelect,
  label,
}: {
  entries: TimelineEntry[];
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <ol aria-label={label} className={styles.events}>
      {entries.map((entry) => (
        <li key={`${entry.kind}:${entry.id}`} className={styles.event}>
          <div className={styles.rail} aria-hidden="true">
            <span className={styles.marker}>
              <span className={styles.icon}>
                {/* Keep the exact Figma SVG bytes and intrinsic dimensions. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={icons[timelineIcon(entry)]}
                  width={16}
                  height={16}
                  alt=""
                />
              </span>
            </span>
            <span className={styles.connector} />
          </div>
          {entry.matterId ? (
            <button
              className={styles.eventCard}
              onClick={() => onSelect(entry.matterId!)}
            >
              <EventContent entry={entry} />
            </button>
          ) : (
            <article className={styles.eventCard}>
              <EventContent entry={entry} />
            </article>
          )}
        </li>
      ))}
    </ol>
  );
}
export function AdvocacyTimeline({
  entries,
  onSelect,
}: {
  entries: TimelineEntry[];
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Matter assignment is separate from client attribution; do not conflate them.
  const history = entries.filter((entry) => !entry.attributionNeedsReview);
  const candidates = entries.filter((entry) => entry.attributionNeedsReview);
  const visible = expanded ? history : history.slice(0, 5);
  return (
    <div className={styles.timeline}>
      <TimelineEntries
        entries={visible}
        onSelect={onSelect}
        label="Loaded advocacy events"
      />
      {entries.length === 0 && (
        <p className="empty">No matching events in the loaded history.</p>
      )}
      {entries.length > 0 && history.length === 0 && (
        <p className="empty">
          No established client events in the loaded history.
        </p>
      )}
      {history.length > visible.length && (
        <button className="button" onClick={() => setExpanded(true)}>
          View all {history.length} loaded events
        </button>
      )}
      {candidates.length > 0 && (
        <details className={styles.review}>
          <summary>
            Attribution review · {candidates.length}{" "}
            {candidates.length === 1 ? "candidate" : "candidates"}
          </summary>
          <p>
            These records are not established client history. Source
            verification does not confirm client attribution.
          </p>
          <TimelineEntries
            entries={candidates}
            onSelect={onSelect}
            label="Attribution review candidates"
          />
        </details>
      )}
    </div>
  );
}
