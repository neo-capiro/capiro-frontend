# ST24 HQ credential receipt correction — 23 October 2026

Core's existing credential owner trims model overrides, converts blank input to null and upgrades historical text-model choices through `@capiro/shared/ai-model-policy`. The frontend compared the masked saved model against the raw draft. A successful rotation using whitespace or an older supported model therefore became an unresolved write and left the drawer locked.

The receipt owner now imports the same already pinned public `upgradeTextModel` export. It preserves exact provider, key suffix and active-status checks. There is no copied model policy, new DTO, store, retry, transport, dependency change or Core production change. Unknown responses remain fenced; a coincidentally equal current credential never proves that the lost rotation succeeded. Removal retains its delivered receipt plus explicit current authorized absence check. Existing dialog/action/journal lifetimes are unchanged.

The committed `vendor/capiro-shared-0.0.0-38fec5c8.tgz` manifest explicitly exports `./ai-model-policy`; its SHA512 matches the package-lock integrity. The architecture inventory now admits that exact public subpath and continues rejecting broad package, private `src`/`dist` and nested internal imports. No package manifest or lock changed.

## Verification

- The new15 source controls fail5 cases against the untouched receipt owner from FE8840e2b3, then pass after the correction. The combined four focused FE source suites pass47/47.
- The corrected synthetic browser fixture reproduces all3 canonical-save failures against the exact original owner. With the correction,11/11 real Chromium cases pass: old-model/blank/custom normalization, masked refresh, in-flight edit/dismiss/duplicate-dispatch guards, wrong provider/suffix/model/status, lost response across reload without persisted key or replay, delayed removal readback and account replacement with a late old response.
- Core's actual credential service suite passes18/18 using a mocked provider/transaction. Eight added table cases assert canonical provider validation, stored and listed masked output, and no key disclosure. The existing mock previously fabricated a second validation timestamp in its returned row; one new readback assertion exposed that millisecond mismatch. The fixture now returns the timestamp actually written. Its original failure is retained.
- Fixture development first used an invalid synthetic tenant ID, so request validation prevented dispatch. Those failures are retained and are **not** product regression evidence. The corrected UUID fixture is the one used for the base/head comparison. One TypeScript test assertion also needed a non-indexed array comparison; no product type error was present.
- Deliberately removing the model comparison makes the wrong-model browser control fail. The owner was restored byte-for-byte, then the final combined Settings browser run passed31/31 with no skipped cases or page errors.
- Windows Node24.22.1, npm11.19.1 and Playwright1.61.1 were used with existing dependencies. Web TypeScript (`--noEmit --incremental false`), touched ESLint/Prettier and whitespace checks pass. The owned loopback5191 server exited; no listener remains. Evidence output is under2MB, within the2GB scratch budget.
- The architecture boundary suite passes29/29. The full architecture gate still **exits1 with21 blocking size-review obligations**, no boundary errors and no new size finding from this change. No baseline, review exemption or artificial component split was added. The original omitted-public-subpath diagnostic is preserved in `architecture-before-public-export.log`.

Evidence is outside the checkout at `work/a2-repairs-20261023/hq-credential-controls/`, including `base-source.json`, corrected `base-browser.json`, `positive-browser.json`, `source.json`, `core.json` and the retained fixture failures. All keys and identities are synthetic; no real provider, AWS, database or model call was made.

## Design and remaining acceptance

The Figma design-to-code skill and current repository/Next.js instructions were read. The existing source's HQ node411:75937 is absent from the current `mpXWnySldUFzdVna8i69Ki` file (failed lookup038acb1a-0d7c-49f3-bdac-04c6f092054c); current page metadata contains no Settings/HQ screen match. No visual design or layout was invented. Current Figma parity is unqualified.

This closes the bounded false-unknown receipt defect, not ST24 or A2. Remaining ST24 forms/partial bulk, full route/tab/revocation/provider acceptance, independent exact-head review and production gates remain open. Core test-only checkpoint38206694f1e3a50dbbcb80b0cbfbeb2c8f017ded adds the paired controls;43-case PG evidence applies to6bfbd5bc and its unchanged production owners. These credential mocks do not establish credential DB/provider qualification. The full25-row scope remains in PREREQUISITES.md.
