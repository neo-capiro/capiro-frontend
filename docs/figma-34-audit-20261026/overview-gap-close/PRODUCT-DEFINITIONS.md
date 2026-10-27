# Portfolio metrics — user decisions, 26 October 2026

These are product definitions supplied directly by the user during the Overview design pass. They replace the earlier **definition pending** status. They are not proof that the backend already exposes a complete, authorized aggregate or reporting snapshot. **Awaiting reply is excluded from the requested UI.**

## Portfolio Pulse

| Metric | Approved product definition |
| --- | --- |
| Clients | Non-archived client profiles; exclude firm profiles and prospects. |
| Objectives | Active objectives; exclude drafts, completed, canceled and archived objectives. |
| Off track | Active objectives explicitly marked Off track. Missing updates alone do not qualify. |
| Strategies | Active strategies, counted once across all linked objectives. |
| Need attention | Distinct clients with overdue Planner work, an off-track objective or missed engagement cadence. Show all qualifying reasons in the drilldown. |
| Open work linked to an objective | Eligible open Planner items linked to an active objective, directly or through an explicitly linked strategy, divided by all eligible open Planner items. Count each Planner item once. |

Completed, canceled and archived Planner items are excluded using Planner's existing states. A zero denominator displays **No open work**, never 0% or 100%. The user supplied no Ignore action or authority; the designs do not add one.

## Client Overview

| Metric | Approved product definition |
| --- | --- |
| Recorded touches | Distinct completed external interactions recorded against the client during the last 30 days. Use supported interaction records; exclude drafts, internal messages, automated replies and bulk newsletters. |
| Overdue work | Open Planner items associated with the client whose due date has passed. Undated items are not overdue. |
| Touches per week | Same qualifying-touch definition, grouped by week for the last eight calendar weeks. Current week is labelled **This week so far**. This period differs from the 30-day total. |
| Latest activity | Most recent recorded activity: description, timestamp, actor and a link to the activity feed. |
| Engagement health | Contact against the client's cadence: **On track**, **Needs attention**, or **Unknown**, with a reason. |

The user proposed a default contact cadence of **30 days**, adjustable per client. For a new client, measure from creation until the first recorded touch. The default and settings implementation remain a proposal until accepted by the owning service; the mockups identify this boundary.

## Calculation and display

- Distinguish loading, complete zero, complete positive, partial unknown, failed/retry, permission-restricted and stale states.
- Unavailable or incomplete data is never presented as zero.
- Drilldowns share the metric's client/portfolio scope, filters and reporting snapshot. Totals count all matching records, not the loaded page.
- Product definitions are approved; exact service fields, completeness, scope and as-of/snapshot binding still require owner implementation evidence. No endpoint or backend authority is invented by these designs.

