import { useRef } from "react";
import type { EngagementMeeting } from "../../../shared/capiro/operations/engagement";
import { MeetingDetail } from "../../../shared/meetings/MeetingDetail";
import { Badge } from "../../../shared/module-ui";
import styles from "./meeting-split.module.css";

export function MeetingSplitView({
  rows,
  selected,
  onSelect,
  onReload,
}: {
  rows: EngagementMeeting[];
  selected: EngagementMeeting | null;
  onSelect: (meeting: EngagementMeeting | null) => void;
  onReload: () => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  return (
    <div className={styles.split}>
      <section className={styles.list} aria-label="Meeting list">
        {rows.length === 0 && (
          <p className={styles.muted}>No meetings match these filters.</p>
        )}
        {rows.map((meeting) => (
          <button
            key={meeting.id}
            className={styles.meeting}
            aria-pressed={selected?.id === meeting.id}
            ref={(element) => {
              if (element) buttons.current.set(meeting.id, element);
              else buttons.current.delete(meeting.id);
            }}
            onClick={() => onSelect(meeting)}
          >
            <time className={styles.date}>
              {new Date(meeting.startsAt).toLocaleString()}
            </time>
            <strong>{meeting.subject}</strong>
            <span className={styles.muted}>
              {meeting.client?.name ?? "Unassigned"}
            </span>
            <Badge>{meeting.preps?.[0]?.status ?? meeting.status}</Badge>
          </button>
        ))}
        <p className={styles.muted}>
          Only meetings and shared details you have permission to view are
          included.
        </p>
      </section>
      {selected ? (
        <MeetingDetail
          key={selected.id}
          meeting={selected}
          presentation="inline"
          onSaved={onReload}
          onClose={() => {
            onSelect(null);
            buttons.current.get(selected.id)?.focus();
          }}
        />
      ) : (
        <section className={styles.empty} aria-label="Selected meeting">
          <p>Select a meeting to view its preparation, notes and debrief.</p>
        </section>
      )}
    </div>
  );
}
