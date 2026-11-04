/**
 * Metric definitions shown under the Portfolio pulse panel. Meri answers "what does this metric mean" from a copy of these definitions in neo-capiro/meri-greenfield
 * apps/worker/conversation/product-definitions.mjs: change that file in the same change.
 */
export function PortfolioMetricDefinitions() {
  return (
    <details style={{ marginBottom: 20 }}>
      <summary>Metric definitions and coverage</summary>
      <p>
        All counts cover your current tenant’s visible active client records,
        excluding prospect profiles and ethical-wall restricted clients. They
        cover the full saved population, not the displayed page or current list
        filter.
      </p>
      <ul>
        <li>
          Objectives: nondeleted draft, in-review and ready records. Awaiting
          review counts only in-review objectives; it is not a health score.
        </li>
        <li>
          Overdue CRM: unsettled saved requests and commitments with due times
          strictly before the snapshot in UTC, across all dates.
        </li>
        <li>
          CRM activity: saved activity entries from the prior 30 days through
          the snapshot, inclusive, in UTC. Derived email, meeting and Planner
          feeds are not added.
        </li>
        <li>
          Tracked-bill coverage: active clients with at least one tracked bill
          in the configured Bill Tracker source divided by all visible active
          clients. Tracking more bills does not increase a client’s
          contribution. Saved targeting topics alone do not count; add a bill in
          a client’s Bill Tracker to include that client. An empty population
          has no percentage.
        </li>
      </ul>
      <p>
        Objective-linked work coverage, off-track indicators and Strategy totals
        are unavailable until their complete source population is supplied.
        Engagement health scores, stage-weighted revenue and win rates remain
        unavailable until their formulas and required inputs are defined.
        Prospect counts use saved stages; government funding keeps its stated US
        federal fiscal year and does not turn program relevance into a client
        award.
      </p>
    </details>
  );
}
