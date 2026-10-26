# Ordinary draft atomic-save candidate — 2026-10-25

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
