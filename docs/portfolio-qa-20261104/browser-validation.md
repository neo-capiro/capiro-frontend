# Portfolio QA browser validation

Browser validation used synthetic, intercepted data in the existing React/Vite component harness. No live site, signed-in session, customer data, backend service, or deployment was used. Fill with Meri and Objectives were excluded.

## Source and environment

- Base: `36359c4868ce95cddd48439f2524555b4cfd004f`.
- Integrated production changes include frontend data `55554c8f`, configured tracker coverage `139d113e`, workflow `1581abc5`, nullable contacts `5fe89a89`, retired folder mode `a3f71c13`, dialog identity `c5c9dccd`, file dialog design `0c5d9572`/`42271b1d`, template dialog `ec5131ea`, and local return validation `412df552`.
- Final browser worktree source checkpoint before this test commit: `f87bbe91`.
- Node `24.22.1`, npm `11.9.0`, pinned Playwright `1.61.1`, Chromium `153` via the task-provisioned executable. Ports `5195` (Portfolio) and `5196` (Modules), one worker.
- New tests use the existing `installFixtures`/operation fixtures. Foreign requests are blocked except the explicit intercepted synthetic storage URL used by the upload test.
- The test-only Next Link adapter now invokes documented `onNavigate` for internal, unmodified client navigation and supports cancellation. It excludes external, download, modifier-key, and new-target navigation. No production navigation was simulated by calling the scroll helpers directly.

## Results

Across the selected suites: **44 distinct cases passed, two inherited cases failed, no skips**. Final targeted reruns passed: Portfolio data 5/5, prospect workflows 4/4, files 2/2, proposal templates 5/5, and metrics 6/6. Existing file access/selection/move and Customize cases contributed the remaining passing coverage.

| Coverage | Observed behavior |
| --- | --- |
| F01 | Legacy stage is retained until an explicit supported stage is chosen; one PATCH changes stage and previous activity remains. |
| F03 | Failed extracted-text GET exposes Recheck; recheck returns saved text without processing writes. Existing removal, denial, quarantine and stale-reader checks pass. |
| F06 | Untitled choices use distinct readable slug names, product, ownership and version; selected published content is previewed; no write occurs before creation. Existing exact-pin, lost-receipt and mismatched-receipt checks pass. |
| F07 | September 17 date-only action remains September 17 in both table and detail under America/Los_Angeles. |
| F09 | Configured tracker owner is sent and echoed; mismatched Core/Intelligence metrics are rejected. |
| F12 | Empty folder creation needs no selection. Upload here preselects the folder; confirmation saves it there and it remains after reload. |
| F13 | 35-event activity starts with 10, expands to 20, resets, filters by text/date, opens full history, collapses, and supports native section anchors. |
| F14–F17, F21 | Pending capacity says checking, first Customize succeeds without retry, Type says Client, prospect search copy matches, client actions are hidden in prospect context, empty client tables are omitted. |
| F19 | No scoring is Not scored; only a confirmed computed empty result displays zero matches. |
| F20 | Search, stage, owner and visibility survive return; the actual scrolling `#main` container returns to its saved position. |
| F22 | Archived/Converted treatment appears near the title; restore and linked-client actions remain reachable. |

File dialogs passed full default axe checks in the desktop creation and upload states and the 390px upload state: **zero violations**. Keyboard focus reaches the visible file-chooser button; Enter opens the chooser. Desktop width is 520px and the dialogs fit within 358px at a 390px viewport. These checks are bounded evidence, not complete accessibility conformance.

## Design evidence

Rendered views were inspected against `docs/portfolio-qa-20261103/FIGMA.md` and its captured Components frame. The initial generic file dialogs differed; that finding led to scoped header/body/footer, 520px width, Cancel actions and visible upload chooser fixes. Final file dialogs match that structure and show no clipping in the checked desktop/narrow states. Lifecycle and section navigation retain the reviewed card/status/control treatment. Proposal preview uses the same modal frame and shows the actual selected published definition; its height grows with content.

Screenshots in [browser-evidence](browser-evidence) include [new folder](browser-evidence/empty-folder-create.png), [narrow upload](browser-evidence/upload-current-folder-mobile.png), [archived lifecycle](browser-evidence/archived-prospect-desktop.png), [bounded activity](browser-evidence/prospect-activity-bounded.png), [converted lifecycle](browser-evidence/converted-prospect-return.png), and [proposal preview](browser-evidence/proposal-template-readable-preview.png). They are component comparisons, not pixel-diff baseline certification or live acceptance.

## Preserved failures and commands

The 41-case Portfolio run initially returned 35 passes and six failures. Four failures were new-test fixture omissions for Watch/Alerts reads; explicit unavailable synthetic responses resolved them, and all four prospect cases passed in the final run. The remaining two failures reproduced on an untouched detached checkout at the exact base with the same browser/runtime:

1. `files.spec.ts` / Master calendar: expected the obsolete visible text `Government forecasts unavailable`; current calendar shows the source-specific coverage notices instead. All earlier client/date/timezone assertions passed. This unrelated assertion was preserved.
2. `portfolio-customize-entry.spec.ts` / unavailable saved ordering: expected zero cards after a 404 but both baseline and changed source show the two accessible cards. The existing failing assertion was preserved; the new first-load Customize regression passes.

Commands ran from `apps/web` using `../../node_modules/.bin/playwright`:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<chromium> CAPIRO_COMPONENT_TEST_PORT=5195 playwright test --config playwright.config.ts tests/browser/portfolio-qa-data.spec.ts tests/browser/portfolio-qa-files.spec.ts tests/browser/portfolio-qa-prospects.spec.ts tests/browser/portfolio-metrics.spec.ts tests/browser/files.spec.ts tests/browser/files-boundary.spec.ts tests/browser/files-browse-selection.spec.ts tests/browser/portfolio-customize-entry.spec.ts --reporter=list
# Initial combined run: 35 passed, 6 failed. Four fixture failures resolved below.

PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<chromium> CAPIRO_COMPONENT_TEST_PORT=5195 playwright test --config playwright.config.ts tests/browser/files.spec.ts tests/browser/portfolio-customize-entry.spec.ts --grep 'Master calendar|unavailable saved ordering' --reporter=list
# Untouched base: 2 failed with the same assertions.

PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<chromium> CAPIRO_COMPONENT_TEST_PORT=5195 playwright test --config playwright.config.ts tests/browser/portfolio-qa-prospects.spec.ts tests/browser/portfolio-qa-files.spec.ts --reporter=list
# Final file behavior/design: 2 passed; prospect Alerts query fixture was corrected next.

PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=<chromium> CAPIRO_COMPONENT_TEST_PORT=5195 playwright test --config playwright.config.ts tests/browser/portfolio-qa-prospects.spec.ts --reporter=list
# Final source including 412df552: 4 passed.

CAPIRO_QA_CHROMIUM_EXECUTABLE=<chromium> CAPIRO_BROWSER_TEST_PORT=5196 playwright test --config test/browser/playwright.config.ts test/browser/prospect-template-adoption.spec.ts --reporter=list
# Final template modal: 5 passed.
```

Scoped ESLint, Prettier and `git diff --check` passed. Browser servers and browser processes exited with their test runners. Raw failed traces remain in ignored local test output; only bounded synthetic screenshots are checked in. Root owns complete TypeScript/build gates, independent source review, backend/database qualification and any later disposable/live acceptance. No browser-level claim is made here for F02 provider recovery, F04 saved preparation remediation, F08 real district evidence, or fresh conversion against a real backend.
