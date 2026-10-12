# Exact-source integration structure review

Reviewed 12 October 2026 by Codex, the assigned shared frontend owner.
This is a responsibility/size review, not native behavior or product acceptance.
The 27 unchanged inherited Portfolio findings remain explicitly unreviewed.

Shared changes have separate owners: ApplicationBoundary owns identity lifetime;
SelectedClient owns verified client projection; request-lifetime owns abort scope;
HeaderFrame/ModeLink/ScopedLink own chrome and canonical navigation; existing
Core/Intel, fixed-operation and Meri-public adapters retain their distinct contracts.
No root route holds feature logic. No guard rule or meaningful assertion was removed.

<a id="changed-modules"></a>
## Changed Modules and Settings source

Original source-hash reviews remain in docs/architecture-size-reviews.json.
The entries below were re-reviewed after the combined compiler/lint/navigation
changes; each binds exact file bytes and keeps all threshold signals visible.

- `apps/web/src/features/modules/directory/CongressionalContacts.tsx`: The directory table still owns only congressional-contact filtering and selection. charAt preserves the original label while satisfying noUncheckedIndexedAccess; transport stays in the existing query adapter.
- `apps/web/src/features/modules/engagement/EngagementOverview.tsx`: The overview still aggregates permitted meetings/tasks/report projections. A stable view clock replaces a render-time clock; no service, provider or authorization responsibility moves into the component.
- `apps/web/src/features/modules/engagement/EngagementScreen.tsx`: The engagement composer owns one route-selected view. Its client selector now changes the canonical URL, clearing client-bound draft/session hints and remounting the shared request/editor scope. Existing meeting, outreach, report and team surfaces remain separate modules.
- `apps/web/src/features/modules/engagement/MeetingLibrary.tsx`: The meeting list and selection retain their existing owner. The upcoming queue uses a stable mounted-view clock and apostrophe escaping preserves visible text. Export, attendance and preparation contracts remain in their adapters.
- `apps/web/src/features/modules/engagement/OutreachView.tsx`: The view selects one outreach session/draft; the adjacent OutreachForm owns editing that record. Guarded state replacement handles changed inputs before rendering without moving dispatch into presentation. Original action/cancellation tests remain required.
- `apps/web/src/features/modules/intelligence/legiwatch/committees/CommitteeFollowDialog.tsx`: The form owns one committee-follow preference transaction. Guarded initialization replaces the effect only when the loaded source changes; typed operations still own the write contract.
- `apps/web/src/features/modules/intelligence/legiwatch/committees/CommitteeRoom.tsx`: This is one committee-room projection composer; the only integration change is equivalent JSX apostrophe escaping.
- `apps/web/src/features/modules/intelligence/legiwatch/hearings/FollowHearingDialog.tsx`: This dialog edits one hearing-follow preference. Guarded loaded-record replacement preserves the same selected-client/preference transaction and existing operation boundaries.
- `apps/web/src/features/modules/intelligence/legiwatch/hearings/IntelligencePanel.tsx`: The panel owns one hearing intelligence query and pagination. Cursor clearing follows the complete hearing/client/relevance tuple before rendering; matching and source qualification remain server-owned.
- `apps/web/src/features/modules/intelligence/legiwatch/live/use-browser-capture.ts`: The hook and its nested connect/message handlers own one bounded browser media/socket capture lifetime. The existing generation, ownsCapture, interruption and cleanup fences remain intact. Callback synchronization moves to layout commit and visible state resets on scope replacement; MediaRecorder, stream, socket, recording transport and timer are still released together. No capture, provider or live execution was performed by this review.
- `apps/web/src/features/modules/intelligence/legiwatch/monitoring/KeywordScanReview.tsx`: One reviewed scan intent remains local to this form, with effects dispatched by the fixed operation registry. Only equivalent JSX apostrophe escaping changes.
- `apps/web/src/features/modules/intelligence/legiwatch/more/LegiWatchSettings.tsx`: Display preferences and hearing email preference retain separate loaded projections and writes within this settings view. Guarded synchronization changes timing before render, not authorization or operation contracts.
- `apps/web/src/features/modules/planner/ProjectCatalog.tsx`: The catalog and its project form keep separate presentation responsibilities in one cohesive project module. Stable project keys repair React identity; JSX text is preserved.
- `apps/web/src/features/modules/planner/PublicForm.tsx`: The public token form retains its distinct unauthenticated capability contract. A keyed FormRequest owns one token/revision read lifetime, while PublicFormQuestions retains answer, attachment and submission state. Retry and token replacement now explicitly remount both and abort old requests.
- `apps/web/src/features/modules/planner/ResourceEditor.tsx`: One resource-edit form remains behind its registered operation. The integration changes only JSX apostrophe escaping.
- `apps/web/src/features/modules/research-portfolios/ResearchReviews.tsx`: The research review lane retains its typed query and explicit review actions. charAt preserves the lane label without optional indexed access.
- `apps/web/src/features/modules/strategies/runs/RunDetail.tsx`: This run-detail projection still delegates artifact/data rendering and fixed operations. Next Links replace internal document navigation to retain the shared session boundary; no run execution or inference is added.
- `apps/web/src/features/modules/workspace/WorkspaceScreen.tsx`: One selected workspace view and document editor remain composed here. Route/client replacement clears the selected/created record before rendering, while document persistence stays in the existing editor/adapter.
- `apps/web/src/features/settings/UsageSettings.tsx`: One usage report screen retains its existing summary/credential queries. A stable mounted-view clock makes the requested date range deterministic across renders; changing days still changes the query.
- `apps/web/src/features/settings/hq/AiKeysSettings.tsx`: The usage report and TenantKeyDrawer retain their existing report and credential-edit interfaces. Only the mounted-view report clock changes. Masked credential records, permission checks and lifecycle tests remain intact; no credential operation is executed by integration.

## Portfolio and newly visible Meri signals

Meri source formatting now uses the combined Prettier gate; five pre-existing
functions become visible to the nonblank-line threshold. AST behavior and public
package contracts are unchanged. Exact function fingerprints are bound in
scripts/architecture/reviewed-size-findings.json, alongside the Portfolio fixes.

- `MeriCitedAnswer.tsx`: Formatting exposes the existing single synthetic cited-answer presentation above the threshold. Its draft, citation disclosure and copy states belong to that answer; the composer is separate. Public sample labels, disabled unavailable controls and exact local design assets remain. No connected source, transport or authority is introduced.
- `RunActivityFixture.tsx`: Formatting exposes the existing explicit synthetic event-control surface. Scenario, replay and run-attempt selection serve one local fixture; canonical public projection owns acceptance and replay semantics, and MeriRunWorkspace owns rendering.
- `run-activity-events.ts`: Formatting exposes the existing finite synthetic event factory. It emits public-contract-valid fixture records, not server events or an agent runtime. Existing source-isolation, invalid-scenario and all-state tests remain.
- `RunActivityPanel.tsx`: Formatting exposes the existing single run-activity projection renderer. Tools, sources, artifacts, approval references and errors are already accepted public events from one run/attempt. Controls remain disabled without a connected authorized service; no orchestration is added.
- `workspace-view.ts`: Formatting exposes the existing display-only fold of accepted events. The finite event switch maps the published contract to one run/attempt view. Replay, authorization and admission remain owned by the public projection package; no second event protocol is introduced.
- `PhoneVerification.tsx`: This component still presents one phone verification transaction owned by usePhoneVerification. Requested-state text follows Figma 1028:188442, removes the conflicting ready-state paragraph, and preserves dormant/unknown/verified distinctions without asserting delivery. The red baseline and browser regressions bind the copy correction.
- `watchlist-queries.ts`: The hook combines current client, targeting, taxonomy and jurisdiction reads for one watchlist editor. All Intel reads now depend on a current Core client source. Reader validation, cancellation and explicit refresh remain together; the Core-404 browser negative control requires zero Intel calls.
- `portfolio.module.css`: This stylesheet contains only the Portfolio index layout, table/cards, responsive and theme presentation, scoped through CSS modules and the existing Portfolio root. The union guard newly discovers its 411 nonblank CSS lines; it introduces no shared global reset or additional domain.
- `Shell.tsx`: This component remains a shared Portfolio chrome composer. HeaderFrame and WorkspaceSwitcher own common structure/navigation; PortfolioNavigation owns the sidebar. Canonical home/settings links replace sibling-host assumptions, without changing feature transport or session ownership.

## Retained test meaning

The Meri asset-path assertion now accepts either CSS quote style while requiring
the same exact local PNG URL. Modules deep-link tests explicitly install the
Core authorized-client projection required by the application boundary. The old
Intel partial-rejection fixture now actually submits the rejected term and its
type; accepting an unrelated rejection was the defect being closed. Original
assertions otherwise remain, with new shared-lifetime/browser negative controls.

## Reviewed correction after the frozen full suite

`BillingSummaryPanel` remains one optional financial read projection: the existing
hook owns current-actor eligibility and request lifecycle; the component owns the
disclosure and its supplied values. Replacing the legacy anchor with `ScopedLink`
does not move authorization, pricing, payments or a second editor into this owner.
`ProfileChoiceSession` still owns one Add profile choice and the transition into
the existing intake form. Removing its now-unused sibling URL argument from the
billing summary does not add a responsibility. Their previously inherited size
signals are now explicitly reviewed against these exact changed function hashes;
the other inherited signals remain visible and unaccepted.

The dialog wrapper retains the adopted Radix focus, portal, modal and primitive
owners. Its small Escape guard handles the reproduced passive-listener transition
between nested dialogs, checking the current top dialog and handling one native
event once. It does not create a parallel modal/focus implementation. The original
focus restoration test failed in the full run and one of five focused repeats;
ten unchanged repetitions pass with the guard. Full-suite verification remains
required. Billing and Intel independent negative controls remain separate files.
