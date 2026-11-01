# Meri 3.4 cleanup — editing and contextual control source verdict

Source pin: `580f4478eaa732c084858b4e764443e79b9782c9`. This is a bounded source review, not runtime/provider acceptance. No Figma or Git changes were made by this review.

## Retire the obsolete fixture-only editing and comment surfaces

The old document working draft is registered with synthetic data in [artifacts.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/fixtures/screens/artifacts.tsx). [DocumentWorkspaceScreen.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/screens/artifacts/DocumentWorkspaceScreen.tsx) disables Save draft and Create new version. [useDocumentDraft.ts](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/screens/artifacts/useDocumentDraft.ts) maintains local unsaved state. [useCommentThread.ts](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/screens/artifacts/useCommentThread.ts) explicitly keeps reply/resolve/reopen changes in the preview; nothing is sent or saved. These are not evidence of a persisted Plate editor or a Meri comment service.

Retirement IDs: `1064:150330`, `1064:150459`, `1064:150539`, `1064:150601`, `1064:150603`, `1064:150605`, `1064:150607`, `1064:150609`, `3045:34297`, `3045:34315`, `3045:34333`, `3064:35947`, `3064:35975`.

The supported replacement is [Files/latest versions](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-57774), leading to the gated [DOCX private editor](https://www.figma.com/design/IXJzJUkXcUTkySHir5JNea?node-id=3219-58340) and the current Save/Release/Publish states. Comment-specific actions have no separately verified persisted-Meri replacement; do not redirect them to unrelated actions.

Current source ownership:

- [MeriFilesHost.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/app/meri/files/MeriFilesHost.tsx) mounts DocumentLibrary and gated OfficeEditing.
- [LibrarySelectedVersion.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/files/LibrarySelectedVersion.tsx) offers Edit private copy only for the latest selection, plus Inspect version and Verify download.
- [OfficeEditing.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/office/OfficeEditing.tsx) admits DOCX/XLSX/PPTX when enabled.
- [DocumentPreviewPanel.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/files/DocumentPreviewPanel.tsx) owns existing/derived PDF preview, distinct from original editing.
- [DocumentRevisionLink.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/files/DocumentRevisionLink.tsx) returns AI revision to the original conversation.

Keep immutable-version/revision coverage (`1064:146038`, `1064:146126`) and all current Office recovery states. This recommendation removes unsupported editing/comment presentations, not preview, download or revision functionality.

## Retire four former workspace approval inboxes

`3032:33006`, `3036:33107`, `3036:38096`, `3048:39000` are explicitly marked reference-only in the final Governance manifest. Current capabilities have no ordinary workspace approval-inbox route. Keep contextual review roots `1064:147397`, `3032:30415`, `3032:31529` and personal-memory owner review.

## Preserve source-supported lifecycle and browser controls

Do not classify `1064:144923`, `1064:144982` and `1064:145144` as fixture-only. [MeriLiveConversation.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/conversation/MeriLiveConversation.tsx) actually renders RunLifecycleControls and CheckpointActions. [RunLifecycleControls.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/conversation/lifecycle/RunLifecycleControls.tsx) supports folded Pause/Steer, original-control recovery, checkpoint inspection, Resume and Fork into new chat. Preserve this coverage as contextual conversation controls, with no standalone Runs destination.

Likewise, preserve the A2 browser control states `3177:42928`, `3177:43098`, `3177:43269` and `3177:43447`. [ConnectedBrowserViewer.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/browser/ConnectedBrowserViewer.tsx) is mounted by the current conversation; [BrowserViewer.tsx](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/features/meri/browser/BrowserViewer.tsx) exposes Take control, Return control, Refresh, Reconnect and explicit Resume Meri.

A2 download-confirmation root `3177:43622` was not proven by BrowserViewer itself; retain it conservatively as conditional artifact/download-result coverage. Do not claim that file bytes or download completion are verified merely because the browser was connected.

Selected-tab sharing is a different supported feature. Keep `3180:44302`, `3180:44331`, `3180:44363`, `3180:44541` and `3180:44710`; see [selected-tab/access.ts](https://github.com/neo-capiro/capiro-frontend/blob/580f4478eaa732c084858b4e764443e79b9782c9/apps/web/src/shared/meri-selected-tab/access.ts).

Root owns final deletion, inbound-link repair and the consolidated retirement ledger. No recovery, empty/loading or responsive state was classified as unused merely because it is outside the 320-frame coverage register.


