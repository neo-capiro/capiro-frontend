# Quick log commitment and follow-up contract review

As of 2026-10-11 14:01 UTC. Rows `CORE-049`, `CORE-096` and `ENG-tasks_create` remain partial or unimplemented; this source/design review is not a commitment-write acceptance.

## What the current API can record

At backend main `fd8765ec01d292013758606204f2c9d886cd31c1`, `POST /clients/:clientId/activity` accepts manually recorded `commitment` and `request` kinds, an optional ISO `dueAt`, and an optional same-client `personId`. The service enforces an existing non-archived client and same-client contact, and the timeline can display and settle a row with a due date. The Portfolio Quick log currently offers note, call, logged email, decision and request, with title/details; it neither accepts a due date nor submits a commitment.

## Why a kind-only UI addition would be incomplete

The approved Figma Quick log commitment state (`411:42992`) requires **who owes it**, a counterparty, due date, optional objective, and an optional follow-up task with assignee, due date and strategy-step link. The profile Timeline log dialog (`411:49817`) also shows separate occurred-at and due inputs. The current activity DTO/model has no structured owed-by, counterparty, objective or task lineage; its JSON metadata is not a validated public contract. Separate Planner task APIs do not establish atomic or recoverable one-submit log-plus-task behavior.

Adding a “Commitment” option to the present Quick log would store only free text and perhaps `dueAt`, while presenting a flow that cannot retain the Figma ownership and follow-up decisions. The frontend must not claim that such a row is an assigned commitment or Planner task.

## Owner contract and acceptance needed

1. Engagement/Planner/Objectives owners define structured same-client commitment direction, counterparty/office identity, objective and strategy-step lineage, user authorization, and the canonical Planner task type/visibility.
2. Define whether one submit creates both activity and task atomically, or returns a durable partial receipt that can be reconciled without duplicating either side. Unknown outcomes need a read-only recovery path and no automatic resend.
3. Decide the persisted due-date/time-zone semantics. The Figma commitment uses a date, while the current `dueAt` is a timestamp. An implicit midnight or browser-local conversion would invent the deadline instant.
4. Then integrate the actual Quick log inputs with exact receipts, actor/client lifetime checks, permission loss, failure retention, Undo boundaries and timeline/Planner read-back. Test against the native approved backend and current Figma frame; no live writes without scoped approval.

No commitment, task, meeting or external message was created by this review.
