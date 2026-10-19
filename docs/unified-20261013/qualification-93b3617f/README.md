# Frozen 93 qualification and known-failure evidence

**Frozen source `93b3617f5d0599f34da373525a96dfc70eaa85d6` passed its complete existing offline qualification, including all 1,122 Portfolio and 286 Modules/Meri/Onboard browser cases. It still has confirmed canonical-navigation and accessibility failures.** This packet preserves both conclusions. Reviewed corrections and their red baselines are included; successor green results are deliberately excluded.

Planned repository location: `docs/unified-20261013/qualification-93b3617f`. This directory was prepared outside the worktree and is not committed or published. Root tree: `871dfd1bf868527c605b0c2e78c83179db3baba2`; application tree: `46fb1aae65c1cdc640c965254b947a149e982c17`; source tree: `9824460c1d8240815f506c9bf3b6ee998b6fc000`.

## Qualification and its limits

| Frozen-source evidence | Result |
| --- | --- |
| Clean install | 852 packages; unchanged source/lock |
| Canonical check | 94 root, 21 transport, 1,631 web, 288 Capiro adapter, 385 Newsletter and 8 declaration controls pass; types/format pass; lint 0 errors / 76 warnings |
| Architecture | 475 signals: 451 reviewed, 24 inherited, 0 blocking/errors |
| Elements | 15 offline controls pass; bounded SSR fixture qualification |
| Public Newsletter Chromium | 116 renderer characterizations + 130 receiving cases pass |
| Canonical Next build and actual server | Build pass; credential-free standalone checks/renders/history pass; corrected supplemental probe passes without weakening origin checks |
| Browser suites | Portfolio 1,122/1,122; Modules/Meri/Onboard 286/286; no skipped, flaky or unexpected results |
| New navigation baseline | Canonical `/` current-page state fails; legacy `/portfolio` control passes |
| New accessibility baseline | All six exact default-axe cases fail on frozen source; all raw violations and incomplete results retained |

[Independent completed-Portfolio review](direct/capiro-unified-final-evidence-independent-review-20261013-portfolio-complete/REPORT.md) verifies every result ID and all four source-bound shard receipts. The early [bounded review](direct/capiro-unified-final-evidence-independent-review-20261013/REPORT.md) and [shards 1/2 addendum](direct/capiro-unified-final-evidence-independent-review-20261013-shards12-addendum/REPORT.md) retain their original pending status as historical checkpoints; completion is established by the final addendum, not by rewriting them. The outer wrapper's exit 120 after successful shard 2 remains preserved and its cause is unproven. Only unrun shards 3/4 resumed; completed shard results were not replayed until green.

The gate receipts/logs/results/scripts are available under [direct frozen evidence](direct/capiro-unified-final-93b3617f-20261013/) and completely preserved in the archive. Earlier e22/6a attempts remain separately identified in the archive; their counts are not added to frozen 93.

## Known failures and reviewed proposals

- [Canonical navigation review](direct/capiro-unified-navigation-independent-review-20261013/review.md): `/` lacks the Overview/Clients current-page predicate that `/portfolio` receives. The original two-case connection-refused setup attempt and corrected one-fail/one-pass baseline are both preserved. A reviewed external source proposal does not constitute a frozen-source repair.
- [Accessibility red baseline](direct/capiro-unified-a11y-regression-20261013/REPORT.md): two Portfolio and four Meri/Modules cases fail the unchanged `axe.run(document)` / empty violations assertion. No rule filters, suppression or relaxed thresholds were used. Later Portfolio description/H2 assertions were not reached on the red baseline. [Static correction review](direct/capiro-unified-a11y-independent-review-20261013/REPORT.md) records exact proposed changes and remaining rendered/manual checks.
- [Full supplemental axe audit](direct/capiro-unified-figma-capture-plan-20261013/A11Y-REPORT.md): contrast, heading/label, role and landmark findings remain; incomplete results are unresolved. The Modules test-notice landmark issue is explicitly fixture-only. Six successful audit *collections* are not six accessibility passes.

All failure traces, reporter JSON and exact raw axe attachments are archived. Successor `/tmp/capiro-unified-corrections-20261013` and its not-yet-frozen render/type reviews are outside this packet. Their failures and green results belong to a separate publication.

## Visual evidence

The original 3.1 target references are Portfolio `411:41421`, Meri Home `442:81437` and Modules Hub `411:93787`. [Reference PNGs/provenance](direct/capiro-unified-final-93b3617f-20261013/figma-references/) and [structural comparison](direct/capiro-unified-final-93b3617f-20261013/FIGMA-STRUCTURAL-REVIEW.md) are preserved. No reference or visual baseline was changed.

The normal-state comparison inputs are [fixture Portfolio](direct/capiro-unified-figma-capture-plan-20261013/captures/fixture-portfolio-1440x1040-light.png), [actual compiled disconnected Meri](direct/capiro-unified-figma-capture-plan-20261013/captures/actual-meri-1440x1040-light.png) and [fixture Modules](direct/capiro-unified-figma-capture-plan-20261013/captures/fixture-modules-1440x1040-light.png). All six canonical captures and same-name JSON receipts are in [captures](direct/capiro-unified-figma-capture-plan-20261013/captures/). Actual compiled Portfolio/Modules correctly show setup boundaries; fixture images do not establish native identity or authority. Phone/desktop axe screenshots and all raw audits are also archived.

Full Figma acceptance remains open: populated reference data are not fabricated, Modules landscape-card proportions and its missing information affordance remain differences, and no separate accepted Onboard/action-workflow frame is inferred. All **337 native Portfolio criteria remain unaccepted**. Native authentication/RLS, admitted Meri service composition, provider/task/payment effects, complete workspace behavior, target musl/image/ABI, deployed hosts and deployment remain unqualified. Host glibc/Chromium tests do not close those limits. [Meri document contract review](direct/capiro-meri-documents-contract-review-20261013/REVIEW.md) records the still-missing supported public browser receiving/request contract; new document UI is not delivered by this snapshot.

## Byte preservation and compact distribution

`SOURCES.json` identifies all 38 selected evidence roots and intentionally excluded successor roots. `SOURCE-FILES.json` maps **every original regular-file path** to its logical restoration path, size and SHA256. The original paths and original bytes are unchanged. Old packet manifests remain in the archive and direct review entrypoints; summaries never replace failed evidence.

`evidence-objects.tar.gz` stores identical byte streams only once as `objects/<sha256>`. It contains 1,334 verified objects representing 1,609 original paths / 187,949,543 raw bytes. The deterministic archive is **24,000,418 bytes**, SHA256 **`254b3df98c33543805e90a766d23bd8928da285780b13a163c52247e4f9968af`**. Both creation and a separate reopening pass verified every member's hash and length. This was author verification, not an independent review claim.

`DIRECT-FILES.json` binds the unchanged human-readable entrypoints under `direct/`. These are intentional convenience copies, with the same object hashes. Relative links inside original reports may target archived subdirectories: restore the evidence tree to inspect every original relationship. Do not interpret a historical absolute `/tmp` link as a published remote source.

`OMITTED-LOCAL-GRAPH.json` inventories eight excluded regular tool/bytecode files (32,358,318 bytes) by original path/hash and seven borrowed symlinks by target/link-text hash. Tool metadata, logs, receipts, SSR output and negative fixtures remain included. Symlinks are not followed, borrowed dependency files are not copied, and no original evidence was deleted. Borrowed dependency targets are not immutable snapshots and may later change; this packet is evidence, not a runnable installed graph. Original raw roots remain local. The query-credential URL scan found no matches; it is a scoped heuristic rather than a claim of exhaustive secret detection.

Verify without source roots or dependencies:

```sh
python3 archive-evidence.py verify .
```

Restore regular evidence to a new empty directory only when approximately 188 MB of additional disk is available:

```sh
python3 archive-evidence.py restore . --destination /path/to/new-empty-evidence
```

The helper rejects unexpected archive members and path traversal; the archive contains no symlink/hardlink entries. Restore verifies all objects before writing and each resulting file afterward. Full filesystem restoration was not run in this constrained workspace; all archived objects were reopened and hashed. No application/test/browser/build/install/native operation was run to prepare this publication packet.
