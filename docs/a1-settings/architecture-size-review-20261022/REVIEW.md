# A1 PR117 exact-source size-review proposal

**Status: proposal only; architecture gate remains held.**

Source head `367f9298a3c75f4a20e30ed1a52aa678b5c03da3`, base `87a8495138f0af5303bc93397438238c6cc5081b`. The subsequent commit adds only this evidence packet; runtime/test source fingerprints stay identical.

This packet covers **42** exact findings (9 replacements, 33 new keys) in the Fable50-finding list. Each was read with its caller/helper/contract context. Current responsibilities are cohesive; arbitrary JSX/function extraction would not remove a distinct owner, so the proposal retains each exact source fingerprint with a concrete rationale. This is not path-wide permission or behavioral/security acceptance.

## Ownership and application

Formal shared registration remains with the coordinating owner. Existing A1 evidence (`docs/a1-settings/VERIFICATION.md` and `docs/a1-workspace/review-r1/frontend-review.md`) explicitly leaves shared-manifest registration outstanding. The current user instruction requires a proposed-entry handoff rather than cross-lane edits. Neither shared registry, baseline, threshold nor architecture evaluator was changed.

`PROPOSED-REVIEWED-SIZE-FINDINGS.json` uses the existing record shape. `MANIFEST.json` supplies each source SHA-256, scanner fingerprint, prior registry record, exact reviewer notes and supporting test references. The owner must review and upsert by `(file, kind, symbol)`; append-only application would duplicate changed keys. Recheck fingerprints if either PR source moves.

No proposal file is imported by architecture or runtime code. The actual command remains blocking until the owner registers accepted records. Any in-memory completeness check is proposal validation only, never an executable gate PASS.

## Verification and limits

`npm run architecture`: **exit 1**, errors `[]`, 42 blocking findings on this standalone PR. Read-only composition exactly reproduces Fable: total551 / reviewed483 / inherited-unreviewed18 / blocking50, errors[].

Only documentation/proposal files change in this revision; no runtime or test source is touched, so prior test receipts remain attributed to their original heads and were not rerun as new evidence. No central production gate, browser/provider/native test, model turn, merge/deploy or live SQL was performed. Existing sparse-checkout evidence documents were restored byte-exact for the canonical classification; no registry change is hidden in setup.

The earlier `security-form.test.tsx` startup failure (undeclared/unlocked jsdom, zero cases executed), canonical nonzero architecture exits, earlier compiler/build environment limits and Fable run `capiro-portfolio-preview-build:3961445f` FAIL remain preserved. No later gate in that failed run is treated as executed.

## Separate source observations

See `SOURCE-OBSERVATIONS.json`. These are source-derived concerns or evidence gaps, not executed reproductions. They remain for dot/Fable disposition; cohesion retention does not resolve them. No email/recovery/reservation change is authorized or made. The reconciliation cancellation issue is inherited; it is not attributed to this size packet or newly to A1.

## Per-finding review

### 1. `apps/web/src/features/modules/workspace/DraftClientAssociation.tsx` — function `DraftClientAssociation`

Scanner: line17, 85 nonblank lines; fingerprint `9e5a4424aeadc6877b517e2436750ffe60918bcf4c721b2be3a37bfec4eec2e7`. Proposed disposition: retain.

Retain this feature-local component as the single held-draft association interaction. Its client query, selected UUID, write exclusion, draft-lifetime counter, exact returned draft/client checks and refusal rendering all belong to one explicit binding attempt. It calls the existing workspace.draft.update operation and returns the confirmed draft through onBound; it does not write editor content, own the editor save sequence, infer an association from a display name, or implement server authorization. Keeping receipt validation beside the callback prevents consumers from adopting an unconfirmed binding. Ordinary and newsletter editors both reuse this component, avoiding two binding implementations. Extracting its small form or moving its attempt state into a generic helper would add indirection without separating an independent responsibility.

Supporting inspected test sources (not new run evidence):

- apps/web/tests/newsletter-client-authority.test.ts: shows recovery only for a held row and binds the selected UUID
- apps/web/tests/newsletter-client-authority.test.ts: keeps the draft held and displays a server wall refusal
- apps/web/tests/newsletter-client-authority.test.ts: rejects a successful response for a different client
- apps/web/tests/newsletter-client-authority.test.ts: receives held flags and validates an explicit UUID binding request

- Read the entire component and its two editor consumers, the fixed operation schema and useCapiroMutation. The transport hook owns cancellation and mutation state; server admission remains authoritative.
- Tests were inspected, not executed for this review. The existing Node/SSR test probe substitutes React effect behavior, so these named tests do not independently qualify browser unmount/scope timing.
- No new ownership conflict or cohesion-driven extraction was identified. This recommendation is for the exact reviewed function, not a path-wide size exception.

### 2. `apps/web/src/features/modules/workspace/WorkspaceDraft.tsx` — function `DraftEditor`

Scanner: line34, 211 nonblank lines; fingerprint `caa02f35b94dab13410db0c0c48a8966e104078c1b51afc66efe4aa9685ec465`. Proposed disposition: retain.

Retain this function as the manual draft editor composition. It owns the editable title/section buffers, history visibility and ordinary PATCH-then-snapshot action for the displayed draft. Prospect identity admission remains in WorkspaceDraft/assertProspectDraft, retained prospect-save reconciliation remains in useProspectDraftSave, rich content rendering/export remains in named components, and copied source tabs remain in CopiedTabs. The A1 binding change stores only the confirmed bound draft for association presentation and passes onBound directly to setBoundDraft; it deliberately leaves title/sections intact instead of reloading the editor and losing unsaved work. Ordinary and prospect paths keep their established different save semantics while sharing the same editing presentation. Extracting their common JSX into a new generic editor abstraction would not remove an independent domain responsibility.

Supporting inspected test sources (not new run evidence):

- apps/web/tests/workspace-held-recovery.test.ts: adopts a confirmed client without reloading or losing unsaved ordinary draft edits
- apps/web/tests/prospect-rich-workspace-render.test.ts: plain input, existing formatted sections and pending-save freeze cases
- apps/web/tests/prospect-workspace.test.ts: manualDraftInput ordering/default Body and assertProspectDraft/assertManualSave receipt checks

- Read the complete WorkspaceDraft.tsx file, including the keyed ProspectDraftEditor and outer record/tenant/prospect checks, plus useProspectDraftSave and manual-draft helpers.
- The held-recovery test checks no reload, adopted client presentation, unchanged unsaved title/body and the subsequent exact update payload. The rich-editor tests inspect SSR output; they do not qualify live rich-editor DOM behavior.
- Prospect recovery is delegated, not reimplemented in DraftEditor. This review does not convert ordinary saves into the prospect durable-recovery contract or assign new behavior.

### 3. `apps/web/src/features/modules/workspace/WorkspaceLibrary.tsx` — function `DocumentsLibrary`

Scanner: line72, 190 nonblank lines; fingerprint `2d75301592dc14979a988f9c8f9456b73afa4c8a02e7e5fef966862d3561ba97`. Proposed disposition: retain.

Retain this function as the read-only Workspace document-list interaction. Query parameters, current page cursor, local search/ownership/template/client filters, loading/refusal state, table columns and open callbacks all operate on one admitted result page. The fixed workspace.documents schema/transport owns receipt parsing and requests; the backend owns visibility, while the optional clientId is sent as the existing server query scope. The A1 additions suppress held rows from client-scoped views/options and show the explicit recovery label without adding a write path, association inference or new store. The local client-name selector filters already-returned display rows and does not establish client identity or change bindings. Extracting columns or each filter into separate files would mainly split presentation configuration, not create a clearer ownership boundary.

Supporting inspected test sources (not new run evidence):

- apps/web/tests/newsletter-client-authority.test.ts: labels held library rows and excludes them from a client-filtered surface
- apps/web/tests/newsletter-client-authority.test.ts: receives held flags and validates an explicit UUID binding request
- apps/web/tests/work-associations.test.ts: canonical UUID association, name-only hold, duplicate-name/rename and prospect exclusion cases

- Read the complete library function, documentTone/WorkflowCards context, WorkspaceLibraryDocument schema and useCapiroQuery lifecycle. The function has no mutation API or independent authorization implementation.
- The direct library test covers held-row presentation and the external clientId-scoped exclusion. Work-association tests cover a separate canonical consumer and are supporting contract context, not proof of every library filter or pagination case.
- This recommendation does not claim exhaustive ownership-filter/cursor/browser coverage. No cohesion-driven extraction or new lane conflict was identified in the exact reviewed function.

### 4. `apps/web/src/features/modules/workspace/newsletter/NewsletterWorkflow.tsx` — file `<module>`

Scanner: line1, 405 nonblank lines; fingerprint `fe25e0d517a5f699138f7aee1af29dbcf5ca4a369d0d4b3715b57beb257377f9`. Proposed disposition: retain.

Retain this file as the newsletter workflow presentation owner. Its only local helper, BuilderTools, adds bounded newsletter blocks through an onChange callback; NewsletterWorkflow composes template, builder, review and staging views of the same draft. Editing state and the create/PATCH/snapshot sequence already live in useNewsletter, content rendering in NewsletterPaper, comments in NewsletterComments, destination staging in NewsletterStaging, template selection in NewsletterTemplates, and held-client recovery in DraftClientAssociation. The file neither embeds those service lifecycles nor imports an unrelated feature's private implementation. The added recovery panel and two held-state staging branches connect an existing child boundary to the same draft. Splitting out each JSX step solely to reduce this file's line count would disperse one view composition without moving a distinct authority, persistence or transport owner.

Supporting inspected test sources (not new run evidence):

- apps/web/tests/newsletter-client-authority.test.ts: refuses to mount staging for a held newsletter even on the stage view
- apps/web/tests/newsletter-client-authority.test.ts: keeps unsaved newsletter edits when its held association is confirmed
- apps/web/tests/workspace-brief-copy-newsletter.test.ts: ordinary newsletter initialization and save skip a preceding bound tab with arbitrary newsletter metadata
- apps/web/tests/workspace-brief-copy-newsletter.test.ts: a bound-only draft cannot dispatch ordinary newsletter PATCH or snapshot

- Read all 408 source lines, including BuilderTools and the four step branches. Read useNewsletter, NewsletterComments and the NewsletterStaging entry/selection boundary to confirm delegated responsibilities.
- The held-staging test checks both the disabled entry action and direct stage-view rendering, and asserts that the staging child is not mounted. Hook tests substantiate the delegated draft behavior; they do not prove full browser navigation, layout or modal accessibility.
- This is a file-level cohesion review distinct from the NewsletterWorkflow function review. No source changes, test execution or fingerprint calculation was performed.

### 5. `apps/web/src/features/modules/workspace/newsletter/NewsletterWorkflow.tsx` — function `NewsletterWorkflow`

Scanner: line78, 323 nonblank lines; fingerprint `7961cd8d1736147113f121d7fd685387443b9eb2d79a77fffe6418360ad05e04`. Proposed disposition: retain.

Retain this function as the renderer and navigation composition for one newsletter draft. Its step branches consume a single useNewsletter result and route explicit events back to that hook; desktop/mobile preview, undo/redo buttons, save status and discard confirmation all present the same editing session. The function delegates comments, paper rendering, templates, staging and binding to named components rather than duplicating their state machines. Its client-binding addition passes only the current draft, pending state and the hook's adoption callback, preserving unsaved editor fields in the hook. The stage button and stage branch both reflect the held flag, while the trusted backend remains responsible for access. A new step controller or generic workflow abstraction would duplicate the existing canonical hook instead of clarifying ownership.

Supporting inspected test sources (not new run evidence):

- apps/web/tests/newsletter-client-authority.test.ts: refuses to mount staging for a held newsletter even on the stage view
- apps/web/tests/newsletter-client-authority.test.ts: keeps unsaved newsletter edits when its held association is confirmed

- Read the complete function, all child imports and the useNewsletter return interface. No dispatch implementation or staging authority is hidden in this renderer.
- Named tests exercise the new held-state composition and preservation of edits through its adoption callback. They do not establish all template/editor/review interactions or native browser behavior.
- No independent responsibility requiring a split was found in this exact function. This review does not approve future additions to its four existing steps.

### 6. `apps/web/src/features/modules/workspace/newsletter/use-newsletter.ts` — function `useNewsletter`

Scanner: line12, 194 nonblank lines; fingerprint `445e20866f94852ffd471190411a41e12c477e83e76281f00a776e7e84daea29`. Proposed disposition: retain.

Retain this hook as the owner of one newsletter editing session and its ordered save attempt. Title/body, undo/redo, selected client, current draft, saved status and the save-in-progress ref are coupled by the invariant that a save uses one draft and client scope through create, primary-document update, metadata update and snapshot. The scope generation checks after awaited writes and confirmed-client adoption must update that same session; separating them into unrelated hooks would make stale-save rejection and unsaved-edit preservation harder to follow. Pure preset/content conversion remains in newsletter-model, fixed requests and cancellation in shared Capiro queries, visual composition in NewsletterWorkflow, and Outreach staging in its own hook/component. It explicitly excludes sourceBriefVersion documents from ordinary newsletter initialization and update selection rather than absorbing copied-tab editing.

Supporting inspected test sources (not new run evidence):

- apps/web/tests/newsletter-client-authority.test.ts: creates with the selected UUID despite duplicate names
- apps/web/tests/newsletter-client-authority.test.ts: holds a removed client before create
- apps/web/tests/newsletter-client-authority.test.ts: reopens using the saved UUID and refuses reassignment
- apps/web/tests/newsletter-client-authority.test.ts: discards a pending create after the local client changes
- apps/web/tests/newsletter-client-authority.test.ts: keeps unsaved newsletter edits when its held association is confirmed
- apps/web/tests/workspace-brief-copy-newsletter.test.ts: both ordinary-versus-bound document selection cases

- Read the complete hook, newsletter-model conversions, fixed request schemas, shared query/mutation lifecycle and the calling renderer. No new transport, persistence store or authorization scheme is introduced by this hook.
- Tests were inspected only. They exercise selected UUIDs, missing clients, reassignment refusal, stale create completion, held recovery and copied-tab exclusion with mocked query/mutation ports.
- The multi-request save is not a database transaction or durable recovery guarantee; this cohesion review makes neither claim. No split is justified solely by its current function length.

### 7. `apps/web/src/features/settings/IntegrationSettings.tsx` — file `<module>`

Scanner: line1, 438 nonblank lines; fingerprint `533315bfc2efc666b350a1f4a9969dd5e54717e3e5ffc3b51d159a95b6a805b0`. Proposed disposition: retain-proposed.

This module presents the existing integration-account settings surface: provider cards, connection status/actions, selected-account permissions and disconnect confirmation. Provider metadata, account registration, destination validation and uncertain-write lifecycle already have separate owners; the only file-local helper formats sync age. It contains fixed API calls and view state, not OAuth/token exchange, mailbox sync algorithms or authority enforcement. Retaining these mutually related views avoids distributing selected connection and disconnect state merely to reduce line count.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- Read entire module, integrationProviders, useSettingsMutation boundaries; this review does not qualify provider behavior or DOM rendering. Named suites provide supporting shared lifecycle/contract evidence only; no direct component interaction coverage is claimed. security-form exercises SettingsDialog/CreateTenant, not InviteMember, and remains unexecuted.

### 8. `apps/web/src/features/settings/IntegrationSettings.tsx` — function `IntegrationSettings`

Scanner: line49, 394 nonblank lines; fingerprint `d4d2ddb780ca576f62c7589b8d973944194f29afc1927abe0beaf098a1ba8df6`. Proposed disposition: retain-proposed.

This function coordinates one integration-settings page: list/capability queries, the selected registration/detail/disconnect record, fixed-operation callbacks and matching status views. The disconnect journal is owned by useSettingsMutation, account registration by RegisterAccount, and URL admission by settingsDestination; server OAuth and sync internals are absent. The large portion is provider/connection markup, separately reviewed below, so a new controller layer would currently duplicate the same selected-account lifetime.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- A1 disconnect fencing is distinguished from the pre-existing connect/sync actions; no claim all operations use one journal. Named suites provide supporting shared lifecycle/contract evidence only; no direct component interaction coverage is claimed. security-form exercises SettingsDialog/CreateTenant, not InviteMember, and remains unexecuted.

### 9. `apps/web/src/features/settings/IntegrationSettings.tsx` — function `IntegrationSettings > <anonymous>`

Scanner: line155, 210 nonblank lines; fingerprint `c16af860e506f16911adcff6ef3427e3305960236e4cb334fd269b9d34e67f17`. Proposed disposition: retain-proposed.

This providers.map callback is one provider-card projection: it filters the supplied connection list for the provider, selects that provider capability query, and renders configuration state, empty state and provider-specific action labels. Account rows remain a nested pure JSX projection; actual requests are parent callbacks or fixed API operations. The provider discriminator is presentation/capability selection, not a second provider implementation.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- Reviewed callback body at source line155, including the absent/disabled provider controls. Named suites provide supporting shared lifecycle/contract evidence only; no direct component interaction coverage is claimed. security-form exercises SettingsDialog/CreateTenant, not InviteMember, and remains unexecuted.

### 10. `apps/web/src/features/settings/IntegrationSettings.tsx` — function `IntegrationSettings > <anonymous> > <anonymous> #2`

Scanner: line172, 134 nonblank lines; fingerprint `20fc2749d2e875e0b39f50226d56a9c259aa3458c5bd771f87428c75cf75fabd`. Proposed disposition: retain-proposed.

This rows.map callback renders one connection identity, health/error, permission affordance and available account actions against the same connection/provider/capability values. It does not own a separate hook, subscription or persisted state; callbacks reuse parent action handling and selected-record setters. Keeping status and action eligibility together makes the displayed account and dispatched connection ID directly reviewable.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- No claim that disabled controls authorize server access; server remains authoritative. Named suites provide supporting shared lifecycle/contract evidence only; no direct component interaction coverage is claimed. security-form exercises SettingsDialog/CreateTenant, not InviteMember, and remains unexecuted.

### 11. `apps/web/src/features/settings/InviteMember.tsx` — function `InviteMember`

Scanner: line14, 116 nonblank lines; fingerprint `9c771ec64d1237e2101b9f5dccd0de918a9926d0639f9b56882623858f417c77`. Proposed disposition: retain-proposed.

One invitation dialog owns its four input fields, visible role choices, one captured submission and the success reset/close sequence. Shared SettingsDialog handles busy dismissal; useSettingsMutation owns uncertain outcome fencing, request capture and receipt validation. The remaining size is labelled form/footer/error composition for that same invitation, with no separate transport or authorization lifecycle to extract.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts
- apps/web/src/features/settings/security-form.test.tsx

- DOM form test remains blocked by undeclared jsdom; source cohesion review is not a DOM pass. Named suites provide supporting shared lifecycle/contract evidence only; no direct component interaction coverage is claimed. security-form exercises SettingsDialog/CreateTenant, not InviteMember, and remains unexecuted.

### 12. `apps/web/src/features/settings/TeamSettings.tsx` — function `TeamSettings`

Scanner: line28, 354 nonblank lines; fingerprint `bdbcd28dc2c8cc7fde7027f22e8122ef85d5b6bc647c40c35d87601ce61ce36a`. Proposed disposition: retain-proposed.

The component composes membership and invitation projections of one team roster, including role/billing controls, invitation resend and selected-member removal confirmation. Both list reloads deliberately share the same refresh and team mutation scope; InviteMember already owns invitation-entry state, while query, mutation, table and dialog primitives own their respective mechanics. Column definitions and modal markup account for the size; no backend membership policy or separate persistence subsystem is implemented here.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts
- apps/web/src/shared/capiro/operations/settings-contracts.test.ts

- Read entire roster and invitation branches, selected remove modal and refresh path. Presentation restrictions are not server authorization. Named suites provide supporting shared lifecycle/contract evidence only; no direct component interaction coverage is claimed. security-form exercises SettingsDialog/CreateTenant, not InviteMember, and remains unexecuted.

### 13. `apps/web/src/features/settings/analyst/AliasManager.tsx` — function `AliasManager`

Scanner: line31, 249 nonblank lines; fingerprint `47757a1a730f064934d6764423feac046dfe720075533434ff0dc5df53b30aa6`. Proposed disposition: retain.

Retain as the program-alias screen coordinator. Program search and selection identify the alias list; the duplicate-alias view supplies options to the already separate MergePrograms transaction. Add/edit draft fields are already owned by AliasEditor. This function owns list presentation, delete confirmation and the three dependent list refreshes; it does not normalize aliases, infer duplicate identity or execute merges itself. Its length is principally table columns and modal composition, and further splitting those declarations would pass the same selected program and refresh boundary between files without removing another responsibility.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts — reviewed source only: synthetic hq-analyst route rendering and all analyst tabs reachable with empty queues; no populated decision interaction is asserted.
- apps/web/src/features/settings/security-writes.test.ts — mismatched analyst.aliases.delete target receipt is refused; helper coverage only.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full AliasManager.tsx and MergePrograms.tsx read. Alias shape/type come from shared/capiro/operations/settings-admin/schemas; fixed operations and authoritative receipt validation remain outside the component.
- No dedicated populated AliasManager interaction test was located; delete/cancel/selection behavior remains unexecuted in this review.

### 14. `apps/web/src/features/settings/analyst/AliasManager.tsx` — function `AliasEditor`

Scanner: line281, 113 nonblank lines; fingerprint `bb8660c88203fadbc934967118a235822f6624587a50c5235b1355367e3d3bca`. Proposed disposition: retain.

Retain as one alias form lifecycle. Initial alias state selects the existing-record PATCH or new-program-alias POST; alias/type fields are shared, while source is editable only on creation because the update contract excludes it. A single submit owns the draft, busy/error display, refresh and close. The operation-specific branch preserves meaningful contract differences and does not justify a generic editor abstraction or separate submit service.

Supporting inspected test sources (not new run evidence):

- apps/web/src/shared/capiro/operations/settings-admin/analyst-programs.ts — inspected strict add/update schemas and canonical aliasType import; this is contract source, not an executed test.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- AliasEditor and its sole AliasManager caller read in full. It uses the same analyst-alias journal section, while input validation and receipt matching are canonical shared owners.
- No direct AliasEditor create/edit/source-disabled assertion was located; the browser empty-queue scene does not open this editor.

### 15. `apps/web/src/features/settings/analyst/AuditAndQuarantine.tsx` — function `AnalystAuditLog`

Scanner: line27, 127 nonblank lines; fingerprint `bd6d61962409ecc621536a1400b973f230a9052889df2038ac706e6a9c8836e5`. Proposed disposition: retain.

Retain as a read-only audit inspection view. Draft filters become applied filters only on form submission and reset pagination; table row selection opens that same audit record before/after detail. One list operation and one selected-record lifetime account for all state. It neither emits audit records nor shares mutation state with the separately exported QuarantineQueue, so splitting filter/table/detail solely for length would fragment a single read workflow.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts — reviewed source only: synthetic hq-analyst route rendering and all analyst tabs reachable with empty queues; no populated decision interaction is asserted.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full AuditAndQuarantine.tsx and analyst-audit.ts operation contracts read. Query cancellation/input replacement belongs to useCapiroQuery; before/after values are rendered as text JSON.
- No populated audit filtering, pagination or detail test was located. Audit read authority and data redaction are backend responsibilities and were not qualified here.

### 16. `apps/web/src/features/settings/analyst/AuditAndQuarantine.tsx` — function `QuarantineQueue`

Scanner: line155, 227 nonblank lines; fingerprint `ba78f3de043fb89b6e022158f007ddb67a16020628d5c696593449d2927d7bce`. Proposed disposition: retain.

Retain as one quarantined-record review workflow. Type/source/page select the queue; raw detail, reprocess and explicit discard all operate on a row from that queue and refresh the same read. Reprocessing acceptance is displayed from the returned receipt rather than locally inferred. Two narrow modals present or confirm the selected record, while useSettingsMutation owns write fencing and recovery; there is no ingestion/reprocessing algorithm in this function.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts — reviewed source only: synthetic hq-analyst route rendering and all analyst tabs reachable with empty queues; no populated decision interaction is asserted.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full queue, QueuePagination, SettingsDialog and fixed quarantine operation schemas read. Type is passed with record ID and the shared operation contract limits the two supported source record categories.
- No direct reprocess-versus-discard, type-switch or populated raw-record interaction test was located; shared lifecycle tests are not substituted for those cases.

### 17. `apps/web/src/features/settings/analyst/MergePrograms.tsx` — function `MergePrograms`

Scanner: line18, 98 nonblank lines; fingerprint `533ce5c4b640bb7d755d62008df8f006710f052f629082c89996be0ccf2964c6`. Proposed disposition: retain.

Retain as a single explicit two-program merge confirmation. Deduplicating caller-provided choices by programId only builds select options; the function captures keep/merge IDs, refuses an empty or identical pair in the UI, invokes one fixed merge operation and reports aliasesCopied from its receipt. Canonical program/alias movement remains server-owned. Keeping the paired selects and destructive confirmation together makes the directional choice reviewable without a separate controller.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts — rejects a programs.merge receipt with keep/merge IDs reversed.
- apps/web/src/shared/capiro/operations/settings-admin/analyst-programs.ts — inspected strict merge body and keepProgramId != mergeProgramId refinement; contract source only.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full function and AliasManager duplicate-detector caller read; this transaction is already extracted from alias browsing.
- No direct option deduplication, paired-select or destructive-confirmation component test was located.

### 18. `apps/web/src/features/settings/analyst/PersonReviewQueues.tsx` — function `PersonCandidateQueue`

Scanner: line37, 136 nonblank lines; fingerprint `d0e3a9339e22dbc003b2dd89c19c6397701145c58568eb0f87b15f65641f9f74`. Proposed disposition: retain.

Retain as one paginated person-to-program candidate decision view. The table presents the proposed person, PE, score and match basis; its only writes are confirm/reject on the displayed candidate ID, followed by the same queue reload. The UI does not resolve identity or create the relationship locally. Column markup and the two intentionally distinct decision payloads explain the size; sharing it with other analyst queues would obscure their different contracts and outcomes.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts — reviewed source only: synthetic hq-analyst route rendering and all analyst tabs reachable with empty queues; no populated decision interaction is asserted.
- apps/web/src/features/settings/security-writes.test.ts — exact confirmed person-candidate row readback, bounded pagination, absence refusal and required readback are asserted.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full PersonReviewQueues.tsx, analyst-personnel.ts and useSettingsMutation read. linked/resolved are service outcomes, and the canonical readback owner verifies the recorded target before success.
- No direct populated candidate button or pagination interaction test was located.

### 19. `apps/web/src/features/settings/analyst/PersonReviewQueues.tsx` — function `PersonnelMergeQueue`

Scanner: line211, 163 nonblank lines; fingerprint `895eee43cc205d6347432dafdd3df706c9994f43474ec1880b2ecdf3c2d31f61`. Proposed disposition: retain.

Retain as a personnel-pair review lifecycle. The queue and selected {item, decision} share one record context; PersonRecord already owns repeated side-by-side person/source presentation. Four explicit decisions use one typed operation and a single notes/confirmation dialog, with reset-on-open and close/reload-on-success. The component does not calculate similarity or merge personnel data, so an additional generic queue or decision service would not remove a separate domain responsibility.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts — reviewed source only: synthetic hq-analyst route rendering and all analyst tabs reachable with empty queues; no populated decision interaction is asserted.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full function, PersonRecord helper, decisions constant, QueuePagination and analyst-personnel contract read. These personnel decisions are intentionally distinct from program merges.
- No direct tests were located for the four decision values, record A/B identity, notes reset or confirmation-close transitions. Shared hook tests cover infrastructure only.

### 20. `apps/web/src/features/settings/analyst/ProgramMatchQueue.tsx` — function `ProgramMatchQueue`

Scanner: line22, 205 nonblank lines; fingerprint `10625c96d3e4514acf5a732ca5617912248337e84c1c10002c0e9af696e9365c`. Proposed disposition: retain.

Retain as the PE-to-program review screen. Status/page state selects the queue; per-row notes, evidence detail and accept/quarantine/reject all concern a displayed match. The local decide closure centralizes the single write shape while the service remains responsible for confidence, evidence tier and actual linkage. Table presentation and evidence modal are dependent views of that same row, not independent provider or matching workflows.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts — reviewed source only: synthetic hq-analyst route rendering and all analyst tabs reachable with empty queues; no populated decision interaction is asserted.
- apps/web/src/features/settings/security-writes.test.ts — refuses an analyst.programMatches.decide receipt whose status contradicts the requested accepted decision.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full function, fixed analyst-programs operations and shared query/write owners read. Notes are keyed by match ID; status changes reset pagination.
- No direct populated evidence, per-row notes or status/action interaction test was located.

### 21. `apps/web/src/features/settings/analyst/ReconciliationQueue.tsx` — function `ReconciliationQueue`

Scanner: line30, 263 nonblank lines; fingerprint `1c9b21e5f1ca08beddd4eaa3c4649887ec11fb358d663bfd38cb628ebbd3ae25`. Proposed disposition: retain-with-observation.

Retain the structural boundary as one reconciliation queue: canonical/conflicting/manual choices, the selected manual draft and second-administrator status all concern the same row lifecycle and one resolve payload owner. Exact decimal input stays a string, pending versus resolved success is read from the backend receipt, and the confirmation/dialog/table use existing primitives. There is no provider integration, persistence or second policy owner to extract. This cohesion decision is not behavioral acceptance: the separately recorded inherited cancelled-notes defect needs disposition and a targeted characterization; moving JSX alone would not fix it.

Supporting inspected test sources (not new run evidence):

- apps/web/src/shared/capiro/operations/settings-admin.test.ts — keeps exact decimal manualValue as a string, rejects numeric/missing manual values and accepts a pending-approval receipt.
- apps/web/test/browser/settings-scenes.spec.ts — reviewed initial analyst reconciliation empty-queue rendering only.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.
- Missing characterization: open Manual for row A, enter notes, Cancel or close, then Keep and Accept for row B; neither request may contain row A notes. Retain a positive case that submitting Manual A sends its own exact value and notes.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Concrete source path: notes is local state; decide body uses ...(notes ? { notes } : {}) independently of decision; SettingsDialog onClose and Cancel call only setManual(undefined). Opening Manual and successful decide reset notes, but cancellation does not.
- Prefer explicit manual-only payload data or a coherent manual-draft reset on every close; no broad extraction or change to the analyst second-admin policy is needed. Parent owns any authorized correction and subsequent fingerprint review.
- Analyst reconciliation approval is a separate existing backend workflow; this review does not remove or reinterpret it as Workspace approval.
- Base classification confirmed read-only against 24316f91: the same unconditional notes inclusion and both close paths already exist before A1. The A1 diff adds the shared mutation fence, signals, notices and disabled controls; it does not introduce the cancelled-notes behavior.
- Separate source-only observation: /dev/shm/a1-size-reviews/reconciliation-cancelled-notes-observation.json. Keep unresolved for coordinating review; no product correction, behavioral acceptance, A2 scope or registry waiver is implied.

### 22. `apps/web/src/features/settings/hq/AiKeysSettings.tsx` — file `<module>`

Scanner: line1, 429 nonblank lines; fingerprint `039619eb360d1492f9c7146aef6aea36b751e0408f4deabd68b16b350a25c797`. Proposed disposition: retain.

Retain this file as the HQ tenant AI usage and credential-management feature. It contains a read-only tenant overview and its private TenantKeyDrawer, with the component boundary already separating range/list selection from the selected tenant's credential interaction. Both views use the same range and explicit refresh callback; the only other local definitions format money/tokens and name the existing credential schema. Fixed operations and schemas remain in settings-admin/hq, reads in useCapiroQuery, and write exclusion, receipts and recovery in useSettingsMutation and its security-write modules. The file does not implement provider calls, credential storage or backend authorization. Moving the private drawer to another file would change placement without uncovering a missing responsibility boundary; no second consumer or separate lifecycle requires that move in this snapshot.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts: Settings hq-ai-keys renders compatible responses without runtime failures
- apps/web/src/shared/capiro/operations/settings-admin.test.ts: requires a current credential readback and accepts only the supported model action
- apps/web/src/features/settings/security-writes.test.ts: mismatched HQ credential receipts, frozen request/raw credential removal, and nonreplayable key-rotation recovery cases

- Static read-only review of /dev/shm/a1-fe-step0-117 at 08101169fa086a20a0d269fc6970c7bc11b71304. No tests or gates were run; no product or registry files were changed. Fingerprints remain with the parent.
- Read the full file, its SettingsScreen/tenant-tab composition, operation definitions, schemas and shared query/mutation/dialog owners. File-level judgment is separate from the two function judgments below.
- The browser scene uses an empty settings.hq.ai.usage fixture and does not open the drawer. Shared receipt/journal tests cover credential invariants, not an end-to-end credential UI journey. Retention is a cohesion judgment, not broader security qualification.

### 23. `apps/web/src/features/settings/hq/AiKeysSettings.tsx` — function `AiKeysSettings`

Scanner: line33, 95 nonblank lines; fingerprint `c7c082a3b756b625a73fd9cda9bb700f65189dacd3ec56ce543eb785de9f7e66`. Proposed disposition: retain.

Retain the overview function as one read-only selection interaction. The chosen 7/30/90-day period produces the query range used by both the tenant usage table and the selected tenant drawer; selecting a row captures its tenant ID/name and closing it clears that selection. Table columns present the same admitted usage rows, and the child refresh callback reloads their source query. No mutation dispatch, credential form state or recovery state is owned here. Extracting the range control or columns would mostly separate closely coupled view configuration, while a new controller hook would only relocate three small pieces of local selection state.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts: Settings hq-ai-keys renders compatible responses without runtime failures
- apps/web/test/settings-access.test.mjs: Settings presentation never exposes HQ or workspace management to customer standard roles

- Static read-only review of /dev/shm/a1-fe-step0-117 at 08101169fa086a20a0d269fc6970c7bc11b71304. No tests or gates were run; no product or registry files were changed. Fingerprints remain with the parent.
- Read the complete function and TenantKeyDrawer consumer, plus useCapiroQuery and SettingsScreen/access. Presentation admission is outside this component; backend authorization is not inferred from it.
- Existing scene coverage checks the empty overview and rendering errors. It does not directly test period changes, selecting a populated tenant, or the parent/child refresh contract.

### 24. `apps/web/src/features/settings/hq/AiKeysSettings.tsx` — function `TenantKeyDrawer`

Scanner: line129, 295 nonblank lines; fingerprint `db93c03e5ae828be7f7070eb1a1f320f7086d13a2e85aadd0378fb21e29f78ae`. Proposed disposition: retain.

Retain the drawer as the interaction owner for one selected tenant's AI credential lifecycle. Add/replace, supported-model change and remove-confirmation act on the same tenant/provider records, use one tenant-scoped mutation owner and lock, and refresh the credential list, tenant usage and overview together. The raw key remains local form state and is cleared on acknowledged save or drawer close; shared snapshot/journal helpers remove credentials from recovery metadata. The usage metrics and workflow table are read-only context for that same tenant/range, with no separate editing lifecycle. Splitting each credential action into state-owning hooks would fragment the common exclusion and confirmation state; extracting the read-only metrics alone would not resolve an ownership defect.

Supporting inspected test sources (not new run evidence):

- apps/web/src/shared/capiro/operations/settings-admin.test.ts: requires a current credential readback and accepts only the supported model action
- apps/web/src/features/settings/security-writes.test.ts: rejects mismatched hq.ai.setCredential, hq.ai.updateModel and hq.ai.removeCredential receipts
- apps/web/src/features/settings/security-writes.test.ts: captures a frozen request and removes raw credentials from memory and persistent recovery
- apps/web/src/features/settings/security-writes.test.ts: never treats absence of a durable invitation/send/key-rotation receipt as permission to retry
- apps/web/src/features/settings/security-action.test.ts: Settings dispatch lifetime cases for double submission, frozen captured input, scope cancellation, mismatched receipts, and read-only reconciliation
- apps/web/src/features/settings/security-form.test.tsx: all dismiss paths are ignored while a security dialog is busy

- Static read-only review of /dev/shm/a1-fe-step0-117 at 08101169fa086a20a0d269fc6970c7bc11b71304. No tests or gates were run; no product or registry files were changed. Fingerprints remain with the parent.
- Read the entire drawer, fixed HQ credential operations, masked credential schema, useSettingsMutation/useSettingsAction, security-writes, journal, reconciliation and SettingsDialog. The drawer delegates transport and recovery rather than implementing either.
- The named tests validate shared boundaries and operation contracts. There is no direct populated-drawer interaction test in the inspected sources, and no live provider or browser credential-flow qualification is claimed.

### 25. `apps/web/src/features/settings/hq/BroadcastDetail.tsx` — function `BroadcastDetail`

Scanner: line9, 109 nonblank lines; fingerprint `cffd933b7e98620dbac9aa1447d70f5f875a8fcc013fa321718476ab8a08fc7a`. Proposed disposition: retain.

Retain this function as a single broadcast detail and archival interaction. Its title/body, creator/time, acknowledgement totals and recipients table all derive from the same detail query keyed by the supplied broadcast ID. Archive is the sole write: the fixed operation uses that ID and, only after the shared mutation owner accepts the result, reloads the detail and parent list. Dialog busy state, the archive/close controls and recovery notice describe that same attempt. Broadcast composition and tenant/recipient selection already live outside this function in BroadcastSettings. Splitting the recipient columns or archive footer would not separate an independent lifecycle or authority.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts: rejects a mismatched hq.broadcasts.archive receipt
- apps/web/src/features/settings/security-action.test.ts: Settings dispatch lifetime cases for double submission, frozen captured input, scope cancellation, mismatched receipts, and read-only reconciliation
- apps/web/src/features/settings/security-form.test.tsx: all dismiss paths are ignored while a security dialog is busy

- Static read-only review of /dev/shm/a1-fe-step0-117 at 08101169fa086a20a0d269fc6970c7bc11b71304. No tests or gates were run; no product or registry files were changed. Fingerprints remain with the parent.
- Read the whole function, its BroadcastSettings caller, broadcast operation/schema definitions, shared query/dialog and mutation/reconciliation owners. Archive reconciliation re-reads the exact broadcast ID.
- The existing hq-broadcasts scene has no selected tenant and does not mount BroadcastDetail. The inspected tests do not directly exercise populated acknowledgements or archive-refresh UI behavior; the listed tests cover shared receipt/lifetime rules.

### 26. `apps/web/src/features/settings/hq/BroadcastSettings.tsx` — function `BroadcastSettings`

Scanner: line25, 331 nonblank lines; fingerprint `a99ef011fce6a54c19081b437bbba14e010883c902df04f056ff90ec67ce0fb5`. Proposed disposition: retain.

Retain this function as the selected-tenant broadcast composition workflow. Tenant selection determines the active-member query, sent-broadcast query, recipient options and displayed confirmation target; changing it clears selected recipients, confirmation and detail selection together. Title/body/audience/recipient state feeds one deliberate confirmation and one fixed send operation, whose acknowledged result clears the composer and reloads the tenant's sent list. The list is the immediate record of this workflow, while the independently selected detail/archive interaction is already delegated to BroadcastDetail. Transport, durable uncertainty handling and semantic receipt checks remain shared. A new generic form/controller split would redistribute this single target-and-confirmation state without removing a separate domain responsibility.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts: Settings hq-broadcasts renders compatible responses without runtime failures
- apps/web/src/features/settings/security-writes.test.ts: rejects a mismatched hq.broadcasts.send receipt
- apps/web/src/features/settings/security-writes.test.ts: retains only exact target IDs, request digest and nonsecret expected values across reload
- apps/web/src/features/settings/security-writes.test.ts: never treats absence of a durable invitation/send/key-rotation receipt as permission to retry
- apps/web/src/features/settings/security-action.test.ts: Settings dispatch lifetime cases for double submission, frozen captured input, scope cancellation, mismatched receipts, and read-only reconciliation
- apps/web/src/features/settings/security-form.test.tsx: all dismiss paths are ignored while a security dialog is busy

- Static read-only review of /dev/shm/a1-fe-step0-117 at 08101169fa086a20a0d269fc6970c7bc11b71304. No tests or gates were run; no product or registry files were changed. Fingerprints remain with the parent.
- Read the entire component, BroadcastDetail, broadcast request/response schemas, SettingsScreen/access, useCapiroQuery and shared mutation/journal owners. The members filter is presentation; the review does not treat it as server authorization.
- The browser scene uses an empty tenant list, so it covers initial selection presentation only. Shared tests cover selected-recipient receipt mismatch and omission of message text from persistent recovery, not every composer/audience/tenant-switch interaction.

### 27. `apps/web/src/features/settings/hq/CustomerSettings.tsx` — function `CustomerSettings`

Scanner: line24, 214 nonblank lines; fingerprint `de94ed1775a38023737e2a04a2fe1c6e8e4b6dc933844a4a3748ba3c4416ca11`. Proposed disposition: retain.

Retain this function as the HQ customer billing overview and its single complimentary-access interaction. Summary totals, status filter and table are projections of the same server-returned customer rows; the selected row supplies the tenant ID and desired comp/uncomp state for one confirmation dialog. The write uses the existing onboard operation, and shared mutation handling requires the semantic receipt plus exact-tenant customer readback before the local selection is cleared and the list reloads. The function does not calculate billing policy, call Stripe or implement a managed-import queue; that unavailable contract is only disclosed. Splitting metrics, filters or table cells would disperse one list presentation without isolating an independent state or trust boundary.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts: Settings hq-customers renders compatible responses without runtime failures
- apps/web/src/shared/capiro/operations/settings-admin.test.ts: preserves source-specific search envelopes and never turns CAGE into a supported match (comp response accepts comped and refuses active)
- apps/web/src/features/settings/security-writes.test.ts: rejects a mismatched hq.customers.comp receipt
- apps/web/src/features/settings/security-action.test.ts: Settings dispatch lifetime cases for double submission, frozen captured input, scope cancellation, mismatched receipts, and read-only reconciliation
- apps/web/src/features/settings/security-form.test.tsx: all dismiss paths are ignored while a security dialog is busy

- Static read-only review of /dev/shm/a1-fe-step0-117 at 08101169fa086a20a0d269fc6970c7bc11b71304. No tests or gates were run; no product or registry files were changed. Fingerprints remain with the parent.
- Read the full component, customer schema, HQ list/comp operations and shared mutation/receipt/reconciliation implementation. Mandatory comp readback verifies both target tenant and requested status.
- The browser fixture has an empty customer list; it does not qualify populated totals, status filtering, or comp/uncomp interaction. The tests cited substantiate shared state/receipt handling, not billing-service correctness.

### 28. `apps/web/src/features/settings/hq/TenantDialogs.tsx` — function `CreateTenant`

Scanner: line15, 110 nonblank lines; fingerprint `e1ad8e29500c01a19b2965aeee3c2d11ef336e30e97a33a778552737108c3b91`. Proposed disposition: retain.

Retain CreateTenant as one tenant-and-initial-admin creation form. Its five fields are one payload for the existing create operation; optional administrator names are omitted when blank, and the same form ID connects the dialog footer submit control to that payload. The pending lock freezes fields and cancellation while the shared mutation owner captures the attempt and qualifies the returned tenant/invitation. Only the accepted result triggers parent refresh, close and form reset. Tenant detail/resend already has its own sibling component and mutation scope. Extracting each field, submission callback or success reset would split a single form lifecycle rather than establish a missing feature boundary.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-form.test.tsx: tenant creation freezes fields and close controls until the exact receipt is accepted
- apps/web/src/features/settings/security-form.test.tsx: all dismiss paths are ignored while a security dialog is busy
- apps/web/src/features/settings/security-writes.test.ts: rejects a mismatched hq.tenants.create receipt
- apps/web/src/features/settings/security-action.test.ts: Settings dispatch lifetime cases for double submission, frozen captured input, scope cancellation, mismatched receipts, and read-only reconciliation

- Static read-only review of /dev/shm/a1-fe-step0-117 at 08101169fa086a20a0d269fc6970c7bc11b71304. No tests or gates were run; no product or registry files were changed. Fingerprints remain with the parent.
- Read all TenantDialogs source, its TenantSettings consumer, create operation schema, shared form/dialog components and mutation owners. No tenant provisioning or invitation transport is implemented in the form.
- The direct component test submits synthetic empty inputs through a mocked transport, then verifies freeze and no close/refresh after the wrong tenant receipt. It does not qualify browser constraint validation or successful real provisioning.

### 29. `apps/web/src/features/settings/hq/TenantSettings.tsx` — function `TenantSettings`

Scanner: line29, 231 nonblank lines; fingerprint `c592bdfec1c7072240456f400cb5ad112eaf5b546dbe3b011267848a3929ea91`. Proposed disposition: retain.

Retain this function as the HQ tenant-list interaction coordinator. One selected tenant and mode determine detail, deletion confirmation or the explicit unavailable impersonation notice; selecting a row resets the confirmation text. Creation and membership detail/resend are already delegated to CreateTenant and TenantDetails. The only mutation owned here is confirmed deletion of the selected tenant using the fixed operation, with current-tenant protection reflected in the controls and receipt/recovery behavior delegated to useSettingsMutation. Impersonation contains no dispatch or hidden alternate authority path. Extracting the list columns or deletion footer would split one selection/confirmation lifecycle, while implementing a new impersonation controller would exceed the existing unavailable contract.

Supporting inspected test sources (not new run evidence):

- apps/web/test/browser/settings-scenes.spec.ts: Settings hq-tenants renders compatible responses without runtime failures
- apps/web/test/settings-access.test.mjs: Settings presentation never exposes HQ or workspace management to customer standard roles
- apps/web/src/features/settings/security-writes.test.ts: rejects a mismatched hq.tenants.delete receipt
- apps/web/src/features/settings/security-form.test.tsx: tenant creation freezes fields and close controls until the exact receipt is accepted
- apps/web/src/features/settings/security-action.test.ts: Settings dispatch lifetime cases for double submission, frozen captured input, scope cancellation, mismatched receipts, and read-only reconciliation
- apps/web/src/features/settings/security-form.test.tsx: all dismiss paths are ignored while a security dialog is busy

- Static read-only review of /dev/shm/a1-fe-step0-117 at 08101169fa086a20a0d269fc6970c7bc11b71304. No tests or gates were run; no product or registry files were changed. Fingerprints remain with the parent.
- Read the entire component, both TenantDialogs children, SettingsScreen/access, fixed tenant operations and shared query/mutation/dialog owners. The operation registry deliberately omits impersonation.
- The HQ scene uses an empty tenant list. The inspected tests do not directly cover populated-row selection, DELETE confirmation, or current-tenant disablement; access/receipt and child-form tests are supporting boundaries only.
- No cohesion-driven split or new ownership conflict was found in this exact function. This recommendation does not authorize tenant deletion, impersonation implementation, new scope, or changes to existing A1/A2 holds.

### 30. `apps/web/src/features/settings/mappings/AttachFederalRecord.tsx` — function `AttachFederalRecord`

Scanner: line24, 192 nonblank lines; fingerprint `f00704627b5907b1cca22a5b94e0e83c99a4e7b1daaa63b1f679dcb639dabd96`. Proposed disposition: retain.

Retain as one manual mapping transaction from chosen client/source to selected external record. SourceSearch already owns source-specific querying and record presentation; presentation.ts derives allowed relationship values and award-decision applicability. This dialog owns the selected record, explicit relationship/roll-up inputs and one manual-attachment payload. Client/source/search changes invalidate selection, and source changes reset award choices. Its JSX implements a dependent form sequence, not another entity resolver or transport owner.

Supporting inspected test sources (not new run evidence):

- apps/web/src/shared/capiro/operations/settings-admin.test.ts — preserves contractor search envelopes and unsupported CAGE metadata.
- apps/web/src/features/settings/security-writes.test.ts — refuses a manual mapping receipt for a different client.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full dialog, SourceSearch, presentation.ts and mappings operation contracts read. Authority is server-owned; the client only supplies typed IDs and an explicit identity decision.
- No direct dialog test was located for selection invalidation, source transitions or mandatory relationship/roll-up choices; helper/contract tests do not qualify these interactions.

### 31. `apps/web/src/features/settings/mappings/ContractorIdentity.tsx` — function `ContractorIdentity`

Scanner: line34, 305 nonblank lines; fingerprint `0480e39d83f970855eaac9afdbe6c09aff1c4f7ae69355c0f24d68d975877f3c`. Proposed disposition: retain.

Retain as a client-scoped contractor identity review. The outer drawer discovers/displays candidates and refreshes them; its selected candidate supplies the nested evidence and explicit relationship/award decision. Existing candidates are confirmed by mapping ID, while unmapped candidates use the manual operation, and rejection preserves its distinct contract. These branches are the same selected-identity decision, share the mutation fence and refresh boundary, and do not implement matching or award aggregation. Fact tables explain much of the length; a standalone generic resolver/controller would blur those contract differences.

Supporting inspected test sources (not new run evidence):

- apps/web/src/shared/capiro/operations/settings-admin.test.ts — mapping body rejects actor/tenant authority fields and binds mapping identity to the path.
- apps/web/src/features/settings/security-writes.test.ts — wrong mapping ID and wrong manual-mapping client receipts are rejected.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full function and sole MappingSettings caller read. Candidate explanation, identifiers and award footprint come from the fixed contractorCandidates response; relationship vocabulary is imported from its canonical schema.
- No direct tests were located for existing-versus-new candidate dispatch, rejection, nested dialog state reset or client-scoped refresh. The shared helper tests cover only part of that path.

### 32. `apps/web/src/features/settings/mappings/MappingReview.tsx` — function `MappingReview`

Scanner: line23, 144 nonblank lines; fingerprint `d5ceeaf83ff529574ac4d77ef52a93b27019339148e8a7b237dea6b53b99d91c`. Proposed disposition: retain.

Retain as one existing-mapping review form. The mapping prop supplies the immutable reviewed identity; its ID scopes the mutation hook and request path. Initial relationship/roll-up values, optional rejection reason, and confirm/reject payload differences stay within that single decision. Award applicability and enum vocabulary are imported, while actual receipt validation and authority stay outside. Splitting confirmation and rejection would duplicate the same record facts and form lifetime.

Supporting inspected test sources (not new run evidence):

- apps/web/src/shared/capiro/operations/settings-admin.test.ts — accepts explicit relationship/roll-up values and refuses identity/tenant/actor fields in the body.
- apps/web/src/features/settings/security-writes.test.ts — rejects confirmIndividual receipt for the wrong mapping ID.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full function, MappingSettings caller, presentation helpers and mappings schema read. Reject sends rejectionReason only; confirming award-bearing sources supplies explicit relationshipType and rollUpAwards.
- No direct component test was located for initialized award fields, confirmation disabled state, rejection notes or refresh/close behavior.

### 33. `apps/web/src/features/settings/mappings/MappingSettings.tsx` — function `MappingSettings`

Scanner: line32, 358 nonblank lines; fingerprint `391699df69ecd67e4f37cef76eaf63b2c40f53314f73a0d5f4818d582bd2dad8`. Proposed disposition: retain.

Retain as the mapping index coordinator. It owns display filters, selected review/attach/identity view, and summary refreshes. The three independently editable workflows are already separated into MappingReview, AttachFederalRecord and ContractorIdentity; bulk eligibility and sequential frozen-ID confirmation already have a dedicated bulkReview owner. The remaining bulk dialog confirms exactly the filtered eligible set and the fixed discovery actions only display backend summaries. Moving the large filter/table declarations into generic helpers would reduce line count without removing another policy, transport or persistence responsibility.

Supporting inspected test sources (not new run evidence):

- apps/web/test/settings-access.test.mjs — bulk eligibility excludes contracting, assistance recipients, PAC committees, unknown sources, resolved/confirmed rows and confidence below 0.6.
- apps/web/src/features/settings/security-writes.test.ts — bulk confirmation freezes reviewed IDs and stops before the next dispatch after scope cancellation.
- apps/web/test/browser/settings-scenes.spec.ts — synthetic intelligence-mappings route renders an empty response without runtime errors.
- apps/web/src/features/settings/security-action.test.ts — reviewed source only: representative shared mutation-hook double-submit, captured-input, mismatch fencing, scope cancellation, read-only recovery and definite-rejection cases; not a direct test of this component.

- Read-only review of local HEAD 08101169fa086a20a0d269fc6970c7bc11b71304 (parent identifies matching remote tree 367f9298). No tests, build, architecture gate or live service were run. This is an exact-function design review, not operational/security acceptance; root supplies fingerprints.
- Full MappingSettings, all three child workflows, bulkReview.ts and presentation.ts read. Bulk source policy and receipt checks are not duplicated in the container; query/list failures use the shared StatusPanel.
- No direct populated filter-to-bulk confirmation or child-open/refresh interaction test was located. The review approves this current responsibility shape only, not unrun browser behavior or backend entity resolution.

### 34. `apps/web/src/features/settings/security-action.test.ts` — function `<anonymous> #10`

Scanner: line217, 160 nonblank lines; fingerprint `11b0e181bf4c3f759b0f583e03e3cc60ad5fa49bf42d8edc4d7ec21e6c9a77cd`. Proposed disposition: retain-proposed.

This describe callback registers the Settings dispatch-lifetime scenarios against one Node/SSR probe: double-submit/frozen input, wrong receipt persistence, scope cancellation, refused readback, read-only reconciliation and definite rejection. Harness state/effect/cache mechanics are already separate helpers; the callback itself registers tests and has no application execution role. Keeping the cases together preserves their common attempt-lifetime contract and explicit assertions without splitting a coherent suite to satisfy the function metric.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- All10 expanded cases and27 assertion expressions preserved; last exact-source run10/10. Node probe does not qualify browser lifecycle.

### 35. `apps/web/src/features/settings/security-write-reconciliation.ts` — function `reconcileSettingsWrite`

Scanner: line9, 183 nonblank lines; fingerprint `7f9bd5f36daaf654fdcd6c04a604bca4dad5b27f657f81b62fe80c4a90d55a57`. Proposed disposition: retain-proposed.

This is the Settings readback policy owner: each branch identifies the authoritative read and target/result evidence required to confirm the requested current state for one retained SettingsWrite. It never dispatches a write, checks cancellation, bounds queue/audit traversal to20pages and refuses creation/send/rotation operations without sufficient attempt evidence. Receipt validation and metadata storage are separate modules; splitting branches into per-screen callbacks would scatter the fail-closed default and make no-replay review harder. Additional unrelated workflow execution would require a new review.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- Reviewed every switch branch and conservative default; this is client-side confirmation, not server authority. Current-state readback (for example role/billing/removal) does not prove which causal attempt produced that state.

### 36. `apps/web/src/features/settings/security-writes.test.ts` — file `<module>`

Scanner: line1, 430 nonblank lines; fingerprint `f5c1cfd24f62cd927c33ab8e923e28388eb8f2a9478f32ac944fe1792e5aeca5`. Proposed disposition: retain-proposed.

This test module covers one Settings write-safety boundary across receipt binding, read-only reconciliation and nonreplayable recovery metadata. The long negative-receipt fixture table and explicit target/value/cancellation cases are data and assertions, while snapshot, journal, reconciliation and bulk-review implementations stay imported from their existing owners. Keeping the fixture table with these cases makes the operation-to-evidence contract auditable; it introduces no production orchestration.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- Existing mocked/Node evidence only; preserves all negative rows, unknown-outcome and secret-exclusion assertions.

### 37. `apps/web/src/features/settings/security-writes.test.ts` — function `<anonymous>`

Scanner: line135, 127 nonblank lines; fingerprint `74cef3d01e94965fe3bd625dc8c57594a40c578b1fea6fe3bcee76db066823c8`. Proposed disposition: retain-proposed.

The first describe registers the receipt-boundary matrix and adjacent readback checks: forbidden branding fields, mismatched targets/values, exact paginated queue rows, cancelled reads, unsupported recovery and definite-versus-uncertain rejection. Executing cases are separate callbacks and the data table is outside the registration function. Its size represents related test declarations rather than a multi-responsibility runtime function.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- No tests deleted, combined away or weakened; full registration callback read.

### 38. `apps/web/src/features/settings/security-writes.ts` — function `assertSettingsReceipt`

Scanner: line31, 209 nonblank lines; fingerprint `05a085db86711e33613d73863484cb29d447581d818d3c1bd67117094cb629f7`. Proposed disposition: retain-proposed.

This is the single semantic receiver for Settings write receipts after transport shape validation. Explicit branches compare captured target/value where the receipt supplies them; flag-only removal/queue/customer/key receipts and returned invitation IDs depend on the separate required readback before success. It records the invitation ID or reprocess result needed for that readback and rejects unmatched/default cases with the uncertainty fence. Dispatch, storage and readback already have separate owners; the operation matrix keeps those differing confirmation contracts visible without a generic success fallback or authorization engine.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- Read all cases including HQ resend exact tenant/email/role and broadcast selected recipients; no new policy accepted by this size review.

### 39. `apps/web/src/features/settings/useSettingsMutation.ts` — function `useSettingsMutation`

Scanner: line29, 136 nonblank lines; fingerprint `32ab728a1b8667a9900c6fed614df81c75241c57578a5035d0ef2b7429aadd4a`. Proposed disposition: retain-proposed.

This hook owns one section-and-auth-scoped Settings attempt lifecycle and its React Query/journal projection. It connects existing action cancellation, snapshot/receipt policy, nonreplayable storage and read-only reconciliation helpers rather than implementing those policies twice. Stable scope keys, subscription state and local lock all describe that same attempt; extracting them into independent hooks would risk separate lifetimes without another caller or responsibility.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- Reviewed storage key, scoped memo dependencies, query subscription and read-only reconcile/clear path. No React concurrent/DOM qualification inferred.

### 40. `apps/web/src/features/settings/useSettingsMutation.ts` — function `useSettingsMutation > <anonymous> #4`

Scanner: line59, 86 nonblank lines; fingerprint `2667e9b561afa523e783b9c68a945b6d9b022362b9b0fd96738eaf5ca73c4b6b`. Proposed disposition: retain-proposed.

This useMemo factory exposes one scoped API facade, preserving raw methods while wrapping only request for the Settings mutation contract. Its large size is the nested request sequence reviewed separately; the factory has no second lifecycle or policy. Keeping the facade and its explicit raw/cache/journal/scope dependencies together makes stale-scope behavior inspectable.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- Reviewed factory dependencies; no independent behavior added or hidden.

### 41. `apps/web/src/features/settings/useSettingsMutation.ts` — function `useSettingsMutation > <anonymous> > request`

Scanner: line61, 83 nonblank lines; fingerprint `ef3233c8ba701a8b0f63d21ffb6aeb9d6fbc9cb37c86e9824c44be2a3580cd36`. Proposed disposition: retain-proposed.

This callback sequences one captured Settings write: permit read-through, require signed-in scope, reject an occupied journal, clone input, persist metadata before dispatch, validate receipt/readback and clear only the matching attempt. Its dispatched/accepted flags keep definite pre-dispatch or definite API rejection separate from post-acceptance uncertainty. Snapshot, storage and receipt/readback policies are delegated; splitting this try/catch across helpers would obscure the ordering that prevents replay after an ambiguous write.

Supporting inspected test sources (not new run evidence):

- apps/web/src/features/settings/security-writes.test.ts
- apps/web/src/features/settings/security-action.test.ts

- Existing no-replay and readback-denial tests map to this order; source review does not expand recovery policy.

### 42. `apps/web/src/shared/capiro/operations/settings.ts` — file `<module>`

Scanner: line1, 551 nonblank lines; fingerprint `692c8cc4863eb59fbfeb7db9aa18518506f47481feb98f9de5d6eb22eb9135ae`. Proposed disposition: retain-proposed.

This is the existing declarative Settings gateway-operation catalog: fixed service/method/path, strict request schemas and response-shape validation, explicit limits and backend source attribution. Reusable wire schemas already live in settings-schemas and request execution in the gateway/http owners; the file contains no transport execution, provider implementation or authorization decisions. Keeping the catalog export together preserves a single typed registry owner and makes the branding name-only contract auditable without introducing a parallel registry.

Supporting inspected test sources (not new run evidence):

- apps/web/src/shared/capiro/operations/settings-contracts.test.ts
- apps/web/src/shared/capiro/operations/settings-admin.test.ts
- apps/web/src/shared/capiro/registry.test.ts
- apps/web/src/features/settings/security-writes.test.ts

- Shared operation source is reviewed read-only; only its A1 changed fingerprint is proposed, no further source change.

## Handoff

Dot reviews the new exact documentation head and proposed entries; Fable/coordinating owner registers accepted records and owns composed qualification. If a behavioral finding needs a change or a registry owner needs a lane handoff, retain the hold and route it explicitly. Frontend shipping still requires corrected A1 backend live. A2/Wave2 and acceptance STOP2/6 remain held.
