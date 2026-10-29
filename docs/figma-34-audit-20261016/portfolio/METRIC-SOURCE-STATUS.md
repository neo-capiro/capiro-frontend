# Recovered Portfolio metric source status

Historical implementation assessment dated 27 October 2026, recovered from closed [frontend PR #247](https://github.com/neo-capiro/capiro-frontend/pull/247), head `6abba465dbbcb1ce8d99aef5ef7c994ee04ef969`, `docs/figma-34-audit-20261016/portfolio/PULSE-AGGREGATE-CONTRACT.md`. These rows are an implementation assessment, not owner-approved model changes or a current-main verification. This canonical copy preserves the historical assessment. It makes no claim that later Core contracts are unchanged; refresh source references before using it to implement or certify any metric.

| Metric | Status in the source | Source assessment |
| --- | --- | --- |
| Clients | Ready | `profileType` separates client, firm and prospect; archiving sets `status === "archived"`. PortfolioPulse counts CLIENT without excluding archived. |
| Strategies | Blocked | `strategies.list` exists, but its strategySummary lacks active/archived state. Status and archivedAt exist on strategyNode; the archive command returns archivedAt only as a receipt. |
| Objectives | Blocked | The objective contract's draft/in_review/ready authoring status does not represent the active/completed/canceled/archived lifecycle required by the metric. |
| Off track | Blocked | Planner project health includes off_track; no objective-to-off-track aggregate exists. |
| Need attention | Blocked | No aggregate read combines overdue Planner work, off-track objectives and missed contact cadence. |
| Open work linked to an objective | Blocked | Planner tasks and objective operational associations exist; no aggregate calculates the ratio. The pulse displays an unavailable marker. |
| Overdue work | Partial | Planner carries due-date semantics, but no client-scoped read exposes open items with due dates. |
| Recorded touches | Blocked | Activity kind, sourceType and recorded/derived origin do not identify completed external, non-automated, non-bulk interactions. Activity-feed length is not a touch metric. |
| Touches per week | Blocked | Requires the same interaction classification as Recorded touches. |
| Awaiting reply | Out of scope | The source records the decision to leave it unavailable; current reads lack authoritative reply state. |
| Latest activity | Partial | Activity supplies title, body and occurredAt but no actor. |
| Engagement health | Blocked | No per-client contact cadence setting. Requires cadence and the recorded-touch classification. |

There are twelve metrics: one Ready, two Partial, eight Blocked and one Out of scope. Ready means the source fields were assessed as available, not that the existing rendering implements the full metric definition correctly.

The same PR proposes objective lifecycle/off-track state, touch classification, per-client contact cadence and activity actor. It contains no migration or product code. Keep unknown metrics unavailable rather than substituting a zero, a loaded-page count or unrelated activity/team counts.
