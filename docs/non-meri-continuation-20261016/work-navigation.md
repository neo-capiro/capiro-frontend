# Work to current Strategy navigation

This bounded source slice starts from PR56 `3ef15d9a8ae6a27a9c2f39ccd923b5e2e07797cd`. It preserves the deployed `9da3616a` preview, PR56 Objective/generated receiving routes, Meri ownership, and the separately edited Engagement Commitment/Overview files.

The current Portfolio Work frame is [1064:166690](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki/Capiro-3.4-Portfolio?node-id=1064-166690). Its captured current design context is `audit-evidence/figma34/portfolio/context-1064-166690.raw.json`. This slice repairs the existing Open Strategies, New strategy, Open strategy, and Open step/risk interactions; it does not change visual layout or introduce a new product workflow. Playwright visual parity has not begun.

## Ownership and design

- `WorkPage.tsx` uses internal navigation rather than requiring the legacy external application origin. Workspace retains its own existing destination behavior.
- New `shared/capiro/strategy-navigation.ts` owns pure Strategy URLs and query selection. `currentStrategyHref` is the deliberate shared entry for current authorized resource links. URL values remain selection hints, never authority.
- `StrategiesScreen.tsx` owns ordinary Strategy view/client/detail/create navigation and consumes it from the current query, so reload and browser history keep the selected view. Existing generated Objective routing remains outside this owner.
- `StrategiesLibrary.tsx` changes only its open callback to include the actual row client ID.
- `StrategyTimeline.tsx` reuses the existing detail query. A requested step opens only after exact Strategy/client detail admission and unique current node membership; invalid, missing, archived or foreign nodes show unavailable without silently opening the whole Strategy or a creation form.
- `StrategyCreate.tsx` reuses the existing creator and catalog. An initial client hint must be found in the current catalog before creation, and successful creation navigates from the acknowledged Strategy result.
- Dedicated native navigation tests and browser cases cover this slice. No API descriptors, registry, shared HTTP, package/lock, shell, tokens, Meri, cloud or deployment changes belong to this slice.

## Verification boundary

Use only focused bounded native checks under the current light-work admission. Author browser coverage without launching a browser; Qualification owns heavy browser/build execution. Existing canonical backend authorization and wall/current-source checks remain authoritative. Mobile is deferred.

The first formatter attempt failed with `MODULE_NOT_FOUND` because the new continuation has no local `node_modules`; no install or junction was created. The dependency-free native navigation controls then passed 11/11 under Node24.19.0 with a128MiB V8 cap, one process/no test isolation children, and a10s per-test deadline. The pure helper has not changed since that run. The duplicate-selector test fixtures were subsequently isolated so their rejection cannot be masked by another invalid selector; that strengthened test source is not rerun yet.

The next formatter/rerun batch refused execution before launching a Node child at `2026-10-16T11:03:06.6290356Z`: available commitment711,528,448bytes was below the1.25GiB light-batch threshold. The permitted physical PR56 formatter is ready for later use; there is no install/junction workaround. The rendered Work link test and nine browser cases are authored but UNRUN; semantic typing/build and visual qualification remain UNRUN. No source is committed or staged by this slice while the root shared working tree is being assembled.

The existing Execution-runs caller `strategies/runs/RunActions.tsx` still builds the old `strategyId`/`nodeId` query without a client witness. That separate caller is unchanged and remains a navigation gap; it must not be made to grant client scope by blindly accepting URL aliases. Preview read-only admission and actual backend availability remain separate owners.
