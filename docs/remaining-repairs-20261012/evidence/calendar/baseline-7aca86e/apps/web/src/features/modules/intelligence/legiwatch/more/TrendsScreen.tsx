"use client";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { Panel, StatusPanel } from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
export function TrendsScreen() {
  const summary = useCapiroQuery("legiwatch.analytics.summary", { query: {} }),
    volume = useCapiroQuery("legiwatch.analytics.volume", { query: {} });
  const momentum = useCapiroQuery("legiwatch.analytics.momentum", {
      query: {},
    }),
    coverage = useCapiroQuery("legiwatch.analytics.coverage", {});
  return (
    <div className={styles.form} data-figma-node="922:178832">
      <p className={styles.banner}>
        Read-only service aggregates · Last 30 days. Missing measurements remain
        unavailable rather than being reported as zero.
      </p>
      <StatusPanel
        loading={summary.loading}
        error={summary.error}
        onRetry={summary.reload}
      >
        {summary.data && (
          <div className={styles.stats}>
            {[
              ["Signals", summary.data.signalsTotal],
              ["Client decisions", summary.data.clientDecisions],
              [
                "Source coverage",
                summary.data.sourceCoveragePct === null
                  ? "Unavailable"
                  : `${summary.data.sourceCoveragePct}%`,
              ],
              ["Tracked bills moved", summary.data.billsMoved],
            ].map(([name, value]) => (
              <div className={styles.stat} key={name}>
                <span>{name}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}
      </StatusPanel>
      <Panel
        title="Daily signal volume"
        description="Daily totals returned by the service for this date range."
      >
        <StatusPanel
          loading={volume.loading}
          error={volume.error}
          onRetry={volume.reload}
        >
          {volume.data && (
            <div
              className={styles.volumeChart}
              role="img"
              aria-label={`${volume.data.total} signals from ${volume.data.from} to ${volume.data.to}`}
            >
              {volume.data.days.map((day) => (
                <div
                  key={day.date}
                  className={styles.volumeBar}
                  title={`${day.date}: ${day.count}`}
                  style={{
                    height: `${Math.max(2, (100 * day.count) / Math.max(1, ...volume.data!.days.map((item) => item.count)))}%`,
                  }}
                />
              ))}
            </div>
          )}
        </StatusPanel>
        <details>
          <summary>Daily values</summary>
          {volume.data?.days.map((day) => (
            <p key={day.date}>
              {day.date}: {day.count}
            </p>
          ))}
        </details>
      </Panel>
      <div className={styles.grid}>
        <Panel
          title="Issue momentum"
          description="Recent-week velocity relative to the prior baseline; steady activity = 100."
        >
          <StatusPanel
            loading={momentum.loading}
            error={momentum.error}
            onRetry={momentum.reload}
          >
            {momentum.data?.topics.length === 0 && (
              <p>No topics have a qualified prior baseline.</p>
            )}
            {momentum.data?.topics.map((topic) => (
              <p key={topic.topicId}>
                {topic.label} · {topic.index}
              </p>
            ))}
          </StatusPanel>
        </Panel>
        <Panel title="Source coverage">
          <StatusPanel
            loading={coverage.loading}
            error={coverage.error}
            onRetry={coverage.reload}
          >
            {coverage.data?.sources.map((source) => (
              <p key={source.family}>
                <strong>{source.family}</strong> ·{" "}
                {source.coveragePct === null
                  ? "Unavailable"
                  : `${source.coveragePct}%`}{" "}
                · {source.total} retained records
                <br />
                <span className={styles.description}>
                  {source.lastSyncedAt ?? "Sync time not supplied"}
                </span>
              </p>
            ))}
          </StatusPanel>
        </Panel>
      </div>
      <ExposureAndCommittees />
    </div>
  );
}
function ExposureAndCommittees() {
  const exposure = useCapiroQuery("legiwatch.analytics.exposure", {
      query: {},
    }),
    committees = useCapiroQuery("legiwatch.analytics.committees", {
      query: {},
    });
  return (
    <div className={styles.grid}>
      <Panel title="Client exposure">
        <StatusPanel
          loading={exposure.loading}
          error={exposure.error}
          onRetry={exposure.reload}
        >
          {exposure.data?.rows.map((row) => (
            <div key={row.clientId}>
              <h3>{row.clientName}</h3>
              {row.bySourceFamily ? (
                Object.entries(row.bySourceFamily).map(([source, count]) => (
                  <p key={source}>
                    {source}: {count}
                  </p>
                ))
              ) : (
                <p>Monitoring measurement unavailable.</p>
              )}
            </div>
          ))}
        </StatusPanel>
      </Panel>
      <Panel
        title="Committee activity"
        description="Signals directly attributed to hearings, limited to the ten returned committees."
      >
        <StatusPanel
          loading={committees.loading}
          error={committees.error}
          onRetry={committees.reload}
        >
          {committees.data?.rows.map((row) => (
            <p key={row.systemCode}>
              {row.committeeName}: {row.count}
            </p>
          ))}
        </StatusPanel>
      </Panel>
    </div>
  );
}
