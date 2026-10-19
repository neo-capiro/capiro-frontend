# Prospects/proposals acceptance review

Read-only review of 40 assigned rows against shipping source `4a1614886fd98bb42d529f1ef59b3d01d7ff9173` at assessment checkout `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d`. The apps tree is identical at both revisions. No application/shared file was changed, no build/server was created, and no provider, paid-model, native backend or billing operation ran.

Three new confirmed findings require bounded action. Two affect already implemented behavior; one is a product gap. Documented unavailable proposal/payment/private-note/rich-intake capabilities remain separate dependencies.

| ID | Severity | Finding | Affected rows |
|---|---|---|---|
| PROS-F01 | P1 | Fresh prospect-list denial leaves cached cards and pipeline usable | PROS-001, PROS-002 |
| PROS-F02 | P1 | Typing during a prospect document save is silently lost on success | PROS-024 |
| PROS-F03 | P2 | Prospect Files cannot search the loaded file list | PROS-019 |

## PROS-F01: Fresh prospect-list denial leaves cached cards and pipeline usable

QueryState displays the fresh permission denial while the list/count/pipeline branches use query.data without checking query.error or successful current access.

Fix before enabling the authenticated Prospects list. This is a frontend revocation-display failure involving previously delivered data; no server authorization bypass, cross-tenant fetch or successful unauthorized mutation was demonstrated.

Source: `apps/web/src/features/portfolio/prospects/ProspectsIndex.tsx:112`, `apps/web/src/features/portfolio/prospects/ProspectsIndex.tsx:123`, `apps/web/src/features/portfolio/prospects/ProspectsIndex.tsx:190`.

Reproduce:

1. Load the prospect index with one authorized synthetic prospect.
2. Open the prospect, expire the 30-second query freshness interval, and make the list endpoint return 403.
3. Return using the Prospects breadcrumb. The current 403 alert appears, but the prior name, geography, stage and next action remain rendered.
4. The Pipeline button remains enabled and opens those cached records despite the denied current list read.

Evidence: [review.spec.ts:43](review.spec.ts:43), [browser-results.json](browser-results.json), [browser-artifacts/review-prospect-list-retai-c05da-ter-a-current-access-denial/denied-prospect-list.png](browser-artifacts/review-prospect-list-retai-c05da-ter-a-current-access-denial/denied-prospect-list.png), [browser-artifacts/review-prospect-list-retai-c05da-ter-a-current-access-denial/denied-prospect-pipeline.png](browser-artifacts/review-prospect-list-retai-c05da-ter-a-current-access-denial/denied-prospect-pipeline.png).

## PROS-F02: Typing during a prospect document save is silently lost on success

The text controls accept edits while the request is pending. Clearing retained state changes the DraftEditor key and reloads it from saved content, discarding newer local input.

Fix before enabling prospect manual document editing: normal typing during a slow successful save silently loses user work. This is independent of native transaction/CAS limitations and reproduces with valid successful service receipts.

Source: `apps/web/src/features/modules/workspace/WorkspaceDraft.tsx:150`, `apps/web/src/features/modules/workspace/WorkspaceDraft.tsx:161`, `apps/web/src/features/modules/workspace/WorkspaceDraft.tsx:241`, `apps/web/src/features/modules/workspace/prospects/useProspectDraftSave.ts:153`.

Reproduce:

1. Open a manual document in the prospect-scoped Workspace.
2. Enter First submitted text and click Save draft; hold the synthetic PATCH response.
3. The Body field remains editable, so enter Later typed text that must survive.
4. Release the valid PATCH and snapshot responses. The field resets to First submitted text; the later edit is neither submitted nor retained.

Evidence: [workspace-review.spec.ts:5](workspace-review.spec.ts:5), [workspace-results.json](workspace-results.json), [workspace-artifacts/workspace-review-prospect--082e8-ntly-discards-it-on-success/typing-during-pending-save.png](workspace-artifacts/workspace-review-prospect--082e8-ntly-discards-it-on-success/typing-during-pending-save.png), [workspace-artifacts/workspace-review-prospect--082e8-ntly-discards-it-on-success/later-edits-lost-after-save.png](workspace-artifacts/workspace-review-prospect--082e8-ntly-discards-it-on-success/later-edits-lost-after-save.png).

## PROS-F03: Prospect Files cannot search the loaded file list

The component directly maps all returned files into an unfiltered list and supplies no search state or control.

Blocks the search facet of PROS-019 and full Files design acceptance. It does not block the already implemented upload/readiness/open facets or establish a native storage failure.

Source: `apps/web/src/features/portfolio/files/ProspectFiles.tsx:164`, `apps/web/src/features/portfolio/files/ProspectFiles.tsx:166`.

Reproduce:

1. Open a prospect with a current scoped attachment list containing a ready synthetic file.
2. Inspect the Files region: Preview and Download are present, but neither a searchbox nor a search-labelled textbox exists.
3. Compare actual Figma 411:65071, which provides Search files above the file table.

Evidence: [review.spec.ts:27](review.spec.ts:27), [browser-results-locator-correction.json](browser-results-locator-correction.json), [browser-artifacts-locator-correction/review-Figma-files-search--9fd2d--file-records-are-available/prospect-files-current.png](browser-artifacts-locator-correction/review-Figma-files-search--9fd2d--file-records-are-available/prospect-files-current.png), [figma-411-65071-context.txt](figma-411-65071-context.txt), [figma-411-65071.png](figma-411-65071.png).

## Executed evidence and limits

- Four unique browser cases reached their final expected result: two fresh UI captures, one confirmed 403 retained-cache reproduction, and one confirmed pending-save data-loss reproduction. These diagnostic passes confirm the observed defects; they are not passing acceptance tests.
- Initial browser launch failed because Playwright’s default executable was absent. The installed `/usr/bin/chromium` resolved it. That failed output is preserved in `browser-results-initial-launch-failure.json`.
- The first runtime pass completed 2/3; the denied-list test initially expected the raw 403 message instead of QueryState’s generic permission text. Its evidence is preserved in `browser-results-locator-correction.json`. The corrected targeted rerun passed 1/1 in `browser-results.json`; no application source changed.
- The delayed manual save case passed 1/1 in `workspace-results.json`; one synthetic PATCH and one synthetic snapshot were used. New content typed after that PATCH began disappeared after success.
- Browser tests used root-managed 5191/5197, external configs with `webServer: undefined`, one worker/browser and unique outputs. Existing repository fixtures were imported rather than redefined.
- The prior whole 934/121 qualification and seven completed repairs were not rerun. Existing brief/contact/conversion/Files/restart acceptance was used at its documented bounded scope.
- Figma asset URLs returned 403 to shell downloads. Returned screenshot bytes from actual design-context responses were saved without alteration. Fifteen fresh context/screenshots are present; native app imagery was not substituted for Figma.
- No native authorization, signed-in Clerk session, real storage, conversion, source generation or deployment acceptance is inferred. Every row identifies its precise remaining work in `row-assessment.json`.

## Row dispositions

| Row | Source disposition | Specific remaining work |
|---|---|---|
| PROS-001 | CONFIRMED_DEFECT | PROS-F01 must be repaired. Native scoped search, owner/stage completeness and revocation remain unrun. |
| PROS-002 | CONFIRMED_DEFECT | PROS-F01 affects the list-to-pipeline path. Native navigation/access was not exercised. |
| PROS-003 | BOUNDED_IMPLEMENTED | Native created-record persistence and the Add profile entry frame411:45185 are unassessed; rich intake is evaluated separately in PROS-006–009. |
| PROS-004 | PARTIAL_IMPLEMENTED_WITH_DEPENDENCIES | Rich legal/contact/registration/sector fields need their prospect-specific owner contracts; no equivalence to Client intake is assumed. Native read completeness is unrun. |
| PROS-005 | PARTIAL_IMPLEMENTED_WITH_DEPENDENCIES | The separate legal-name contract required by517:121532 is absent. Native update/receipt persistence is unrun. |
| PROS-006 | DEPENDENCY_UNAVAILABLE | Business Development owner must supply canonical company email/phone/primary POC/classification persistence and authorization. Contact CRUD is a separate resource, not evidence that these properties work. |
| PROS-007 | DEPENDENCY_UNAVAILABLE | A prospect-logo contract must define association, scan/readiness and replacement semantics before enabling this action; ordinary prospect attachment upload is not logo support. |
| PROS-008 | DEPENDENCY_UNAVAILABLE | Prospect-specific CAGE/UEI/SAM/LDA/EIN/NAICS/PSC/type/set-aside persistence remains required. Client fields cannot be silently repurposed. |
| PROS-009 | DEPENDENCY_UNAVAILABLE | Owner-defined prospect sector/track/issue/start-date schema and validation remain missing. Shared firm notes do not supply all intake notes semantics. |
| PROS-010 | BOUNDED_IMPLEMENTED | Owner persistence and active-membership authorization need native verification. The Figma rich-intake placement differs, but the owner-change interaction exists. |
| PROS-011 | BOUNDED_IMPLEMENTED_CAPABILITY_GATED | Native catalog release and owner-approved legacy-stage mapping remain dependencies. No automatic won-to-charge behavior is inferred. |
| PROS-012 | BOUNDED_IMPLEMENTED | Native archival, permission/revocation and durable history retention remain unrun. Archived-vs-active filtering has source support. |
| PROS-013 | BOUNDED_IMPLEMENTED | Native task persistence and owner authorization remain unrun. No independent task-assignee contract is claimed. |
| PROS-014 | BOUNDED_IMPLEMENTED | Native history completeness, provenance and visibility remain unrun; arbitrary email/meeting logging is evaluated separately in PROS-016. |
| PROS-015 | DEPENDENCY_UNAVAILABLE | Per-user private-note visibility/authorization is undefined; firm notes do not meet the private-note criterion. Preserve current honest labeling. |
| PROS-016 | DEPENDENCY_UNAVAILABLE | Owner-defined supported activity kinds, permissions and provider provenance are needed for arbitrary logging. Global Quicklog is not accepted as prospect logging. |
| PROS-017 | BOUNDED_IMPLEMENTED_NATIVE_DEPENDENCY | Backend contact source registration is composed at 243248e726243c44bd4b9d24fd1ed220da18c56a. The allocated Contacts migration remains source-only/unapplied; native deployment, enabled-service behavior and database/RLS acceptance were not run. Durable Contacts recovery and conversion carry-over remain unproven. Prior contact-browser cases are bounded fixture evidence. |
| PROS-018 | DEPENDENCY_UNAVAILABLE | Native Meri must define authorized prospect/context intent that stays editable and waits for Send. Shared mode navigation alone does not satisfy research handoff. |
| PROS-019 | CONFIRMED_PRODUCT_GAP_WITH_IMPLEMENTED_FACETS | PROS-F03 blocks the search facet. Native storage and researcher/source completeness remain unrun; missing research federation is a separate dependency. |
| PROS-020 | BOUNDED_IMPLEMENTED_NATIVE_DEPENDENCY | Reuse prior focused Files/restart evidence. Real storage delivery, scan readiness, owner authorization and native concurrent conversion remain unrun. Text import is legitimately disabled. |
| PROS-021 | BOUNDED_IMPLEMENTED_WITH_VISUAL_DIFFERENCE | Actual 65188 uses two document-type cards; current Modules landing is a different layout and does not create proposal documents. Native list/open permissions and conversion-origin preservation remain unrun. |
| PROS-022 | BOUNDED_IMPLEMENTED_NATIVE_DEPENDENCY | Live model generation was not run or authorized. Dossier/source completeness, native durable generation and mapping into Workspace remain owner acceptance tasks. |
| PROS-023 | BOUNDED_IMPLEMENTED_NATIVE_DEPENDENCY | Native brief persistence/source resolution and durability remain unrun. Rich toolbar and actual proposal version binding are separate unmet criteria, not implied by this section editor. |
| PROS-024 | CONFIRMED_DEFECT_AND_RICH_EDITOR_GAP | PROS-F02 must be repaired before manual drafting deployment. Rich-document editing remains a distinct implementation/contract acceptance gap; generic exports and textareas do not satisfy that toolbar. |
| PROS-025 | LEGITIMATELY_DISABLED_DEPENDENCY | Native comment/share permission, invitation and document version binding are unsupported. Do not enable generic sharing against prospect documents as a substitute. |
| PROS-026 | PARTIAL_IMPLEMENTED_WITH_DEPENDENCIES | Existing manual-export fixture evidence is reused. Native exports of actual brief/proposal versions, rich Preview and artifact equivalence remain unrun/unsupported; manual documents are not automatically brief/proposal exports. |
| PROS-027 | PARTIAL_IMPLEMENTED_WITH_DEPENDENCIES | Generic template browsing is bounded implemented behavior. Prospect proposal-specific template binding and management workflow are not present; native catalog evidence does not prove generation. |
| PROS-028 | LEGITIMATELY_DISABLED_DEPENDENCY | Native Workspace/BusinessDevelopment/Engagement must agree immutable prospect, brief, template, commercial terms/team and generated-version binding before this workflow can be accepted. |
| PROS-029 | LEGITIMATELY_DISABLED_DEPENDENCY | An authorized native send contract must bind the selected contacts and exact PDF/appendix versions and record durable outcome. No email/provider activity was performed. |
| PROS-030 | LEGITIMATELY_DISABLED_DEPENDENCY | Transactional send-receipt/stage/log semantics and a governed undo are missing. Source does not fabricate a stage success or attempt an email. |
| PROS-031 | LEGITIMATELY_DISABLED_DEPENDENCY | Native reply correlation, recipient/thread provenance and cancellation-aware reminder contract are required; no generic timer was substituted. |
| PROS-032 | PARTIAL_IMPLEMENTED_WITH_DEPENDENCIES | New-client conversion shown in65934/66181/66430 remains unavailable. Prior failed/lost/mismatched linking evidence is reused; native lock/association persistence is unrun. |
| PROS-033 | LEGITIMATELY_DISABLED_DEPENDENCY | Native paid conversion, actual-invoice consent, recovery/compensation/SCA/webhook/grants and policy acceptance remain owner dependencies. No billing or provider execution was authorized or run. |
| PROS-034 | PARTIAL_ORIGIN_RETENTION_NOT_CARRY_OVER | Origin retention is not the 66181 promise of transactional contacts/files/research/proposal-version carry-over. Native conversion mapping and durable access constraints remain unrun. |
| PROS-035 | DEPENDENCY_UNAVAILABLE | Owner-approved brief-to-objective mapping and native reviewed draft creation remain required. The sample count 3 is not a license to invent objectives. |
| PROS-036 | PARTIAL_LINK_NAVIGATION_NATIVE_ENTITLEMENT_UNASSESSED | Real converted-client authorization/entitlements and full-module/template availability need native service proof. The existing link only proves navigation, not paid feature activation. |
| PROS-037 | PARTIAL_IMPLEMENTED_WITH_VISUAL_GAPS | Three-step rich intake remains tied to missing field contracts; its navigation/chips cannot be claimed accepted. Full responsive review of all dialogs remains unassessed. |
| PROS-038 | REUSED_SCOPED_SHELL_PARTIAL | Actual prospect view picker 65425 is absent; full shared-shell target variants 47010/80302/85416 and live Clerk remain outside this bounded pass. Root shared-shell review owns broader acceptance. |
| PROS-039 | PRODUCT_DEFINITION_DEPENDENCY | Product owner must define stage probabilities, value/currency units and authorized source before a weighted metric can be accepted. The sample design number must not be hardcoded. |
| PROS-040 | PRODUCT_DEFINITION_DEPENDENCY | Product owner must define denominator, date boundaries and legacy-stage treatment, with native historical data. No ratio can safely be inferred from currently loaded cards. |

## Deliverables

- [findings.json](findings.json): reproduction, severity, deployment impact, file/line, row/frame and artifact evidence.
- [row-assessment.json](row-assessment.json): exactly 40 unique assigned IDs, source evidence, current/prior Figma coverage and row-specific remaining criteria.
- Figma contexts/screenshots, diagnostic specifications/configs and preserved browser results beside this report.

No implementation was attempted. Root integration owns disposition and any repair authorization.
