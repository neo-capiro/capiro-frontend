"use client";
import { useRef, useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { useClient } from "@/features/portfolio/index/public";
import { useActivity } from "./queries";
import { ActivityFilters } from "./ActivityFilters";
import { ActivityFeed } from "./ActivityFeed";
import { QuickLog } from "./QuickLog";
import {
  emptyActivityFilters,
  filterActivity,
  activityRangeError,
} from "./activity-filters";
import styles from "./overview.module.css";

export function ActivityTimeline({ clientId }: { clientId: string }) {
  const activity = useActivity(clientId);
  const client = useClient(clientId);
  const records =
    activity.isSuccess && !activity.error ? activity.data : undefined;
  const timeline = useRef<HTMLElement>(null);
  const expandedContent = useRef<HTMLDivElement>(null);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [filters, setFilters] = useState({ ...emptyActivityFilters });
  const [expanded, setExpanded] = useState(false);
  const [logging, setLogging] = useState(false);
  const rangeError = activityRangeError(filters);
  const rows = filterActivity(records ?? [], filters, zone);
  const content = (
    <>
      <div className={styles.timelineFilters}>
        <ActivityFilters
          value={filters}
          onChange={setFilters}
          zone={zone}
          kinds={[...new Set((records ?? []).map((item) => item.kind))]}
        />
        {rangeError && <p role="alert">{rangeError}</p>}
        <QueryState
          pending={activity.isPending}
          error={activity.error}
          retry={() => void activity.refetch()}
        />
      </div>
      {records &&
        !rangeError &&
        (rows.length ? (
          <ActivityFeed
            clientId={clientId}
            rows={rows}
            zone={zone}
            expanded={expanded}
            onFallbackFocus={() =>
              (expanded ? expandedContent.current : timeline.current)?.focus()
            }
          />
        ) : (
          <p className="empty">No activity to show.</p>
        ))}
      {records && (
        <footer className={styles.timelineFooter}>
          <small>
            {rows.length} activities
            {records.length === 500
              ? " · Latest 500 items available from this history feed"
              : ""}
          </small>
          {expanded && (
            <button className="button ghost" onClick={() => setExpanded(false)}>
              Return to profile
            </button>
          )}
        </footer>
      )}
    </>
  );
  return (
    <>
      <section
        id="activity-timeline"
        ref={timeline}
        tabIndex={-1}
        className={`card ${styles.timelineCard}`}
        aria-label="Activity timeline"
      >
        <header className={styles.timelineHeader}>
          <h2>Activity timeline</h2>
          <button className="button ghost" onClick={() => setExpanded(true)}>
            Expand timeline ↗
          </button>
        </header>
        {!expanded && content}
      </section>
      <Dialog
        open={expanded}
        onOpenChange={setExpanded}
        title="Engagement timeline"
        className={styles.timelineDialog}
      >
        <div
          ref={expandedContent}
          tabIndex={-1}
          className={styles.timelineDialogBody}
        >
          <div className={styles.timelineLog}>
            <button
              className="button primary"
              disabled={!records}
              onClick={() => setLogging(true)}
            >
              Log activity
            </button>
          </div>
          {content}
        </div>
        <QuickLog
          clientId={clientId}
          clientName={client.data?.name ?? "this client"}
          open={logging && expanded}
          onOpenChange={setLogging}
        />
      </Dialog>
    </>
  );
}
