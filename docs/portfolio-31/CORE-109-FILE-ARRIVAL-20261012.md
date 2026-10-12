# CORE-109 — activity attachment arrival

## Pre-code outline — 12 October 2026

This continuation starts from product commit `75409a96d6c58a53c7d44eb6053cc291995caf80` in the isolated `codex/portfolio-file-arrival-20261012` worktree. It addresses the attachment arrival portion of CORE-109, with the already implemented CORE-061 preview as its dependency. It does not mark either audit row accepted.

`client-profile/ActivityTimeline.tsx` already emits `/portfolio/<clientId>/files?file=<encoded sourceId>`. The destination Server Component ignores `searchParams`, and `FilesPage.tsx` only opens a manually selected attachment. Existing activity evidence asserts the meeting link; existing Files evidence covers manually opened previews, readiness and reader changes. None consumes this attachment query parameter.

### Ownership and intended behavior

- The thin Files route awaits installed Next 16.4's Promise `params` and `searchParams`, then passes a single string `file` value to the existing client page. An absent, empty or repeated parameter does not choose a file. The installed `next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` and `04-functions/use-search-params.md` were read before this change.
- One small `files/linked-arrival.ts` hook owns the local arrival intent only: exact requested ID, originating client, first current `useFiles` reader scope and consumed state. It binds the reader before a held attachment read completes. A reader/client change, failed list or explicit close/manual action consumes the old intent; ordinary attachment refreshes cannot replay it. A missing ID after a successful current list is unavailable in that list, not evidence of deletion or permission denial.
- `FilesPage.tsx` composes the resolved attachment into its existing `FilePreview`. Selection comes only from the successful current reader/client `useFiles` result and exact attachment ID, independently of local table filters. The ID is never interpreted as a URL or passed to a second attachment endpoint. Opening the dialog performs no external navigation, download or extraction. Canonical preview, readiness, reader, navigation and extraction owners remain unchanged.
- Existing manual file selection, folder/access dialogs, upload, sorting and filtering retain their owners. The arrival is consumed when the user takes a competing explicit file action, so a delayed list cannot interrupt it with another dialog.
- The only new UI state reuses the existing Files `DocumentState` frame with neutral unavailable-in-current-list copy. There is no new visual primitive or asset.

### Current design and contract references

The current Figma file is `Zc2dEN5aLU47dVdsewDmiJ`, Portfolio page `411:40601`. Current design context and screenshots were read for Files `411:52484` and existing document status `1011:51337` (component set `1011:51339`) before code. The existing canonical `FilePreview` and `Dialog` are reused; this change does not claim that Figma supplies an inline document renderer. No Figma write is needed for this composition and status-copy change.

The pinned native reference is `neo-capiro/capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`: `apps/api/src/engagement/engagement.controller.ts` exposes GET `attachments`; `apps/api/src/engagement/engagement.service.ts`, `listAttachments`, validates attachment parents and filters tenant, client, superseded records and viewer access before returning current readiness and permitted URLs. Existing local source snapshots are retained in the earlier Capability documents evidence. This arrival needs no native endpoint, ACL or provider change; native minimum-reader role remains `standard_user`.

### Verification planned before implementation

A dedicated HTML/harness/spec will compose the real ActivityTimeline and FilesPage, mirror the thin route's parameter projection, and replace only API responses and view/identity events. First, exact arrival and missing-target cases will run against pristine product source to prove the gap. The fixed cohort will cover the genuine activity link, direct/encoded/duplicate IDs, no automatic external action, closing and ordinary refresh, missing and failed lists, reader/client changes while reads are held, current readiness and manual fallback. Desktop/phone screenshots and keyboard checks will use the actual retained preview. Unchanged original Files/browser boundary cases will qualify the composition. No heavy build or live provider call is part of this slice.

## Results

The attachment arrival is implemented in the three planned source owners. `Page` projects the awaited single query value; `useLinkedFileArrival` captures the initial current reader and consumes that local intent; `FilesPage` composes the exact current attachment into the existing preview. No server contract, payload, URL expiry rule, preview renderer or shared primitive changed.

A new arrival also waits for an already in-flight attachment refresh to settle before choosing a retained cached record. This is separate from an already open preview: an open preview retains its current-list behavior during an ordinary refresh, follows updated readiness, and disappears when the refreshed list fails or no longer contains the ID. Once closed, absent or failed, that arrival cannot reopen on a later ordinary GET. A different explicit `file` parameter is a new arrival; the consumed marker is local to the mounted page, not durable server state.

### Evidence and command results

All evidence below is under `outputs/evidence/core-109-file-arrival-20261012/` in this isolated worktree. The preserved baseline and fixed cohort are separate runs; their counts are not added together.

| Check | Result and exact scope |
| --- | --- |
| Pristine baseline | **5 expected failures** in 35.35 seconds, zero skips/flakes. The real activity link, direct desktop/phone arrivals and held-list arrival reached the rendered authorized Files list but never opened the preview. The missing-target case had no neutral current-list status. Product source was exactly `75409a96d6c58a53c7d44eb6053cc291995caf80`; `git diff -- apps/web/src` was empty. Raw report, inputs, failure screenshots and traces are retained in `baseline-pristine/`. |
| Fixed browser cohort | **27/27 passed** in 52.76 seconds, zero skips/flakes/unexpected outcomes. The seven candidate input hashes were checked unchanged before preserving the raw report and captures in `browser-candidate-01/`. |
| Retained unit contracts | **13/13 passed** across unchanged `tests/files.test.ts`, `tests/files-boundary.test.ts` and `tests/file-navigation.test.ts`. |
| Web types | `npm run typecheck --workspace @capiro/web` passed after the final source change. |
| Lint and format | Scoped ESLint passed for the two existing source owners, new hook and dedicated TSX/spec. Prettier formatted those owned files and the dedicated HTML; no central configuration changed. |
| Architecture | The actual full source scan reports `errors: []` and one changed-body review signal, `FilesPage`; its exact review record is provided below for coordinator integration. The local registry is unchanged, so the scan correctly exits 1 pending that review record. The route and linked-arrival helper have no size findings. |
| Independent source review | Root independently read all seven candidate files and verified snapshot/live hash equality, reporting no current source finding. Integration and the combined final gates remain root-owned. |

The browser commands use the qualified runtime:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/158b6018a5d3/browser-runtime/runtime/chromium \
FONTCONFIG_PATH=/etc/fonts \
npm run test:browser -- tests/browser/linked-file-arrival.spec.ts \
  --grep 'genuine activity link|direct arrival|missing exact target|pending exact arrival' \
  --timeout 12000

PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/158b6018a5d3/browser-runtime/runtime/chromium \
FONTCONFIG_PATH=/etc/fonts \
npm run test:browser -- tests/browser/linked-file-arrival.spec.ts \
  tests/browser/files.spec.ts tests/browser/files-boundary.spec.ts \
  tests/browser/files-reader-selection.spec.ts \
  --grep-invert 'Master calendar retains' --timeout 15000
```

The second command excludes only the unrelated Master calendar case co-located in `files.spec.ts`. All eleven original Files, readiness and reader-selection assertions are unchanged. Port 5191 was stopped and successfully bind-checked after both runs.

### Final-source coverage

| Cases | Count | Behavior qualified |
| --- | --- | --- |
| Real ActivityTimeline link | 1 | Exact encoded attachment href reaches Files; the second of two current records is selected by ID; no external tab, download or extraction occurs. |
| Direct desktop and phone arrival | 2 | Encoded parameter, retained modal/keyboard behavior, focused control, Escape, no viewport overflow, no replay after close/refetch, and manual fallback with focus restoration. |
| Missing and held current lists | 3 | Missing ID uses neutral current-list language and never selects another row; a held initial GET waits; an arrival during a held cached refresh does not open retained data. |
| Parameter boundaries | 3 | Empty, repeated and URL-shaped nonmatching values do not select a different record or navigate externally. |
| Reader and client lifetime | 5 | Held actor, tenant, revocation/restoration and client changes cannot transfer the old arrival; an already displayed preview disappears for a replacement reader and does not reopen when same-ID data returns. The changed-client fixture returns a valid new-client collection to isolate the local intent guard instead of relying on schema rejection. |
| Refresh failure and readiness | 2 | Failed refresh hides retained metadata and consumes arrival while preserving canonical retry; ordinary successful refresh preserves the open preview and updated quarantined readiness removes original/download/text actions. |
| Original Files behavior | 11 | Wrong-client list refusal, removed/denied/quarantined preview updates, mismatched folder receipt, reader-scoped preview/delete/access/upload/checked state, and a quarantined file's folder move. |

The browser harness renders the real ActivityTimeline and FilesPage with the canonical API provider, query, preview and interaction owners. Its routing adapter mirrors the thin Server Component's single-parameter projection. It does not execute a Next production server or establish native permission acceptance. All service/storage endpoints in these cases are synthetic; the native minimum reader role and same-client validation remain those of the existing service. No live provider, AWS, customer attachment or server mutation was performed.

### Visual review

The three deliberately captured final images were opened and inspected after the successful cohort:

- `browser-candidate-01/test-results/linked-file-arrival-a-dire-e4116-oard-and-geometry-at-1440px/linked-file-1440.png`: the existing centered preview, visible focus ring, original/download actions and explicit text action render correctly.
- `browser-candidate-01/test-results/linked-file-arrival-a-dire-652ee-board-and-geometry-at-390px/linked-file-390.png`: the preview fits with 16-pixel side margins; text and controls wrap within the viewport and Escape closes it.
- `browser-candidate-01/test-results/linked-file-arrival-a-miss-c96f4-g-another-file-or-replaying/linked-file-unavailable.png`: the existing document status frame explains current-list absence while the remaining manual list stays usable.

This is a Figma-referenced arrival composition change, not a reimplementation of the Files table or an inline renderer. No CSS, assets or Figma components changed. Current Figma context/images are preserved in `figma/`.

### Cohesion review

`FilesPage` remains the Files view compositor: it derives table/folder/filter presentation from the canonical current list, retains reader-scoped manual selection, and chooses the existing preview/access/move/upload dialogs. The new arrival's distinct one-time lifetime is owned by `linked-arrival.ts`; transport, receipt validation, download authorization and extraction remain delegated to their unchanged owners. Retaining this render function avoids splitting one page's mutually related presentation into arbitrary pieces. The added hook contains no query, identity subscription, mutation or provider action.

Exact changed-body record for root integration:

```json
{
  "file": "apps/web/src/features/portfolio/files/FilesPage.tsx",
  "kind": "function",
  "symbol": "FilesPage",
  "fingerprint": "db89e110514dfb52bbe6186b6836df43eab0c6aa2278eb8489dd28a977c056b2",
  "reason": "Composes the current reader-scoped Files table, folder/filter controls and mutually related preview/access/move/upload dialogs. One-time linked arrival lifetime is delegated to linked-arrival.ts; list reads, native authorization, file navigation, extraction and mutation receipts remain in their canonical owners. The added composition does not introduce a second service or unrelated domain responsibility.",
  "reviewedBy": "portfolio-prospects-files; independently read by root",
  "reviewedOn": "2026-10-12"
}
```

The function has 254 nonblank body lines. No other changed source exceeds the configured function/file threshold. This review pins the inspected body and does not approve future growth. CORE-109 remains open for overall audit acceptance; this specific frontend omission is resolved and is not a native-contract blocker. CORE-061 remains the existing preview dependency, with no new acceptance claim.

## OPP-01 audit/design discrepancy retained separately

The historical matrix requests a fit score on client-matched opportunity cards. Current Figma `411:55991` instead shows match explanations on the opportunity list (`411:56050`, first card `411:56051`, explanation `411:56054`); percentages appear in the separate relevant-budget-program pane (`411:56104`, `411:56114`–`411:56115`). The retained `apps/web/src/features/portfolio/opportunities/OpportunityResults.tsx` matches that opportunity-card design.

Exact pinned references in **`neo-capiro/capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`**:

| Native repository path | Git blob | Relevant semantics |
| --- | --- | --- |
| `apps/api/src/funding-opportunities/funding-opportunity-v2-search.service.ts` | `58f26631019a716b01894829a192b910b65db566` | Projects raw `relevanceScore` and matched signals into the result. |
| `apps/api/src/funding-opportunities/funding-opportunity-v2-search.sql.ts` | `2f902b103d9bf533e1dd98070513c7b2b735830c` | Assigns raw 85/45/30/10 bands or null from matching conditions. |
| `apps/api/src/funding-opportunities/funding-opportunity-v2-search.sql-mapping.ts` | `9957a95d571e1d6389c274a315d85ac18cb7c93f` | Returns the SQL score only for matched-mode results; other modes get null. |

The exact fetched native contents, upstream URLs/blob references and inspected Figma context/screenshot are saved in `outputs/evidence/core-109-file-arrival-20261012/opportunity-discrepancy/`. These semantics are not a probability contract. The existing `apps/web/tests/browser/fixtures.ts` value `relevanceScore: 0.8` is synthetic and does not change that contract. No numeric score is added; this is a current-design/old-audit discrepancy for owner reconciliation, not a newly confirmed missing opportunity UI.
