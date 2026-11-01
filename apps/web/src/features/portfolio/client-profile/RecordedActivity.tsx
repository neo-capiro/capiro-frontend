"use client";
import { useRecordedActivity } from "./useRecordedActivity";
import type { RecordedActivityResponse } from "./recorded-activity-contract";
import styles from "./overview.module.css";

const sources = [
  ["meetings", "Meetings (start time)"],
  ["emails", "Mail threads (last message time)"],
  ["tasksCompleted", "Done Engagement tasks (last updated time)"],
  ["debriefs", "Saved debriefs (created time)"],
  ["outreachSent", "Sent Classic outreach (sent time)"],
] as const;
function ActivityDetails({ value }: { value: RecordedActivityResponse }) {
  return (
    <details>
      <summary>Counts and timing</summary>
      <p>{value.disclosure}</p>
      <p>
        As of <time dateTime={value.asOf}>{value.asOf}</time> (UTC).
      </p>
      <p>
        Current rolling 7 days: {value.window.from} to {value.window.to}.
      </p>
      <p>
        Prior rolling 7 days: {value.comparisonWindow.from} to{" "}
        {value.comparisonWindow.to}.
      </p>
      <p>
        Each window includes its start and excludes its end. Counts cover
        records readable by you for this client.
      </p>
      {value.status === "complete" ? (
        <>
          <p>
            Prior index: {value.priorScore}/100. Trend compares index points:
            improving above +5, declining below −5, otherwise stable.
          </p>
          <ul>
            {sources.map(([key, label]) => (
              <li key={key}>
                {label}: {value.breakdown[key]} current;{" "}
                {value.priorBreakdown[key]} prior.
              </li>
            ))}
          </ul>
          <p>
            Index: 15 per meeting, 2 per mail thread, 10 per done task, 20 per
            debrief and 5 per sent outreach, capped at 100. Mail counts threads,
            not messages; done tasks use their last update, not a
            completion-event ledger. Planner tasks are excluded.
          </p>
        </>
      ) : (
        <p>
          Source counts and both indexes are unavailable; no partial total is
          shown.
        </p>
      )}
    </details>
  );
}
export function RecordedActivity({
  clientId,
  version,
}: {
  clientId: string;
  version?: 1;
}) {
  const { data, pending } = useRecordedActivity(clientId, version);
  const message = pending
    ? "Loading recorded activity…"
    : !data
      ? "Recorded activity unavailable"
      : data.status === "complete"
        ? `${data.trend[0]?.toUpperCase()}${data.trend.slice(1)} · prior 7 days`
        : data.reason === "capacity"
          ? "Incomplete · source capacity exceeded"
          : "Incomplete · source records changed";
  return (
    <section className={`card ${styles.health}`} aria-label="Recorded activity">
      <div className="row between">
        <small>Recorded activity</small>
        <a href="#activity-timeline" aria-label="Open activity timeline">
          ↗
        </a>
      </div>
      <strong>{data?.status === "complete" ? `${data.score}/100` : "—"}</strong>
      <small>Recorded activity index · internal logging only</small>
      <small role="status">{message}</small>
      {data && <ActivityDetails value={data} />}
    </section>
  );
}
