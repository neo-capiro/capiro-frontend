# Meri cited-answer consolidation outline

Date: 11 October 2026 UTC. Owner: Codex. Branch: `task/meri-ui-consolidation-20261011`.

## Inputs and ownership

- Exact local base `85e96b968a3e984407886b2e06536b20810eccef`, tree `9d662c6d1090af8211a459e9ff95310242ec21da`, source equivalent to frontend PR4 `ad04c660a8a181aa99b4786bf51926dd4957ea3a`.
- Preserve the unique work in frontend PR1 `b697cfcba6589ef193de4e3bcb25aad773871125`, tree `437e57d0095f0fdaa175b99a003c0d92b0bb7472`. Its 35 changed paths contain 28 additions and seven modifications absent or different in PR4.
- Writable scope: those 35 paths, focused `apps/web/test` checks, this task, matching consolidation report, and `docs/qualification/candidates/cited-consolidation-20261011/**`. No dependency/lock, Portfolio, backend, cloud, or remote Git changes.

## Responsibilities and interfaces

- A thin `/meri/fixture/cited-answer` route composes the canonical `ProductShell` and `MeriCitedAnswer` feature view.
- `MeriCitedAnswer` owns the synthetic answer, table, labelled source disclosure, local clipboard feedback and editable follow-up drafts. Shared `MeriComposer` continues to use adopted AI Elements through the public `@capiro/ui/prompt-input` export.
- `DesignIcon`, `Header`, `Sidebar`, `ProductShell` and `MeriComposer` receive an optional `home | cited-answer` asset set, defaulting to the existing Home behavior. Shell layout/tokens remain canonical.
- Consolidate the overlapping `Sidebar` changes: retain PR4's Routines label/icon for Home; add PR1's exact cited-answer assets and return-to-Home routing. Do not replace an old whole tree or revert Portfolio consolidation.
- Reuse all 22 exact PR1 asset bytes and its immutable manifest. Fresh Figma design context and screenshot for file `Zc2dEN5aLU47dVdsewDmiJ`, frame `442:81682`, are the design reference. Keep transient URLs out of runtime.

## Boundaries and failure ownership

All identities, citations, answers and counts remain visibly synthetic. Drafts and source disclosure live in the page only; clipboard failure receives bounded visible feedback. Send, Attach, Retry, Fork, Helpful, Portfolio and Modules actions remain disabled where no authorized live contract is integrated. No browser state establishes actor, tenant, scope or source authority. No live provider, source connection or deployment is exercised.

## Verification

Verify recovered file bytes against the external PR1 Git blob hashes. Preserve all pre-existing Home, Portfolio and package/lock bytes outside the approved overlap. Add asset integrity coverage and perform the required package checks, workspace type checks, original tests, architecture guard, transport suite and production build. Use actual Playwright browser inspection at 1440×1040 and 390×844 for cited-answer layout, all static asset geometry, copy/source/follow-up interactions, disabled actions, root route navigation, new-conversation reset, Home behavior and the three labelled mode toggles. Retain bounded command, screenshot and behavior evidence; stop owned server/browser processes and remove only owned dependency links.

## Runtime and source recovery

Use the pinned installed Node runtime and borrow already-installed immutable dependencies without installation or modification. Record the borrowed paths and owned links. The local PR1 commit/tree exists but selected blobs are lazy; a blocked first blob read is not an implementation defect. Continue through the approved GitHub connector only, with `GIT_NO_LAZY_FETCH=1` for subsequent object reads. No remote refs are changed.

## Return boundary

Completed bounded source preservation and local fixture verification are recorded in `docs/coordination/reports/CODEX-MERI-CITED-CONSOLIDATION-20261011.md`. The latest human handoff makes Portfolio continuation's forthcoming consolidated `apps/web` and shared `HeaderFrame` the canonical frontend base. Freeze this exact local candidate for root review; no publish or merge. Root must reconcile the seven shared/fixture paths against the reviewed Portfolio source before accepting the combined application/image. No separate frontend application, image or hostname was added.
