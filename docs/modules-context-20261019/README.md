# Modules context-state repair - 19 October 2026

Base: `816b0f1470efe978d22856beee9c8133055ab5bd` (main including PR105). Branch: `codex/modules-context-state-20261019`. This branch is independent of Settings PR106.

## Bounded behavior changes

- **Planner / ResourceCatalog:** an opened Reporting dashboard no longer appears under Goals or another resource section. Returning to Reporting retains the selected dashboard. Editor targets capture their original resource kind and ID; the editor, form preview and template-copy dialogs remain mounted at one stable sibling position across resource-section switches and browser history. Unsaved names, descriptions, form answers/files and template-copy input remain intact. No key-based wholesale reset or draft store was added. The existing unmount behavior when leaving resource sections for tasks/projects or another module is unchanged and outside this repair.
- **Intelligence / DataExplorer:** Comment Deadlines clears the selected record, matching ordinary dataset switches. Search and bill facets remain intact; the destination uses Federal Register, page 1 and `comment-close` sorting. A selected bill cannot be relabeled as a Federal Register record.
- **Workspace / DocumentsLibrary:** Mine and Shared with me wait for the current identity and display identity failures with retry. Their rows, counts and pagination remain hidden until the required reads are available. Everyone remains usable independently of identity. Ownership switching and retry preserve local filters and cursor; retry targets the failed read rather than resetting the view.

Only these three feature files change runtime behavior. No shared session/auth/provider/shell, Portfolio, Meri, Core, transport, contracts, dependency, lockfile, deployment or scanner-policy edits are included. No unrelated cleanup or deletion was performed.

## Fresh collision audit

At 19:24 UTC, GitHub main remained the base above. The refresh covered all 106 PRs, 90 updated since October 14 (64 in the strict rolling five-day window), and all 92 open heads. Ninety open heads were already ancestors of main. The two divergent heads were Meri-only PR102 (`3a23d8b1d0f155fb13768c2955e79d37d9cecda5`, 1 ahead/13 behind) and Settings-only PR106 (`553b848303a94b206c3c2efafc0c29c2cb40414a`, 2 ahead/0 behind). Changed files were checked; neither contains these fixes. PR106 explicitly lists these three defects as excluded follow-ups. No outstanding source was duplicated.

## Focused verification

Environment: Node 24.10.0, locked dependencies installed with `npm ci --ignore-scripts --no-audit --no-fund`, installed Chrome, one browser worker, synthetic local fixtures with non-local requests blocked. No concurrent heavy runs, production Next build or broad regression suite.

Before source edits, tests reproduced the stale dashboard, existing/new dashboard editor kind changes, stale bill detail, missing Mine/Shared identity loading/error feedback, stale-identity history handling and misleading document count on error. The first explorer attempt used an invalid string Congress fixture; it was corrected to the existing numeric contract before the actual stale-selection failure was reproduced.

All **12 new browser cases passed**, plus **4 existing regression cases** (Planner/Workspace/Intelligence primary routes and Workspace desktop/mobile filter layout). Coverage includes repeated resource/dataset/ownership switches, browser back/forward, captured create/update payloads, refused-write draft retention, form file/answer retention, template-copy retention, identity pending/error/retry, unchanged filter/cursor input, independent Everyone reads and rejection of a stale history read. Runtime observation assertions reported no unhandled browser exceptions.

The first green pass exposed a missing required `taskField` in the synthetic form fixture and five test expectations using a period instead of the canonical loading ellipsis. Those test-only issues were corrected; the affected cases then passed without further runtime source changes. Six cases passed in the first run and ten in the targeted follow-up, for 16 distinct passing cases.

Commands use `apps/web/test/browser/playwright.config.ts`, with the same browser options, an isolated port (`5299`) and a separately managed instance of the existing `server.mjs`. A temporary local config disables automatic server management only, avoiding the Windows harness teardown wait and allowing the built harness to be reused. The local server was stopped after checks. No harness/config changes are committed.

- New specs: `planner-resource-context.spec.ts`, `planner-resource-dialog-context.spec.ts`, `explorer-dataset-selection.spec.ts`, `workspace-ownership-state.spec.ts`.
- Existing checks: `modules.spec.ts` filtered to Planner/Workspace/Intelligence; `remaining-modules.spec.ts` filtered to Workspace filters.
- Scoped ESLint: exit 0, no errors; two inherited `no-img-element` warnings in unchanged WorkflowCards markup.
- Prettier and `git diff --check`: passed.
- Web TypeScript (`node --max-old-space-size=4096 ../../node_modules/typescript/bin/tsc --noEmit --incremental false` from `apps/web`): passed, exit 0.
- Architecture (`node scripts/architecture.mjs`): **passed, exit 0; 0 boundary errors; 533 size signals, 515 reviewed, 18 unchanged inherited and 0 blocking** after the approved two-record metadata successor. The initial scan had two stale review fingerprints. Both hashes still match the independently reviewed source; no runtime source changed in this successor, so the earlier browser and TypeScript results remain applicable.

## Responsibility review and coordination

<span id="module-context"></span>

Independent Codex source review found no correctness issues in the three fixes. ResourceCatalog retains local selection/dialog ownership and has no size signal. DataExplorer remains one explorer screen owner for dataset/query/filter/page/selection presentation (307 nonblank function-body lines). DocumentsLibrary remains one paged document list owner for filters, required-read status, results/counts and page controls (185 nonblank function-body lines). The canonical shared query layer still owns request lifetime/validation; backend services own access and authority. No second service or persistence layer was introduced.

The exact [approved review records](proposed-size-reviews.json) replace only the existing DataExplorer and DocumentsLibrary entries after explicit parent coordination. Their source hashes were independently verified. All 235 registry entries retain their order and the other 233 remain unchanged. The separate PR106 branch and Settings records were not edited; later integration must retain both PRs' disjoint record updates. No broad waiver, threshold change or runtime expansion is included.

## Design and live-service limits

This is a local interaction/state repair using existing controls and layout. It makes no new Figma parity or motion acceptance claim. The six missing mockups and existing design/API qualification dependencies in `docs/desktop-integration-20261019` remain with their owners; no mockup, endpoint or service behavior was invented. Existing `me.read`, Planner resource operations, explorer datasets and Workspace document operations are reused unchanged. Synthetic checks do not establish authenticated live availability. No merge or deployment was performed.
