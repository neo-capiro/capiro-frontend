# A1 PR118 exact-source size-review proposal

**Status: proposal only; architecture gate remains held.**

Source head `c968392dd47a1bfee303a9e1e66fd742a63dc7d1`, base `87a8495138f0af5303bc93397438238c6cc5081b`. The subsequent commit adds only this evidence packet; runtime/test source fingerprints stay identical.

This packet covers **8** exact findings (7 replacements, 1 new keys) in the Fable50-finding list. Each was read with its caller/helper/contract context. Current responsibilities are cohesive; arbitrary JSX/function extraction would not remove a distinct owner, so the proposal retains each exact source fingerprint with a concrete rationale. This is not path-wide permission or behavioral/security acceptance.

## Ownership and application

Formal shared registration remains with the coordinating owner. Existing A1 evidence (`docs/a1-settings/VERIFICATION.md` and `docs/a1-workspace/review-r1/frontend-review.md`) explicitly leaves shared-manifest registration outstanding. The current user instruction requires a proposed-entry handoff rather than cross-lane edits. Neither shared registry, baseline, threshold nor architecture evaluator was changed.

`PROPOSED-REVIEWED-SIZE-FINDINGS.json` uses the existing record shape. `MANIFEST.json` supplies each source SHA-256, scanner fingerprint, prior registry record, exact reviewer notes and supporting test references. The owner must review and upsert by `(file, kind, symbol)`; append-only application would duplicate changed keys. Recheck fingerprints if either PR source moves.

No proposal file is imported by architecture or runtime code. The actual command remains blocking until the owner registers accepted records. Any in-memory completeness check is proposal validation only, never an executable gate PASS.

## Verification and limits

`npm run architecture`: **exit 1**, errors `[]`, 8 blocking findings on this standalone PR. Read-only composition exactly reproduces Fable: total551 / reviewed483 / inherited-unreviewed18 / blocking50, errors[].

Only documentation/proposal files change in this revision; no runtime or test source is touched, so prior test receipts remain attributed to their original heads and were not rerun as new evidence. No central production gate, browser/provider/native test, model turn, merge/deploy or live SQL was performed. Existing sparse-checkout evidence documents were restored byte-exact for the canonical classification; no registry change is hidden in setup.

The earlier `security-form.test.tsx` startup failure (undeclared/unlocked jsdom, zero cases executed), canonical nonzero architecture exits, earlier compiler/build environment limits and Fable run `capiro-portfolio-preview-build:3961445f` FAIL remain preserved. No later gate in that failed run is treated as executed.

## Separate source observations

See `SOURCE-OBSERVATIONS.json`. These are source-derived concerns or evidence gaps, not executed reproductions. They remain for dot/Fable disposition; cohesion retention does not resolve them. No email/recovery/reservation change is authorized or made. The reconciliation cancellation issue is inherited; it is not attributed to this size packet or newly to A1.

## Per-finding review

### 1. `apps/web/src/features/portfolio/calendar/MeetingArtifacts.tsx` — file `<module>`

Scanner: line1, 403 nonblank lines; fingerprint `9ad57744c6b3a293ca149235200b2be9636879b56a6dd21514a95bdb2da27815`. Proposed disposition: retain.

Retain this module as the presentation owner for one meeting's notes/debrief interaction. Its exported wrapper establishes the actor/tenant/meeting/client/kind React lifetime, and its private editor owns only the admitted list, local draft and selected dialogs. The existing artifacts/api, artifacts/contracts and useArtifactMutation modules own request/receipt semantics and attempt state; debrief/public and documents/public own generation and document preview. Notes and debriefs use the same interaction contract, so duplicating their editors or moving arbitrary JSX to meet 400 lines would add another owner without isolating a distinct domain. The capability-admission observation below needs a bounded correction in the existing owner, not a general component split.

Supporting inspected test sources (not new run evidence):

- Source inspected, not executed: apps/web/tests/acceptance-meeting-artifacts-query.test.ts covers native list parsing, parent mismatches, duplicates and empty versus malformed data.
- Source inspected, not executed: apps/web/tests/acceptance-meeting-artifacts-admission.test.ts covers list loss during parent preflight and valid receipts after dispatch.
- Source inspected, not executed: apps/web/tests/browser/acceptance-meeting-artifacts-dialogs.spec.ts and acceptance-meeting-artifacts-reads.spec.ts cover draft retention, stale list concealment and share confirmation visibility.

- Read-only review of HEAD 267ea934550076116c00a1506d1f7b6cd4c50e36. Raw whole-file SHA-256: 9f5ec3589a567279cd853e834ecad15f71b763a6b87a63c2adebe07de00c8b09. Root supplies the scanner fingerprint separately.
- Ownership evidence: lines 16-43 are the identity-keyed wrapper; 55-139 own local read admission/selection; 170-176 and 295-300 compose existing public generation/preview interfaces. No persistence or provider implementation is embedded.
- Source-only behavior observation PF-CAP-1: lines 71-90, 117-127 and 312-399 do not recheck explicit current edit/share capability refusals for an already-open editor/share dialog. Row buttons at 222, 240, 254 and 278 do honor those flags. A successful refresh that changes only capabilities can therefore leave a dialog action enabled and dispatchable. Backend authority remains separate; this is not an authorization-bypass claim. Dot/Fable owns disposition.
- Retain is a cohesion disposition only. It is not code, security, browser, policy or deployment ACCEPT. No tests, gates, source edits or registry edits were performed in this review.

### 2. `apps/web/src/features/portfolio/calendar/MeetingArtifacts.tsx` — function `ArtifactEditor`

Scanner: line44, 350 nonblank lines; fingerprint `95d33d77069d4af55ddc2851fb5a3082500e045a1f7b1562c6453627038c23d5`. Proposed disposition: retain.

Retain the editor as one interaction coordinator: all three local selections (editing, sharing and preview) refer to the same actor-scoped list and are concealed by the same current-read boundary. Keeping the attempt hook above the conditional dialogs preserves pending/uncertain intent when a read hides a dialog. The function delegates dispatch/receipt processing to useArtifactMutation and changeMeetingArtifact and does not own model generation or PDF generation. A separate generic controller or separate save/share state owners would obscure this shared lifetime. The existing admission predicate is the appropriate single place to address PF-CAP-1; extracting it merely to shorten the editor would not fix the inconsistency.

Supporting inspected test sources (not new run evidence):

- Source inspected, not executed: apps/web/tests/browser/acceptance-meeting-artifacts-dialogs.spec.ts covers editor and share-dialog concealment/restoration after failed reads.
- Source inspected, not executed: apps/web/tests/browser/acceptance-meeting-artifacts-delivery.spec.ts exercises same-turn stale form submission.
- Source inspected, not executed: apps/web/tests/browser/acceptance-meeting-artifacts-preflight.spec.ts verifies the held parent preflight cannot dispatch after list refusal.

- Reviewed function begins at line 44 of HEAD 267ea934550076116c00a1506d1f7b6cd4c50e36; containing file raw SHA-256: 9f5ec3589a567279cd853e834ecad15f71b763a6b87a63c2adebe07de00c8b09.
- Dependencies inspected: queries.ts, contracts.ts, artifacts/api.ts, artifacts/useArtifactMutation.ts, access/useDispatchGuard.ts and public generation/preview entry points. The mutation adapter calls assertReadable immediately after the awaited parent read and before dispatch, so admission remains the editor's responsibility.
- PF-CAP-1: assertReadable at 71-90 rejects unavailable/restricted rows and ineligible share state but never consults selected.capabilities. editingCurrent at 117-120 and sharingCurrent at 121-127 likewise omit capability refusal. The save/share buttons at 370 and 387-399 depend only on blocked. Inspected tests cover unavailable lists, not a still-readable row whose explicit capability changes to false. Source-only observation; no reproduction was run.
- Cohesive size rationale does not approve the behavioral observation or qualify browser/security behavior.

### 3. `apps/web/src/features/portfolio/calendar/MeetingArtifacts.tsx` — function `ArtifactEditor > <anonymous> #8`

Scanner: line183, 111 nonblank lines; fingerprint `0cf6c07d1d43e02e78ef7d20afa3af2c4b93b004e0663ab1843d97d1c157ae7e`. Proposed disposition: retain.

Retain the rows.map callback as one saved-artifact card projection. It renders that row's status, known/unknown sharing caption, restricted-content treatment and command entry points; every branch addresses the same row. Commands delegate to the enclosing editor's single mutation/selection lifetime, while export delegates to the existing preview owner. Extracting a stateful card would risk per-row attempts or dialogs, and extracting a stateless card would pass the same admission and selection callbacks through without separating responsibility. A later reusable card is reasonable only if an actual second presentation needs it. The current-capability observation belongs to shared action admission, not a new per-card authority layer.

Supporting inspected test sources (not new run evidence):

- Source inspected, not executed: apps/web/tests/browser/acceptance-meeting-artifacts-reads.spec.ts covers hidden bodies/actions after refusal, replacement reads and restricted provenance.
- Source inspected, not executed: apps/web/tests/browser/acceptance-meeting-artifacts-dialogs.spec.ts covers debrief preview concealment and reopening from the current saved row.
- Source inspected, not executed: apps/web/tests/a1-portfolio.test.ts PF-12 checks preservation of sharingKnown/approvalKnown and capability false in the receiving schema; it does not exercise card event admission.

- The nominated callback is rows.map at lines 183-293; its enclosing source raw SHA-256 is 9f5ec3589a567279cd853e834ecad15f71b763a6b87a63c2adebe07de00c8b09 at HEAD 267ea934550076116c00a1506d1f7b6cd4c50e36.
- PF-CAP-1 also affects current-row event checks: Edit at 223-233 and Share at 258-270 re-read existence/restriction but do not inspect the newly read capability. Approve/unshare delegate to the same assertReadable predicate. Render-time disabled/conditional controls are not equivalent to current command admission. No browser or synthetic event was executed.
- Retain is limited to this callback's cohesion; behavior remains subject to Dot/Fable disposition and actual qualification.

### 4. `apps/web/src/features/portfolio/calendar/MeetingForm.tsx` — function `MeetingForm`

Scanner: line12, 202 nonblank lines; fingerprint `7d85f252ca237ac0d0234f1923c412f6c4173471c6f922e72e9af7f145c1e660`. Proposed disposition: retain.

Retain this one meeting-draft form. Subject, time, description, location and selected client are submitted together and share the pending/uncertain lock, local validation and close behavior. The form converts civil input using the existing range owner and delegates assignment intent to meetingAssignmentFields and dispatch to useSaveMeeting. Client availability and current-read feedback determine whether this same draft can be submitted; they are not a separate client-management workflow. The existing keyed callers reset the draft when the editor opens/closes. Splitting individual fields or validation JSX would disperse one submission contract without removing business or transport logic, which already lives outside the form.

Supporting inspected test sources (not new run evidence):

- Source inspected, not executed: apps/web/tests/a1-portfolio.test.ts PF-11 covers unchanged association omission, explicit reassignment/clear and required revision.
- Source inspected, not executed: apps/web/tests/browser/calendar-meeting-recovery.spec.ts covers draft retention during failed detail refresh, same-turn stale submission and cancel/reopen.
- Source inspected, not executed: apps/web/tests/browser/calendar-meeting-receipts.spec.ts and calendar-client-clear.spec.ts express receipt and clear/create scenarios, but their harness is stale as noted below.

- HEAD 267ea934550076116c00a1506d1f7b6cd4c50e36; raw whole-file SHA-256: 2e4eb917e246a044c3d196b622a5b7af3ff78e2981c4198e9e4c9c8f844f563d. Full nominated source and meeting-save.ts/range.ts inspected; callers inspected at MeetingDetail.tsx 222-231 and CalendarPagePanels.tsx 137-148.
- Evidence gap PF-FIXTURE-1: apps/web/tests/browser/calendar-meeting-receipts-harness.tsx line 38 seeds [meeting,id], whereas mutations.ts line 48 reads [meeting,id,readClientId ?? null]. Its meeting fixture at lines 11-26 also omits updatedAt, so clearing an existing association is refused by meetingAssignmentFields before dispatch. These old browser sources cannot be cited as current successful qualification without repair/rerun.
- No test or gate was executed; retain concerns cohesion only. Dot/Fable retains behavioral/evidence disposition.

### 5. `apps/web/src/features/portfolio/calendar/mutations.ts` — function `useSaveMeeting`

Scanner: line15, 95 nonblank lines; fingerprint `0c9a51edb153a5e660c7309507ca0c567aa24ef22f002390dc4a9c94d2927d88`. Proposed disposition: retain.

Retain the hook as the save-sequence owner for one meeting create/update. Synchronous single-flight reservation, captured lifetime, exact current-read admission, native request/receipt validation, uncertain outcome retention and successful invalidation are phases of the same save attempt. The original association and readClientId intentionally remain distinct from the selected destination clientId; combining those would break reassignment admission. Identity policy is delegated to useDispatchGuard and DTO/receipt semantics to meeting-save.ts. Extracting the try/catch or cache completion into generic helpers would hide the before/after-dispatch boundary without creating an independently meaningful service.

Supporting inspected test sources (not new run evidence):

- Source inspected, not executed: apps/web/tests/browser/calendar-meeting-recovery.spec.ts checks current-read refusal before React rerenders and retained draft behavior.
- Source inspected, not executed: apps/web/tests/browser/calendar-meeting-receipts.spec.ts expresses wrong receipt, normalized receipt and pending-field lock scenarios; current harness mismatch prevents relying on it as passing evidence.
- Source inspected, not executed: apps/web/tests/a1-portfolio.test.ts checks assignment intent/revision serialization at the delegated meeting-save boundary.

- HEAD 267ea934550076116c00a1506d1f7b6cd4c50e36; raw whole-file SHA-256: 82a99949f6580ebb68706d24c617314fcf0f089379fb240a1a06d917d4d00afe.
- Exact owner boundaries: lines 33-37 capture/abort the editor lifetime; 44-64 admit the current cached source; 65-93 distinguish known refusal from uncertain delivery; 95-103 invalidate after success; 108-112 synchronously reserve before mutate. useDispatchGuard and meetingSaveReceiptSchema were inspected rather than assumed.
- PF-FIXTURE-1: current read-key shape at line 48 differs from the old receipt harness line 38; explicit clear additionally needs the reviewed updatedAt revision absent from that fixture. Source review only, not a gate result.
- No automatic broadening of this review to auth/session internals or new lifecycle behavior. Retain is not browser/security ACCEPT.

### 6. `apps/web/src/features/portfolio/client-profile/ActivityActions.tsx` — function `ActivityActions`

Scanner: line13, 119 nonblank lines; fingerprint `ef4491c12aeba7cb881f92ec3dabab93d0edb41322fd51e15d19c2208f2db35f`. Proposed disposition: retain.

Retain this per-record action coordinator. The menu, settle/reopen control, pin feedback and edit/remove dialog selection all act on the same recorded activity and share useChangeActivity state. The local refs have one UI purpose: transfer focus from a closing Radix menu to a dialog or return it after a pin/removal interaction. Editing fields, removal confirmation and status rendering are already delegated to ActivityDialogs; current-record preflight, command semantics, receipt admission and uncertainty are already delegated to activity-mutations/activity-change. Further splitting the menu or focus handlers would add callback plumbing around a single interaction rather than isolate a new reason to change.

Supporting inspected test sources (not new run evidence):

- Source inspected, not executed: apps/web/tests/browser/activity-actions.spec.ts covers recorded versus derived controls, keyboard focus transfer/return, failed edits/removals, settlement/reopen and duplicate-write prevention.
- Source inspected, not executed: apps/web/tests/a1-portfolio.test.ts PF-22 covers undated recorded commitment/request completion and refusal of note/email before dispatch.
- The browser settlement test still has the older title 'settlement requires a due date'; its actual fixture compares a dated request with an undated note, so it does not establish the new undated-obligation UI case.

- HEAD 267ea934550076116c00a1506d1f7b6cd4c50e36; raw whole-file SHA-256: 71e531a49500e644ecca4b3e08859075a993541b329288e73d184a772f380e1b. Full ActivityActions, ActivityDialogs, activity-mutations and activity-change sources inspected.
- Lines 22-41 own dialog/focus state, line 42 excludes derived rows, lines 50-64 present kind-based completion, and lines 113-136 compose existing status/dialog owners. There is no transport or persistence in this component.
- PF-22 kind-based completion without a due date was directly approved by Neo in the supplied transcript. This review preserves that existing decision and adds no new policy authority. No tests or gates were run.

### 7. `apps/web/src/features/portfolio/relationships/email/send.ts` — function `sendReviewedMail`

Scanner: line36, 122 nonblank lines; fingerprint `d0c3f05b87e0e6859c7405de82c2e800073f902a8f121a78fb18b47e32a858a7`. Proposed disposition: retain.

Retain this bounded single-send adapter. Parsing the reviewed DTO, re-reading the exact sender, confirming the reply thread and attachment readiness, dispatching once, validating the exact request receipt and classifying delivery uncertainty form one ordered send sequence. The split between preflight refusal and post-dispatch uncertainty is essential to whether the caller may release its attempt. Mailbox projection, attachment receiving and recipient normalization are already separate semantic owners. Keeping the final actor assertion adjacent to dispatch makes the no-intervening-await property reviewable. It does not select a provider, store durable intent, manage React state, compose mail, rewrite content or retry delivery, so another workflow/service extraction is not warranted by its line count.

Supporting inspected test sources (not new run evidence):

- Source inspected, not executed: apps/web/tests/email-compose.test.ts exercises zero POST on failed preflight, exact recipients/attachments, changed actors, malformed receipts, HTTP uncertainty and exact durable rejection keys.
- Source inspected, not executed: apps/web/tests/mailbox-selection.test.ts covers exact mailbox B, omitted local review metadata, stale/absent sender refusal, mismatched sender/signature receipt and wrong-mailbox replies.

- HEAD 267ea934550076116c00a1506d1f7b6cd4c50e36; raw whole-file SHA-256: 63350812554bc548a463f4843a09e9ffb7fabaa36bd263760d93ec6a17bf771d.
- Full send.ts and direct recipients.ts, attachments.ts, mailboxes.ts dependencies inspected. Preflight uses the supplied authority assertion; it is not an alternative server authorization or provider implementation. Durable reservation/recovery remains in send-attempt/useSendMail.
- This is source cohesion review only. No mail was sent, no test/gate was run, no A2 or email behavior was changed, and no live/native delivery guarantee is inferred.

### 8. `apps/web/src/features/portfolio/relationships/email.ts` — function `useSendMail`

Scanner: line121, 89 nonblank lines; fingerprint `801093b94ef55df07e70a63784f63ff81f697be1249aeb12dbf7e0a75502f7f7`. Proposed disposition: retain.

Retain this hook as the React lifecycle owner of one actor/client/entity mail attempt. The write path and read-only recovery path use the same reserved request identity and must reconcile into the same caller-visible status. Transport/preflight and delivery classification belong to sendReviewedMail, cross-tab reservation/storage/settlement belong to send-attempt, and authority capture belongs to useMailAuthority; the hook only composes those owners with query invalidation. Separating recovery into an independently stateful sender would risk two owners for the same attempt. The recovery projection observation below should be resolved within this lifecycle interface if authorized, rather than extracting files to satisfy 80 lines.

Supporting inspected test sources (not new run evidence):

- Source inspected, not executed: apps/web/tests/mail-intent-recovery.test.ts covers two-tab reservation, retained identity without content storage, delayed token protection, storage refusal, failed recovery release and held unknown/incomplete acceptance.
- Source inspected, not executed: apps/web/tests/browser/acceptance-contact-mail-write-lifetime.spec.ts covers pending/uncertain send across history loss and same-contact reopen, not accepted recovery after an earlier uncertain mutation error.
- No direct hook/UI accepted-recovery projection test was found among the inspected recovery and contact-mail test sources. No test was added or executed.

- HEAD 267ea934550076116c00a1506d1f7b6cd4c50e36; raw whole-file SHA-256: 06fc7f3c9fdf58b7f4663ad1109c06ced785ff247d82721a12931d70e47bd942. Full email.ts, email/send-attempt.ts, email/authority.ts and caller MailCompose.tsx inspected.
- Source-only behavior observation MAIL-RECOVERY-1: accepted recovery at email.ts lines 172-175 only invalidates queries after recoverMailAttempt clears the reservation. The returned object at 204-208 still exposes mutation.isSuccess/data and falls back to mutation.error. If an earlier POST already set MailSendError(uncertain=true), later accepted recovery leaves that old error visible. MailCompose.tsx lines 86-87 derive its locked state from that error and line 105 uses send.isSuccess, so this path has no accepted-success projection. This is a source-derived concern, not an executed reproduction.
- No behavior change is authorized by this review. Dot/Fable must disposition MAIL-RECOVERY-1 separately. Retaining the cohesive hook does not imply code/security/browser acceptance or native email qualification.

## Handoff

Dot reviews the new exact documentation head and proposed entries; Fable/coordinating owner registers accepted records and owns composed qualification. If a behavioral finding needs a change or a registry owner needs a lane handoff, retain the hold and route it explicitly. Frontend shipping still requires corrected A1 backend live. A2/Wave2 and acceptance STOP2/6 remain held.
