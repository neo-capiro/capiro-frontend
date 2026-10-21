# Frontend source history audit — 21 October 2026

Baseline: `4f9a7e8dcaa9ba03494dc5a49559daf70cea5100` (`origin/main`).

Read-only inventory of all 151 fetched remote branches and 113 PR heads plus local heads retained in the isolated clone. Corrected scope: skip only work demonstrably covered by an identified current consolidation receiver or active owner at an exact head; old donor/PR existence alone is insufficient. No merge, push, checkout mutation, runtime enablement, or deployment by this auditor.

## Result

- All **264 fetched references** audited: **151 branches + 113 historical PR heads**. **244** heads are exact main ancestors; **20** need content/supersession reconciliation.
- Final reference statuses: 250 already consolidated; 8 integrate; 4 superseded; 2 intentional exclusion.
- Known memory, held roster/build, and partial browser-spec source remains unreceived. No exact current receiver/active-owner evidence was found; integrate compatible source. Old donor branches are provenance, not exclusion evidence.
- Browser review narrowed b6336be5/dc9a18d2 to TWO files: history-body/session-hint timing and Files session header. Scoped-heading commits contradict newer Figma3.4 main; roster fixture and stronger task-header coverage are already present. See frontend-browser-spec-review.md.
- The only extra unpublished product-source candidate found in the cloned local refs is `0e4a9d748591774e838592ab9bccf89706392e59`, honest unknown-run status after stalled observation plus its regression test. The frontend owner received it onto `codex/missed-stalled-status-20261021` (initial supplemental commit `180ca0be`) and owns final head/testing.

## Existing donor lanes requiring receipt

| Lane | Exact head | Content / disposition |
|---|---|---|
| `codex/memory-review-ui-20261018` | `88bf4005621dd1a10fce6888269097cb0d9cc8c0` | Five genuinely absent owner-inbox/correction/proxy/held-preview commits. Old donor existence is not current receiver evidence. Receive compatible source while preserving default-disabled activation, canonical Core authority, and fail-closed routing. |
| `codex/memory-settings-review-20261018` | `481c25593bd77c2c96c219c1dd3e16ff21cee8d3` | Receive the five missing memory predecessors from 88bf4005. Do not duplicate Settings commit 481c2559: its four changed files are identical to main and its patch is equivalent to PR93. No current receiver evidence for the five predecessors. |
| `codex/frontend-core-roster-pin-20261019` | `e6180219b589ae8fced7155d1c451840c8663d94` | No current receiver/active-owner evidence. Receive PR111 held Core source pin and bounded readiness docs with current defaults/holds preserved; backend pin compatibility remains a coordinated prerequisite. |
| `codex/frontend-build-receipt-20261019` | `cfabbc30c88f5d0078e95ac8062116fc636c13a9` | No current receiver/active-owner evidence. Receive the historical PR112 build and held image-only proposal records without claiming they qualify the newer consolidated source or executing rollout. Includes PR111 predecessors. |
| `fable/meri-everything-heading-specs-20261021` | `b6336be53c3515115122578ad22f659cc2fd6ab5` | PARTIAL: receive only history-body/session-hint timing and Files session-header corrections in two files (8c5f53bc selected paths plus dc9a18d2). Heading-only aa0a9df1/b6336be5 contradict newer Figma3.4 main heading restored in 1d94c922; 4a381f8d roster already exists; task-command donor assertions are weaker than main. See frontend-browser-spec-review.md. |
| `fable/meri-stale-browser-specs-20261020` | `dc9a18d28ea934f5e655d13ea1e8686225bb4d73` | PARTIAL: 8c5f53bc history-body + Files header paths and dc9a18d2 timing are unreceived. Preserve main task-command direct header capture/count and navigation test. Same two-file delta is contained by b6336be5; receive once. |

## Historical non-ancestor dispositions

The existing main `docs/integration/FRONTEND-INTEGRATION-LEDGER.md` section 8 is the authoritative prior reconciliation, corroborated here with blob and patch checks. It already records receipt of the Dot chain and deliberate retention of the large evidence-only branches. `docs/meri-figma-34-20261015/HISTORICAL-STATUS-20261018.md` protects corrected test claims.

| Reference | Head | Status | Evidence / reason |
|---|---|---|---|
| `origin/codex/frontend-build-receipt-20261019` | `cfabbc30c88f5d0078e95ac8062116fc636c13a9` | integrate | No current receiver/active-owner evidence. Receive the historical PR112 build and held image-only proposal records without claiming they qualify the newer consolidated source or executing rollout. Includes PR111 predecessors. |
| `origin/codex/frontend-core-roster-pin-20261019` | `e6180219b589ae8fced7155d1c451840c8663d94` | integrate | No current receiver/active-owner evidence. Receive PR111 held Core source pin and bounded readiness docs with current defaults/holds preserved; backend pin compatibility remains a coordinated prerequisite. |
| `origin/codex/memory-review-ui-20261018` | `88bf4005621dd1a10fce6888269097cb0d9cc8c0` | integrate | Five genuinely absent owner-inbox/correction/proxy/held-preview commits. Old donor existence is not current receiver evidence. Receive compatible source while preserving default-disabled activation, canonical Core authority, and fail-closed routing. |
| `origin/codex/memory-settings-review-20261018` | `481c25593bd77c2c96c219c1dd3e16ff21cee8d3` | integrate | Receive the five missing memory predecessors from 88bf4005. Do not duplicate Settings commit 481c2559: its four changed files are identical to main and its patch is equivalent to PR93. No current receiver evidence for the five predecessors. |
| `origin/codex/meri-desktop-visual-on-chat-20261018` | `788a08f3fd83bf63efd3d4f6a14d4a0b4ca700c5` | superseded | Visual parents received through combined PR97. Fixture commit 68051886 is patch-equivalent to c0d8ab28 and both changed files are identical to main. The missing 11-line intermediate receipt 788a08f3 is superseded by combined and main-receiving reports, which preserve newer fixes and qualified scope. |
| `origin/docs/figma34-gaps-20261016` | `8a9c7da1562364ecfba4a233b9a8f3d4aaded75c` | already consolidated | Final Figma comparison records are byte-identical via selective receipt 92d8cd16. Older Dot source chain is reconciled in existing integration ledger section 8; intermediate contract 0.1.7 forms are superseded. |
| `origin/docs/meri-host-status-correction` | `2dc47441789f61e55a6371d9a30310d11c65b27e` | superseded | Existing integration ledger section 8 explicitly excludes the 15 October status correction because README/REMAINING were rewritten; its missing status document describes controls now implemented. |
| `origin/dot/meri-desktop-parity-20261016` | `3930e36593960966edaa39f8f7f25faa14f9654a` | already consolidated | Dot source chain is fully received by content, not ancestry; integration ledger section 8 records 49 source paths: 30 identical, 16 earlier main-history versions, 3 older intermediates. Figma evidence received at 92d8cd16; later 3.4 shell supersedes old geometry. |
| `origin/dot/meri-ui-followup-20261016` | `36974aa470d9e1ae5b6cd89c16b8e19dc77e2b6e` | already consolidated | Canonical useRunCommands/useLiveRun separation and historical documentation are present. Existing integration ledger section 8 explicitly reconciles this source chain; evolved content is not an unmerged feature. |
| `origin/dot/meri-ui-history-20261016` | `033a9862d1b4f3c2b98ac560d8737e2d8240d4a3` | already consolidated | History/selection/prompt lineage source received and evolved; exact retained evidence and current history-queries/history-pages owners corroborate integration ledger section 8. Do not restore intermediate versions. |
| `origin/dot/meri-ui-initial-input-20261016` | `8c50fc49ee1f125bd841d3eb3b8959d7d5daec45` | already consolidated | Initial-input source received under newer contracts 0.1.10. Retry-pin source and nine evidence files are exact main blobs; older 0.1.7/0.1.8 preparation is superseded as documented by HISTORICAL-STATUS-20261018.md. |
| `origin/dot/meri-ui-input-20261016` | `b2c7dab2bfd159b2d54e2b0149226811c593fb4e` | already consolidated | Input SDK/UI received under newer 0.1.10 contracts. Raw runtime evidence is byte-identical; older intermediate builds are superseded, not missing. Existing integration ledger section 8 gives the source disposition. |
| `origin/fable/meri-everything-heading-specs-20261021` | `b6336be53c3515115122578ad22f659cc2fd6ab5` | integrate | PARTIAL: receive only history-body/session-hint timing and Files session-header corrections in two files (8c5f53bc selected paths plus dc9a18d2). Heading-only aa0a9df1/b6336be5 contradict newer Figma3.4 main heading restored in 1d94c922; 4a381f8d roster already exists; task-command donor assertions are weaker than main. See frontend-browser-spec-review.md. |
| `origin/fable/meri-stale-browser-specs-20261020` | `dc9a18d28ea934f5e655d13ea1e8686225bb4d73` | integrate | PARTIAL: 8c5f53bc history-body + Files header paths and dc9a18d2 timing are unreceived. Preserve main task-command direct header capture/count and navigation test. Same two-file delta is contained by b6336be5; receive once. |
| `origin/integration/capiro-archive-diagnostics-20261012` | `753eb6701e62f8f3f5ace16f86c967bdd372298b` | intentional exclusion | Historical ZIP timezone diagnostics only (32 files, about 420k lines), no missing executable product source. Existing integration ledger section 8 deliberately keeps this archive on its branch. |
| `origin/meri/f34-evidence-c7e06000` | `59be1a24239c9c1af2c174cdddad59882b98db23` | intentional exclusion | Portable qualification evidence for historical c7e06000 only (256 files, about 2.27M lines), not new product source or current acceptance. Existing integration ledger section 8 deliberately keeps it on its branch. |
| `origin/meri/live-wiring-20261016` | `0b026499187c8379f8f307a06c353cdd166b9c3f` | superseded | Only count-claim doc update 0b026499 is absent. It would conflict with main’s explicit historical correction (architecture FAIL, browser INCOMPLETE, build UNRUN). No independently bound evidence was established in this audit to replace the correction. |
| `origin/test/meri-discovery-state` | `3703d08a89ee91e495985fa5b56cbbd8c8006c7b` | superseded | Unconsumed preparatory reducer superseded by canonical useConversationDiscovery in shared/meri-conversations/history-queries.ts and scope-checked history-pages.ts. Existing integration ledger section 8 explicitly excludes it; adding it creates a second owner. |
| `pr/111` | `e6180219b589ae8fced7155d1c451840c8663d94` | integrate | No current receiver/active-owner evidence. Receive PR111 held Core source pin and bounded readiness docs with current defaults/holds preserved; backend pin compatibility remains a coordinated prerequisite. |
| `pr/112` | `cfabbc30c88f5d0078e95ac8062116fc636c13a9` | integrate | No current receiver/active-owner evidence. Receive the historical PR112 build and held image-only proposal records without claiming they qualify the newer consolidated source or executing rollout. Includes PR111 predecessors. |

## Local heads

| Reference | Head | Status | Reason |
|---|---|---|---|
| `refs/heads/codex/frontend-build-receipt-20261019` | `cfabbc30c88f5d0078e95ac8062116fc636c13a9` | intentional exclusion | Duplicates an existing published lane; preserve and do not create competing source. |
| `refs/heads/codex/frontend-core-roster-pin-20261019` | `e6180219b589ae8fced7155d1c451840c8663d94` | intentional exclusion | Duplicates an existing published lane; preserve and do not create competing source. |
| `refs/heads/codex/meri-stalled-status-20261019` | `0e4a9d748591774e838592ab9bccf89706392e59` | integrate | Only additional unpublished product-source candidate in the cloned local refs: honest unknown-run status after observation stalls, with behavior test. Frontend owner received it as -x supplemental commit 180ca0be on codex/missed-stalled-status-20261021, then continued a companion footer correction; final head/testing owned by parent. |
| `refs/heads/codex/portfolio-continuity-20261019` | `5cd5f20d0f2919dce915a67a46487ce81f3e4f15` | already consolidated | Exact local head is reachable from refreshed main. |
| `refs/heads/codex/portfolio-meeting-continuity-20261019` | `ace46f896c98c8285e5da9231e813885d7979a7b` | already consolidated | Exact local head is reachable from refreshed main. |
| `refs/heads/codex/ui-receiving-20261019` | `6da70dc3d968360d296eaf191462b15f7978dd30` | already consolidated | Exact local head is reachable from refreshed main. |
| `refs/heads/codex/ui-receiving-all-three-20261019` | `043c1102c322098b01173e223ca7a33a1f4c08fb` | already consolidated | Exact local head is reachable from refreshed main. |
| `refs/heads/main` | `816b0f1470efe978d22856beee9c8133055ab5bd` | already consolidated | Exact local head is reachable from refreshed main. |

## Method and limits

- Exact main ancestry for every fetched head.
- git cherry patch equivalence for non-ancestor heads.
- Per-file Git blob comparison for 40 distinct non-ancestor commits (including two merge commits); main reachable-object membership distinguishes evolved files from absent bytes. Merge composition was reconciled through documented source receipt, not an empty diff-tree result.
- Manual semantic comparison and existing integration ledger section 8 for squashed, superseded, and intentionally separate history.
- Local refs checked separately; only 0e4a9d74 adds unpublished product source beyond the known published lanes.

- Reference coverage is complete for the fetched snapshot, not deleted/unadvertised remote refs or every unrelated local checkout.
- An ancestor may have been recorded by an ours merge or later reverted. This audit uses documented/content reconciliation for known provenance-only mergers (especially PR113), not ancestry as universal proof of current behavior.
- Existing donor branches do not prove a current receiver/active owner. Known memory, PR111/112, and partial browser gaps are integrate until exact receiving evidence exists.
- No new functional, browser, visual, live, or deployment acceptance is claimed by this history audit.

PR113 deserves explicit care: `2abf9cdd` is an unchanged-tree ancestry marker, and the current main already has source successors of the serving-line repairs. A blind ancestry test cannot prove content preservation under such merges; the known source map and per-file checks remain necessary. PR102 approvals remain received and off by default.

## Complete fetched-reference ledger

| Reference | Exact head | Status |
|---|---|---|
| `origin/assessment/capiro-remaining-20261012` | `e9ba4c32da8e9a499bf7fb3b1b34dad7acf913ac` | already consolidated |
| `origin/codex/desktop-integration-20261019` | `3a34ab25a6cc0929294901039aeed0baa609f289` | already consolidated |
| `origin/codex/frontend-build-receipt-20261019` | `cfabbc30c88f5d0078e95ac8062116fc636c13a9` | integrate |
| `origin/codex/frontend-core-roster-pin-20261019` | `e6180219b589ae8fced7155d1c451840c8663d94` | integrate |
| `origin/codex/frontend-source-receiving-20261018` | `d9959a9cee267365d1f13a72351802a66c6dbfe2` | already consolidated |
| `origin/codex/memory-review-ui-20261018` | `88bf4005621dd1a10fce6888269097cb0d9cc8c0` | integrate |
| `origin/codex/memory-settings-review-20261018` | `481c25593bd77c2c96c219c1dd3e16ff21cee8d3` | integrate |
| `origin/codex/meri-desktop-visual-audit` | `8894f279419d93540c993dc5a62c8263943823a6` | already consolidated |
| `origin/codex/meri-desktop-visual-on-chat-20261018` | `788a08f3fd83bf63efd3d4f6a14d4a0b4ca700c5` | superseded |
| `origin/codex/meri-figma34-combined-20261018` | `58e3c035d74b188e31e76de404a12541a34b603e` | already consolidated |
| `origin/codex/meri-product-features-handoff-task6-20261017` | `b12978025858aac65169661e3bf04f13c3ab3faa` | already consolidated |
| `origin/codex/meri-task-update-desktop-task6-20261016` | `bd9e0d03c54ef4fbb57010c3b97cfb3d77bdf2b9` | already consolidated |
| `origin/codex/meri-user-preferences-production-task6-20261017` | `1c0c059466963a3a5b4757d05f44701eb2007347` | already consolidated |
| `origin/codex/meri-user-preferences-task6-20261017` | `9e6d80843b0a46a862f7613b4ab9b08d925d7b17` | already consolidated |
| `origin/codex/modules-context-state-20261019` | `4dc8727f73da851a52c36a17f99589f6391df8b1` | already consolidated |
| `origin/codex/modules-desktop-safety-20261019` | `442f188c6636ee4d34566e92aad34261d2dd402a` | already consolidated |
| `origin/codex/modules-settings-figma34-20261018` | `e1de3f1d41f508629a79c198a21b71103e17c245` | already consolidated |
| `origin/codex/modules-settings-state-fixes-20261019` | `553b848303a94b206c3c2efafc0c29c2cb40414a` | already consolidated |
| `origin/codex/non-meri-core-preview-slice-20261018` | `f13dae4d6ab696f2fedde53ea18f0ed2018e9bf6` | already consolidated |
| `origin/codex/non-meri-functional-gap-20261018` | `3e6c0a9e39b858fb47eb6cad9ca79008963619aa` | already consolidated |
| `origin/codex/portfolio-continuation-20261011` | `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0` | already consolidated |
| `origin/codex/portfolio-core-contracts-20261018` | `45528667db95f805660d2ded5f7a20b5c91c909b` | already consolidated |
| `origin/codex/portfolio-desktop-safety-20261019` | `336a093e9debd3b067468510403219731820ee4d` | already consolidated |
| `origin/codex/portfolio-figma34-desktop-20261018` | `88088d9ca86dc9c2f8ea9b2e42507348ca7652b1` | already consolidated |
| `origin/codex/portfolio-handover-closeout-20261011` | `02c02d95bdf3949662b9123f425271c6491ffdab` | already consolidated |
| `origin/codex/portfolio-meeting-continuity-20261019` | `ace46f896c98c8285e5da9231e813885d7979a7b` | already consolidated |
| `origin/codex/portfolio-repo-move-20261011` | `8e8e6999c385beccd245e94e8f32a8a3120e8131` | already consolidated |
| `origin/codex/ui-receiving-20261019` | `6da70dc3d968360d296eaf191462b15f7978dd30` | already consolidated |
| `origin/codex/ui-receiving-all-three-20261019` | `043c1102c322098b01173e223ca7a33a1f4c08fb` | already consolidated |
| `origin/docs/clerk-production-domain-readback-20261017` | `a841d5aa8f683c8f1497685c1a6d96f3afe577a6` | already consolidated |
| `origin/docs/figma34-gaps-20261016` | `8a9c7da1562364ecfba4a233b9a8f3d4aaded75c` | already consolidated |
| `origin/docs/meri-host-status-correction` | `2dc47441789f61e55a6371d9a30310d11c65b27e` | superseded |
| `origin/docs/portfolio-session-handover-20261012` | `c953bc08a9cabc6e38fdacd019017d2e891a3284` | already consolidated |
| `origin/docs/pr81-image-terminal-20261017` | `2c7e73b16e565c6c9c8d1f120a854fee153a667c` | already consolidated |
| `origin/dot/fe-roster-reviewed-core-source-20261018` | `78cb98163379830cba2ca81283d7e3833a9a23d5` | already consolidated |
| `origin/dot/fe-roster-service-config-20261018` | `6b758cb22ee718e1198c8ebfafe6ba1fe401dbb7` | already consolidated |
| `origin/dot/meri-desktop-parity-20261016` | `3930e36593960966edaa39f8f7f25faa14f9654a` | already consolidated |
| `origin/dot/meri-memory-settings-receive-20261018` | `b39ab841aad18cc06613f5aa1e6acbc930b8b6bd` | already consolidated |
| `origin/dot/meri-new-chat-selector-20261018` | `67fdf56b8f63f25c95dd2c0a2ff0139dcfe3cfb8` | already consolidated |
| `origin/dot/meri-ui-followup-20261016` | `36974aa470d9e1ae5b6cd89c16b8e19dc77e2b6e` | already consolidated |
| `origin/dot/meri-ui-history-20261016` | `033a9862d1b4f3c2b98ac560d8737e2d8240d4a3` | already consolidated |
| `origin/dot/meri-ui-initial-input-20261016` | `8c50fc49ee1f125bd841d3eb3b8959d7d5daec45` | already consolidated |
| `origin/dot/meri-ui-input-20261016` | `b2c7dab2bfd159b2d54e2b0149226811c593fb4e` | already consolidated |
| `origin/fable/adj-d3-first-connect-20261020` | `87d804bc3cecab69fb2cabe887d78c5cb81f9daf` | already consolidated |
| `origin/fable/adj-fe-first-connect-release-20261020` | `87d804bc3cecab69fb2cabe887d78c5cb81f9daf` | already consolidated |
| `origin/fable/adj-g-stream-window-20261020` | `6043b76e28d0fedf99b184c9b7cbd6fb3cd6baca` | already consolidated |
| `origin/fable/consolidate-preview-onto-main-20261020` | `2abf9cdd9e402f7961d04f7136f1810c6eb69da5` | already consolidated |
| `origin/fable/fe-intents-20261019` | `496f9b6c7fcb72af086e49b9230a5008f2339fa8` | already consolidated |
| `origin/fable/frontend-integration-20261018` | `271a267da93aa952a89b208d1f42eed0ffb080c2` | already consolidated |
| `origin/fable/meri-everything-heading-specs-20261021` | `b6336be53c3515115122578ad22f659cc2fd6ab5` | integrate |
| `origin/fable/meri-host-archived-client-guard-20261017` | `31a140cddf798c32b5cc45ad22e7b672312b3ca3` | already consolidated |
| `origin/fable/meri-host-size-split-20261017` | `4ea553fe71682b22192ab09cc6663b97971c21df` | already consolidated |
| `origin/fable/meri-stale-browser-specs-20261020` | `dc9a18d28ea934f5e655d13ea1e8686225bb4d73` | integrate |
| `origin/feat/capiro-directory-objective-20261014` | `0a023523456a1f8fbaa61aec4f34a27a8d19a59a` | already consolidated |
| `origin/feat/capiro-meri-conversations-20261014` | `f8eadc87adb187fbb3d9593ef873f2520fcf2177` | already consolidated |
| `origin/feat/capiro-objective-resource-choices-20261014` | `6eacf3459d1191b5544b337ed00288bec55f257d` | already consolidated |
| `origin/feat/governed-objective-output-receiver-20261017` | `f81f75974d314a25043bb4073e64c756dae1ffd5` | already consolidated |
| `origin/feat/governed-objective-planner-current-read-ui-20261017` | `8278c2d487624910a4878eaa37822771c4f9cf23` | already consolidated |
| `origin/feat/governed-objective-read-adapter-20261017` | `57efa4afca37b1708e8cad2c5d7b670c91c0fb60` | already consolidated |
| `origin/feat/governed-objective-strategy-intake-ui-20261017` | `de59687eb0067b19cc4ff2ffceddb19419ae9d8e` | already consolidated |
| `origin/feat/governed-objective-ui-plan-20261017` | `aceb18ea56bd99a48e0ca527ce0f3e7559092c05` | already consolidated |
| `origin/feat/meri-first-chat-bootstrap-preview-20261016` | `8fd2c4c4556e5fed37da012293a4f1b4d2088d14` | already consolidated |
| `origin/feat/meri-non-meri-desktop-integration-20261016` | `2a6b817fb27aa9524ab5036a5b8e1bf0955a26c8` | already consolidated |
| `origin/feat/non-meri-coherent-desktop-read-20261017` | `ddffefc67d68da0acee4b52ef4e3cbad278b0895` | already consolidated |
| `origin/feat/non-meri-desktop-continuation-20261016` | `d7b6d182356649214e956707e72672464320d699` | already consolidated |
| `origin/feat/non-meri-desktop-product-fixes-20261017` | `f3e248252cc9860665300ee1765d1e2702969ced` | already consolidated |
| `origin/feat/non-meri-desktop-strategy-integration-20261017` | `36e6b70b9c086ba46bf24568865c50ba3a455ca9` | already consolidated |
| `origin/feat/non-meri-next-shipment-receiving-20261017` | `de587eec44f2dc45565bfbe8bd4a10bb0d301fde` | already consolidated |
| `origin/feat/non-meri-objective-plan-bindings` | `3ef15d9a8ae6a27a9c2f39ccd923b5e2e07797cd` | already consolidated |
| `origin/feat/non-meri-url-state-personnel-20261017` | `7e0ca0ffeee8e49b628776ffeb4bce0bd568fde3` | already consolidated |
| `origin/feat/objective-generation-receiving` | `9cef177eb294167ea3fbc46289cabbd8c6b8f7c9` | already consolidated |
| `origin/feat/objective-planner-receiving` | `ee5f04469c1fbf0e14842785e345ab5964770086` | already consolidated |
| `origin/feat/planner-markdown-toolbar` | `f86895e185a099d7bd655d7fcf5481cdb237e6b1` | already consolidated |
| `origin/feat/portfolio-commitment-due-day-20261017` | `009430af25c6a5a97f74a5ae18a0c3a0b1749ecd` | already consolidated |
| `origin/feat/pr60-existing-clerk-issuer-handoff-20261017` | `4f820f588386e6b023f55714c0e6c11091ecef63` | already consolidated |
| `origin/feat/pr64-native-session-authority-20261017` | `77d3fdd3ce050540003219836a0c3bfb1f6eafbb` | already consolidated |
| `origin/feat/pr70-first-chat-architecture-recovery-20261017` | `01cf1df981250841d40df5fe0389f47168593cce` | already consolidated |
| `origin/feat/pr70-first-chat-preview-config-20261017` | `7e0c5da4e8319b0ca3e34824d22b30b02abd2b14` | already consolidated |
| `origin/feat/pr82-research-card-figma-20261017` | `f6261d706a4253373c0baf8928c8e17c0c25b2be` | already consolidated |
| `origin/feat/research-create-intent-retry-20261017` | `fc358a9183066381ec3cb04719e2a451e31c2957` | already consolidated |
| `origin/feat/research-create-reload-persistence-20261017` | `eee2791a63a9bd6b5ef0f8ea3b50bf52f5f3fc92` | already consolidated |
| `origin/feat/settings-profile-dialog-write-lifetime-20261017` | `2220a4a6b2295b8420639587123b69d72ac2ff84` | already consolidated |
| `origin/fix/desktop-export-on-checkpoint` | `f5a0c7639b99b25cdca5c49b6977c5592313ab3e` | already consolidated |
| `origin/fix/desktop-time-pending-catalog` | `af68cd562227befba4f0dab67df4cd8ff56b218e` | already consolidated |
| `origin/fix/engagement-workload-contract-closeout` | `2758775ddf0e3b17898370be61540498344a9f57` | already consolidated |
| `origin/fix/meri-audit-recovery-20261018` | `5c784e3e46114816ba57db17ad7a2c2013a8d81a` | already consolidated |
| `origin/fix/meri-exact-run-reconnect` | `c060f0462acd79feabe4d4ca5818abf00380189e` | already consolidated |
| `origin/fix/non-meri-settings-comment-closure` | `e9df91d876eaad05d13fdd0707c1fe39d5affb62` | already consolidated |
| `origin/fix/planner-canonical-request-origin` | `0a73dd87d0430f07ac67d66e96457a4df304720c` | already consolidated |
| `origin/fix/planner-qualification-successor` | `4c852b9477801d2671f436af7aa15ec5882f49c3` | already consolidated |
| `origin/fix/portable-desktop-test-harness` | `74a2008a86ad54ce303f5f58e5529803fa096aa5` | already consolidated |
| `origin/fix/rich-document-boundary-keyboard` | `4e1421054df0d32c564f7c9bc75cbd5e5366b428` | already consolidated |
| `origin/fix/selected-meeting-desktop-parity` | `9b7e087ca1e7cc9c6dbbf60fe4e4c7eba4c1cb66` | already consolidated |
| `origin/integration/capiro-archive-diagnostics-20261012` | `753eb6701e62f8f3f5ace16f86c967bdd372298b` | intentional exclusion |
| `origin/integration/capiro-build-execution-20261012` | `305180e53766387ff56b2689505b44272250217d` | already consolidated |
| `origin/integration/capiro-contracts-20261012` | `a397d45c461b24eb741afcd3b7cf28ca354d1e96` | already consolidated |
| `origin/integration/capiro-followup-20261012` | `7aca86e7d64cfdb85d09d424a07e6186339fc24c` | already consolidated |
| `origin/integration/capiro-functional-preview-20261014` | `257cf5b5db673b31c98264f9da33759c68066ba4` | already consolidated |
| `origin/integration/capiro-input-accessibility-20261013` | `bbf1b1b42b213cf971681fde79931afade0804a9` | already consolidated |
| `origin/integration/capiro-layout-received-candidate-20261014` | `6505e5014886625cad7dacd70fb11f607445791a` | already consolidated |
| `origin/integration/capiro-meri-workflow-20261013` | `fc6f8eef67353d166895146f8d83189a5cf0a05c` | already consolidated |
| `origin/integration/capiro-newsletter-port-20261012` | `46ebdd448ef55e88c7a4083fb4586322757a14f8` | already consolidated |
| `origin/integration/capiro-onboard-port-20261013` | `a2ae5919fdb70523e67c49adbcc559cbae2b37e7` | already consolidated |
| `origin/integration/capiro-p1-successor-20261012` | `fd1176790a6fb31b7ae68587f965a22d4145d8a2` | already consolidated |
| `origin/integration/capiro-preview-candidate-20261014` | `ee9d872743f44f927fa924eebd764da8e093888c` | already consolidated |
| `origin/integration/capiro-preview-read-only-20261013` | `6780c114a1d216fa857182a62f9b3610b9d76121` | already consolidated |
| `origin/integration/capiro-preview-receiving-20261013` | `23df0b04fe643ba7ab64395d7a471ddb20172db6` | already consolidated |
| `origin/integration/capiro-preview-visual-20261013` | `c045668da6fc3b630e6d83432e608c9d20c86afe` | already consolidated |
| `origin/integration/capiro-receiving-20261014` | `348c98dfe1962fac962157eb785732281a282d06` | already consolidated |
| `origin/integration/capiro-remaining-20261012` | `3a83e874383d9129726689bb8fc66438c2f18f18` | already consolidated |
| `origin/integration/capiro-shared-20261012` | `d393f08a551f00ee507636264a01657ff0f64655` | already consolidated |
| `origin/integration/capiro-successor-candidate-20261014` | `72b6e1279506f0a38d7d34794c7cc9ba17744043` | already consolidated |
| `origin/integration/capiro-unified-20261013` | `890a993a26dcee66ca3190ee6af4611e33171240` | already consolidated |
| `origin/integration/capiro-unified-desktop-20261014` | `cc73ead8f591b31b2f2cfc8bb008913408d7a5e0` | already consolidated |
| `origin/integration/capiro-visual-closeout-20261012` | `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d` | already consolidated |
| `origin/main` | `4f9a7e8dcaa9ba03494dc5a49559daf70cea5100` | already consolidated |
| `origin/meri/f34-evidence-c7e06000` | `59be1a24239c9c1af2c174cdddad59882b98db23` | intentional exclusion |
| `origin/meri/figma-34-ui` | `c7e060007f5cd5a9b786442d0cc168a73c5565a8` | already consolidated |
| `origin/meri/live-wiring-20261016` | `0b026499187c8379f8f307a06c353cdd166b9c3f` | superseded |
| `origin/repair/capiro-auth-initialization-20261014` | `6eeac2b95f5775447e9dd8ec25b9c556686d39e4` | already consolidated |
| `origin/repair/capiro-authorized-layout-20261014` | `8f07bead475a186e470eb0b50f2e4fb03d4c40f5` | already consolidated |
| `origin/repair/capiro-browser-release-20261014` | `20568813c9dc9ce161962e159e0a3751a196195c` | already consolidated |
| `origin/repair/capiro-customize-entry-20261014` | `4465f5f1cfb1b807c97106433b70a0ccd480c4a2` | already consolidated |
| `origin/repair/capiro-desktop-closeout-20261014` | `0b6c7ecf2c3f0f66dee5a0e88cb67528a6cc5fc2` | already consolidated |
| `origin/repair/capiro-desktop-content-20261014` | `882c7b51d79c6d20ace685fb32b5c76a1ef312bf` | already consolidated |
| `origin/repair/capiro-desktop-detail-content-20261014` | `7d7bf4c550e8d906c6ef3498ff79327820519daa` | already consolidated |
| `origin/repair/capiro-desktop-details-20261014` | `462e7b554200f9b4a96c1589d55b6df7ce4a7df5` | already consolidated |
| `origin/repair/capiro-existing-api-feedback-20261014` | `348bf98481268a5f06e26a924f0985b242265cbb` | already consolidated |
| `origin/repair/capiro-figma-parity-20261014` | `6dcb3923cec125be94fc72e80e31bec635687cd2` | already consolidated |
| `origin/repair/capiro-files-selection-20261014` | `38c53fb0c8f05f598d835122c0ce7fd0f30a04fc` | already consolidated |
| `origin/repair/capiro-meri-phone-parity-20261014` | `d542239d13fd1af674c1fecf8130d68f3f6849ed` | already consolidated |
| `origin/repair/capiro-next-functional-20261014` | `247de58f00a1fea50c25a3400463103885014f4f` | already consolidated |
| `origin/repair/capiro-outreach-pending-20261014` | `93ad8792a95bfc1a15a691c608b5fe98f0ca7956` | already consolidated |
| `origin/repair/capiro-portfolio-modules-acceptance-20261014` | `bded987746d1f1a263bb4209c90b21ac5c978f40` | already consolidated |
| `origin/repair/capiro-preview-favicon-20261014` | `a2d210a728a8ec6d2f1f2137b1c3b8ea8dbb2b82` | already consolidated |
| `origin/repair/capiro-production-data-20261014` | `7e170defb9442aa3ce0fd1d5b14060af831ce8d0` | already consolidated |
| `origin/repair/capiro-service-error-feedback-20261014` | `d034866de50ac006a9cf49607f6d9e9d63c9b150` | already consolidated |
| `origin/repair/capiro-shipping-browser-20261013` | `6dacdaca3507bf75a472f5860ac72fc483377248` | already consolidated |
| `origin/repair/capiro-strategy-proposal-compatibility-20261014` | `038ee79e93e9b4d1a371a5d38e17dd339b1af859` | already consolidated |
| `origin/repair/capiro-workspace-admission-20261014` | `3059abec94e2d6b9790758bb9563afdb8091b143` | already consolidated |
| `origin/review/capiro-sdk-015-20261014` | `98c6eefea0953fbecccd88de43161c6bc809f300` | already consolidated |
| `origin/task/meri-cited-answer-20261011` | `b697cfcba6589ef193de4e3bcb25aad773871125` | already consolidated |
| `origin/task/meri-ui-publish-20261011` | `3cc30ff3182e8050d563516607866cf07efe2aef` | already consolidated |
| `origin/task/modules-settings-20261011` | `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a` | already consolidated |
| `origin/test/meri-discovery-state` | `3703d08a89ee91e495985fa5b56cbbd8c8006c7b` | superseded |
| `origin/test/pr52-auth-readiness-controls` | `4ac87e7554eaab5defde9abd43ee843b54029a53` | already consolidated |
| `origin/work/engagement-outreach-only-20261017` | `b57072a5e3bb3e2028e64ce55bca9cf576f6f014` | already consolidated |
| `origin/work/first-chat-preview-native-gets-20261017` | `411c0cf0335fcfc047e2c61be8525a31a48171b2` | already consolidated |
| `origin/work/first-chat-proxy-origin-20261017` | `b071de88231654f699dc2baee0ddd255bfa4643a` | already consolidated |
| `origin/work/meri-task-command-root-origin-20261017` | `0936b4b66c9305c3e358d6b94ec888349f62888d` | already consolidated |
| `origin/work/pr87-pr90-local-receiving-20261017` | `143c20a178665e0eb5c830acb3cb7d60351e5f29` | already consolidated |
| `pr/1` | `b697cfcba6589ef193de4e3bcb25aad773871125` | already consolidated |
| `pr/10` | `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d` | already consolidated |
| `pr/100` | `6b758cb22ee718e1198c8ebfafe6ba1fe401dbb7` | already consolidated |
| `pr/101` | `78cb98163379830cba2ca81283d7e3833a9a23d5` | already consolidated |
| `pr/102` | `496f9b6c7fcb72af086e49b9230a5008f2339fa8` | already consolidated |
| `pr/103` | `442f188c6636ee4d34566e92aad34261d2dd402a` | already consolidated |
| `pr/104` | `336a093e9debd3b067468510403219731820ee4d` | already consolidated |
| `pr/105` | `3a34ab25a6cc0929294901039aeed0baa609f289` | already consolidated |
| `pr/106` | `553b848303a94b206c3c2efafc0c29c2cb40414a` | already consolidated |
| `pr/107` | `ace46f896c98c8285e5da9231e813885d7979a7b` | already consolidated |
| `pr/108` | `4dc8727f73da851a52c36a17f99589f6391df8b1` | already consolidated |
| `pr/109` | `6da70dc3d968360d296eaf191462b15f7978dd30` | already consolidated |
| `pr/11` | `e9ba4c32da8e9a499bf7fb3b1b34dad7acf913ac` | already consolidated |
| `pr/110` | `043c1102c322098b01173e223ca7a33a1f4c08fb` | already consolidated |
| `pr/111` | `e6180219b589ae8fced7155d1c451840c8663d94` | integrate |
| `pr/112` | `cfabbc30c88f5d0078e95ac8062116fc636c13a9` | integrate |
| `pr/113` | `2abf9cdd9e402f7961d04f7136f1810c6eb69da5` | already consolidated |
| `pr/12` | `305180e53766387ff56b2689505b44272250217d` | already consolidated |
| `pr/13` | `fd1176790a6fb31b7ae68587f965a22d4145d8a2` | already consolidated |
| `pr/14` | `7aca86e7d64cfdb85d09d424a07e6186339fc24c` | already consolidated |
| `pr/15` | `3a83e874383d9129726689bb8fc66438c2f18f18` | already consolidated |
| `pr/16` | `46ebdd448ef55e88c7a4083fb4586322757a14f8` | already consolidated |
| `pr/17` | `6dacdaca3507bf75a472f5860ac72fc483377248` | already consolidated |
| `pr/18` | `a2ae5919fdb70523e67c49adbcc559cbae2b37e7` | already consolidated |
| `pr/19` | `fc6f8eef67353d166895146f8d83189a5cf0a05c` | already consolidated |
| `pr/2` | `8e8e6999c385beccd245e94e8f32a8a3120e8131` | already consolidated |
| `pr/20` | `890a993a26dcee66ca3190ee6af4611e33171240` | already consolidated |
| `pr/21` | `c045668da6fc3b630e6d83432e608c9d20c86afe` | already consolidated |
| `pr/22` | `bbf1b1b42b213cf971681fde79931afade0804a9` | already consolidated |
| `pr/23` | `6780c114a1d216fa857182a62f9b3610b9d76121` | already consolidated |
| `pr/24` | `23df0b04fe643ba7ab64395d7a471ddb20172db6` | already consolidated |
| `pr/25` | `257cf5b5db673b31c98264f9da33759c68066ba4` | already consolidated |
| `pr/26` | `348bf98481268a5f06e26a924f0985b242265cbb` | already consolidated |
| `pr/27` | `4465f5f1cfb1b807c97106433b70a0ccd480c4a2` | already consolidated |
| `pr/28` | `38c53fb0c8f05f598d835122c0ce7fd0f30a04fc` | already consolidated |
| `pr/29` | `247de58f00a1fea50c25a3400463103885014f4f` | already consolidated |
| `pr/3` | `02c02d95bdf3949662b9123f425271c6491ffdab` | already consolidated |
| `pr/30` | `93ad8792a95bfc1a15a691c608b5fe98f0ca7956` | already consolidated |
| `pr/31` | `3059abec94e2d6b9790758bb9563afdb8091b143` | already consolidated |
| `pr/32` | `6eeac2b95f5775447e9dd8ec25b9c556686d39e4` | already consolidated |
| `pr/33` | `8f07bead475a186e470eb0b50f2e4fb03d4c40f5` | already consolidated |
| `pr/34` | `a2d210a728a8ec6d2f1f2137b1c3b8ea8dbb2b82` | already consolidated |
| `pr/35` | `0a023523456a1f8fbaa61aec4f34a27a8d19a59a` | already consolidated |
| `pr/36` | `7e170defb9442aa3ce0fd1d5b14060af831ce8d0` | already consolidated |
| `pr/37` | `f8eadc87adb187fbb3d9593ef873f2520fcf2177` | already consolidated |
| `pr/38` | `6eacf3459d1191b5544b337ed00288bec55f257d` | already consolidated |
| `pr/39` | `348c98dfe1962fac962157eb785732281a282d06` | already consolidated |
| `pr/4` | `3cc30ff3182e8050d563516607866cf07efe2aef` | already consolidated |
| `pr/40` | `d034866de50ac006a9cf49607f6d9e9d63c9b150` | already consolidated |
| `pr/41` | `6dcb3923cec125be94fc72e80e31bec635687cd2` | already consolidated |
| `pr/42` | `ee9d872743f44f927fa924eebd764da8e093888c` | already consolidated |
| `pr/43` | `d542239d13fd1af674c1fecf8130d68f3f6849ed` | already consolidated |
| `pr/44` | `bded987746d1f1a263bb4209c90b21ac5c978f40` | already consolidated |
| `pr/45` | `20568813c9dc9ce161962e159e0a3751a196195c` | already consolidated |
| `pr/46` | `462e7b554200f9b4a96c1589d55b6df7ce4a7df5` | already consolidated |
| `pr/47` | `882c7b51d79c6d20ace685fb32b5c76a1ef312bf` | already consolidated |
| `pr/48` | `038ee79e93e9b4d1a371a5d38e17dd339b1af859` | already consolidated |
| `pr/49` | `7d7bf4c550e8d906c6ef3498ff79327820519daa` | already consolidated |
| `pr/5` | `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a` | already consolidated |
| `pr/50` | `cc73ead8f591b31b2f2cfc8bb008913408d7a5e0` | already consolidated |
| `pr/51` | `0a73dd87d0430f07ac67d66e96457a4df304720c` | already consolidated |
| `pr/52` | `0b6c7ecf2c3f0f66dee5a0e88cb67528a6cc5fc2` | already consolidated |
| `pr/53` | `e9df91d876eaad05d13fdd0707c1fe39d5affb62` | already consolidated |
| `pr/54` | `2758775ddf0e3b17898370be61540498344a9f57` | already consolidated |
| `pr/55` | `9b7e087ca1e7cc9c6dbbf60fe4e4c7eba4c1cb66` | already consolidated |
| `pr/56` | `3ef15d9a8ae6a27a9c2f39ccd923b5e2e07797cd` | already consolidated |
| `pr/57` | `d7b6d182356649214e956707e72672464320d699` | already consolidated |
| `pr/58` | `4e1421054df0d32c564f7c9bc75cbd5e5366b428` | already consolidated |
| `pr/59` | `2a6b817fb27aa9524ab5036a5b8e1bf0955a26c8` | already consolidated |
| `pr/6` | `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0` | already consolidated |
| `pr/60` | `8fd2c4c4556e5fed37da012293a4f1b4d2088d14` | already consolidated |
| `pr/61` | `bd9e0d03c54ef4fbb57010c3b97cfb3d77bdf2b9` | already consolidated |
| `pr/62` | `9e6d80843b0a46a862f7613b4ab9b08d925d7b17` | already consolidated |
| `pr/63` | `1c0c059466963a3a5b4757d05f44701eb2007347` | already consolidated |
| `pr/64` | `4f820f588386e6b023f55714c0e6c11091ecef63` | already consolidated |
| `pr/65` | `b12978025858aac65169661e3bf04f13c3ab3faa` | already consolidated |
| `pr/66` | `aceb18ea56bd99a48e0ca527ce0f3e7559092c05` | already consolidated |
| `pr/67` | `77d3fdd3ce050540003219836a0c3bfb1f6eafbb` | already consolidated |
| `pr/68` | `57efa4afca37b1708e8cad2c5d7b670c91c0fb60` | already consolidated |
| `pr/69` | `f81f75974d314a25043bb4073e64c756dae1ffd5` | already consolidated |
| `pr/7` | `c953bc08a9cabc6e38fdacd019017d2e891a3284` | already consolidated |
| `pr/70` | `31a140cddf798c32b5cc45ad22e7b672312b3ca3` | already consolidated |
| `pr/71` | `a841d5aa8f683c8f1497685c1a6d96f3afe577a6` | already consolidated |
| `pr/72` | `009430af25c6a5a97f74a5ae18a0c3a0b1749ecd` | already consolidated |
| `pr/73` | `2220a4a6b2295b8420639587123b69d72ac2ff84` | already consolidated |
| `pr/74` | `fc358a9183066381ec3cb04719e2a451e31c2957` | already consolidated |
| `pr/75` | `8278c2d487624910a4878eaa37822771c4f9cf23` | already consolidated |
| `pr/76` | `eee2791a63a9bd6b5ef0f8ea3b50bf52f5f3fc92` | already consolidated |
| `pr/77` | `ddffefc67d68da0acee4b52ef4e3cbad278b0895` | already consolidated |
| `pr/78` | `7e0ca0ffeee8e49b628776ffeb4bce0bd568fde3` | already consolidated |
| `pr/79` | `7e0c5da4e8319b0ca3e34824d22b30b02abd2b14` | already consolidated |
| `pr/8` | `d393f08a551f00ee507636264a01657ff0f64655` | already consolidated |
| `pr/80` | `de59687eb0067b19cc4ff2ffceddb19419ae9d8e` | already consolidated |
| `pr/81` | `01cf1df981250841d40df5fe0389f47168593cce` | already consolidated |
| `pr/82` | `36e6b70b9c086ba46bf24568865c50ba3a455ca9` | already consolidated |
| `pr/83` | `f6261d706a4253373c0baf8928c8e17c0c25b2be` | already consolidated |
| `pr/84` | `2c7e73b16e565c6c9c8d1f120a854fee153a667c` | already consolidated |
| `pr/85` | `f3e248252cc9860665300ee1765d1e2702969ced` | already consolidated |
| `pr/86` | `de587eec44f2dc45565bfbe8bd4a10bb0d301fde` | already consolidated |
| `pr/87` | `b57072a5e3bb3e2028e64ce55bca9cf576f6f014` | already consolidated |
| `pr/88` | `411c0cf0335fcfc047e2c61be8525a31a48171b2` | already consolidated |
| `pr/89` | `0936b4b66c9305c3e358d6b94ec888349f62888d` | already consolidated |
| `pr/9` | `a397d45c461b24eb741afcd3b7cf28ca354d1e96` | already consolidated |
| `pr/90` | `b071de88231654f699dc2baee0ddd255bfa4643a` | already consolidated |
| `pr/91` | `143c20a178665e0eb5c830acb3cb7d60351e5f29` | already consolidated |
| `pr/92` | `271a267da93aa952a89b208d1f42eed0ffb080c2` | already consolidated |
| `pr/93` | `b39ab841aad18cc06613f5aa1e6acbc930b8b6bd` | already consolidated |
| `pr/94` | `e1de3f1d41f508629a79c198a21b71103e17c245` | already consolidated |
| `pr/95` | `88088d9ca86dc9c2f8ea9b2e42507348ca7652b1` | already consolidated |
| `pr/96` | `45528667db95f805660d2ded5f7a20b5c91c909b` | already consolidated |
| `pr/97` | `d9959a9cee267365d1f13a72351802a66c6dbfe2` | already consolidated |
| `pr/98` | `5c784e3e46114816ba57db17ad7a2c2013a8d81a` | already consolidated |
| `pr/99` | `f13dae4d6ab696f2fedde53ea18f0ed2018e9bf6` | already consolidated |
