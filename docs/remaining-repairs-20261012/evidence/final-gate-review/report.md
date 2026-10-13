# Independent qualification checkpoint: 104495d

**The 104495d checkpoint is not fully qualified.** Portfolio stopped with 163 passed, 7 failed, 3 interrupted and 945 unrun. The completed non-Portfolio gates remain valid evidence for this exact source; they do not turn the stopped suite into a pass.

Source: `104495d4cdc8251640b922aea431fa0e169fe935`; tree `01e6c338048c507dab0d2f3ba6fafa02912bc003`; application tree `ad282f731750e1984790de2ec266ff9e311581c9`. The gate receipts consistently show this source before and after execution, empty source diffs and no source change. Raw evidence is `/tmp/capiro-remaining-qualification/final-104495d`.

This is an independent read-only audit of raw results, frozen test assertions and production source. I did not rerun tests, start browsers, build, typecheck, edit source or call native services. The initial in-progress observation is preserved separately in `initial-partial-snapshot.json`.

## Counts independently verified

| Gate | Observed result | Evidence |
| --- | --- | --- |
| Combined check | **1,471 passed = 58 + 21 + 1,275 + 117** | Four raw summaries in `combined-check.log`; exit 0 |
| Elements | **15/15**, separate from 1,471 | `elements-check.log`; exit 0 |
| Modules browser | **208/208**, 208 attempts, no retries/skips/flaky/unexpected | `modules-browser-results.json`; one worker, retries 0, exit 0 |
| Portfolio browser | **163 passed / 7 failed / 3 interrupted / 945 unrun** | `portfolio-browser-results.json`; 1,118 planned records, three workers, retries 0; exit 130 after recorded SIGINT |
| Production | One successful Next build; 11 HTTP checks, four viewport/theme render controls, two cross-mode history controls | `production-build.log`, `production-artifacts/production-smoke.json`; build ID `3iUKAoD4mmM7JLQlh3fho` |

The combined parts are root Node tests (58), offline transport qualification (21), Portfolio Vitest (1,275 across 89 files) and shared Capiro Vitest (117 across 21 files). Meri's nine run-workspace Node tests are already included in the 58. Playwright's raw `skipped: 948` comprises three interrupted attempts plus 945 cases without an attempt; it must not be described as 948 completed skips.

Architecture reports zero boundary errors, 427 size signals, 403 reviewed, 24 inherited unreviewed and zero blocking. Lint reports zero errors and 76 warnings. These remain visible qualifications, not a warning-free claim.

The initial clean install failed with exit 254 while creating `/home/agent/.npm/_cacache`. The preserved follow-up command used the explicit writable cache, exited 0 and installed 847 packages. No source changed during either attempt.

## Stopped Portfolio diagnosis

All seven failures are in `apps/web/tests/browser/attendance.spec.ts`, at lines 126, 171, 201, 234, 330, 353 and 383. Each fails in `openMeeting` at line 103 while expecting the “Meri meeting attendance” region. The helper opens a future 2099 meeting and does not select its **Information** section.

Frozen production source explains the mismatch: `MeetingDetail.tsx:95` initializes the selected tab through `initialMeetingTab`; `lifecycle.ts:34` selects Preparation for upcoming meetings; the attendance component is rendered only under Information (`MeetingDetail.tsx:131`). This supports the navigation-helper diagnosis. The seven cases still **failed**, and their later attendance assertions were not exercised. A deliberate navigation correction and a successor exact-source qualification packet are required.

The 1,118-case suite selects only `apps/web/tests/browser/**/*.spec.ts` through `apps/web/playwright.config.ts:3`. Label it **Portfolio browser**, not a separate Portfolio/Meri interaction suite. Meri currently has the nine Node controls, 21 offline transport controls, asset checks, shared-mode integration and actual Next shell/history coverage. This suite does not establish fresh Meri workspace/cited-answer browser interaction acceptance.

## Requested coverage map

`report.json` provides exact file/line/title/result mappings, each attempt, outcome counts per gate, raw receipt identities and evidence/source hashes. Mappings include unrun cases explicitly; source assertions are not passing results.

| Requested gate | Exact controls inspected | Established scope and remaining limit |
| --- | --- | --- |
| Cross-mode / back-forward | `test/browser/integration.spec.ts:37`; `next-modules-scope.spec.ts:13`; `next-modules-view-persistence.spec.ts`; production `verify-standalone.mjs` | Completed Modules fixtures verify client hints, draft/style scope, Calendar view/date and history. Actual Next verifies same-document Meri/Portfolio/Modules/Settings navigation in light/dark. Actual protected content is setup-only; live authenticated navigation remains unrun. |
| Sign-out / expiry | `test/browser/session.spec.ts:20,53`; `integration.spec.ts:169`; `ApplicationBoundary.tsx` | Completed synthetic identity changes remove protected content; mocked Core 401 expires above client replacement and does not replay. This is not live Clerk logout, token expiry or revocation acceptance. |
| Tenant / client replacement | `integration.spec.ts:120`; `next-modules-scope.spec.ts`; `prospect-draft-pending-edit.spec.ts:196`; `meeting-detail-current.spec.ts` | Completed Modules controls reject held old-scope reads and clear old drafts through the shared boundary. URL client selection remains a hint; native server authorization is separately unrun. Corresponding selected Portfolio cases remain explicitly unrun. |
| Interrupted writes | `prospect-draft-pending-edit.spec.ts:111,166`; `prospect-workspace.spec.ts`; `newsletter-staging.spec.ts`; Portfolio `activity-command.spec.ts`, `files-delete-recovery.spec.ts`, `prospect-upload-restart-acceptance.spec.ts` | Completed Modules cases cover held PATCH/snapshot success, failure and loss; retained intent, no automatic replay, read-back, actor replacement and restart. The report identifies which early Portfolio activity cases passed and which later file/upload cases did not run. Mocked receipts/storage do not qualify native CAS, durability, S3, delivery or billing. |
| Desktop / mobile / accessibility | `calendar-visual-closeout.spec.ts:6`; `settings.spec.ts:118`; `remaining-modules.spec.ts`; `meeting-detail-current.spec.ts`; Portfolio `visual.spec.ts`, `dialog-disabled-focus.spec.ts`, `mail-rich-compose.spec.ts` | Completed Modules tests cover responsive geometry, keyboard controls and focus return. Portfolio visual/focus cases later in the stopped run remain unrun. Actual Next setup screenshots were independently inspected at 1440 light and 390 dark: legible and contained. No full WCAG/screen-reader/contrast/zoom/touch/cross-browser certification. |
| Figma | `docs/remaining-repairs-20261012/design-baseline/README.md`; exact asset Node tests; lane context/capture evidence | Selected original assets and contexts are preserved; bounded geometry checks are meaningful. Screenshots are not full pixel comparison. No immutable full-file Figma revision is verified. CR-10 original `435:82802` remains 1×1 and parent `435:82147` clipped; full composer visual acceptance remains open. The initial preservation table must be read with later lane evidence. |
| Public package / transport separation | `scripts/public-packages.mjs:9`; `scripts/architecture.test.mjs:10,52,122`; `packages/qualification-transport/qualification.test.mjs`; `packages/qualification-elements/qualification.test.mjs` | Completed byte/export/boundary checks and real factory + external Chat composition pass with injected mock fetch. Detach is local, stream completion is not run completion. Elements is restricted offline SSR, not browser styling or G1/native runtime admission. |

The production smoke explicitly runs without credentials, fixture identity or service interception; 503 fail-closed adapters are expected results. The four renders are two viewports × two themes, and the two history controls are one per theme. They do not show authenticated feature content or native calls.

Elements receipt SHA256 is `a3cfd3651afd351107bbc22e6b8ce83416717942c474c7b57b412e3ead53ee02`. I independently checked all 48 recorded source files and all three generated outputs against their hashes and byte lengths, plus both public vendor tarballs against their manifest bindings. The scope remains “Offline SSR fixture; not browser/product/G1 admission.”

All 337 native rows retain their individual acceptance requirements. Native authentication, persistence, DDL/deployment, provider effects and complete Figma/accessibility acceptance remain unrun here. A local Next build and standalone smoke do not qualify the deployed image or shipping environment.
