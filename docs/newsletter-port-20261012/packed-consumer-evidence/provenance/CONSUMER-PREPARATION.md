# Frozen newsletter consumer inputs

The original 116-case renderer corpus, golden expected results and declaration fixtures are ready for the separate PR16 consumer workspace. This packet performs provenance/content verification and preparation only. **No package, corpus, consumer, compiler, bundler, browser or installation was executed here.** No frontend or backend repository was edited.

## Exact source and fetch paths

All 18 original files in [consumer-corpus](consumer-corpus/) were fetched using the authorized GitHub connector at backend commit `62d057b4a17b2c038920f10b93e83e51e46239bc`. The repository prefix is `docs/shared-newsletter-packed-distribution-20261012/evidence/`; append the filenames below to obtain their exact fetch paths. The complete nontruncated evidence Git tree is `5be29b56305184fcfa72117c7c2bde0b96b7e2fe`.

| Original file | Purpose and immutable binding |
| --- | --- |
| [renderer-characterizations.cjs](consumer-corpus/renderer-characterizations.cjs) | Exports `characterize(news, render)`, taking the two actual public module objects; Git blob `338d81d47474a27df95b83cc08d263655c320b0a` |
| [original-C-renderer-golden.json](consumer-corpus/original-C-renderer-golden.json) | Frozen original-source expected behavior: 116 unique `{name,value}` records, 54,405 bytes, Git blob `90f04f24b95c2bcd676a5db33ea717a819bdb84c` |
| [packed-renderer-results.json](consumer-corpus/packed-renderer-results.json), [browser-renderer-results.json](consumer-corpus/browser-renderer-results.json) | Historical backend results; both byte-identical to the original golden above, independently verified as file contents here |
| [consumer-positive.ts](consumer-corpus/consumer-positive.ts) | Exact public DTO/render declaration fixture; Git blob `ec08ad04413d3093f0296eb17b19742af7518b64` |
| [consumer-negative.ts](consumer-corpus/consumer-negative.ts) | Exact invalid block kind, stage ID type and social platform fixture; Git blob `47bff7f621411c980c0802e6097ae85dd2b24fdb` |
| [qualify-packed-consumer.mjs](consumer-corpus/qualify-packed-consumer.mjs) | Immutable backend runner reference; Git blob `ca85ca766be3826bd794f589dcc3d9b842182f7d` |

Golden SHA-256: `b56b5d3526230e9011aaa82f258c7327816a60a78ddc020714c81e9c7d98b32f`.

The other originals are four `packed-types-{node,browser}-{positive,negative}.command.json` receipts; the two `packed-types-{node,browser}-negative.log` files; `packed-esm-imports.command.json` and `.log`; `browser-metafile.json`; `static-five-module-closure.json`; and `consumer-qualification.stdout.json`. [CORPUS-ORIGINS.json](CORPUS-ORIGINS.json) records all exact paths/refs/Git blobs. [CORPUS-VERIFICATION.json](CORPUS-VERIFICATION.json) additionally records verified tree membership, byte counts, modes, SHA-256 hashes, every case name and preparation derivations.

## Minimal prepared files

[prepared-consumer](prepared-consumer/) contains four byte-exact copies of the corpus, golden and positive/negative fixtures, plus these explicitly derived inputs:

- `consumer.mjs`: exact value of the original runner's ESM source literal at lines 80–88. It uses actual named imports from only `@capiro/shared/newsletter` and `@capiro/shared/newsletter-render`, checking the canonical template ID, default schedule mode, unsafe URL refusal and render export.
- `browser-entry.mjs`: exact value of the source literal at line 174. It imports both public namespaces, calls the unchanged corpus, and exports the results. The standard bundler `default` namespace alias is the only name filtered by the original corpus.
- `tsconfig-node.json` and `tsconfig-node-negative.json`: the original generated NodeNext configurations.
- `tsconfig-browser.json` and `tsconfig-browser-negative.json`: the original generated ESNext/Bundler configurations. All four preserve ES2022, strict mode, `noUncheckedIndexedAccess`, `noEmit`, `skipLibCheck:false`, empty ambient `types`, and ES2022/DOM libraries. Positive/negative filenames match the original generator; no trailing newline is added.
- `fixed-sandbox-excerpt.txt` and `browser-build-options-excerpt.txt`: verbatim source excerpts for the root's new harness, not executable standalone files.

[prepared-consumer/DERIVATION.json](prepared-consumer/DERIVATION.json) distinguishes copied Git blobs from generated-value reconstructions and binds every output to the immutable runner's source hash and line range. [prepare-corpus.py](prepare-corpus.py) is the inspection/preparation recipe; it parses text/JSON and checks hashes, without importing the package or corpus. No package manifest, lockfile, dependency installation, backend path alias or complete runner is supplied or executed. Root owns that workspace integration.

## Behavior to preserve

Keep the golden file frozen. The original producer runner hardcodes its backend paths, extracts the package, imports it, runs compilers/bundlers and **rewrites the golden from original C source**. It is retained as evidence, not a frontend command to run verbatim. A frontend harness should compare actual public-package results against the saved golden, never regenerate the expectation from its candidate.

Use the original deterministic environment for the characterization comparison: zero-argument `Date` and `Date.now()` fixed at `2026-10-12T12:00:00.000Z`; `Math.random()` fixed at `0.125`; supplied standard `URL` and `structuredClone`. Apply that environment to the package execution realm before calling its helpers. These controls characterize local document IDs and current-year merge text; they establish no production ID or authority guarantees.

The corpus covers named public API inventories, default configuration/brand kit, document-local ID output, safe link/image decisions, escaping, live/disabled/unknown merge tags, style clamping, fixed/custom fonts, five asset mappings, six visibility operators, missing-recipient refusal/editor display, all 16 block kinds, HTML fallback and caller sanitizer policy, image sizing/crop/rewrite, disabled/authorized saved-survey links, legacy survey callbacks and ordering, six social targets across six platforms, mobile/share styles, full rich/plain text and three original templates. Cardinality and exact ordered results should remain checked as well as individual values.

The strict negative fixture must fail for exactly three intended diagnostics in each mode: two TS2345 refusals for `invented-kind` and `invented-platform`, and TS2322 for a numeric stage ID. The saved logs show those diagnostics. Do not count an import/module-resolution failure as the expected negative result. The positive stage/recipient IDs are synthetic declaration examples, not valid native authorization or response-routing examples; the identity sanitizer is a synthetic callback-policy probe.

For browser qualification, the original build uses browser platform, IIFE format, ES2022 target, `PackedNewsletter` global name, external source map, metafile and `write:false`. Inspect its resolved input graph: the two entry/corpus files plus exactly five packed runtime modules (`newsletter`, `newsletter-render`, `newsletter-fonts`, `newsletter-fonts.catalog`, `newsletter-social-share`), no external import edges and no output imports. Root's workspace layout can alter physical paths; record the actual graph and preserve module identity. A VM without `require`, `process`, `Buffer`, `fetch` or `XMLHttpRequest` was the backend's execution boundary; its historical pass does not prove a frontend browser page. Backend tools were Node 24.19.0, TypeScript 5.9.3 and esbuild 0.21.5; qualify the receiving workspace's actual versions separately.

## Bounded next step and remaining limits

Root can vendor the verified [artifact](artifact/capiro-shared-0.0.0.tgz), pin its manifest/lock integrity and consume only the two public subpaths in the new qualification workspace. The package remains private `@capiro/shared@0.0.0`, has no declared runtime dependencies, and must be identified by immutable bytes rather than a new version or a source checkout dependency. Artifact SHA-256 is `697d826647e88e7f8559da386be7de1ae6408dc61c73877b86c2e17275fd63ab`.

This step makes no app UI, transport, rich routing, provider, native stage, saved-version/CAS, deployment or PR15 change. Rich stage IDs remain separate from saved document-version IDs; declaration compatibility and rendered strings cannot authorize delivery. Actual receiving-workspace imports, typechecks and browser bundle execution are still **NOT_RUN** here and are the next root-owned qualification work.
