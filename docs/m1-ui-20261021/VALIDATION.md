# M1 source validation receipts

**Preview/native/provider acceptance: NOT RUN.** Fable owns deployment and live qualification. This file records source checks only; final integrated validation is reported in the PR.

The authorized snapshot retains MF-02/MF-06/MF-21, disabled lifecycle UI and source-aware unavailable copy. Lifecycle SDK/API integration, capability shell/layout integration and all MF-07 persistence are parked. Results for parked candidates must not be counted as validation of this snapshot; final integrated results are pending the root owner's run.

## MF-21 launcher

- `npm exec vitest -- run tests/meri-m1-release.test.ts` (from `apps/web`): **3/3 passed** before mutation checks.
- M1-GATE-OPTIN: disabling the explicit opt-in guard caused `is inert without explicit opt-in` to fail. **Killed**.
- M1-GATE-PATHS: allowing missing manifest/state paths caused `refuses incomplete operator input` to fail. **Killed**.
- M1-GATE-PRODUCTION: accepting arbitrary origins caused `refuses production, stale pins...` to fail. **Killed**.
- Launcher source was restored byte-for-byte after each mutation. These checks test the local runner's safeguards; they do not qualify live chat assertions.
- Final focused launcher rerun: **3/3 passed**. The five new MF-21 TypeScript source/test files pass a focused strict type check using the app configuration; owned files pass Prettier.

## MF-21 browser

`npm run test:browser:modules -- --grep 'M1 composed synthetic core flow'` attempted both 1440/390 cases. **BLOCKED:** both launches failed before test-body execution because Playwright's Chromium headless-shell executable was absent. No browser assertion passed, and neither core case is mutation-qualified. The fixture uses synthetic HTTP receipts and real mounted UI components.

The separate draft-reload candidates are explicitly HELD/skipped pending Neo’s MF-07 persistence-policy approval, in addition to integrated source and browser availability. Fable’s planning confirmation is not recorded as Neo’s approval. After a baseline browser pass, a targeted product mutation that enables held lifecycle buttons must fail both viewport cases; cursor-resume and exact target-selection mutations can independently qualify those recovery assertions. Perform these checks only after shared source edits finish, with exclusive ownership and exact restoration.

The opt-in preview test and its assertion mutation checks remain **NOT RUN**. The default skipped result cannot count as a pass. Source/configuration/native identity, actual renewal cycles, physical runner retirement, deployment reopening, the 20-minute idle case, and provider qualification remain Fable's live gates.

## Authorized source snapshot

All checks below use only the proposed authorized source, excluding parked shell/layout, SDK/API and persistence candidates. No ticket is declared closed: required browser/native/preview acceptance remains outstanding.

- Meri unit regression suite: `vitest run tests/meri*.test.ts` — **58 files / 863 tests passed**, repeated after the scoped responsibility extractions.
- Full web TypeScript: `NODE_OPTIONS=--max-old-space-size=6144 tsc --noEmit --incremental false` — **passed** on the authorized snapshot before the responsibility extractions. Post-extraction focused TypeScript covers every changed/new TS/TSX entry and its imports: **passed**.
- Architecture guard: **passed**, zero boundary errors, zero blocking size findings. The existing 18 inherited unreviewed findings remain visible. The initial four candidate-specific size findings were resolved through cohesive extraction; no review records or policies were weakened.
- Changed TypeScript/TSX formatting and lint: **passed**.
- Production Next build: **NOT RUN / environment capacity blocked**. The shared filesystem had only about 65 MiB available after disposable cache cleanup. No build pass is inferred from unit/type checks.
- Browser visual, accessibility and interaction checks: **BLOCKED** before test execution by absent Chromium; supported downloads returned an unavailable HTML response instead of a browser archive. No screenshot baseline was changed.
- Native identity, runtime/provider retirement, preview lifecycle, deployment reopen and 20-minute idle: **NOT RUN**, owned by Fable's release acceptance.

## Mutation qualification of new unit tests

All 13 new unit tests have targeted product/runner mutations. **15/15 mutations were detected**, then source was restored exactly (or mutated only through an in-memory Vite transform). These are source-level qualification receipts, not browser or deployed outcomes.

| New test group | Tests | Mutations detected |
| --- | ---: | --- |
| `meri-m1-identity.test.ts` | 6 | Proactive renewal mislabeled as expiry; denial mislabeled as expiry; natural cap mislabeled as denial; final bootstrap 401/403 mislabeled as expiry; transcript omitted from scoped cancellation/removal; private pending prompt rendered after denial. |
| `meri-m1-stop-recovery.test.ts` | 3 | Fence incorrectly described as cleanup; held lifecycle buttons enabled; reservation replay sent with changed source; pending edit revision ignored; access-loss capture reset omitted. |
| `meri-m1-release.test.ts` | 3 | Explicit opt-in bypassed; required operator paths omitted; arbitrary deployment origin accepted. |
| `meri-unavailable-copy.test.ts` | 1 | Preferences consumer incorrectly described as unable to save. |

The new browser scenarios and opt-in live assertions remain **unrun and mutation-unqualified**. The brief's every-new-test requirement is therefore incomplete for those scenarios; a skipped/default-disabled suite is not a passing gate. Fable must run the baseline and targeted mutations once a browser and approved preview are available.
