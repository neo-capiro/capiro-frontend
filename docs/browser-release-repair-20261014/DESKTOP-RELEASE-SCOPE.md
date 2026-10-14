# Desktop-first release scope admitted by Neo

Neo explicitly requested desktop priority and deferred mobile. Further mobile-only remediation and mobile/detail parity stopped when this instruction arrived. The nearly completed useful unfiltered validation was retained: it is the shortest remaining complete desktop/shared path, not an expansion of mobile work.

## Exact selection

Primary: `npm run test:browser -- --workers=3` with committed `apps/web/playwright.config.ts`, all `apps/web/tests/browser/**/*.spec.ts`,1300cases, default viewport1440×1040, retries0. Modules/Meri/shared: `CAPIRO_QA_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser:modules --workspace @capiro/web -- --workers=2`, committed `apps/web/test/browser/playwright.config.ts`, all `apps/web/test/browser/**/*.spec.ts`,507cases, default viewport1440×1040, retries0. All explicit desktop/light/dark cases and shared logic remain selected. Existing mixed viewport tests remain intact. No grep, skip, failure suppression or count-based exclusion is used.

These unfiltered executions are superset supporting evidence. The release acceptance scope is desktop functionality/shared regression only. A mobile execution success is not mobile release/Figma/native acceptance. Desktop Meri coverage includes explicit synthetic fixture assets/theme and ordinary authenticated unavailable states, navigation, files, conversations/owner/session lifetimes and isolation in the Modules/Meri suite. Production shared/auth/client scope/styles/components remain canonical.

## Deferred mobile evidence

Retain `before`390light/dark Portfolio contrast failures and390 default axe heading-order/scrollable-region failure; `intermediate` and `focus-first-attempt` phone keyboard-focus failures; `modules-first-attempt` phone stale current/fixture expectations and filesystem incident; `modules-control-first-attempt` phone hidden disabled-button locator failures; and `modules-complete-heading-attempt`390light/dark+320light exact desktop-suffix failures. These attempts are diagnostic/deferred evidence, not passing mobile acceptance. Their underlying shared heading/focus/contrast defects were repaired before deferral, while stale fixture/heading test bindings were independently reviewed for desktop/shared impact. No desktop/shared defect was identified in the remaining historical phone-only expected-name/hidden-state assertions.

PR43 mobile production candidate remains separate and unmerged. Full mobile view/detail/modal Figma parity, the captured phone Objective/Engagement/Planner references and native mobile execution remain deferred. No failing evidence is deleted or relabeled successful. The final complete run reports record actual execution statuses separately.

## Still open

All337 native rows remain open. Desktop detail/modal Figma comparisons remain separate/unaccepted: fresh references alone cannot prove rendered parity. Backend designated route/config/data bindings, saved-layout mapping, and explicit SDK0.1.5 compatibility review remain owner prerequisites. Native preview deployment/new-image identity is unverified. No AWS, paid build, credentials or live data-changing service check was performed.
