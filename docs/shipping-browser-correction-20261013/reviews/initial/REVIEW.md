# Initial PR17 receipt review

**Completed receipts accepted at source `d4be41e60516e576c74afa304b50ed67da15cb93`, with DOC-01 open for evidence publication. This is not final qualification.** Root ran the recorded gates; this reviewer independently inspected logs, JSON results, Git bytes and hashes, and started no runtime, browser, server, build, dependency change or AWS action.

[Source binding](SOURCE-BINDING.json) records root tree `401cadde371b91606e3346243aaca6b6225aafcb`, app tree `6ae2118b797f478f5a63788841a9777d67c8001e`, and a clean working tree before/after inspection. All five completed gate receipts bind identical source before/after. [Full review receipt](REVIEW-RECEIPT.json).

| Recorded gate | Reviewed result |
| --- | --- |
| Clean `npm ci --ignore-scripts` | Exit 0; 847 packages. Borrowed application dependency links were removed beforehand. |
| Combined `npm run check` | Exit 0; 1,479 tests: 59 root +21 transport +1,282 Portfolio +117 Capiro. Public packages, workspace types, lint, formatting and architecture completed. |
| Elements qualification | Exit 0; 15/15. Independently verified receipt SHA256, all 48 recorded source hashes against exact Git bytes, all three output hashes, and recorded runtime stream hashes. Offline SSR scope remains explicit. |
| Controlled selection V1 | Exit 1; zero tests executed. External harness could not resolve `@playwright/test`. Preserved setup failure, not a behavioral red. |
| Controlled selection V2 | Exit 0; 3/3 repetitions, three workers, 30-second test timeout, zero retries. |

The architecture report retains 427 size signals: 403 reviewed, 24 inherited/unreviewed, zero blockers. A successful architecture gate does not relabel inherited findings as approved. See [check verification](CHECK-VERIFICATION.json) and [Elements verification](ELEMENTS-VERIFICATION.json).

The frozen controlled baseline at `1585438` failed all three repetitions with actual text loss: `Verified rewrite. Added locally.` became ` Added locally.`. The baseline, failed V1 setup and successful V2 retain byte-identical external spec and diagnostics. V2's only configuration delta is the results destination; its external `node_modules` link resolves the clean-installed candidate workspace. Baseline used one worker; V2 used three. The diagnostic harness reads/wraps editor state and withholds observer delivery, so this establishes the controlled ordering defect and correction, not the exact AWS interleaving. [Controlled comparison](CONTROLLED-VERIFICATION.json), [config delta](CONTROLLED-CONFIG-DIFF.patch).

The prior profile review remains valid at these exact bytes: removing the three-line enabled-state wait reproduces the original integration test, and the entire profile product directory remains unchanged from frozen `1585438`. Original geometry, cache-update and write assertions are retained. The controlled identity test establishes lifecycle behavior; it does not identify which AWS bounding box was null.

## DOC-01 — minimum evidence-only correction

The published [profile review copy](raw/published-profile-REVIEW.md) retains two relative links whose targets are absent at `d4be41e`. Copy these **unchanged original bytes** from `/tmp/capiro-shipping-profile-permanent-review-20261013` into `docs/shipping-browser-correction-20261013/reviews/`:

- `REVIEW-RECEIPT.json`: 3,860 bytes, SHA256 `77f93ae09ee590412e4b4647e37be12d7cecd376775fc0fca048bcf00e6b52e1`.
- `AWS-FAILURE-EVIDENCE.json`: 18,324 bytes, SHA256 `21f89c46e5af85b5f249602481c3fe35731d91b02080c01f75cedf23d13f06c7`.

Preserve the Markdown and sealed originals, compare copied hashes, and include the additions in the final evidence manifest. This repairs the existing links without changing runtime source or assertions. [Exact link and repair receipt](DOC-01.json). This reviewer made no repository edit.

## Pending gates and limits

Full Portfolio was still running at this review cutoff. Only its running receipt is included; no partial progress is counted as a pass. Full Modules, production build and actual-server receipts remain pending for a separate final review.

Local environment evidence observes Chromium `154.0.8037.57`, Playwright `1.61.1`, Node `24.19.0` and npm `11.9.0` on Debian. The supplied AWS report establishes locked Playwright `1.61.1`, observed Node `24.19.0`/npm `11.7.0`, and installed Chromium/headless-shell `149.0.7827.55`; its exact launched browser and resolved timeout/retry values were not captured. Final documentation should say **installed149**, not claim observed AWS browser-runtime equivalence. Official local149 downloads were blocked403. No version-based causation or AWS success is established.

AWS retained logs show 1,116/1,118 passed and two failures; screenshots/traces/browser JSON were worker-local without a preserved retrieval destination. They cannot establish the missing profile row or exact race. Native acceptance remains zero, with 337 Portfolio rows held. No deployment or fourth AWS run is part of this review.
