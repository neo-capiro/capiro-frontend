# Exact-proposal accessibility red baseline

All **six proposed cases failed at the intended full-default axe `violations[]` assertion**, using frozen source `93b3617f5d0599f34da373525a96dfc70eaa85d6`, app tree `46fb1aae65c1cdc640c965254b947a149e982c17`. There were no setup/import failures, retries, skipped cases or assertion edits. Both commands exited 1 because of the expected accessibility failures. Source and the three proposal files were verified unchanged before and after execution.

| State | Width | Reported violation rules (node counts) |
| --- | --- | --- |
| Portfolio | 1440 and 390 | color-contrast (2), heading-order (1), label-content-name-mismatch (1) |
| Meri | 1440 | aria-allowed-role (1), color-contrast (3), region (1) |
| Meri | 390 | aria-allowed-role (1), color-contrast (1), region (1) |
| Modules | 1440 and 390 | color-contrast (31), region (1) |

Each failure is at `apps/web/test/accessibility.ts:20`, after rendered Home readiness and the unfiltered `axe.run(document)` result attachment. Portfolio's later accessible-description and h2 assertions remain in the exact test source but were **not reached** in this red baseline. They still require a passing run after the bounded source repair. Incomplete axe results are preserved in full, not treated as passing or suppressed. The Modules `region` finding includes the existing harness-only `.test-notice`; it must not be misattributed to the production hub.

`BASELINE-FINDINGS.json` records each title, rule, impact, target, incomplete count, raw attachment hash and assertion location. `raw-axe/` is a byte-exact base64 decode of the original Playwright JSON attachments and retains all raw result fields. Original reporter JSON, console logs, failure screenshots and traces are preserved separately under the portfolio/shared paths.

Staged source is ready for the intended permanent paths, with unchanged relative imports:

- `apps/web/test/accessibility.ts` — SHA256 `041d33331ffe2aacbf9c2ac5bc86fa00e4134342612c9ad5ba311aa3e543dcce`
- `apps/web/tests/browser/portfolio-home-accessibility.spec.ts` — SHA256 `7aeb3c4e3141f7cbec9c29715b9a053f5c9c3e9284744b711a0a8722e44ea2a2`
- `apps/web/test/browser/shared-home-accessibility.spec.ts` — SHA256 `2a3aaea30e7b9a863cdef654e9e6f54eaaf1f0ab4f5d891f9e35dfefb42f3bcf`

Only the external test tree/config/wrapper/evidence was created. Existing fixture files and the root dependency install are borrowed symlinks, used read-only. No source, dependency, canonical test/config or compiled Next runtime changed. `INPUT-HASHES.json` also binds existing fixture hosts, fixtures, installed axe 4.14.0 and the already-generated Modules bundle. No harness wiring correction was necessary.

Execution used one worker, zero retries, 30 seconds per case, system Chromium 154, light theme, UTC and exact 1440×1040 / 390×844 viewports. Portfolio attached the existing root-owned 5191 server. Shared cases used a separately owned 5197 preview of the existing frozen Modules bundle; no compilation or install was performed. The owned preview and browser were closed; 5197 is verified closed and borrowed 5191 remains untouched. `SOURCE-BINDING-AFTER.json` records the clean source and port state.

`NETWORK-REVIEW.json` independently inspects all six retained trace network streams: requests stayed on loopback and no mutation methods were observed. Application API reads were served by the existing synthetic fixtures. This evidence does not qualify native authentication, authorization, provider effects or full WCAG conformance.

Commands executed from `/workspace/capiro-onboard-port-20261013`:

```sh
TZ=UTC A11Y_PHASE=portfolio node node_modules/@playwright/test/cli.js test --config /tmp/capiro-unified-a11y-regression-20261013/playwright.config.mjs --project=portfolio
node /tmp/capiro-unified-a11y-regression-20261013/run-shared-red.mjs
```

This packet is separate from the sealed original capture/audit packet and all full qualification results. Root owns copying the exact permanent test bytes, source fixes and unchanged green replay. Use fresh output paths for subsequent execution; do not overwrite this red evidence.
