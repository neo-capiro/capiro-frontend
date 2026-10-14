# Active Objective backend binding audit

Independent reviewer: Codex outreach_review. Read-only GitHub inspection on 2026-10-14; no live backend request, database/provider operation, source import, schema change or native acceptance. This records the latest published sources requested by the parent, rather than relying on the earlier PR4 snapshot.

## Exact inspected publications

Repository: `neo-capiro/capiro-backend`.

| Source | Exact SHA | Evidence |
| --- | --- | --- |
| Requested current source | `91399fe1a205e37073cbeed2d7eb66a1fafd7fa2` | [Source tree](https://github.com/neo-capiro/capiro-backend/tree/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2) |
| Published PR18 head returned by GitHub | `f4f9e1361d92ac0afadd67c1cae3f5faefa829ec` | [PR18](https://github.com/neo-capiro/capiro-backend/pull/18) |
| Published PR16 head returned by GitHub | `d15bba2cd75a8d36743e5d7a10eda346e4e48e2a` | [PR16](https://github.com/neo-capiro/capiro-backend/pull/16) |
| Published PR13 head returned by GitHub | `917fed9be648dc4abfd6770e0e391ce2e3fe3928` | [PR13](https://github.com/neo-capiro/capiro-backend/pull/13) |

The recursive Git tree response for `91399fe1a205e37073cbeed2d7eb66a1fafd7fa2` reported `truncated: false`. Path discovery therefore had a complete tree; it was not a full semantic inspection of every source file. All four Objective owner files below have identical Git blob IDs at all four inspected SHAs.

## Core Objective owner: verified routes and types

| Exact path and source | Git blob | Verified responsibility |
| --- | --- | --- |
| [objectives.controller.ts](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api/src/clients/objectives/objectives.controller.ts) | `164ed9499affe58530415f8dc37009329c7201f7` | Existing `clients/:clientId/objectives` CRUD and transition controller; `RolesGuard`, `standard_user`, current tenant context and UUID selectors. |
| [objective.dto.ts](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api/src/clients/objectives/objective.dto.ts) | `7df26dd269f79b3f8c70077b4619610306f3450f` | `ObjectiveDraftDto`, `CreateObjectiveDto`, `UpdateObjectiveDto`, `ObjectiveVersionDto`, `ObjectiveTransitionDto`. |
| [objective-rules.ts](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api/src/clients/objectives/objective-rules.ts) | `1bcf7f6e871bb90022ae4b60b90b9acaf9eaf82e` | `ObjectiveStatus = draft | in_review | ready`; `ObjectiveTransition = request_review | confirm_ready`; normalization and four-field readiness. |
| [objectives.service.ts](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api/src/clients/objectives/objectives.service.ts) | `cffc4601583c5a0889b0900352a7609635167dea` | Existing tenant/client admission, list/get/create/update/transition/remove, versioned immutable revisions and `presentObjective`. |

Controller-relative routes are `GET clients/:clientId/objectives` (optional `objectiveId` query selects one record), `POST` (create), `PATCH` (required `objectiveId`), `DELETE` (required `objectiveId`), and `POST clients/:clientId/objectives/transition` (required `objectiveId`). Application service prefixes/origins remain deployment configuration; this audit does not establish a deployed URL.

Draft fields: `outcome` (string, max2000), `governmentProblem` (string, max4000), nullable `askType`, `minimumWin` (string, max2000), `limits` (string, max4000), nullable UUID `ownerUserId`. Ask types: `funding`, `policy_authority`, `both`, `protect_funding`, `meri_propose`. Create requires UUID `requestId`; update/delete/transition require integer `expectedVersion >= 1`. Transition accepts only `request_review` or `confirm_ready`.

`presentObjective` returns `id`, `clientId`, `requestId`, `outcome`, `governmentProblem`, `askType`, `minimumWin`, `limits`, `ownerUserId`, `status`, `version`, `readyAt`, `reviewRequestedAt`, `createdAt`, `updatedAt`, and `readiness`. Readiness is exactly four checks: outcome, government problem, ask type and minimum win, with `completedFields`, `requiredFields: 4`, and `isReady`.

[Core Prisma schema](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api/prisma/schema.prisma) (Git blob `7bc76800e4c0fa9cb4c5aacbb819884e189ceaf5`) contains `ClientObjective` basic intake/status/version fields and `ClientObjectiveRevision` with immutable version, operation, actor and JSON snapshot. These inspected models contain no operational-leg/cycle/decision relation. A JSON snapshot is not a published operational projection contract.

**Bounded verified absence:** the four exact Objective owner files and these two models do not expose operational-leg, cycle or decision fields/routes, or an `active` status. This does not establish absence across this repository, other repositories, or deployed services. Complete path discovery also found separate budget lifecycle/cycle and Outreach decision owners; their association and semantics for Active Objective detail remain unverified. They must not be treated as interchangeable aggregates.

## Existing Objective-bound resource destinations

The current frontend already declares these GET operations; they are resource observations under an exact Objective revision, not an operational overview or decision API.

| Frontend operation | Service-relative route | Inspected owner evidence |
| --- | --- | --- |
| `strategies.objectiveDestination` | Strategy `/strategies/:id/objective-destination` | [Strategy controller](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api-strategy/src/strategy/strategy.controller.ts), blob `c2d99378e71830d2a9c46a098e4bea004690212a`. |
| `planner.objectiveDestination` | Strategy `/planner/tasks/:id/objective-destination` | [Planner controller](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api-strategy/src/planner/planner.controller.ts), blob `182e6ccf4af1b70f7902cd5b812f6b2b06413bda`; current task receipt/version, not an Objective completion aggregate. |
| `workspace.objectiveDestination` | Workspace `/drafts/:draftId/versions/:versionId/objective-destination` | [Versions controller](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/workspace/src/versions/versions.controller.ts), blob `ee3b7b5ca6462ef29ad447e339dc30c4d1150ee1`. |
| `directory.objectiveDestination` | Core `/clients/:clientId/targets/:targetId/objective-destination` | [Client targets controller](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api/src/clients/client-targets.controller.ts), blob `dd2c1dadf8da4ab0dc50136bf756cead61feed93`; published PR13 saved target identity binding. |
| `engagement.objectiveDestination` | Core `/engagement/outreach-v3/sessions/:sessionId/objective-destination` | Existing frontend declaration in `apps/web/src/shared/capiro/operations/engagement-objective-destination.ts`; no fresh protected Engagement service implementation inspection in this audit. |

Canonical shared types [ClientObjectiveDestinationInput / ClientObjectiveRevisionBinding](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/packages/shared/src/client-objective-destination.ts), blob `767a11ddff2ff43a39cdf572029b40a4976facac`, bind `clientId`, `objectiveId`, positive int32 `objectiveVersion`, plus `objectiveRevisionId`. Observations do not grant authority.

Published [PR16 receiving handoff](https://github.com/neo-capiro/capiro-backend/blob/d15bba2cd75a8d36743e5d7a10eda346e4e48e2a/docs/objective-files-calendar-receiving-20261014/HANDOFF.md) selects immutable saved Workspace revisions with canonical snapshot/hash format and existing Planner start/due occurrences with exact task version. It adds receiving qualification/reference evidence, not production cycle/decision endpoints. Published PR18 concerns runtime Prisma dependencies and source/deployment metadata, not a changed Objective DTO.

Frontend basic contract is `apps/web/src/features/portfolio/objectives/contracts.ts`; current status/readiness matches the inspected Core owner. Existing CRUD writers remain in that feature. Destination declarations remain canonical in shared Capiro operations, with no duplicated API implementations introduced here.

## Read restriction and remaining action

The earlier parent assignment explicitly said, “Do not read protected backend EngagementService.” This reviewer retained that narrowly named service-source restriction; it is a task scope instruction, not a newly discovered authorization/security rule and not a claim that all Engagement or backend code is inaccessible. No protected EngagementService was read. Publicly declared frontend operation metadata is separately identified above. No read was denied or left with an uncertain outcome.

Still pending: backend owner supplies the approved Active Objective operational-leg/cycle/status/decision route, selector, response and action mapping, including which exact published owner establishes each association. Existing `ready` must not be relabeled `active`, resource receipts must not be aggregated into invented decisions, and lack of a verified frontend binding must not be reported as repository-wide missing implementation. Independent TaskDetail/Engagement frontend work can continue on existing canonical fields/actions. Full Active Objective parity and all337 native rows remain open; mobile parity remains deferred.

## Planner recurrence display verification

Root independently read exact successor Planner validation and the canonical public strategy-verifier scheduling source before labelling optional weekdays. [planner-schedule.ts](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/packages/strategy-verifier/src/planner-schedule.ts), Git blob616dfd3309cf6fe453c9d2d6e43d90a0340ff548, compares recurrence weekdays with JavaScript getUTCDay (Sunday0). The frontend displays provided weekdays with Intl weekday names, provided basedOn/endsOn/anchorOn fields and frequency/interval. It does not calculate successor schedules, adopt backend implementation, infer omitted defaults, or claim a DST policy. Other source reads: apps/api-strategy/src/planner/planner.validation.ts (allowed recurrence keys/validation), planner.service.ts (uses canonical nextPlannerSchedule), planner-date-rules.ts and its tests (date validation), scheduler service (existing worker delegation). These read-only references are not runtime imports/copies and do not modify Strategy frontend files.

## Latest publication refresh before sealing

Root refreshed backend publications after the independent initial audit: PR19head3b7affb158903069d220c89000d054c327d3c96d ([PR19](https://github.com/neo-capiro/capiro-backend/pull/19)) and newly published PR20head45aa8059f1a0e6451e5d0b9518b7543ed3e9254e ([PR20](https://github.com/neo-capiro/capiro-backend/pull/20)). Both nontruncated exact recursive trees retain all four Objective owner blob IDs listed above. Their runtime qualification changes do not alter these basic Objective routes/DTO/rules/service bytes. No runtime/security/credential or deployment action was performed; these were read-only source-tree comparisons. Latest publication does not resolve the operational association map.
