import { useEffect, useRef } from "react";
import type { EngagementMeeting } from "../capiro/operations/engagement";
import { ActionButton, Badge } from "../module-ui";
import { safeWebsite } from "../portfolio/domain/website";
import styles from "./meetings.module.css";

export function MeetingDetailHeader({
  meeting,
  current,
  inline,
  onClose,
  pending = false,
}: {
  meeting: EngagementMeeting;
  current?: EngagementMeeting;
  inline: boolean;
  onClose: () => void;
  pending?: boolean;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (inline) title.current?.focus();
  }, [inline]);
  const displayed = current ?? meeting;
  // Supplied meeting URLs never infer a scheme as editable website inputs do.
  const join = /^https?:\/\//i.test(current?.joinLink ?? "")
    ? safeWebsite(current?.joinLink)
    : undefined;
  return (
    <header className={styles.detailHeader}>
      {inline && (
        <>
          <p className={styles.identity}>
            {displayed.client?.name ?? "Unassigned"}
          </p>
          <h2 ref={title} tabIndex={-1}>
            {displayed.subject}
          </h2>
          <p className={styles.muted}>
            {new Date(displayed.startsAt).toLocaleString()} ·{" "}
            {displayed.location ?? "Location not specified"}
          </p>
        </>
      )}
      <div className={styles.metadata}>
        <Badge>{displayed.status}</Badge>
        <Badge>{displayed.visibility ?? "private"}</Badge>
        {displayed.description && (
          <p className={styles.muted}>{displayed.description}</p>
        )}
      </div>
      <div className={styles.tools}>
        {join ? (
          <ActionButton asChild>
            <a
              href={join}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              Join meeting
            </a>
          </ActionButton>
        ) : (
          <ActionButton
            disabled
            title={
              current
                ? "No safe meeting link is available."
                : "A current meeting read is required."
            }
          >
            Join meeting
          </ActionButton>
        )}
        {inline && (
          <ActionButton disabled={pending} onClick={onClose}>
            Close meeting
          </ActionButton>
        )}
      </div>
    </header>
  );
}
