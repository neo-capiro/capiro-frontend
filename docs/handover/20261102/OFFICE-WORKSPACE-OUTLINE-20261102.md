# Office documents in the Workspace — implementation outline (2 November 2026)

Branch `fable/office-workspace-20261102` from `main` 4cbea4b9. Instruction: Office (Collabora CODE) documents belong in
the Workspace, not in Files; use CODE's own editor UI; leave no dead code.

## Root decisions

- **Workspace route.** The Workspace is `/modules/workspace` (`features/modules/workspace`). An Office document opens at
  `/modules/workspace?officeVersionId=<versionId>[&clientId=…][&officeRunId=…]` (`workspace-route.ts` destination
  `office`), rendered by `OfficeDocumentScreen` inside `WorkspaceScreen`. The Documents view lists Office documents
  (the Meri artifact library filtered to Word/Excel/PowerPoint) beside the existing workspace drafts.
- **Document model.** The Workspace draft model (Core `apps/workspace`: sectioned blocks, saved versions, no lineage) has
  no file representation. An Office document therefore stays a Meri artifact: immutable versions with
  `artifactId`/`parentVersionId` lineage, the private draft in Core office-drafts, and the same WOPI file for manual
  and Meri edits. The Workspace is the place it is opened, listed and revised; the storage owner is unchanged.
- **CODE UI mode: full notebookbar workbench.** The launch form posts to CODE with
  `ui_defaults=UIMode=notebookbar;SavedUIState=false`, `closebutton=1`, `revisionhistory=1` and `lang` added to the
  action URL the service composed (the contract receiver admits extra query parameters; `WOPISrc` and the token
  fields stay the service's). The frame fills the page. Collabora's menus, sidebar, status bar, comments and track
  changes are CODE's own; nothing is hidden by the host.
- **CODE controls drive the host.** After `App_LoadingStatus: Document_Loaded` the host sends
  `Disable_Default_UIAction` for `UI_Save` and `UI_Close`, so CODE's Save button posts `UI_Save` (the host runs the
  confirmed Save: `Action_Save` with `Notify`, then the canonical draft read), CODE's close (X) posts `UI_Close` (the host
  saves pending changes, releases the editor and returns to Documents), File › Save As posts `UI_SaveAs` (the host
  publishes the saved draft as the next immutable revision and reopens it), and the revision-history item posts
  `UI_FileVersions` (the host opens the revision panel). `Host_PostmessageReady` is sent on frame load and again on
  `Frame_Ready`.
- **Flag.** `MERI_OFFICE_WORKFLOW_ENABLED` keeps its name. It is read once per page (`/modules/[module]`, `/meri`,
  `/meri/files`) and carried as an `OfficeWorkspaceLinks` context; when off, no Office link, list or screen renders.

## Deleted (Files placement)

`features/meri/office/OfficeEditing.tsx` (dialog context, Edit private copy, Open the new version in the editor),
`OfficeEditor.tsx` (the dialog), `OfficeEditorControls.tsx`, `OfficeDraftActions.tsx`, `useOfficeEditor.ts`,
`office.module.css`; the `officeEnabled` wiring in `MeriFilesHost`; the `office` copy branch of `DocumentRevisionLink`;
tests that only exercised the dialog placement (`office-ask-meri.test.ts` reopen case, `office-editor.spec.ts` host
buttons). Replaced by `features/modules/workspace/office/*` and `features/meri/office/OfficeWorkspaceLink.tsx`.

## Tests

Unit: `workspace-route` office destination; `office-frame` new messages (Frame_Ready handshake, default-action
disabling, `UI_Save`/`UI_SaveAs`/`UI_FileVersions`/`UI_Close` callbacks); `office-editor` publish-revision sequence
and close-with-save; `office-edit-view` workspace link; `office-ask-meri` entry in the workspace; `office-upload-entry`
navigation. Browser: `office-workspace.spec.ts` (full-UI launch parameters, CODE Save → confirmed draft read, Save As →
revision published and reopened, close → release), `office-bridge.spec.ts` (proposal card link to the workspace route).
