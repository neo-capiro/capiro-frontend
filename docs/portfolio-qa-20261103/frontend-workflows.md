# Portfolio QA: prospect and file workflows

## Scope and implementation heads

Base: `36359c4868ce95cddd48439f2524555b4cfd004f` (`main`).

Implementation commits, in order:

- `3396f3c0`: validated Portfolio list return URL and scroll helpers.
- `1581abc5`: workflow, display, folder and file text changes.
- `5fe89a89`: unavailable contacts remain unknown in profile completeness.
- `a3f71c13`: remove the superseded selected-file folder creation mode.
- `c5c9dccd`: distinct file-dialog keys within one reader scope.
- `0c5d9572`: scope new folder/upload dialogs to the 520px Portfolio 3.4 header/body/footer design and use an accessible Choose files action.
- `42271b1d`: keep the native upload input hidden and focus on the visible chooser action.
- `ec5131ea`: use the same 520px Portfolio 3.4 frame for proposal selection through the canonical Workspace Modal.
- `6b3490a8`: type the display test fixture against the public blueprint contract.

The changes address F01, F03, F06, F12, F13, F20 and F22, the prospect/files portions of F18, and a compact prospect completeness checklist. F11 receives clearer recovery state and prerequisite copy; it is not claimed to be a repaired live fixture. Fill with Meri and Objectives were not changed.

## Canonical owners and behavior

| Finding | Implementation | Behavior and limits |
| --- | --- | --- |
| F01 | `features/portfolio/prospects/StageEditor.tsx` | The existing backend capability controls explicit legacy-to-current transitions. The dialog explains that the user must choose the destination; no stage mapping is inferred. Requires the paired backend catalog/transition fix. |
| F03 | `features/portfolio/files/extraction.ts`, `FilePreview.tsx` | The same attachment text route is read with GET. It does not dispatch transcription/provider work or require client write permission. Failure exposes an enabled recheck. The response is bound to the attachment and initiating scope; a fresh canonical file list must still show the selected usable file before text is delivered. No successful read changes indexing state. Audio/video that needs transcription remains unavailable through this provider-free route. |
| F06 | `features/modules/workspace/document-templates/blueprint-display.ts`, `prospects/ProspectTemplatePicker.tsx` | Preserves a real saved name, otherwise uses a readable saved slug, then an explicitly unnamed product/ordinal fallback. Choices show product, ownership scope and known latest version state. Existing published-version verification and read-only definition preview remain the selection boundary. The separate profile catalog explains how to reach the selectable Workspace catalog. |
| F11 | `prospects/contact-transfer/ContactTransfer.tsx`, `brief/client-copy/ClientBriefCopy.tsx` | Loading is visible while access/recovery prerequisites are checked. Contact recovery explains that an available linked client and current source/destination contact access are required. Unknown commands, retained intent and authority checks remain unchanged. |
| F12 | `files/folders.ts`, `CreateFolder.tsx`, `FilesPage.tsx`, `FolderCards.tsx`, `UploadDialog.tsx`, `upload.ts` | Creates an empty folder without selecting files. The folder catalog merges durable empty names and current visible file folders. Upload here preselects its current folder; the destination is fixed after upload begins. The confirmation body and receipt bind the folder to the original upload attempt. |
| F13 | `prospects/ProspectHistory.tsx`, `overview.ts` | Initially displays the newest ten events, with load-more, collapse, text/type/date filtering, and a separate full-history dialog. Native section anchors keep later prospect work reachable. Saved events are not deduplicated or removed. |
| F18 | `shared/portfolio/domain/display.ts`, file and watch components | Human-readable source labels, local timestamps, and readable identity basis. Watch resolves names from the existing authorized member catalog; fallback is Name unavailable or Unassigned. Raw file source metadata remains under Source details. |
| F20 | `prospects/list-navigation.ts`, `ProspectsIndex.tsx`, `ProspectPipeline.tsx`, `ProspectDetail.tsx` | An allowlisted local return URL retains search, owner, stage, visibility, sort and view. Scroll is saved/restored on the shell's actual `main` scroller; native browser Back remains available. Portfolio overview callers are integrated by the frontend-data change. |
| F22 | `prospects/ProspectLifecycle.tsx`, `ProspectDetail.tsx` | Archived/Converted is prominent near the title, with a lifecycle notice and restore/linked-client action. Pipeline stage remains independently visible. |

The new completeness component uses known saved description/next-step/contact values and contextual edit links. A missing/failed contacts service response is not an empty contact list. It does not manufacture source data.

The frontend uses the existing session, reader/writer, native query and Dialog owners. It adds no model loop, authorization authority, proxy, general service or dependency. The new display adapters contain presentation only.

### Contract and uncertainty details

- `GET clients/:clientId/files/folders` returns `{ folder: string | null, count: number }[]`; a durable empty folder has count zero.
- `POST clients/:clientId/files/folders` accepts `{ folder: string }` and returns `{ folder: string }`. The paired Core implementation is idempotent for the normalized name. The dialog retains the exact name after an ambiguous response so Retry cannot switch the command to another folder. It never reports unconfirmed creation as success.
- Attachment confirmation accepts optional `folder`; its normalized value is part of `UploadAttempt.scope` and must match the returned attachment. A lost storage response retries confirmation with the original storage key, source, actor, file and folder, without resending bytes.
- `GET engagement/attachments/:attachmentId/extract-text` uses the existing text response shape. It is a safe repeatable read; browser cancellation never claims provider cancellation. Current reader and selected-file checks still reject stale or mismatched completion.
- Backend source tracing for F06: `apps/workspace/src/template-studio/template-studio.service.ts:listBlueprints` returns saved `WsBlueprint` name/slug/product metadata directly, with the newest version. The public parser preserves those fields. The frontend did not establish that a missing wire-field mapping caused the report's five untitled records, and did not mutate saved titles.
- Backend F11 work establishes that conversion could reuse an archived canonical/already-linked client without an explicit eligibility refusal. That guard is fixed in the paired backend change. No live data or report fixture was inspected or repaired, and this source gap is not proof of the reported fixture's cause.

## Figma reference

The existing Capiro 3.4 Portfolio prospect and Files components were reused. The additive review frame is [Portfolio QA November 2026](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=3171-88648).

Relevant component nodes: lifecycle `3171:88647`, activity footer `3171:88639`, section anchors `3171:88640`, empty folder `3171:88641`, upload destination `3171:88643`, proposal selection/preview `3171:88645`.

Implementation uses the canonical white card/border/radius, compact buttons, existing Dialog and the exact existing prospect dot asset at its 5×5 slot. No new external runtime image or package was introduced. The design context and screenshot were inspected; independent browser validation owns rendered interaction, responsive screenshots and accessibility evidence.

## Verification

Environment: Node `v24.22.1`, npm `11.9.0`; dependencies installed by the integration owner with `npm ci --ignore-scripts`. Scoped worktree dependencies resolve to that Linux install, including the app-local `@capiro/shared` package.

Commands run from the frontend worktree:

```sh
npm run test --workspace @capiro/web -- tests/files-text-read.test.ts tests/portfolio-workflow-display.test.ts tests/prospect-overview.test.ts tests/file-upload-receipts.test.ts tests/files.test.ts tests/files-boundary.test.ts tests/prospect-contact-transfer-view.test.ts tests/prospect-client-brief-copy-view.test.ts tests/prospect-file-copy-view.test.ts tests/prospect-watch-entry.test.ts tests/document-blueprints.test.ts tests/prospect-workspace.test.ts tests/prospect-list-navigation.test.ts
# PASS: 13 files, 82 tests, no skips.

npm run test --workspace @capiro/web -- tests/prospect-completeness.test.ts
# PASS: 1 file, 2 tests, no skips.

npm run test --workspace @capiro/web -- tests/files-batch-move.test.ts tests/files-batch-move-refusal.test.ts
# PASS: 2 files, 41 tests, no skips.

npm run test --workspace @capiro/web -- tests/file-upload-receipts.test.ts tests/files.test.ts tests/office-upload-entry.test.ts
# PASS after dialog alignment: 3 files, 18 tests, no skips (overlaps prior coverage).

npm run test --workspace @capiro/web -- tests/portfolio-workflow-display.test.ts tests/document-blueprints.test.ts tests/prospect-workspace.test.ts
# PASS after proposal modal alignment: 3 files, 29 tests, no skips (overlaps prior coverage).

git diff --cached --check
# PASS before the main implementation commit.
```

The text tests cover GET-only requests after an unavailable response, unchanged indexing state, mismatched receipts, file disappearance during read and revoked initiating scope. Upload tests cover an unknown storage result, refusal to change destination during retry, confirmation-folder binding and one byte upload. Navigation tests reject unrelated destinations, retain filters, and restore a nonzero shell scroll position.

Scoped ESLint reported the pre-existing `react-hooks/set-state-in-effect` in Watch's retained-alert handling. It was reproduced from the untouched base through `git show 36359c4868ce95cddd48439f2524555b4cfd004f:apps/web/src/features/portfolio/prospects/watch/ProspectWatch.tsx | node ../../node_modules/eslint/bin/eslint.js --stdin --stdin-filename src/features/portfolio/prospects/watch/ProspectWatch.tsx`. Exact native SVG `<img>` callsites retain the existing Next image warnings. New index effect dependency warnings were corrected.

The final targeted lint of 22 owned/new workflow modules excluding that unchanged Watch effect reported zero errors and three native-SVG warnings. The subsequently added proposal Modal and explicitly typed display fixture both passed scoped ESLint without warnings. The integration typecheck identified the test fixture's widened `scope` string; `6b3490a8` fixes that diagnostic and its three display tests pass.

Initial focused runs exposed a test fixture without `usable:true` and an incorrectly linked app-local shared package; both were corrected before the final passing runs. Assertions were not weakened or skipped.

Integration owner runs full typecheck/build/lint/architecture on the combined frontend head. Browser validation is a separate lane; this document does not claim those unrun gates passed. The existing large FilesPage, Detail, History and Watch components trigger proportional size review; lifecycle and completeness were extracted into cohesive presentation owners, while existing transport/authorization ownership remains unchanged.

## Cleanup and acceptance limits

Removed `FileExtractionUnconfirmed` and the POST text-read path from the preview, the blocked Upload here/two-stage upload copy, the selected-file `creating` folder mode in MoveFile/MoveFiles, and unused `.folderHint` CSS. Ordinary Move continues to support entering a new destination name. Existing move/refusal coverage remains and passes.

No processes, external writes, uploads, live conversions, deployments or migrations were initiated by this lane. The repository changes are committed; only local dependency symlinks remain outside git. A fresh disposable-tenant conversion, durable empty-folder database behavior, deployed text reader/provider boundaries and the original synthetic fixture need live acceptance by the integration owner.
