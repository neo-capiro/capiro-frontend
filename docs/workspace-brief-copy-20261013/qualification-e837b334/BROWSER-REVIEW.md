# Final e837 browser evidence review

**PASS: all current shared and Portfolio browser cases passed on exact source `e837b3341e7c31dd8b349438c7d9c5086fa4eb0e`.** This audit independently reconciles all eight raw reports with current discoveries and both producer aggregates.

| Cohort | Discovery / unique passed cases | Shard counts | Effective total timeouts |
| --- | ---: | --- | --- |
| Shared | 399 / 399 | 100 + 105 + 103 + 91 | 399 × 30,000 ms |
| Portfolio | 1,278 / 1,278 | 322 + 322 + 320 + 314 | 1,274 × 30,000 ms; 4 × 90,000 ms |

All 1,677 file/full-title/project identities and spec IDs occur exactly once. Every case has one passed attempt and retry 0. Missing or duplicate identities, case errors, top-level report errors, skipped, unexpected and flaky cases are all zero. Aggregate per-shard ID lists, multiplicities and complete statistics match the raw reports.

All eight shard receipts exit 0; those receipts and both discovery receipts record identical clean e837 source before and after. The bound root tree is `742bba63f01e67d3f4601166085c4fcd3b044a1c`, application tree `91e226f6286ae5af91b49e929e36474687bc7287`, and production source tree `9cb4e5c29b3957a6325d34c104eefcd49f439d15`. Case/report start times lie within their bound receipts. Portfolio completed at 2026-10-13 20:42:09 UTC.

Both cohorts use the canonical configurations, two workers per shard, repeatEach 1 and retries 0. The default timeout is 30,000 ms. The four existing Portfolio `test.slow()` declarations remain byte-identical to 6034 and produce their original 90,000 ms runtime budgets: three capability-presentation variants and one registrant-intake selection case. All other resolved configuration matches discovery apart from explicit sharding/output and runtime reporter/metadata.

The previously failed Calendar case `1de639fdc719e2321283-be08d9b57421c24286a4` passes once in current Portfolio shard 2. The exact reviewed `files.spec.ts` SHA256 remains `f428001ef0d3e8c7f471f0f0a4630f01be8be198cc5fa8fbe5d847511ab4da0f`; its preserved final unexpected-request assertion now completes. Neither the earlier focused replay nor any historical 6034 pass is included in these current totals. The historical 6034 failure remains sealed separately.

The tool handle loss is not treated as an outcome. `TOOL-SESSION-OBSERVATION.json` records the original driver, qualifier and shard-4 processes continuing during the single source-bound shard-4 receipt. The reviewer subsequently checked all four original PIDs and found them absent. The later producer closure note agrees. The eight underlying completed receipts and complete raw reports establish the results; no unavailable top-level shell exit is fabricated, and no independent continuous process-monitor claim is made. Collector byte-preservation verification is outside this browser review.

The 33 runtime-observation attachments have empty page-error lists; the three Calendar attachments also have empty console-error lists. Other recorded console-error counts remain preserved, without a universal zero-console-error claim. The prior source-preservation, shared/discovery and historical findings packets were reverified against their sealed manifests (37 members).

This review ran no browser, tests, installation or build and changed no repository source/index or evidence producers. It verifies the complete synthetic browser gates only. All 337 native acceptance rows remain open; no native, staging, production or Figma acceptance is inferred.
