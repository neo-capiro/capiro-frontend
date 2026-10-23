# Workspace and Planner entry checkpoint

This is a bounded MF19 source increment on the reviewed main integration `5acef36d4a5bf90b7b8e72cbbf9a851a7dafe49b`, not full M2 or SDK acceptance. Core data owners still authorize reads. No provider request, new endpoint, capability DTO, table, dependency or deployment flag is introduced.

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

The target IDs are UUIDs validated at the existing local descriptor boundary. `active` is a source control's presentation input, never a grant. A owns the small Portfolio source mounts; no A-owned feature, gateway, registry, shared library or manifest is edited here. Workspace and Planner module mounts still need root allocation. Mail connection identity is not inferred from an address.

Opening creates or reuses the existing unsent bootstrap request, then navigates with only the client ID and opaque local entry ID in the URL. The local record stores the exact object ID, no title/body/prompt/credential. Repeated clicks reuse the same entry. Replacing a reference retires its old Back link while preserving an unresolved Core request. Confirmed client/General changes retire the reference; transient client loading does not. Account/session retirement uses the existing tab owner. Rejection removes only the matching entry and cannot erase a newer reference.

## Receiving behavior

`MeriEntryContext` is mounted before the existing conversation connection. The existing `workspace.draft` or `planner.task` operation resolves a source with current account access before displaying its title. The receiver checks exact object/client identity; Workspace also refuses a mismatched supplied tenant, a prospect or held association, and missing canonical client identity. Planner refuses archived tasks. Display names never repair missing identity. Pending/repeated reads hide old content. Denied, missing, expired and conflicting reads retire the local reference. Canonical query cancellation and keyed account/client/entry lifetime prevent late responses from republishing retired content.

The source link returns to the existing exact draft/task route. Entity chat submission is visibly unavailable until the SDK control owner accepts the plain context. No conversation bootstrap or submit is issued for these entities, even though ordinary client-only entries retain their existing bootstrap flow. A second check in Core resolution refuses silently losing an entity context. The entity's five-minute local expiry does not interrupt an already opened client-only chat.

## Design and checks

Figma design-to-code and implement-motion skills were read. Fresh file `IXJzJUkXcUTkySHir5JNea` nodes `3034:37943` and `3034:38160` establish the existing status-card vocabulary. The only returned motion belongs to the palette dialog, not this card; no invented animation was added. The receiving view reuses the existing Meri Notice/row/outline primitives and shared Button. Its synthetic screenshot is inspected, including explicit 36px controls; this is component qualification, not full product visual acceptance.

Validation uses the real ApplicationBoundary, identity/client owners, MeriHome, shared navigation hook, receiver and typed Capiro request owner. Only the Clerk fixture and HTTP results are synthetic. The browser allowlist admits exact identity, client roster/detail and the two source reads; any other API or remote request fails. It covers fresh title reads, reload, keyboard source return, denied recheck/retirement, object/client/tenant mismatch, missing client, held/prospect association, archived task, transient client loading, confirmed scope changes and late actor/tenant responses. No automatic writes are allowed.

The first 13-case browser run failed because the fixture omitted the existing Meri client-selector roster GET; behavior assertions had passed. The exact roster read was added without broadening the allowlist. Original results are retained in local `work/mf19-checkpoint`. A deliberate removal of the Workspace client-match guard must fail the wrong-client case; exact bytes are restored afterward.

Full Linux/build/service-backed acceptance and independent exact-head review remain root gates. Remaining M2 requirements are tracked in `STATUS.md` and `SDK-MIGRATION.md`; this checkpoint does not narrow them.

Final local source checks on Windows Node24.22.1/npm11.19.1:

- Web TypeScript, touched-source ESLint and Prettier pass; `git diff --check` passes.
- `npm run test --workspace @capiro/web -- tests/meri-entry.test.ts tests/meri-m2-owned-contracts.test.ts tests/meri-skill-draft.test.ts`: 85/85 pass.
- `npm run test:browser --workspace @capiro/web -- tests/browser/meri-entry.spec.ts tests/browser/meri-m2.spec.ts`: 20/20 pass, no skips (14 receiver and six existing M2 cases), 56.3 seconds. Explicit expiry and 36px control geometry are included.
- Architecture exits0: zero errors, zero blocking findings, 533 reviewed and 18 unchanged inherited size signals; no new entry/host size finding or waiver. An intermediate wrapper made the host exceed400 lines; entry routing was kept inside the receiving component, with the same tested behavior.
- Removing `draft.clientId !== scope.clientId` causes the wrong-client browser case to fail at its required unavailable-state assertion. Exact source bytes are restored; the final20-case run passes afterward.

Raw synthetic results, mutation log and the inspected PNG are retained outside the repository in the root task's `work/wave2-current/u/mf19-20261023-1710` evidence directory. Native toolchain11.9.0/Linux qualification remains separate; no build or live acceptance is claimed from this local npm version.
