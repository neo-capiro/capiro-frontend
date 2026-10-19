import type { Activity } from "./contracts";
import styles from "./overview.module.css";

/** The activity feed is a history list, not a touch, reply, or deadline summary. */
export function EngagementPulse({
  records,
}: {
  records: Activity[] | undefined;
}) {
  return (
    <section className={`card ${styles.pulse}`} aria-label="Engagement pulse">
      <header className="row between">
        <div>
          <h2>Engagement pulse</h2>
          <small>Source-backed engagement metrics are unavailable</small>
        </div>
        <a href="#activity-timeline">Open timeline →</a>
      </header>
      <div className={styles.pulseGrid}>
        {[
          ["Touches", "Touch count unavailable"],
          ["Awaiting reply", "Reply status unavailable"],
          ["Overdue", "Deadline status unavailable"],
        ].map(([label, description]) => (
          <div key={label}>
            <strong>—</strong>
            <small>{label}</small>
            <small>{description}</small>
          </div>
        ))}
      </div>
      <div className={styles.pulseTrend}>
        <span className="eyebrow">Touches per week</span>
        <small>
          A verified touch summary is not available for this client.
        </small>
      </div>
      <div className={styles.pulseLatest}>
        <div className="row between">
          <span className="eyebrow">Latest</span>
          <span className={styles.recordCount}>
            <small>Recent activity items</small>
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

export function DeadlineAndRequests() {
  return (
    <section
      className={`card ${styles.deadlines}`}
      aria-label="Deadline stress and requests"
    >
      <div>
        <h2>Deadline stress</h2>
        <strong>—</strong>
        <small>Planner due dates are unavailable in this profile.</small>
      </div>
      <div>
        <h2>Open requests by type</h2>
        <strong>—</strong>
        <small>Request counts are unavailable in this profile.</small>
      </div>
    </section>
  );
}
