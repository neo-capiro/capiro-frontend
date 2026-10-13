# CAP-05/06/07 capability documents continuation

## Bounded implementation outline — 2026-10-11

Base: e7cdd3cc3e50cd2fd3355f134a7ceb64861134f5. Isolated branch: codex/portfolio-capability-documents-20261011. Earlier Capability presentation source/archive remain frozen. Root owns integration and the architecture review registry.

Canonical Files owns attachment schema/query, presigned upload orchestration, operation lifetime and fresh file navigation. Extend the existing uploadParentFile beforeDispatch hook and shared currentClientWriter/assertClientWriter checks; do not create another uploader, authorization policy, endpoint or guessed signed-URL TTL. Bind writes to initiating actor/client/source/view, require native source plus the actual ticket s3Key in receipts, and preserve unknown-storage and confirmation-only retry semantics. Derive downloads from an explicitly refreshed authorized client list and exact selected attachment/source/readiness. Server ACL, source provenance, byte verification, scan policy and URL minting remain authoritative.

EntityDocuments owns the capability-scoped document list presentation and composes these Files operations. Reuse current Figma411:55548, its native text-glyph document/download slots, canonical buttons/Dialog, loading/error state patterns and shared tokens. Render full bordered document rows and matching upload/caption order, with keyboard and phone layouts. Add only a narrow optional description/context on the public EntityDocuments export and a minimal CapabilityEditor composition change. Any genuinely missing state variants must be authored in the existing Figma component page before implementation.

Expected Files prerequisite owners: files/upload.ts, UploadDialog.tsx, contracts.ts, queries.ts, FilePreview.tsx and one cohesive local operation/download owner if needed. Presentation owners: EntityDocuments.tsx, its local CSS module and CapabilityEditor.tsx. Tests/evidence stay dedicated; no shared foundations, central registry, lock, unrelated domain or backend edits.

Verification: retain a wrong-source receipt refusal regression before correcting the historically accepted fixture; characterize stale actor/client/source/view and expired-link behavior against unchanged source; verify exact native payload/receipt identity, unknown upload outcome, confirmation retry, current-read failure/denial/removal/quarantine, fresh download destination, keyboard/focus, phone and both themes. Use intercepted synthetic routes only. Preserve meaningful existing upload/File/Capability assertions. Root owns combined checks/build and live acceptance.

## Native contract snapshot

Repository neo-capiro/capirov2; commit4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace. Exact fetched controller and service are under outputs/evidence/portfolio-capability-documents-20261011/native. Controller651–714 explicitly documents source=capability:<id>; upload/confirm/list routes use the existing Engagement service. Service7479–7625 owns ticket/confirmation,7654–7740 owns authorized list/readiness URLs, and createAttachmentDownloadUrl uses expiresIn300. The implementation will refresh native URLs rather than infer or extend that expiry.

## Implemented continuation

The three rows use existing published services. No new native contract is required for the bounded list, upload and download work below. Signed-in acceptance is a separate qualification task; it is not evidence that a frontend implementation is blocked.

| Audit row | Implemented behavior | Canonical owners |
| --- | --- | --- |
| **CAP-05 — capability documents list** | Current client list is filtered by the exact capability source. Failed/denied reads hide retained filenames and signed links. Reader-specific child keys prevent one actor, tenant or identity revision from displaying another reader's retained list or extracted preview. A replacement reader obtains a fresh authorized GET before rows return. Local preview/upload intent is bound to reader and source, so a same-ID record in a replacement list does not automatically reopen the previous reader's dialog. | `files/file-reader.ts`, `queries.ts`, `EntityDocuments.tsx`, `DocumentState.tsx`, `entity-documents.module.css`; minimal `capabilities/CapabilityEditor.tsx` composition. |
| **CAP-06 — choose file, upload, progress and failure** | The canonical uploader retains one actor/client/source/view attempt and uses the actual `beforeDispatch` guard at each native stage. Ticket `fields.key` must equal its `s3Key`. Confirmation must match the exact client, source, storage key, filename/type and initiating uploader; supplied meeting parent remains checked for shared callers. A wrong successful receipt or uncertain byte outcome preserves that ticket for confirmation-only retry, without another byte upload. Obsolete stage/completion/cache effects are suppressed. | `files/UploadDialog.tsx`, `upload.ts`, `file-scope.ts`; existing `shared/portfolio/auth/client-writer.ts` is reused unchanged. |
| **CAP-07 — download capability document** | Each explicit download refreshes the authorized current client list, verifies selected ID/source/readiness and the returned URL, and checks the same reader/view immediately before navigation. A long-open modal does not reuse an old signed URL. Denial, failed refresh, removal, wrong source/client, quarantine or a superseding list prevents navigation. Successful unchanged GETs remain valid even when React Query structurally shares the data object. | `files/navigation.ts`, `queries.ts`, `file-reader.ts`, `file-scope.ts`, `EntityDocuments.tsx`, `FilePreview.tsx`. |

### Canonical reader and selection ownership

The public `filesKey(clientId)` remains the `['client-files', clientId]` invalidation prefix. The actual reader cache key adds tenant, user and the successful identity update count. `useFiles` verifies the captured reader before and after its GET and exposes a `readerScope` string for local UI intent. Existing Calendar, email and enrichment callers still invalidate the public prefix; they do not need a second cache or uploader.

`EntityDocuments` adds its source to this UI scope. The root-requested follow-on in `FilesPage.tsx` captures checked row IDs, preview/move/access/delete selection, upload selection and folder-access selection to the same reader scope. Folder access also captures the chosen folder. Search, sort and filter drafts retain their existing behavior. Routine file GET revisions do not change this UI scope, so an already open preview continues to follow current quarantine/removal state. Native folder/access/delete mutation dispatch remains outside this bounded selection correction.

The operation owners deliberately use a different, stricter check: download and extraction capture the current successful file-list update count and refuse superseded work. This is a local browser source revision, not a native version field or compare-and-swap guarantee. Cache observer notifications alone do not count as a successful read. A dedicated stale-identity mount/refetch case checks for React render-phase update warnings; it passed without a speculative notification rewrite.

### Bounded extracted-text correction

Independent review identified an unconditional late extraction invalidation next to the changed preview. With root authorization, `files/extraction.ts` now owns that native POST and selected-preview lifetime. It verifies the exact native `attachmentId`, client/source/readiness and current source revision before dispatch and before any cache/text effect. Actor, client, source, view disposal or revoked identity prevents obsolete text from returning to the visible preview. `mutations.ts` forwards its extraction export to this single owner; the old unconditional implementation is removed.

A dispatched request with an unknown or malformed result is described as unconfirmed. The UI does not automatically retry it or claim that browser abort canceled server/provider processing. The native endpoint can perform extraction/transcription; this continuation does not add a provider call, change its queue semantics or exercise it against customer data.

## Native evidence and limits

The pinned [Engagement controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/engagement/engagement.controller.ts) and [Engagement service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/engagement/engagement.service.ts) were fetched and retained under the evidence directory's `native/` folder.

- Controller 651–714 defines the current upload/confirmation DTO, including the free-text `source` tag. The `capability:<id>` format is provenance, not a new capability authorization claim.
- Service 7479 onward returns the native presigned POST and its actual object key. Confirmation verifies stored bytes and parents. Its exact-replay comparison at 7567 does not compare source, so the frontend explicitly checks returned source as well as key/client/uploader. A mismatched 200 can be a committed result and therefore retains the attempt for confirmation-only retry.
- The list at 7654 onward enforces native access and exposes `usable`, blocked/scan disclosure and usable signed URLs. Download/preview expiry remains the service's responsibility; the existing URL helper uses 300 seconds. The frontend neither calculates a guessed remaining TTL nor extends it.
- Controller 2889 and service 7743 onward define the existing extraction POST and response. Returned `attachmentId` is checked exactly before accepting text.
- The controller class requires `standard_user` and has no lower-role override on GET attachments. The synthetic `client_portal_user` test only demonstrates that frontend download code does not incorrectly reuse a writer-role filter. It is **not** evidence that the deployed native service authorizes that role.

No endpoint, DTO, storage policy, native ACL, byte/scan rule, provider operation or capability save payload was invented. Native access denial remains authoritative.

## Figma implementation evidence

Fresh context and a screenshot of [Documents 411:55548](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-55548) were inspected before UI edits. The implementation retains its 720px desktop modal, 30px upload control, 12px caption, 13px row text, 10×12px row padding, 10px gap and 8px radius. The document and download slots in that frame are literal **▤** and **↓** text glyphs; no substitute image asset or icon library was introduced. Long filenames wrap on a 390px phone without horizontal overflow.

The frame describes missing runtime states but does not provide their components. Under the user's Figma authorization, the small state family was authored **before** implementing it, using existing warm-theme variables, Geist typography and the existing v2 Button component. Exact nodes are Loading **1011:51334**, Empty **1011:51335**, Error **1011:51336**, Unavailable **1011:51337**, Checking **1011:51338**, component set **1011:51339**, and [review frame 1011:51353](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1011-51353). Saved context, screenshots and node metadata are in `figma/`.

The caption names the application's existing **Files** tab. Figma's example calls it Documents; preserving the actual destination avoids promising an absent navigation item. UI acceptance checks cover light/dark desktop and phone, all authored status frames, keyboard preview opening, Escape/connected-opener focus restoration, and disabled native-unavailable downloads.

## Qualification and preserved failures

All browser/API/storage routes in this evidence are intercepted synthetic fixtures. No actual file/customer write, provider call, deployment or signed-in acceptance is claimed. Final audit acceptance remains open.

| Evidence cohort | Observed result | What it establishes |
| --- | --- | --- |
| `unit-baseline.json` | 5 existing passes; 4 new expected failures | The old uploader accepted wrong source/key/uploader receipts and mishandled an uncertain storage result. The accepted fixture was then corrected to the native source/key contract while retaining explicit wrong-receipt refusal tests. |
| `browser-baseline/` | 6 expected failures | Held upload ticket outlived actor/client/source/unmount, late confirmation refreshed obsolete context, and a long-open download reused the old URL. Baseline production hashes are in `baseline-source.json`. |
| `browser-candidate-01/` | 28/34 passed | Exposed structural-sharing rejection of legitimate refreshed URLs and global button precedence producing a 36px control. |
| `browser-candidate-02/` | 30/34 passed | Native execution cases passed; four visual cases exposed missing focus return from the nested preview. |
| `browser-reader-baseline/` | 4/8 passed | Diagnostic comparison only; it is not used as final qualification because its temporary source restoration was not fully bound. |
| `browser-candidate-03/` | 38/42 passed | All upload/download/visual cases passed. Four reader cases exposed retained local preview intent reopening after a replacement reader's fresh same-ID list. `source-observation.json` records that the unused legacy `mutations.ts` file alone retained a baseline implementation; the active preview imported the new extraction owner and the other 12 hashes matched. |
| `browser-selection-baseline/` | 1 passed; 4 intended selection failures; 1 test-locator failure | Restored only the original `FilesPage` to reproduce its preview/delete/access/upload reopening. The new stale-identity mount/refetch console case passed. The folder fixture originally targeted Unfiled although its native fixture folder was Reports. |
| `browser-folder-selection-baseline/` | 1 expected failure | Corrected only that folder locator and native access fixture; the original page still reopened folder access after a reader change. |
| `unit-final.json` | **60/60 passed** | Canonical upload, wrong receipt/storage retry, fresh navigation revision, meeting upload, voice and email unit compatibility. |
| Final source type and lint checks | **Passed** | `tsc --noEmit` and scoped ESLint, including the new harness, reader and selection cases. |
| `browser-candidate-04/` | **48/48 passed**, 154.3 seconds, no skips/flakes | Frozen 14-file snapshot; all production hashes were verified before and after the document/selection cohort. All 13 ready/error/empty/loading screenshots were manually inspected against Figma. |
| `browser-compatibility/` | **38/38 passed**, no skips/flakes | Preserved Files preview/readiness/folder behavior, Capability payload/draft/keyboard composition, meeting transcript/voice upload boundaries, email attachment retry/lifetime, and enrichment upload checks on the same unchanged production snapshot. |

Cohorts overlap and must not be summed into a single test total. Existing meaningful behavioral assertions remain; fixture changes only supply the exact native source/key/attachment identity or select the fixture's actual folder. `visual-inspection.json` binds the manual review to all 13 final PNG hashes. `static-validation.json` records the clean final type/lint/format/diff checks and the architecture registry handoff. Browser port 5191 was released after both owned runners stopped; no further browser process is left running.

### Final-source coverage

| Changed responsibility | Final qualification |
| --- | --- |
| Ticket key, exact confirmation source/key/client/uploader, captured upload retry lifetime | Five receipt unit cases; dedicated upload/execution browser cases; preserved transcript, voice, email and enrichment upload cases. |
| Current reader child cache, fresh authorized download selection and local source revisions | Five navigation unit cases; denied/failed/removed/wrong-client/wrong-source/quarantined read cases; held reader/client/source/view navigation; unchanged-data structural sharing and long-open URL refresh. |
| Reader-scoped display, extracted text and UI selection | Actor/tenant/role replacement; invalidated identity; held extraction and wrong attachment receipt; stale-identity mount/refetch console case; five FilesPage preview/delete/access/folder/upload variants with checked-ID reset. |
| Documents UI and minimal Capability composition | Four viewport/theme scenarios plus phone loading, native-unavailable action, long-name wrapping, error/retry/empty states, keyboard preview/focus return, and three preserved Capability draft/payload/tab cases. |
| Canonical Files compatibility | Existing wrong-client refusal, removed/denied/quarantined preview, wrong folder receipt and successful folder move assertions; public invalidation prefix remains compatible with shared upload callers. |

The three CAP rows have no remaining identified frontend implementation gap within these verified native contracts. Environment-matched signed-in acceptance and root's combined production/build/regression gates remain separate, open qualifications. No final audit row is marked accepted by this report.

## Source review and integration boundary

Immutable source snapshots and manifests are retained under `review-candidate-01` through `review-candidate-04`. Candidate04's manifest SHA256 is `4613fe3e13079dc16061c8067ab90909dcd094e265ceee92bfdbcf3ec2026ea5`. Independent P2 review verified all 14 hashes and found no remaining blocking issue in the native receipts, lifetime, reader provenance, selection correction or canonical caller compatibility. Root owns the separate integration review and registry update.

`cohesion-reviews.json` contains seven exact AST fingerprints and responsibility-specific reasons for `UploadFiles`, `useFileScope`, `uploadParentFile`, `EntityDocuments`, `FilePreview`, `CapabilityEditor` and `FilesPage`. The standalone architecture scan has **zero boundary/origin errors**; its seven changed size signals await those exact root-owned registry entries. No registry, lockfile, shared foundation, unrelated feature or backend file is modified by this worktree.

