# Ordinary draft atomic-save candidate — 2026-10-25

## PR171 review corrections — 2026-10-26

This correction addresses the three PROCESS6.2 CHANGES in Hermes's `W3-UI-PR171-REVIEW.md`, reviewed against original head `7043a3ad2746bb681506e053f4f083a2c96daa7d` / tree `5e45efe824c307a9306c526498001bc0916cd2e4`. That original commit and its evidence remain preserved. The correction is on the same branch and draft PR171, still stacked on exact FE159. Independent review of the correction remains pending.

- The ordinary hook remembers the mounted request even when the shared hydration owner hides a blocked snapshot. An absent/different record cannot release a known request during current-state read, resolution, or repeated recovery retry. No new persistence or shared journal changes were made.
- A reservation collision retains this tab's unsent title/body and original baseline separately from the other tab's immutable request. Recovery displays those local edits frozen and offers no replay of the other tab's request. If that request is no longer pending, the existing `readRecoveryDisposition` must supply its exact acknowledged or ordinary-CAS-refused marker before current-state review is available. Save remains disabled until deliberate adopt/rebase. A still-retained bound receipt likewise cannot automatically mark the independent editor saved or advance its baseline.
- The no-supported-sections read-only display now maps `currentDraft.documents`, so adopting current state changes the displayed document name/body together with its title. Unsupported content remains inert and omitted from save requests.

The synthetic browser fixture can install one shared producer-shaped state/receipt store into two pages in the same browser context. Its routes and receipt semantics are unchanged. The static host seam adds the cross-tab state field. Prospect, Newsletter, export/history product code, the five previously approved shared paths, package exports, manifests, architecture registries and Fable's paths are untouched by this correction.

### Counterexamples, mutation and restored checks

All times below are UTC on 2026-10-26. Tool versions/dependencies are unchanged from the original evidence. The browser uses the allocated port5323, checked free before each run, existing Chrome and isolated synthetic contexts. No signed-in service or real Core/DB was used.

| Check                                                                                                                                                          | Result                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original product source with new mounted correction spec, 01:17:29–01:18:25                                                                                    | Exit1. Both missing-storage paths and the two-tab collision failed on the intended behavior. The fourth case initially used an unsupported fixture block type and failed setup; it is not counted as product evidence. |
| Corrected read-only fixture (`table`), original product source, `--grep 'adopting current state'`, 01:19:10–01:19:30                                           | Exit1, one selected failure: adopted title appeared but current document name/body did not.                                                                                                                            |
| First corrected browser run, save/correction/export specs, 01:21:00–01:22:27                                                                                   | Exit0, 27/27 passed; includes eight affected export cases.                                                                                                                                                             |
| Deliberate mutation allowing absent storage to settle an independent cross-tab request, `--grep 'missing disposition'`, 01:23:25–01:23:49                      | Exit1, one selected failure on the missing recovery hold. Source restored byte-for-byte in `finally`.                                                                                                                  |
| Final `npm run test:browser:modules --workspace @capiro/web -- workspace-ordinary-save-corrections.spec.ts workspace-ordinary-save.spec.ts`, 01:25:01–01:26:21 | Exit0, 20/20 passed, no skips: five corrections plus 15 ordinary-save cases. Includes positive exact replay/acknowledgement followed by B's explicit rebase, and absent disposition refusing it.                       |
| Final `npm run test --workspace @capiro/web -- tests/workspace-ordinary-export.test.ts tests/workspace-held-recovery.test.ts`, 01:25:08                        | Exit0, 30/30 passed in two affected host test files, no skips. Reuse the original 42 other unchanged unit cases and producer evidence.                                                                                 |
| Scoped ESLint on six changed TS/TSX paths, 01:25:11                                                                                                            | Exit0, no warnings. An intermediate hook-dependency warning and missing presentation-stub field were fixed before the final checks.                                                                                    |
| `npm run typecheck --workspace @capiro/web`, 01:25:23                                                                                                          | Exit2: 33 candidate errors, exactly the same 33 diagnostic lines in the saved exact-base log; zero added errors.                                                                                                       |
| `node scripts/architecture.mjs`, 01:25:27                                                                                                                      | Exit1: same public-import error and totals637/312 reviewed/18 inherited-unreviewed/307 blocking. No registry changes or suppressions.                                                                                  |

Raw logs/results remain in the author's existing `work/correction-*` files. The final eight-path formatting and diff checks are recorded with the commit handoff. No broad producer/full acceptance rerun was requested or performed.

### Exact review follow-up

Hermes accepted the exact public `canonicalWorkspaceSnapshot` symbol/owner ruling and the unchanged `WorkspaceDraft`, `workspace-documents.ts`, and `journal.ts` size dispositions. Integration still owns the exact allowlist/registry edits and actual resulting gate. The three correction fingerprints needing review are:

| Finding                                                       | Nonblank | Fingerprint                                                        |
| ------------------------------------------------------------- | -------: | ------------------------------------------------------------------ |
| `ordinary-save/useOrdinaryDraftSave.ts::<module>`             |      495 | `7ba7f640862c62e4ea572649285cc7b8fc11f87738c45dabab7e3f8a387a0341` |
| `ordinary-save/useOrdinaryDraftSave.ts::useOrdinaryDraftSave` |      428 | `67b05f3110cdad27c6f53ad07b763df0743cc334e01fd71f1499a52d0428fb55` |
| `WorkspaceDraft.tsx::DraftEditor`                             |      184 | `2114418c39d3315017c0392e0f94635b0a232d48794a2c5576f2dc3f2931dd14` |

The added check composes the existing journal's positive-disposition owner; it does not create another recovery store or claim a receipt for unsent edits. The hook remains the single ordinary-save lifecycle owner. This is author rationale for the independent reviewer, not a size approval. The original raw-newline baseline comparison remains reused; no unrelated files were normalized. Authenticated integration/acceptance and release remain with the successor's assigned owners. No merge or deployment.

## Original candidate evidence — preserved at head7043a3a

The remainder records the original implementation and checks, before the correction above.

Existing ordinary WorkspaceDraft saves now submit one typed POST `/drafts/:id/save` using the editing baseline. The existing encrypted retained-intent journal preserves the exact request across a lost response and remount. Explicit replay keeps its original identity/body; only a bound receipt reconciled with authorized current state reports Saved. A native CAS refusal allows deliberate adopt/rebase. Generic, request, client and foreign-receipt failures retain the fence.

The ordinary editor preserves formatted sections and omits unsupported document bodies/config fields from writes. The producer retains those fields. Client association remains its existing separate action; current unsaved edits, including typing during the association request, carry into explicit baseline review. Prospect and basic Newsletter save owners are unchanged.

## Source and ownership

- Branch: `codex/wave3-ordinary-save-20261025`; worktree `C:/dev/wave3-ordinary-save-20261025`.
- Exact FE159 base: `f0cef941893d64e237cc3bef1dcddde54987cbf5`, tree `38515f94533fbf7ea3ef2765f7725512dfd903eb`.
- Independent FE158 sibling remains `e637ac02a8c5851f9a2cc3d20cc91f9b9717b3de`.
- Inspected producer: Core137 `c739cdfd580b88d9ec131aff9dc17248a4b65eb6`, tree `2bbfade0de5227f8fe064ebf2b92d1b9b5f2c23a`; accepted Core129 save contract `45eaba1b720849e914052fcf3d7003ac73ac27cd`.
- Root and the human approved the exact five shared paths in the phase brief before application. The existing bounded 409 relay and encrypted journal are extended only for native ordinary-save codes and recorded CAS-refusal retirement.
- Manifests, lockfiles, package exports, shared architecture registries, Core, auth/session owners, accepted export/history implementations and other save owners remain unchanged. Existing dependency junctions were reused; nothing installed.

## Verification actually run

Windows, Node 24.22.1, npm 11.19.1 (manifest asks 11.9.0), Vitest 4.1.11, Playwright 1.61.1, TypeScript 5.9.3, ESLint 9.39.2, Prettier 3.8.1. Existing Chrome executable; synthetic harness only, port 5323 checked free before each run. All fixture data is synthetic.

| Command                                                                                                                                                                                                      | UTC / result                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `npm run test --workspace @capiro/web -- tests/workspace-ordinary-save.test.ts tests/workspace-ordinary-save-recovery.test.ts tests/workspace-ordinary-export.test.ts tests/workspace-held-recovery.test.ts` | Final 23:09:42, exit 0: 72 passed, 4 files; no skipped cases.                                                            |
| `npm run test:browser:modules --workspace @capiro/web -- workspace-ordinary-save.spec.ts workspace-ordinary-export.spec.ts`                                                                                  | Final 23:09–23:11, exit 0: 23 passed (15 save/recovery, 8 affected export).                                              |
| `node ../../node_modules/eslint/bin/eslint.js <all 19 touched TS/TSX paths relative to apps/web>`                                                                                                            | Final 23:09, exit 0. A render-prop/ref warning was corrected by passing the editor as a React component; no suppression. |
| `node node_modules/prettier/bin/prettier.cjs --write <owned paths>` then `--check <owned paths>`                                                                                                             | Formatting applied; final check recorded in Git handoff.                                                                 |
| `npm run typecheck --workspace @capiro/web`                                                                                                                                                                  | Exit 2 on both exact base and candidate: the same 33 Meri contract errors, zero added errors.                            |
| `node scripts/architecture.mjs`                                                                                                                                                                              | Exit 1, still open; details below.                                                                                       |
| `git diff --check`                                                                                                                                                                                           | Exit 0.                                                                                                                  |

Focused coverage includes the real typed browser API → gateway → fixed producer URL/body, all three bounded native codes, unsupported payload rejection and UTF-8 bound, seven receipt binding mismatches, changed payload, seven foreign states, real encrypted journal transitions/storage refusal, one atomic save and duplicate click, frozen pending inputs, stale editor baseline, explicit adopt/rebase, committed response loss, exact replay after remount, historical receipt versus newer current state, current read never proving an unknown outcome, scope/access loss and delayed completion, rich content, unknown-field preservation, and client association.

The pre-existing export and held-client static host fixtures now provide the new editor/state seam. The obsolete held-client PATCH-save expectation was removed and replaced by the stronger mounted association → rebase → atomic POST witness. Existing export assertions are retained. No accepted export/history product code was changed.

## Failing counterexamples and restored pass

Each mutation was confined to the owned worktree and restored in `finally`. Raw logs remain in the author's `work/` directory; all public results below are counts/behavior.

| UTC      | Mutation / targeted command suffix                                                                                | Intended failure                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 21:51:41 | Reinsert PATCH + snapshot; browser `--grep 'one save and duplicate click'`                                        | 1 failed, exit 1: forbidden-write list contained PATCH and version POST.                            |
| 21:52:53 | Refresh captured baseline before dispatch; browser `--grep 'stale baseline preserves edits'`                      | 1 failed, exit 1: submitted hash differed from original editing baseline.                           |
| 21:53:11 | Change replay request ID and title; browser `--grep 'lost committed response survives remount'`                   | 1 failed, exit 1: second body differed from retained original.                                      |
| 21:53:29 | Remove actor receipt binding; Vitest ordinary-save `-t 'refuses a mismatched actorId receipt'`                    | 1 selected failed, exit 1: foreign receipt resolved instead of rejecting.                           |
| 21:53:31 | Remove recorded-conflict guard from retirement helper; Vitest recovery `-t 'never retires'`                       | 2 selected failed, exit 1: unknown/saved outcomes retired instead of rejecting.                     |
| 21:54    | Pre-fix association callback with edits made during pending PATCH; browser `--grep 'explicit client association'` | 1 failed, exit 1: stale title replaced the latest edit. Fixed and included in the final 23/23 pass. |

A final storage-reservation counterexample also failed at 23:02 UTC (one selected browser case, exit 1): Retry document recovery replaced unsent local edits with a newer server read. The correction retains the in-memory edit and its original baseline when no journal row was reserved, including across repeated recovery failures. The final mounted case proves no initial dispatch and a later genuine CAS conflict instead of a silent baseline refresh.

Final restored source passed the full focused unit/browser commands above. Filtered mutation runs skipped only nonselected cases; there are no skips in the final runs.

## Architecture gate and independent review remain open

The actual checkout reports 637 signals, 307 blocking versus exact FE159's 634 signals, 124 blocking. Of the review-status differences, 180 signals across 163 unchanged files have identical normalized source fingerprints and differ only in LF/CRLF bytes. The checker hashes raw bytes for existing review records. The initial ZIP baseline and a verified-clean accepted-base source-byte comparison both retained this distinction; no environment or shared review record was modified to conceal it.

Six source fingerprints changed or were added: `useOrdinaryDraftSave.ts` (409 nonblank lines), its `useOrdinaryDraftSave` function (369), `DraftEditor` (184), `WorkspaceDraft` (98), `workspace-documents.ts` (403), and `journal.ts` (529). These require the independent review owner. Author rationale: the hook owns one ordinary-save lifecycle and composes existing persistence/request lifetime; the host renders existing editor owners; the operation file owns this fixed document API; the journal adds only a narrow guarded refusal retirement. This is rationale for review, not self-approval.

The one dependency error is `ordinary-save/ordinary-save.ts` importing the public `canonicalWorkspaceSnapshot` named export from `@capiro/shared`. The installed package exports it at its root, and the browser build/runtime passed. The architecture check's `approvedSnapshotImport` allows only the existing objective and client-brief owners. Root's registry owner must allow this exact new owner/single symbol or decide another public ownership arrangement. The author did not change the registry, use a private package path, copy the canonical algorithm, or route through an unrelated feature to bypass the check.

## Deletion and remaining gates

The ordinary `useCapiroMutation` PATCH/snapshot chain and its error plumbing are removed from WorkspaceDraft. Search for `workspace.draft.update` / `workspace.draft.snapshot` in Workspace source finds only the unchanged prospect save, basic Newsletter save, and explicit client-association PATCH. Shared operations remain because those callers are active.

Inspected/reused, not rerun: Core129 transaction/CAS/receipt/PG evidence; unchanged FE158 version-history and FE159 export producer evidence. NOT RUN: independent exact-head review and size/import registry disposition (Root/reviewer); authenticated FE+Core deployed integration with two editors, real timeout/revocation recovery (Acceptance); ARM64 image/config/scan/deploy/rollback and real-path acceptance (Release). No migration, cloud, live data, signed-in testing, merge, deployment or external send occurred. Whole WS05/07, E45 integration and Wave2 closure remain open.
