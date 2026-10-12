# P7 Work current reads — 2026-10-11

## Pre-edit outline

Base: `0beb51c3593ca801f88fdc4c8b972d209a929760`. This isolated slice addresses source gaps in WORK-01, WORK-02, WORK-03, WORK-04 and WORK-08. It does not mark these audit rows complete; native and signed-in acceptance remain outstanding.

The existing Work page renders retained React Query data after a failed summary or detail refresh. Workspace documents similarly survive failed draft, current-client or client-catalog reads. Strategy detail validation checks shape but does not bind the real response IDs to the requested strategy and client. The legacy Workspace name matcher also accepts a unique same-name catalog entry belonging to a different client when the current client is absent.

### Ownership and intended changes

- `work/contracts.ts` owns native response validation, exact Strategy ID/client association and the legacy Workspace association rule. Require the requested current client to be the sole matching-name entry in the successful client catalog; do not infer a missing Workspace client ID.
- `work/queries.ts` owns existing GET requests, cancellation and scoped detail keys. Bind detail validation to the requested strategy and client without changing native endpoints or payloads.
- `WorkPage.tsx` owns the current summary/detail composition. Only successful, error-free reads may supply cards, links, counts, upcoming work and risks. A failed detail removes its derived content while other verified details and Workspace remain usable. Totals requiring every detail remain unknown until that feed is complete.
- `WorkspaceDocuments.tsx` owns the three-read association gate and document presentation. Include the current client in loading, error and retry behavior. Failed or mismatched reads suppress document rows and their deep links without replacing unknown data with a successful empty claim.
- Dedicated Work tests exercise retained-cache failure, response association, recovery and source changes. Existing Work document and domain assertions remain intact. No shared query framework, new service architecture, editor or mutation is needed.

Preserve native live-plan and linked-artifact projections, the existing active/in-progress and incomplete-risk rules, the half-open 30-day window, the first-five non-completed strategy node presentation and configured existing-application routes. Planner tasks are not substituted for Strategy nodes. Workspace remains a legacy exact-name projection of documents the native service permits this actor to read.

### Verification plan

First add synthetic baseline cases against the unchanged source, including the absent-current-client name collision. Capture focused browser failures when the root regression releases port 5191. Then implement the bounded fixes and run the same cases, original Work browser coverage, relevant unit tests, typecheck, lint and formatting. Inspect the changed error/availability presentation at desktop and phone widths. Supply exact changed function fingerprints and individual cohesion rationales for root review; do not edit the central review registry.

## References inspected before edits

- [Work desktop, 411:52106](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-52106), [Work error, 411:52437](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-52437), and [Work phone, 411:86349](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-86349): fresh design context and screenshots retrieved using the design-to-code skill. The error design withholds unavailable Strategies and exposes Retry. This guard repair retains the existing components, tokens and assets; it is not a claim that inherited page layout matches every Figma frame.
- Native references are pinned to `neo-capiro/capirov2` commit `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`: [Strategy controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api-strategy/src/strategy/strategy.controller.ts), [Strategy service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api-strategy/src/strategy/strategy.service.ts), [Workspace drafts controller](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/workspace/src/drafts/drafts.controller.ts), [Workspace draft DTO](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/workspace/src/drafts/dto/draft.dto.ts), and [Workspace drafts service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/workspace/src/drafts/drafts.service.ts).
- Strategy list excludes archived strategies and counts only live nodes. Detail includes the native strategy/client IDs, live nodes ordered by start date and attached artifacts, returning 410 for an archived strategy. No new echoed identifier is required.
- Workspace `GET drafts?scope=all` means the actor's owned and active shared documents, further filtered by native source access. Its slim projection contains a nullable client display name, document status and updated timestamp; it does not provide a client UUID or agent completion state. Existing `draft`/`complete` status meaning is preserved.
- The same pinned [Clients service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/clients.service.ts) was read from the independently preserved P6 native reference. `get` selects the exact client and tenant and returns the native Client including `id`; the default list filters the tenant and excludes archived clients. The Work view checks that real ID without adding a tenant or revision echo.
- Repository AGENTS, implementation standards, architecture guidance and the installed Next 16.4 `use client` guide were read. Routes and shared session boundaries remain outside this feature slice.

## Current bounded result

Four existing source modules changed. `work.module.css`, shared components, routes, request endpoints and native status/projection meanings are unchanged. A retained failed Strategy list can no longer drive detail content or a successful-empty claim; a failed individual detail removes only that Strategy's content, links and derived items. Strategy and Workspace feeds remain independent. Workspace cannot expose document rows after any of its three association reads fails, or after a mismatched current Client response.

The added Strategy response validator retains the native shape/UUID checks and binds the response's existing `id` and `clientId`. Detail cache keys now include the client. No Strategy/Planner mutation, duplicate editor, derived Planner task or invented Workspace client ID was introduced.

### Execution and evidence order

1. The new Workspace association unit baseline ran against unchanged `0beb51c`: **3 passed, 1 failed** at the intended absent-current-client assertion. Original tests were untouched.
2. All five pristine Work feature files were copied from Git `0beb51c` and verified byte-for-byte against the working source. SHA-256 identities are in `outputs/evidence/portfolio-work-current-reads-20261011/baseline-feature/manifest.json`.
3. The fixes were implemented while root's full browser suite held port 5191. Fixed focused units pass **11 selected cases**, with four unrelated domain tests explicitly skipped by the Work-only name filter. Typecheck, focused lint, formatting and `git diff --check` pass.
4. Fixed feature source was separately frozen in `outputs/evidence/portfolio-work-current-reads-20261011/fixed-feature/manifest.json`. During the assigned browser window, the exact baseline source was restored and verified. The 16 new synthetic browser cases produced **14 intended failures and 2 passes** in 98.15 seconds. Failures exposed retained Strategy counts/cards, retained Workspace rows after each failed feed, mismatched native IDs, a reused cross-client detail cache and the cached-empty claim. The late-removed-detail and healthy native-projection checks already passed. Baseline source hashes were checked again after the run.
5. The frozen fixed feature files were restored and verified before the final cohort. **All 18 cases passed** in 25.9 seconds: the same 16 cases plus both unchanged Work document tests. No source or test changes were made between these browser cohorts. Fixed source hashes matched again after the run. Port 5191 was released and verified free. The baseline browser run occurred after implementation against the exact saved Git source; it is not presented as a pre-implementation browser run.

The 11 selected unit cases cover exact native Strategy/client response identity, retained native UUID validation, Workspace draft/status shape without a fabricated client UUID, absent/duplicate/renamed client-name association, and the two unchanged Work date/association assertions in `domain-behavior.test.ts`. Raw unit reports are `apps/web/work/work-current-reads-evidence/unit-baseline.json` and `unit-fixed.json`.

Raw browser reports are `apps/web/work/work-current-reads-evidence/browser-baseline.json` and `browser-fixed.json`, with failure traces/context retained in `browser-baseline/` and final captures in `browser-fixed/`. Source restoration/completion receipts are in `outputs/evidence/portfolio-work-current-reads-20261011/`. The evidence manifest inventories exact source and artifact hashes; these are synthetic checks, not native signed-in acceptance.

### Rendered review

The final captures were opened and inspected against the fresh Work desktop/error/phone Figma context. At 1440px and 390px, failed Strategy data and its deep links are absent, counts are unknown, Retry remains usable, and healthy Workspace documents remain available. Recovery restores current records. The unchanged document integration test also captures desktop and 390px dark mode, retains exact link assertions and verifies no page-level horizontal overflow.

This slice changes read gates and association validation, not CSS, assets or the inherited page composition. Two observed frontend presentation gaps remain: the phone document view uses a horizontally scrollable table, with its row action initially to the right, whereas `411:86349` specifies stacked cards with a visible action; the generic QueryState/count layout differs from the compact unavailable-Strategy treatment in `411:52437`. The existing sidebar/header and broader Work layout were not requalified as pixel-exact. These are frontend presentation follow-ons, not missing service contracts. The exact Figma screenshots were saved as validated PNG evidence; no screenshot became a UI asset.

### Cohesion review

The changed source contains no file over 400 nonblank lines, no untyped `any` and no remote origin literals. Exactly two function bodies exceed 80 nonblank lines: WorkPage (168) and WorkspaceDocuments (102). Both compose a single read-only view around its current-source gate; schemas/projections and requests retain distinct existing owners. Individual, exact-fingerprint retention rationales are in `P7-WORK-CURRENT-READS-20261011-SIZE-REVIEW.json` for independent root review. No central review registry was edited.

### Remaining native and acceptance gates

Strategy/Planner availability is still governed by the native tenant and feature guards. Archived Strategy detail responses remain native 410 outcomes. The page reports only the existing live-node and attached-artifact projections; no broader workflow completion metric is inferred. Workspace documents remain limited to native actor access and legacy client-name matching. Renamed clients, duplicate names and archived/absent catalog membership can leave documents unassigned here; this repair does not migrate that association or revoke an already-issued external link.

Synthetic fixtures establish the frontend's refusal, recovery and presentation behavior. Actual native authorization/revocation, service availability, configured external destinations, signed-in navigation, native persistence and full Figma/P7 acceptance remain open. WORK-01–04/08 remain open audit rows, and this slice does not claim Strategy/Planner lifecycle activation or completion of the Work area.
