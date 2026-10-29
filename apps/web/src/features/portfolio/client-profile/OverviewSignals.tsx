import type { Activity } from "./contracts";
import type { ActivityMetricsView } from "./useActivityMetrics";
import { ActivityMetricStatus } from "./ActivityMetricStatus";
import styles from "./overview.module.css";

/** The activity feed is a history list, not a touch, reply, or deadline summary. */
export function EngagementPulse({
  records,
  metrics,
}: {
  records: Activity[] | undefined;
  metrics: ActivityMetricsView;
}) {
  return (
    <section className={`card ${styles.pulse}`} aria-label="Engagement pulse">
      <header className="row between">
        <div>
          <h2>Engagement pulse</h2>
          <small>Saved CRM activity · last 30 days · UTC</small>
        </div>
        <a href="#activity-timeline">Open timeline →</a>
      </header>
      <div className={styles.pulseGrid}>
        {[
          ["Recorded activities", metrics.data?.counts.recordedActivities],
          ["Open requests", metrics.data?.counts.openRequests],
          ["Overdue requests", metrics.data?.counts.overdueRequests],
        ].map(([label, count]) => (
          <div key={label}>
            <strong>{count ?? "—"}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className={styles.pulseTrend}>
        <ActivityMetricStatus metrics={metrics} />
        <small>
          Activity counts cover saved CRM entries. Open requests are unsettled
          requests over all time; overdue requests have a saved due time before
          the count time. Meetings, mail and Planner work are excluded.
        </small>
      </div>
      <div className={styles.pulseLatest}>
        <div className="row between">
          <span className="eyebrow">Latest</span>
          <span className={styles.recordCount}>
            <small>Loaded timeline items</small>
            <strong>{records?.length ?? "—"}</strong>
          </span>
        </div>
        {records?.slice(0, 3).map((activity) => (
          <div className={styles.latestItem} key={activity.id}>
            <small>{activity.kind}</small>
            <span>{activity.title}</span>
            <small>{new Date(activity.occurredAt).toLocaleDateString()}</small>
          </div>
        ))}
        {records?.length === 0 && (
          <p className="muted">No activity recorded yet.</p>
        )}
      </div>
    </section>
  );
}

export function EngagementHealth() {
  return (
    <section className={`card ${styles.health}`} aria-label="Engagement health">
      <div className="row between">
        <small>Engagement health</small>
        <a href="#activity-timeline" aria-label="Open activity timeline">
          ↗
        </a>
      </div>
      <strong>—</strong>
      <small>Health score unavailable</small>
    </section>
  );
}

export function DeadlineAndRequests({
  metrics,
}: {
  metrics: ActivityMetricsView;
}) {
  return (
    <section
      className={`card ${styles.deadlines}`}
      aria-label="Deadline stress and requests"
    >
      <div>
        <h2>Overdue commitments</h2>
        <strong>{metrics.data?.counts.overdueCommitments ?? "—"}</strong>
        <small>
          Unsettled CRM commitments with a saved due time before the count time,
          across all time. Planner work is excluded.
        </small>
        <ActivityMetricStatus metrics={metrics} />
      </div>
      <div>
        <h2>Open commitments</h2>
        <strong>{metrics.data?.counts.openCommitments ?? "—"}</strong>
        <small>
          All unsettled CRM commitments, including those with no due date. Each
          saved entry is counted once.
        </small>
      </div>
    </section>
  );
}
