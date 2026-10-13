# Independent saved-document lifecycle review

**PASS, bounded static source/evidence review.** No new blocker was found in the reviewed feature. The ten owned file hashes match the author's final source bindings, and the seven supporting preserved/shared dependency bindings also match. The candidate is an uncommitted continuation of `7c87678730538958ace9762f824dc3e588bf445b`; this is not a commit, full application gate or native acceptance. `SOURCE-VERIFICATION.json` and `source/` bind the exact reviewed bytes.

Key sources: controller SHA256 `8f5097b4bb3296667ec7e0190e1ac90261f51990c50835df50b04f6e6bb73b67`; journal `d131eb1e7bdb44c5053be257d6b3e3c2e749b16f9d2312502069045eef109a57`; controller tests `4d9bbf10922565b27cfd1b07e4b07bc27130a6e464df6ef59d42a0bf766fe8e4`.

## Findings and lifetime reasoning

The journal is correctly owned by the existing canonical QueryClient. Its single feature key contains only attempt sequence/status and document/revision IDs. There are no draft bodies, recipient data, saved responses, review candidates or preview HTML in that cache. `skipToken`, no retries and infinite inactive lifetime preserve the fence across same-cache navigation without creating a query/refetch task. No localStorage, global journal or durable backend claim is introduced.

`run` installs its active controller before `journal.begin`; `begin` publishes a pending ticket synchronously before transport. Reentrant disposal is checked before dispatch. A same-cache replacement sees the prior pending/unknown creation, save or exact-revision stage attempt. It cannot repeat an unknown create or stage the same revision. The journal's own begin checks enforce this independently of UI disabled state.

Cleanup marks the owner unmounted before unsubscribing/settling/aborting, clears the active execution and resets every private projection. Both successful and failed settlement recheck the current mounted execution after synchronous journal notifications. Thus a listener-triggered disposal during settlement cannot reinsert a private stage receipt or error. Aborted or displaced asynchronous work cannot regain authority after remount because both the active controller identity and abort state are checked.

Canonical scope replacement remains unchanged: `ApplicationBoundary` keys the user/session/organization and selected client; `DataProvider` owns a QueryClient and clears it on disposal/expiry. The journal's `finish` first checks that its ticket still exists. A parent-first clear followed by child cleanup therefore does not recreate an empty journal. Child-first cleanup followed by clear also destroys the fence. These conclusions apply to the actual existing provider lifetime and the reviewed finite controls; they do not claim persistence across reloads, tabs or separate QueryClients.

Readback and causation remain distinct. A current detail response creates a review candidate. Explicit Adopt or Rebase may mark an unknown/conflicting **save** reviewed and resume deliberate CAS work; it does not say the old save committed. Unknown **creation** remains in the journal despite empty lists or adoption of a known document. Unknown **stage** remains fenced for case-insensitive document identity plus exact revision after readback/adoption; no missing stage ID is inferred from a document read. A later saved revision can support a new stage intent. Returned routes are displayed, never followed.

Submission and local content are protected. Only one operation dispatches at a time; controller edit/undo/redo refuse while active, and the UI's pending fieldsets are disabled/inert. Save captures the submitted draft. Confirmed save/adoption replaces editor state deliberately; conflict or uncertainty retains local edits. New scope/view owners start fresh local drafts while retaining only permitted same-cache attempt metadata. List data alone never becomes an actionable saved document, and current-read failure disables writes and removes review/preview eligibility.

The feature consumes six Workspace adapter methods; it does not call Core record/open/prepare/send, saved-version staging or provider owners. Mounting does not read the service. Invitation-affecting library/detail calls are explicit actions with visible copy. Saved HTML uses the existing sanitizer/image restriction/CSP/sandbox boundary and states that the response has no document/revision token. Browser sanitation/layout behavior was not rerun here.

## Evidence checked

The copied author packet has an exact verified manifest set in `AUTHOR-EVIDENCE-VERIFICATION.json`. Its final `journal-final-green.log` reports **37 passed / 0 failed / 0 skipped**, comprising 34 lifecycle controls and 3 unchanged draft controls. This reviewer inspected the tests and raw logs but did not execute them. The controls use the real adapter, intercepted fetch and actual QueryClient; they do not exercise real routes or React provider replacement in a browser.

Preserved failures are meaningful and consistent with the final fixes:

- `stage-identity-red.log`: equivalent uppercase UUID readback allowed an extra fifth request. Both the journal and lookup now compare document UUIDs without case sensitivity.
- `journal-disposal-red.log`: two targeted failures restored a stage receipt or error after settlement-triggered disposal. Final success/error paths recheck current execution after journal notification.
- `journal-scope-order-red.log`: clear-first cleanup recreated an old empty query; one control failed while the other order passed. Final retained-ticket admission prevents that recreation.

Earlier 25/28/34-case checkpoints and before-journal reports are retained, not represented as the final result. The three canonical provider/lifetime files and original draft/browser test files are independently byte-equal to the supplied baseline. Shared adapter hashes match the separately reviewed corrected boundary. No earlier tests were replaced to produce this feature packet.

## Structure and remaining qualification

All nine exact size signals received independent responsibility review in `STRUCTURE-REVIEW.json`: controller303, journal107, actions174, editor118, test module592 and four test groups93/113/82/159 nonblank lines. The controller remains one coupled document-view lifecycle; the journal separately owns navigation fences, the adapter owns request/receipt bindings, React owns mounting/subscription and preview owns sanitation/display. Keeping coupled state transitions together makes their interlocks reviewable. The test groups cover the same finite responsibilities with real local dependencies. This review does not edit or replace the root's architecture registry/scanner.

Still unrun by this reviewer: every test, browser/React integration, full type/lint/architecture gates, production build, server, native identity/grant checks, durable write/concurrency outcomes, invitation effects, provider delivery and broader rich UI/Figma/accessibility acceptance. Author focused passes do not close those gates. Fences are local conservative safeguards, not durable idempotency or backend authorization.

No source, shared registry, index, dependency or runtime process was modified. Evidence was written only to this new review directory; the author and previous review packets remain unchanged.
