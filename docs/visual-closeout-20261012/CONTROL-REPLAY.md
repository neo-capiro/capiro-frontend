# Original seven defect controls — publication and replay

The exact control sources and complete raw red/green evidence were published in `3e7ad7c648b65b84c758388f9505b3b057e0c57f`. The application source is `4a1614886fd98bb42d529f1ef59b3d01d7ff9173`; the red baseline is `a397d45c461b24eb741afcd3b7cf28ca354d1e96`, whose application is the previously qualified `2d50edd` checkpoint. No original assertion changed between the valid red and green runs.

| Suite | Exact control source | Valid red run | Exact-source green run |
| --- | --- | --- | --- |
| Portfolio: VD01–05 and VD07 | [control.spec.ts](evidence/candidate-4a16148/development/portfolio/control.spec.ts) | [raw log](evidence/candidate-4a16148/development/portfolio/baseline-corrected-locator.log), [JSON](evidence/candidate-4a16148/development/portfolio/canonical-baseline-results.json): six failed | [raw log](evidence/candidate-4a16148/defect-portfolio.log), [JSON](evidence/candidate-4a16148/defect-portfolio-results.json): six passed |
| Modules: VD06 | [control.spec.ts](evidence/candidate-4a16148/development/modules/control.spec.ts) | [raw log](evidence/candidate-4a16148/development/modules/baseline-configured.log), [JSON](evidence/candidate-4a16148/development/modules/canonical-baseline-results.json): one failed | [raw log](evidence/candidate-4a16148/defect-modules.log), [JSON](evidence/candidate-4a16148/defect-modules-results.json): one passed |

Canonical SHA-256s:

- Portfolio: `47a8faecfb55bea520d43748663014e64a12e684666486f49c14cc0edece25ea`.
- Modules: `01f43f1b255ef9c7125872d995f6f3ad38d7bc098a4b8d669c17d56fc8870285`.

[BASELINE-RECEIPT.json](BASELINE-RECEIPT.json) binds the valid red runs to the clean baseline and distinguishes earlier setup/locator failures. [DEFECT-CONTROLS.json](evidence/candidate-4a16148/DEFECT-CONTROLS.json) binds the same controls to final green reports. Raw traces, error contexts and screenshots remain in each `canonical-baseline-artifacts` folder, with candidate captures under `defect-portfolio-artifacts` and `defect-modules-artifacts`. The original `*-before.png` names were intentionally retained on both runs. VD01 takes its historical screenshot before opening Manage owners; the dedicated Owners images are in the full Portfolio suite's `visual-closeout-owner-card-3c309-cel-and-nested-focus-return` folder.

## Portable replay

The original source imports fixture helpers from `/workspace/capiro-visual-closeout`. Its historical config also used absolute output paths. Preserve those originals. The provided [replay-controls.mjs](evidence/image-proposal-4a16148/replay-controls.mjs) verifies their canonical hashes, copies them into a fresh external output folder, rewrites only the three Portfolio or two Modules fixture import paths, and records both source hashes and every substitution. It uses the chosen checkout's original Playwright/server config, dependencies and assertions, with no retries. It refuses existing output directories.

Use an installed checkout of either baseline or candidate and a separate checkout of the evidence publication. The candidate control result is six plus one passed; the pre-edit baseline is six plus one expected product failures. Run sequentially per suite to avoid claiming the same local server port twice. Commands below illustrate the two browser environment variables already owned by their original configs; an installed Playwright browser can instead use their defaults.

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node /path/to/replay-controls.mjs /path/to/source /path/to/evidence/candidate-4a16148 /tmp/fresh-portfolio-output portfolio
CAPIRO_QA_CHROMIUM_EXECUTABLE=/usr/bin/chromium node /path/to/replay-controls.mjs /path/to/source /path/to/evidence/candidate-4a16148 /tmp/fresh-modules-output modules
```

The supplemental author replay at evidence head `3e7ad7c` passes all seven against application tree `46cebca97ccfc1facc1c1a939beb6f4d7730685b`; [its raw evidence](evidence/control-replay-3e7ad7c/SHA256-MANIFEST.json) is separate from independent review. The initial Modules attempt used Portfolio's browser variable and stopped before browser launch; it remains under `modules-unconfigured-attempt`. The configured run passed without changing control or application source.

The parent has now relayed the [final independent bounded source/presentation pass](INDEPENDENT-FINAL-REVIEW.json). All seven exact controls independently pass on `4a161488` and reproduce seven expected defects on preserved `2d50edd`, giving 69 cumulative browser and 73 unit passes. The reviewer verified all 578 original evidence hashes, source equivalence and all 15 author gates, including 934/121 browser counts. The earlier [partial relay](INDEPENDENT-REVIEW-RELAY.json) remains historical. One nonblocking P3 Meri source-label correction is appended without rewriting raw evidence; see [the correction](MERI-PROVENANCE-CORRECTION.md). Native/live/image and unassessed frames remain separate.
