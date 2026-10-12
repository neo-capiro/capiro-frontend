# Local Modules and Settings browser harness

This is an explicit loopback-only component harness. It uses the production shared transport and UI modules with a test-only Clerk alias. It never configures or contacts a live Capiro service, creates a real session, or enables a production mock mode.

From `apps/web`, run `npx playwright test --config test/browser/playwright.config.ts`. The configuration starts Vite on `127.0.0.1:5197`. Use `CAPIRO_TEST_CHROMIUM=/absolute/path/to/approved/chromium` only when the installed Playwright Chromium is unavailable. Test API responses are explicit route interceptions and must pass the production operation response validators. Unhandled operations return a disclosed test failure instead of invented data.

Every screenshot uses the locally installed Geist font and local Figma assets. Fixture identity and records are synthetic. Passing these tests verifies component behavior and layout with compatible fixtures; it does not verify live authentication, backend authorization, persisted writes, third-party providers or deployment.

11 October environment: the standard Playwright browser CDN returned empty/non-ZIP downloads. An isolated official `@sparticuz/chromium@153.0.0` runtime supplies `/tmp/chromium`; run `CAPIRO_QA_CHROMIUM_EXECUTABLE=/tmp/chromium npx playwright test --config test/browser/playwright.config.ts`. The launch uses ordinary sandbox/shared-memory flags without disabling web security. This is a test runtime, not an application dependency.
