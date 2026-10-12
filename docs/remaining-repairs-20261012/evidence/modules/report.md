# MS07–09 bounded Modules repairs

Base: PR14 evidence head `7aca86e7d64cfdb85d09d424a07e6186339fc24c`; isolated branch `repair/capiro-remaining-modules-20261012`, worktree `/workspace/capiro-remaining-modules`. Shipping candidates and prior evidence are untouched. Final commit: `b5eaadd031580edca79e9d99de2c0ab14d59997c`; apps/web tree `1235d7501b627a8be327800373ea1ab2314fdf5c`.

## Behavior and ownership

- **MS08 / frame411:95475:** All tasks defaults to client sections with current-page shown/open counts, current project labels, compact assignee labels, Open client navigation and a Group by None option. The existing TaskList remains the sole row/action renderer. `task-client-groups.ts` groups only the supplied permitted task page: direct task client wins; a single known project client is a fallback; multiple clients, missing project associations and unavailable client names stay explicitly distinguished. No row is duplicated. The canonical `taskMatchesClient` direct-client OR project-membership predicate is byte-unchanged.
- `PlannerClientScope` owns All tasks picker navigation through the existing `clientId` URL and shared verified-client lifetime. All tasks remains selected across scope/history; task/create intents are removed on deliberate scope change. Failed client-catalog reads disable the picker and remove catalog-derived labels/links until retry. An independently verified selected client retains its own name even when the optional catalog fails or omits it. My tasks retains its prior request behavior.
- **MS07 / frame411:112533:** Workspace's own CSS now sizes the actual Radix combobox trigger buttons and wraps them on phones. Document ownership, query, cursor and filtering logic are unchanged.
- **MS09 / frame411:108618:** PublicForm owns a muted page,680px/32px card, internal eyebrow,40px heading, bounded submit and error strip before the submit control. Existing FormAnswers, native validation, visible-answer filtering, uploads, abort/in-flight guards, receipt validation, input retention and token replacement remain canonical and unchanged.

## Design baseline

`design-baseline.json` pins the original file/nodes, capture-completion timestamps, full context/screenshot paths and SHA256 hashes. Complete initial design contexts and PNGs are preserved locally; no Figma edit, replacement design or further live refresh was performed. The provider returned no version identifier. Root owns GitHub preservation of these artifacts; the earlier original assessment remains in Git.

No new static asset is consumed. Existing Geist, shared tokens/primitives and exact existing image assets remain. Native file inputs and task selection/completion controls retain their existing behavior; task-group headings and tables adapt the authored grouping without inventing service totals or access semantics. Shared shell/header geometry is outside these three findings.

## Verification and boundaries

- Focused unit controls:16/16 passed, including7 grouping cases, form conditions, task presentation and anonymous public-form contracts (`unit-green.log`).
- TypeScript passed. Targeted lint passed with two inherited exact-image advisories and no errors. Final format/diff checks pass; browser qualification is recorded below.
- Architecture dependency errors are empty. `structure-review.json` contains exact source hashes/fingerprints and specific responsibility rationale for all changed size signals. Registry review is owned by root; the size gate remains pending integration acceptance, not silently waived.
- Root independent static review found no source defect. All source hashes in `root-static-review.json` match the final source except planner.module.css: the subsequent one-line fixed-to-auto table layout correction is qualified below and its current hash/fingerprint is in `structure-review.json`.

Grouping/scope are frontend presentation of existing returned records, not a new native client filter or authorization rule. Pagination remains native current-page pagination; counts are not whole-firm totals. Local grouping preference is not a new saved-view/native field. No native/provider/AWS/browser-auth environment was contacted. No whole337-row acceptance is implied: these three supplementary Modules findings have no original337 row assignment.


## Final browser qualification and visual review

The exact eventual regression spec fails all three intended controls on immutable PR14 source capsules: absent named client groups (MS08),150.59px vertical spread of Workspace controls instead of a compact row (MS07), and a15px PublicForm heading instead of40px (MS09). `browser-red-final.json/log` preserves that run. The six original source capsules were checked byte-for-byte against7aca86e; no frozen worktree was altered.

The first candidate passed11/11 behavior controls. Manual screenshot review then caught equal-width table columns which wrapped short task names. `browser-group-width-red.json/log` proves the new geometry assertion fails at179.66px. The bounded correction changes grouped table-layout from fixed to auto, allowing the existing cell widths to allocate task-name space. Final candidate `browser-final.json/log` passes11/11, including the width assertion. The initial green attempt and width-red attempt remain preserved.

`browser-preservation.json/log` passes25/25 existing controls without modifying any existing test: PR14 Calendar verified-client scope and view/date history, separate start/due occurrences and independently successful feeds, linked-task identity/project membership/current-read rejection, tenant/client replacement, Planner modes and failed-write draft retention, public visible-answer submission/received receipt/revoked capability, plus the two selected existing Engagement controls. All runs used one Chromium worker,zero retries,synthetic HTTP fixtures and the shared allowed executable. No full build or whole suite ran.

Six final desktop/phone screenshots under `browser-final/` were inspected against the original preserved Figma screenshots. Desktop client sections retain compact project/assignee/date/status metadata; the phone table scrolls inside its card. Workspace desktop filters share a row and phone controls wrap within the viewport. The public form uses the authored card/header/error/submit hierarchy at desktop and phone widths. Task selection/completion controls, canonical native field rendering and inherited shared shell remain; no unsupported prototypes or invented service totals are added. The public-form fixture intentionally has one text question; native conditional/file questions are covered by the preserved canonical tests rather than fabricated screenshot fields.

`final-source-and-checks.json` pins the commit, all11 changed files and exact check results. `source-before-browser.json` and `structure-review-before-width-correction.json` preserve the earlier candidate. `server-closed.json` records owned final server PID744404 stopped and5197 TCP closed before the lease was returned to root. Borrowed node_modules remains an unchanged symlink for integration/review. Root owns shared architecture records, independent final acceptance, GitHub evidence preservation and combined qualification.


## Size-review packet correction

Root detected an omitted whole-module TaskViews review after integration. The final scanner already reported this408-line module (fingerprint5361d74ae5d725d4b128d1755b80b41f7aa9cb36af3f54135df01f3125a1bb2a), alongside TaskList135. My packet refresh updated hashes for its earlier eight-entry list without adding the module entry after the grouping/assignee presentation crossed400 lines. This was an evidence-enumeration omission; no source or scanner change was involved. `structure-review.json` now includes the exact whole-module responsibility analysis and all9 current changed-source signals, checked as a set against `architecture-final.json`. Root owns independent module acceptance.
