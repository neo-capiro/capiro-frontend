# Structure review — 12 October 2026

Reviewer: Codex, implementation review. This is not an independent human acceptance or live-service qualification. Scope: Modules, Settings, their shared transport/primitives/shell, and the new verification harness. Unrelated Meri and Portfolio implementation was preserved.

The repository thresholds (400 nonblank lines per file, 80 per function) remain unchanged and every signal stays in architecture output. `docs/architecture-size-reviews.json` records reviewed source hashes, exact signals, responsible functions and the dispositions below. Changed bytes, missing review evidence or a new signal make the architecture check fail again. No review can waive imports, cycles, private ownership or route-boundary errors. The command has no automatic approval/update mode; future contributors must inspect and record a new review.

## Restructuring and corrections

- Planner's resource-type editors are separated from resource save/lifecycle; timesheet state is separated from toolbar/table/dialog composition. Public and member form previews reuse answer rendering and conditional visibility. Form type edits preserve compatible task mappings and remove incompatible file/text settings.
- Strategies' library, timeline grid, linked-work dialog and individual proposal review are separate cohesive components. Context import owns upload → resolve → analyze → selected save in one cancellable hook; retries replace the same source/chunk result rather than duplicating it.
- Workspace's library, newsletter template selection, newsletter persistence/history, Hill Day section editors, template cards and defaults are separate components/hooks. Newsletter save serializes actions, retains the created draft after a later failure and prevents edits during persistence from being falsely marked saved.
- LegiWatch has bounded folders for hearing discovery, recording, research sources, draft delivery, publications, monitoring and briefings. Directory owns committee rooms separately from Committee Staff. The LegiWatch More catalog is the single owner of its retained view/title/component selection. Recipient selection is shared by retained draft delivery and briefing schedules; retired reports, imports, News evidence, Florida Budget, legacy digest and Daily subscriptions have no screen owners.
- Shared component lifetimes abort requests on unmount as well as session changes. Gateway input/bounded decoding is separated from HTTP dispatch. Multipart, binary, presigned upload and retained-audio protocols have dedicated owners.
- Reviewed UI edge cases included comma-separated option editing, hidden-ancestor form branches, exact research cursor continuation, stale preview hashes, nullable held scan counts and timestamp-zone compatibility. Failures remain visible and do not synthesize success.

<a id="module-presentation"></a>
## Module presentation

The remaining large rendering functions own one named screen, editor or dialog, including its loading/error/empty states and the fields used by that interaction. They use `shared/capiro` for validated operations and `shared/module-ui` for controls, dialogs and tables. Extracting every JSX block at 80 lines would move related fields away from their owner without separating a responsibility. No UI TSX file remains above the 400-line threshold. The hash records identify the particular function and source rather than exempting all JSX or a feature directory.

Directory and Research Portfolio screens keep dataset-specific filters/selection and read state together. Planner containers share task/form models and focused editors. Engagement routes delegate session proposal/target actions and shared meeting detail. Strategy execution decisions remain separate from timeline presentation. Workspace builders keep preview/edit interactions local, with persistence and multi-step import lifetimes extracted.

<a id="legiwatch"></a>
## LegiWatch presentation and recording

Long editors correspond to one backend-owned reviewed configuration: keyword rules, record/agenda rules, statute monitors, workflows or briefing schedules. Mutation bodies preserve required optimistic versions and exact configuration/source hashes. Preview, activation and send remain visibly separate actions. Read-only captured identities cannot silently become new actor authority.

The browser-capture hook intentionally owns the complete stream/socket/recorder lifetime. Its generation check fences all callbacks; tracks, recorder, transport, socket and timeouts are released on close/unmount/failure. It sends only after `capture_ready`, requires the retained recording epoch where applicable, bounds buffered audio and distinguishes acknowledged audio from unconfirmed tail coverage. Reliable audio framing/acknowledgment/backpressure belongs to `HearingRecordingTransport`, and message schemas belong to `ws-messages`. Splitting callback closures across unrelated hooks would make resource ownership less explicit. Real browser audio, consent and WebSocket behavior remain a live gate.

<a id="settings"></a>
## Settings presentation

Each large function owns one Settings page, queue or confirmation dialog. Role-based visibility only controls presentation; Core/Intel backend guards remain the authority. Shared action handling centralizes pending/error state. Analyst monetary values retain exact decimal handling; merging/reconciliation and second-admin decisions retain explicit review. Signature editing delegates to Tiptap and sanitizes HTML through DOMPurify, with upload confirmation separate from signature saving. Greenfield Meri pages retain deliberate unavailable actions until their public contract exists.

<a id="contracts"></a>
## Declarative operation catalogs

`operations/settings.ts`, `operations/strategies-agents.ts` and `operations/workspace-hillday.ts` remain over 400 nonblank lines. Each is a declarative catalog of fixed paths, strict request validators, projected responses and pinned controller evidence for one service area. They do not contain session handling, persistence, HTTP dispatch or UI. Schemas with real reuse already have adjacent canonical owners. The registry composes their exported descriptors. Splitting solely by line number would obscure related contracts; a new domain or transport responsibility must be extracted and reviewed.

<a id="tests"></a>
## Behavioral test suites

Long test callbacks group related independent assertions for one external boundary: Planner contracts, Intelligence/Research contracts, LegiWatch contracts and exact preview/source-authority behavior. Fixtures are synthetic. Tests assert observable validation/failure outcomes, retained decimal precision, revocation/scope behavior and response projection. Their size does not make them production services, and their assertions were not removed to pass checks.

<a id="shared-meetings"></a>
## Shared meeting presentation

Meeting detail and artifacts are reused by Engagement and Master Calendar. Each function keeps its tab or artifact interaction together. API contracts and request lifetimes remain in the shared Capiro boundary; these components do not own email sending, tenant binding or Meri execution.

<a id="styles"></a>
## Authored stylesheet catalogs

The Workspace (782 lines), Strategies (453 lines) and LegiWatch (453 lines) CSS modules exceed the file threshold and have explicit review records. Each owns a coherent feature family's visual vocabulary and responsive overrides. Components reuse these local classes; none contains behavioral rules or cross-feature selectors. Keep related selectors and their responsive variants together; extract only when a distinct component design gains an independent owner. The obsolete combined Settings stylesheet was removed after verifying there were no imports. Its live layout and control sheets have separate ownership; a duplicate `stack` export in controls was removed so it cannot mask the canonical layout class.

<a id="legiwatch-simplification-20261031"></a>
## LegiWatch simplification and Directory committee move — 31 October 2026

Independent Codex source review: base `6d1465cf903b7a85bc716590eacc33dc2a81c570`, final implementation head `fd745cc49c58ac794e7903a3c1247efd99999506` (full review at `3f0952566fc2cef29f3cf9347a1c74a27ccdef0a`, followed by inspection of both cleanup commits). The records in `docs/architecture-size-reviews.json` identify 28 changed or moved files with current size signals and exact source bytes; the two existing function records for `CommitteeDirectory` and `StateDirectory` are updated in `scripts/architecture/reviewed-size-findings.json` to avoid duplicate reviews. This review does not approve unchanged files or waive boundary errors. Records for source deleted or reduced below the threshold in this diff are removed. No scanner policy or threshold changed.

Directory now owns committee catalog selection, federal and Florida room presentation, and the follow dialog. `CommitteesScreen` only composes the selected room or catalog, makes the State coverage limit explicit, and delegates URL changes to `committee-route.ts`. `CommitteeRoom` and `StateCommitteeRoom` each own their jurisdiction-specific detail tabs; federal proceedings share one local renderer, Florida bill referrals use the existing Directory pagination, and follow writes are isolated in `CommitteeFollowDialog`. `CommitteeDirectory` retains its independent staff-contact query and table. `StateDirectory` has one legislator responsibility after deleting the page-derived committee grouping. The public directory link builder preserves the client selection hint and drops unrelated hearing state; backend authorization remains authoritative.

The retained `DeliveryRunView`, `DeliveryCompose` and `RecipientPicker` functions have separate responsibilities: immutable edition/history presentation, explicit composition approval, and local recipient selection. Hearing publication delivery and SMS consent retain their existing owners while consuming the renamed recipient operation/schema. These components do not recreate report definitions, report schedules or Daily subscriptions. `BriefingReview` now previews and freezes a saved selection without a report-library chooser; research review uses the same retained delivery view after approval. Existing history, citation selection, brief composition and editorial schedule editing remain separate. Editorial activation requires the current saved policy and version, and editing invalidates the saved-configuration activation presentation.

Workflow editor, one-time preview and saved-action presentation remain separate functions. Removing the report-review template reduces their responsibilities while retaining folder scope, reviewed hashes, exact request keys and server-owned execution. The hearing-detail and notification functions change only their committee destination; their existing detail subcomponents and action boundaries remain intact. Research lookup, source-date display, cited draft creation, version comparison and search/results owners are unchanged except for the moved source helpers. Their long functions keep related fields and loading/error states together; further JSX-only splitting would not create a separate responsibility.

The three reviewed contract suites retain independent behavioral assertions for gateway retirement, retained API paths, source and approval constraints, privacy projection and retained hearing boundaries. The new retirement suite rejects old operation names before authentication/network dispatch and rejects retired report/source configuration in current writes. The final cleanup deletes unused nonresearch UI type alternatives, their redundant selection condition and the selection reset callback whose only callers were retired screens. No actionable source findings remain at the final implementation head. Root owns the executed TypeScript, focused contract/Directory/browser checks and production build evidence; this source responsibility review does not claim live authentication, delivery, recording or deployment qualification. The review scan has zero blocking size findings in changed files; its 11 unrelated boundary errors and 140 unrelated blocking size findings remain visible and outside this review.
