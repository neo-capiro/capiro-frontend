# Portfolio 3.4 design additions — contract findings

Read from `neo-capiro/capiro-frontend` main on 26 October 2026. This is source inspection, not a live backend or deployment certification. No application source or Figma nodes changed during this research.

## Objective intake

- Five fields: Outcome (2,000 characters), Government problem (4,000), Type of ask, Minimum win (2,000), Limits (4,000; optional).
- The first four fields establish form completeness for review/ready. This is not semantic quality scoring. Drafts can be saved while incomplete or blank.
- Ask options: Funding; Policy or authority; Both; Protect existing funding; Not sure, let Meri propose.
- Statuses: Draft, In review, Ready. Saving changes to an In review/Ready record reopens Draft.
- Confirm ready has a confirmation dialog. Missing fields show “Complete outcome, government problem, ask type and minimum win.” Current authority and pending writes control admission.
- Pending save: “Saving objective…”; conflict requires reviewing current version. The current implementation does not establish a new automatic activation, question lifecycle, cycle verdict, or next-30-days task cap.

Sources:
- [contracts.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/contracts.ts)
- [ObjectiveFields.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/ObjectiveFields.tsx)
- [ObjectiveReadiness.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/ObjectiveReadiness.tsx)
- [NewObjectivePage.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/NewObjectivePage.tsx)
- [ObjectiveEditorControls.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/ObjectiveEditorControls.tsx)
- [useObjectiveEditorSession.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/useObjectiveEditorSession.ts)

## Human Objective associations

Current main now includes authoring implementation; the October 16 source-absence observation is historical.

- “Manage Objective links” opens a dialog. Existing work uses the shared cascader, drill mode, leaf selection, level-scoped “Search loaded work”, and “Load more work”. Do not label this a universal server-side search.
- Linkable kinds: Strategy, Planner project, Planner task, Outreach session, Meeting. Budget package and defense budget cycle are not standalone linkable kinds.
- Strategy may carry human annotations: fiscal year and authority track. The current picker sends `context:null`; no separate cycle CRUD.
- Review reads current client assignment and source authority again. Selection alone is not write authority.
- Command identity: schemaVersion, requestId, clientId, objectiveId, expectedObjectiveVersion, expectedAssociationSetVersion. Link adds resource kind/id and cycles; unlink adds the exact associationId.
- Manual provenance includes associationId, linkedRevision, linkedAt, and via. Application-receipt provenance includes receiptId and sourceRevision. They must remain visually distinct.
- Unlink removes the selected relationship, not the work. An inherited or receipt-derived relationship is not an interchangeable manual removal target.
- Unknown result keeps the immutable original command. “Result not confirmed” → “Check saved result”. Definite refusal: “Change was not applied” → “Refresh and review again”. Confirmed receipt: “Change confirmed” → “Refresh and finish”. An unchanged receipt means the saved link already matched the request.
- Busy writes hide close and prevent Escape/outside dismissal. On close, focus returns to the Manage links trigger.
- No invented `can_link` field. Backend POST independently checks authority.

Sources:
- [ObjectiveAssociationDialog.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/operational/ObjectiveAssociationDialog.tsx)
- [AssociationSourcePicker.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/operational/AssociationSourcePicker.tsx)
- [AssociationReview.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/operational/AssociationReview.tsx)
- [objective-operational.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/shared/capiro/operations/objective-operational.ts)
- [objective-operational-types.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/shared/capiro/operations/objective-operational-types.ts)
- [objective-associations.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/shared/capiro/operations/objective-associations.ts)

## Planner, current resources, and generated receiving

- Multiple projects and shared tasks retain current memberships. Do not add one-project or next-30-days rules.
- Section coverage states are complete, partial, unbound, unavailable, and not_implemented. Partial coverage suppresses aggregate totals.
- Operational views explicitly say requested, Strategy-applied, and Planner-applied versions are unavailable. Opening the page does not start/continue generation.
- Ordinary current-resource opening is distinct from exact generated-output receiving. A manual link does not establish generated/application lineage.
- The separate governed Planner receiver requires a ready saved Objective and current authorized selected client, then verifies generation/output and rechecks current project access before navigation. Loading, unavailable, in-progress, absent, and recheck-failure states are distinct.

Sources:
- [ObjectiveOperationalPage.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/operational/ObjectiveOperationalPage.tsx)
- [OperationalSections.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/operational/OperationalSections.tsx)
- [ObjectiveGovernedPlanner.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/objectives/ObjectiveGovernedPlanner.tsx)

## Economic evidence and Government/Federal

- An economic evidence read DTO exists. It carries numeric value, unit, currency, effective dates, observed date, review date, import ID/row, geography, verification/review status, external-use approval, and promotedFacilityId.
- Review: pending_review / approved / rejected. Verification: source_verified / geocode_verified / user_provided / inferred.
- Evidence types: facility, employee, payroll, capital_investment, taxes, supplier, supplier_spend, partner, beneficiary, beneficiary_count, project_site, other.
- Only evidence explicitly attributed through matching promotedFacilityId displays as current-location evidence. At most 1,000 client evidence records are returned; this is not period-complete history. Facility staff previews and imported evidence are not summed.
- Public district ACS/LODES measures remain separate from client figures; preserve dataset, source year, geography, period, units, observed/sync dates. Missing is not zero.
- Current file inventory and inspected source expose read operations, not an admitted structured economic entry/import mutation. DG-04 remains owner-contract-dependent. Draft designs may demonstrate layout, but commit must remain unavailable pending exact field/unit/provenance/write acceptance. Do not invent merge/overwrite behavior.
- Program associations are FY-agnostic relevance signals, not funding totals or verified awards. Prior-award heuristics may match names and do not prove client/site attribution. District overlap does not allocate program funding to a location.
- Clearly synthetic examples may illustrate evidence presentation. No inspected source establishes verified live values for every category.

Sources:
- [profile-evidence-contracts.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/profile-evidence-contracts.ts)
- [profile-evidence-queries.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/profile-evidence-queries.ts)
- [FacilityEconomicSections.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/FacilityEconomicSections.tsx)
- [ClientProgramContext.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/ClientProgramContext.tsx)
- [Government/location audit](https://github.com/neo-capiro/capiro-frontend/blob/main/docs/figma-34-audit-20261016/portfolio/GOVERNMENT-AND-LOCATION.json)

## Pulse and Overview aggregates

- Source currently calculates only the returned Clients count from profileType CLIENT. Need attention, Objectives, Off track, Strategies and linkage percentage remain unavailable.
- Overview Touches/Awaiting reply/Overdue, Health, deadline stress and request totals remain unavailable. Current activity-list length is only “Recent activity items”, not a complete touch metric.
- No accepted linkage denominator or ignore semantics found. Complete-zero/positive examples must use an accepted complete scope or be explicitly conditional synthetic design examples. Partial unknown is not zero.

Sources:
- [PortfolioPulse.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/index/PortfolioPulse.tsx)
- [OverviewSignals.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/OverviewSignals.tsx)

## Billing and conversion (DG-06)

- Inline billing remains unavailable: “Inline billing is not available in this preview. No charge has been made.” No admitted charge/quote command was identified in the inspected Portfolio surface.
- Current main now admits explicit new-client conversion, unlike the older blanket audit limitation. It consumes one available slot and makes no purchase.
- Requires current permission, active prospect, successful duplicate search, current capacity, and an explicit reviewed checkbox.
- Fields: existing client name read-only; optional HTTP/HTTPS website (max 2,048; no credentials); optional description (max 600).
- Contacts, files and research stay prospect-scoped. Contact carry-over is a separate explicit review.
- Pending command locks fields and is retained across reload. “Recover new-client conversion” → “Recover conversion receipt” before any fresh conversion.
- Receipt outcome created binds requestId, prospectId, payloadDigest and expectedUpdatedAt. Success offers “Open created client” and “Acknowledge conversion”.
- Only a validated PROSPECT_NEW_CLIENT_REFUSED envelope with status 400/402/404/409 and exact original identity/digest proves no write. “Review refused conversion” checks the original receipt and current prospect before a new review. Unverified failures remain unknown.
- Existing-client linking creates no client and makes no charge. It preserves prospect history/files/research and requires explicit selected-client confirmation.

Sources:
- [ProfileCapacityStatus.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/billing/ProfileCapacityStatus.tsx)
- [NewClientConversion.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/prospects/conversion/NewClientConversion.tsx)
- [new-client-command.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/prospects/conversion/new-client-command.ts)
- [ProspectClientLink.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/prospects/conversion/ProspectClientLink.tsx)

## Remaining owner dependencies

1. Exact economic authoring/import command, write schema, unit/period admission, overwrite/merge choice and review authority.
2. Complete Portfolio/Overview aggregate definitions, source completeness, linkage denominator and ignore authority.
3. Inline payment, quote, purchase and reconciliation contracts; existing conversion must not imply payment authority.
4. Verified live source/unit/geography/period evidence for each location category. Mockup values are synthetic, not proof of backend coverage.

No backend runtime, data ingestion, deployed frontend, tests, or visual parity were verified by this research.

## Advocacy correction clarification (DG-08)

- Merge is **matter to matter**, not a single-record operation. The current matter is the retained destination; the selector chooses the source matter. All records and links move to the destination, and the source matter is permanently removed. Existing copy says this cannot be undone.
- Reassign is an exact record moved from its current matter (or unassigned state) to a different current matter. The record becomes locked against automatic re-clustering.
- Detach leaves the exact record unassigned and retained for later manual reassignment; it is locked against automatic re-clustering.
- Mark not advocacy hides the exact record from Matters and Timeline, retains it for audit, and locks it against automatic re-clustering. Optional reason is limited to 1,000 characters.
- Before dispatch, source and target are re-read in the current client. The code compares their entire snapshots and checks the record's current membership. There is no exposed integer version in the submitted correction payload; do not invent a `v3` CAS field. A changed-record presentation should ask to reload current records.
- Merge request is POST `/{destinationMatterId}/merge`, body `{sourceMatterId}`. Record commands are POST `/records/{recordId}/reassign` with `{targetMatterId}`, `/detach`, or `/not-advocacy` with optional `{reason}` under the current client's advocacy root.
- Current source has no idempotency request ID, receipt lookup, or original-command replay endpoint for these corrections. `retry:false`; the attempt is retained in the open dialog. After a dispatched error, the action becomes **Check current result**, which performs read-only reconciliation and never repeats the write.
- Merge reconciliation requires source absence, destination presence, all source records locked at the destination, and all source links present. Reassign requires the exact locked record at the destination and absent from the source. Detach requires an unassigned timeline record and source absence.
- An unknown not-advocacy result cannot be proven by absence from the latest 500 timeline entries. The code explicitly requires an acknowledged server response or authoritative rejected-record/audit receipt; the latter is not supplied by the inspected flow.
- Consequently DG-08 persistent original-request receipt lookup/replay is an **unresolved backend contract dependency**. Mock up the admitted read-only reconciliation and an honest unresolved result, rather than an active fabricated receipt/replay action.

Sources:
- [CorrectionDialog.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/advocacy/CorrectionDialog.tsx)
- [correction.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/advocacy/correction.ts)
- [useCorrection.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/advocacy/useCorrection.ts)

## Timeline mutation clarification (DG-09)

- Current timeline does not expose an immutable request-ID/receipt lookup/replay endpoint. `activity-attempt.ts` explicitly calls its mechanism session-cache protection, not a native operation receipt.
- Attempt scope includes tenant, user, client and activity ID; a local token distinguishes pending/unknown attempts. This does not establish persistent recovery after a browser reload.
- Update uses PATCH `/clients/{clientId}/activity/{activityId}`; deletion uses DELETE of that path. There is no explicit version field in these payloads.
- Before dispatch, current latest-500 rows are read and compared. Stable fields are kind, occurredAt, sourceType and sourceId. Edit also compares title/body; removal compares all relevant title/body/dueAt/settledAt/pinned fields. Changed/missing records refuse the write.
- Unknown result: “The result is not confirmed. Load and review the latest activity before trying again.” Conflict: “This entry changed.” CTA: **Review latest activity**, with **Loading latest activity…** while pending.
- Read-only review displays “Latest saved activity” with current title/body/pin/settle values. A missing row says it is no longer in the current activity list and asks to close/review the timeline. Absence from a bounded list is not proof that the original removal committed.
- No automatic resend. The source clears its local session attempt after a successful current read so the user can deliberately review a next action; this is not an idempotent original-command replay guarantee.
- Edit fields are Title (required, max 300) and Details (max 5,000). Title receives initial focus. Close restores the activity actions trigger or the supplied timeline fallback. Pending writes block dismissal. Draft fields remain while the edit dialog is open.
- Persistent original-command lookup/replay requested in DG-09 remains a backend dependency. Mockups must not portray an active receipt endpoint or guaranteed safe replay absent a new accepted contract.

Sources:
- [activity-attempt.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/activity-attempt.ts)
- [activity-change.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/activity-change.ts)
- [activity-mutations.ts](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/activity-mutations.ts)
- [ActivityDialogs.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/ActivityDialogs.tsx)
- [ActivityActions.tsx](https://github.com/neo-capiro/capiro-frontend/blob/main/apps/web/src/features/portfolio/client-profile/ActivityActions.tsx)
