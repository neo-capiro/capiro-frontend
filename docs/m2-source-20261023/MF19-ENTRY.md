# Workspace and Planner entry checkpoint

This is a bounded MF19 source increment, not full M2 or SDK acceptance. The module-mount increment follows client-wire checkpoint `b6e12a96ceb27c9f6db679bf905fe80000505130`, which includes reviewed main `75458af705e352c54bf23ed3b5c61de7e781d714`. Core data owners still authorize reads. No provider request, new endpoint, capability DTO, table, dependency or deployment flag is introduced.

## Public source mount

`shared/meri-entry/public.ts` exports:

```ts
useEntityEntry(
  clientId: string,
  target:
    | { source: "workspace-draft"; draftId: string }
    | { source: "planner-task"; taskId: string },
  active: boolean,
): { ready: boolean; reason: string; open(): void }
```

The target IDs are UUIDs validated at the existing local descriptor boundary. `active` is a source control's presentation input, never a grant. A owns the small Portfolio source mounts; no A-owned feature, gateway, registry, shared library or manifest is edited here. The allocated Planner task detail, Workspace draft and saved newsletter now mount this helper. Mail connection identity is not inferred from an address.

Opening creates or reuses the existing unsent bootstrap request, then navigates with only the client ID and opaque local entry ID in the URL. The local record stores the exact object ID, no title/body/prompt/credential. Repeated clicks reuse the same entry. Replacing a reference retires its old Back link while preserving an unresolved Core request. Confirmed client/General changes retire the reference; transient client loading does not. Account/session retirement uses the existing tab owner. Rejection removes only the matching entry and cannot erase a newer reference.

## Receiving behavior

`MeriEntryContext` is mounted before the existing conversation connection. The existing `workspace.draft` or `planner.task` operation resolves a source with current account access before displaying its title. The receiver checks exact object/client identity; Workspace also refuses a mismatched supplied tenant, a prospect or held association, and missing canonical client identity. Planner refuses archived tasks. Display names never repair missing identity. Pending/repeated reads hide old content. Denied, missing, expired and conflicting reads retire the local reference. Canonical query cancellation and keyed account/client/entry lifetime prevent late responses from republishing retired content.

The source link returns to the existing exact draft/task route. Entity chat submission is visibly unavailable until the SDK control owner accepts the plain context. No conversation bootstrap or submit is issued for these entities, even though ordinary client-only entries retain their existing bootstrap flow. A second check in Core resolution refuses silently losing an entity context. The entity's five-minute local expiry does not interrupt an already opened client-only chat.

## Design and checks

Figma design-to-code and implement-motion skills were read. Fresh file `IXJzJUkXcUTkySHir5JNea` nodes `3034:37943` and `3034:38160` establish the existing status-card vocabulary. The only returned motion belongs to the palette dialog, not this card; no invented animation was added. The receiving view reuses the existing Meri Notice/row/outline primitives and shared Button. Its synthetic screenshot is inspected, including explicit 36px controls; this is component qualification, not full product visual acceptance.

Validation uses the real ApplicationBoundary, identity/client owners, MeriHome, shared navigation hook, receiver and typed Capiro request owner. Only the Clerk fixture and HTTP results are synthetic. The browser allowlist admits exact identity, client roster/detail and the two source reads; any other API or remote request fails. It covers fresh title reads, reload, keyboard source return, denied recheck/retirement, object/client/tenant mismatch, missing client, held/prospect association, archived task, transient client loading, confirmed scope changes and late actor/tenant responses. No automatic writes are allowed.

The first 13-case browser run failed because the fixture omitted the existing Meri client-selector roster GET; behavior assertions had passed. The exact roster read was added without broadening the allowlist. Original results are retained in local `work/mf19-checkpoint`. A deliberate removal of the Workspace client-match guard must fail the wrong-client case; exact bytes are restored afterward.

Full Linux/build/service-backed acceptance and independent exact-head review remain root gates. Remaining M2 requirements are tracked in `STATUS.md` and `SDK-MIGRATION.md`; this checkpoint does not narrow them.

Earlier receiver-only local checks on Windows Node24.22.1/npm11.19.1:

- Web TypeScript, touched-source ESLint and Prettier pass; `git diff --check` passes.
- `npm run test --workspace @capiro/web -- tests/meri-entry.test.ts tests/meri-m2-owned-contracts.test.ts tests/meri-skill-draft.test.ts`: 85/85 pass.
- `npm run test:browser --workspace @capiro/web -- tests/browser/meri-entry.spec.ts tests/browser/meri-m2.spec.ts`: 20/20 pass, no skips (14 receiver and six existing M2 cases), 56.3 seconds. Explicit expiry and 36px control geometry are included.
- Architecture exits0: zero errors, zero blocking findings, 533 reviewed and 18 unchanged inherited size signals; no new entry/host size finding or waiver. An intermediate wrapper made the host exceed400 lines; entry routing was kept inside the receiving component, with the same tested behavior.
- Removing `draft.clientId !== scope.clientId` causes the wrong-client browser case to fail at its required unavailable-state assertion. Exact source bytes are restored; the final20-case run passes afterward.

Raw synthetic results, mutation log and the inspected PNG are retained outside the repository in the root task's `work/wave2-current/u/mf19-20261023-1710` evidence directory. Native toolchain11.9.0/Linux qualification remains separate; no build or live acceptance is claimed from this local npm version.

## Module source controls

Planner uses the saved task ID and canonical client association. Its existing editor exposes whether its fields or project/section membership differ from the saved task. Unsaved task/comment edits, child editing dialogs, pending mutations, archived/unassigned tasks and mutation errors disable Ask Meri. The existing attachment owner reports its own pending/error state through one optional callback; upload, archive, download and their `finally` paths keep that state in the same owner. Layout-effect cleanup clears the parent observation on unmount, and an old account's late response cannot update a replacement component. No second request counter or upload implementation was added.

Workspace draft uses the saved draft ID/client and refuses prospects, held/missing client associations, unsaved content/title changes, pending saves and errors. Newsletter uses its saved draft identity, never its editable client selector; unsaved or pending changes remain held. A cached newsletter cannot bypass its parent detail query's loading/error state. These controls only open an unsent context; the receiver still re-reads the exact entity, and SDK submission remains unavailable.

Fresh module Figma context came from file `Zc2dEN5aLU47dVdsewDmiJ`, Planner footer `411:100778` within task detail `411:100627`, and newsletter builder `976:190222` including action row `976:190919` and button `976:190923`. The mounts reuse existing text buttons/action rows with no new asset, CSS, motion or library. Desktop and 390px phone task screenshots plus Workspace/newsletter screenshots were inspected for visible controls, wrapping and clipping.

Module checkpoint checks:

- Final combined browser run: **34/34 pass**, no skips, 1.9 minutes. It includes all14 earlier receiver cases,14 source/attachment/network controls and six existing M2 palette/client/skill/mock-model/management cases. Requests use the actual public operation methods, including PATCH for task/draft updates; only explicitly held synthetic writes are allowed. An unregistered read is deliberately requested and proven to fail.
- New controls cover keyboard navigation on desktop/phone, saved IDs and a fresh receiver title, dirty/restored drafts, pending/unknown save, archived/missing/held sources, newsletter edits and denied receiving read, attachment success/unknown/archive, and late account retirement. No automatic bootstrap or submit is admitted.
- Removing the task dirty guard makes the required disabled-state assertion fail. Exact source bytes were restored before the final passing suite. The first source run's two failures were fixture POST assumptions for existing PATCH writes; that failure is retained as fixture evidence, not a product fix.
- Touched-source ESLint/Prettier and web TypeScript pass; no dependency/lockfile changes. Architecture reports zero dependency errors and **seven pending size reviews**: TaskAttachments, TaskDetail module/session, useTaskEditor, DraftEditor and NewsletterWorkflow module/function. These are existing owners; no size waiver or cosmetic extraction was added. Independent cohesion review and exact-head Linux/build acceptance remain pending.

Evidence is outside the repository under `work/wave2-current/u/mf19-module-20261023`: final browser log, dirty-guard mutation log, architecture fingerprints and inspected synthetic PNGs. This does not qualify live authorization, SDK context delivery, or full MF19 completion roundtrip.

## Repair after independent review of aeb30ec8

The independent review of `aeb30ec817fd69b659f45627173ad9157f656db6` reproduced two P2 findings with three additional browser controls: newsletter comment drafts/pending/unknown writes did not fence Ask Meri, and a successful attachment download cleared an unrelated uncertain upload fence. The original 34 authored cases passed, so their results alone did not cover these sequences. The original failing controls, screenshots and report remain under root evidence `work/wave2-current/u/review-mf19`; they were not rewritten for the repair. A authored this repair after completing the independent review, so a different reviewer must assess the repaired head.

`NewsletterComments.tsx` remains the single comment owner. Its same-file `useNewsletterComments` hook is composed once by the workflow, retaining the comment draft and existing create/resolve mutation state across builder/review step changes. The existing typed query reads comments only in the review step. The workflow observes dirty, pending and failed-write state in its existing entry guard. A successful delivered write clears only unchanged submitted text; failed writes retain their indication even if the text is cleared or the workflow changes steps. The existing account/source component lifetime retires this state. No transport, persistence, automatic replay or general navigation layer was added.

`TaskAttachments` retains upload/archive write failures separately from its transient download error. The existing observation callback and inline error use that retained write failure, so a successful download cannot establish a write outcome or release the handoff fence. Existing component retirement still prevents a late old-account result from affecting the replacement task. This is a view-lifetime fence, not durable reconciliation or proof that a lost write was rejected.

The added closed-network cases cover comment text across step changes, pending then delivered success, pending then unknown result across steps, pending/unknown resolve, late account retirement, and unknown upload followed by a successful download. The fixture admits only the exact existing comment and binary-download operations needed for those cases; write counts and unexpected traffic remain assertions.

The final combined browser run passes **40/40**, no skips: all34 original cases and all six added cases. The unchanged reviewer controls pass separately3/3. Both runs use the real source owners and typed transport with synthetic loopback responses. Their servers exited and port5191 was released.

Repair checks and current architecture fingerprints are recorded in the root repair handoff. The original three controls now pass unchanged (3/3, no skips). Focused source tests pass85/85; web TypeScript, touched ESLint/Prettier and diff checks pass. Architecture still exits1: zero dependency errors,551 signals,525 reviewed,18 inherited and **eight blocking size-review findings**. The comment presentation's changed101-line fingerprint adds one review obligation to the original seven. Its state hook and presentation stay together in the existing domain module; splitting the presentation merely to cross a numeric threshold would not resolve another responsibility. No architecture waiver or passing-gate claim was added. Independent exact-head review, production/Linux/service gates, SDK context delivery and full MF19/M2 acceptance remain outstanding.
