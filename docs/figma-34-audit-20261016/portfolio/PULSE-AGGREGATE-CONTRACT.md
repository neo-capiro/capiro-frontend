# Pulse and Overview aggregate definitions

Owner-supplied definitions for the Portfolio pulse and the Client Overview metrics, with
the calculation and display rules that govern them. Recorded 2026-10-27 by the Capiro
owner (`neo@capiro.ai`).

This is the artifact **DG-05** asked the owner for: *"Pair each metric with the
owner-approved definition, scope, source completeness and as-of period."* It resolves the
previously open items in `DESIGN-GAPS.md` DG-05 and `portfolio-contracts.md`
§ *Pulse and Overview aggregates* — the authoritative definitions and the linkage
denominator/ignore semantics. It does **not** authorize new routes, schemas or writes.

## Portfolio pulse

| Metric | Definition |
|---|---|
| Clients | Count of non-archived client profiles. Exclude firm profiles and prospects. |
| Objectives | Count of active objectives. Exclude drafts, completed, canceled and archived objectives. |
| Off track | Active objectives explicitly marked Off track. Missing updates alone don’t make an objective off track. |
| Strategies | Count of active strategies. Count each once, even when linked to multiple objectives. |
| Need attention | Count of distinct clients with overdue Planner work, an off-track objective or a missed engagement cadence. Show the reasons in the drilldown. |
| Open work linked to an objective | Percentage of eligible open Planner items linked to an active objective, directly or through an explicitly linked strategy. Count each Planner item once. |

## Client Overview

| Metric | Definition |
|---|---|
| Recorded touches | Distinct completed external interactions recorded against the client during the last 30 days. Use supported interaction records; exclude drafts, internal messages, automated replies and bulk newsletters. |
| Awaiting reply | Current email conversations authoritatively tracked as awaiting a response. Count each conversation once. A substantive reply or explicit closure clears it. Keep unavailable if reply tracking cannot support this definition. |
| Overdue work | Open Planner items associated with the client whose due date has passed. Items without a due date aren’t overdue. |
| Touches per week | The same recorded-touch definition, grouped by week for the last eight calendar weeks. Label the current week “This week so far.” |
| Latest activity | Most recent recorded activity, showing its description, timestamp and actor, with a link to the activity feed. |
| Engagement health | Whether recorded contact is within the client’s contact cadence: On track, Needs attention or Unknown. Show the reason alongside the status. |

## Calculation and display rules

- **Linkage:** linked eligible open Planner items ÷ all eligible open Planner items × 100.
  Exclude completed, canceled and archived items using Planner’s existing states.
- **No eligible work:** display “No open work”, rather than 0% or 100%.
- **Contact cadence:** proposed default of 30 days, adjustable per client. For new clients,
  measure from creation until their first recorded touch.
- **Unknown is not zero:** distinguish loading, complete zero, complete positive, partial,
  failed/retry, permission-restricted and stale states.
- **Drilldowns must agree:** use the same scope, filters and reporting snapshot as the
  metric. Totals count all matching records, not just the loaded page.

## Current source status (implementation assessment, not owner-approved)

What the frontend and its Core reads can produce today, so the remaining work is separated
from the definitions above. Line references are to `apps/web`.

| Metric | Status | Evidence |
|---|---|---|
| Clients | Ready | `profileType` separates CLIENT/firm/prospect, and archiving sets `status === "archived"` (`client-intake/profile-api.ts:57`). `PortfolioPulse.tsx` currently counts `profileType === "CLIENT"` without excluding archived. |
| Strategies | Blocked | `strategies.list` exists (`shared/capiro/operations/strategies-plan.ts:21`) but the `strategySummary` it returns carries no active/archived state: `status` and `archivedAt` exist only on `strategyNode` (`strategies-schemas.ts:59,76`), and `strategies.archive` returns `archivedAt` only as a command receipt. “Active strategies” is not derivable from the list read. |
| Objectives | Blocked | The objective contract exposes an authoring status `["draft","in_review","ready"]` (`objectives/contracts.ts:59`), which is not the active/completed/canceled/archived lifecycle this definition names. |
| Off track | Blocked | Off-track exists as Planner project health `["on_track","at_risk","off_track","on_hold","complete"]` (`operations/planner-core-schemas.ts:117`); the objective→off-track aggregate does not exist. |
| Need attention | Blocked | Composite of overdue Planner work, off-track objectives and missed cadence; no read spans those sources. |
| Open work linked to an objective | Blocked | Planner tasks (`planner.tasks`, status `todo|in_progress|blocked|done`) and objective association (`objectives.operational.associations`) both exist, but no aggregate read computes the ratio. The pulse shows a hard-coded `—`. |
| Overdue work | Partial | Planner carries due-date semantics (`dateField: created|start|due|completed`, `basedOn: due_date|completion_date`) but no client-scoped read exposes open items with due dates. |
| Recorded touches | Blocked | `activitySchema` has `kind`, `sourceType` and `origin: recorded|derived` — nothing that classifies an interaction as external, completed, non-automated and non-bulk. This is why `OverviewSignals.tsx` documents that the activity feed "is a history list, not a touch, reply, or deadline summary". |
| Touches per week | Blocked | Same classification gap as recorded touches. |
| Awaiting reply | Out of scope | Dropped by owner decision 2026-10-27 and left unavailable. No reply-state field exists on any current read, which the definition anticipated ("keep unavailable if reply tracking cannot support this definition"). |
| Latest activity | Partial | `activitySchema` carries title, body and `occurredAt` but **no actor**, so the actor in this definition needs a new field or a design change. |
| Engagement health | Blocked | No per-client contact-cadence setting exists (the only cadence settings in the tree are bill-tracker alert preferences, unrelated). Needs the cadence setting plus the recorded-touch definition. |

## Required data-model additions

Owner decision 2026-10-27: do not build reply tracking — Awaiting reply stays unavailable —
and add the other four. Each is a Core/model change; none can be satisfied in the frontend
alone.

| # | Addition | Needed by | Shape |
|---|---|---|---|
| 1 | Objective lifecycle state | Objectives, Off track, Need attention, Open work linked | `active` / `completed` / `canceled` / `archived` plus an explicit off-track marking. The objective contract today exposes only the authoring status `draft` / `in_review` / `ready`. |
| 2 | Touch classifier on interaction records | Recorded touches, Touches per week, Engagement health | A record-level way to say "completed external interaction" and to exclude drafts, internal messages, automated replies and bulk newsletters — distinct from the existing `kind` / `sourceType` / `origin`. |
| 3 | Contact cadence setting | Engagement health, Need attention | A per-client interval (default 30 days, adjustable), with a stated measurable start for new clients (creation until first recorded touch). |
| 4 | Activity actor | Latest activity | The actor on the activity read. `activitySchema` carries title, body and `occurredAt` but no actor, so this definition cannot be rendered as written. |

Not added by decision: reply tracking (Awaiting reply).

## What this changes

- **Resolved:** the definitions, the linkage denominator and the ignore semantics that DG-05
  listed as outstanding. `PF-portfolio-index-2` ("open each pulse drilldown only with a
  qualified aggregate/coverage contract") now has a contract to qualify against, and
  `PF-client-overview-1` ("do not substitute recent-activity length or team count for
  defined touch/awaiting-reply/deadline metrics") is now checkable against a stated rule.
- **Still open:** most of the aggregate reads do not exist. Implementing them is Core
  aggregate/read work, not frontend; the frontend is already correct in leaving unknown
  metrics unavailable rather than printing an inferred zero.
- **Unchanged:** no invented aggregate, no inferred zero, and partial unknown is still not
  zero.
