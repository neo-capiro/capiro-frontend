# Context and reference index

This index accompanies the complete handover. It separates the authoritative source from earlier worktree variants while preserving both. The exact file-by-file inventory is in `SOURCE-INVENTORY.json` for the 1,184 canonical tracked files, and `context/manifest.json` for all restored working-context paths. The context inventory includes raw failed and passing runs, native source readbacks, Figma responses and captures, source snapshots, working diffs, and original handoff archives.

## Start here

1. [Current handover](HANDOVER.md): scope, current source, open issues, integration ownership, evidence and safe restart.
2. [Shared integration contract](../../SHARED-INTEGRATION-CONTRACT-2026-10-12.md): proposed routes, auth/client scope, common files, configuration and one release pipeline.
3. [Full local commit sequence](SOURCE-COMMITS.md), [source file inventory](SOURCE-INVENTORY.json), and [source publication receipt](receipts/source-publication-receipt.json).
4. [Current check summary](VERIFICATION-SUMMARY.json) and [exact runner receipt](verification/root-check/receipt.json).
5. [Open Intel Watchlist finding](reviews/watchlist-accepted-projection-REVIEW.md), [its exact source bindings](reviews/watchlist-accepted-projection-review.json), and [latest Meri shared-file review](reviews/PR4-SOURCE-ADVANCE-20261012.md).
6. [Historical phased gate review](planning/PHASE-GATES-20261012.md); read its chronology alongside the current handover, which supersedes its unfinished-integration status.

## Context restoration

The `context/` package preserves selected original paths relative to `/workspace/scratch/158b6018a5d3`. Its verifier checks every metadata file, compressed pack and uncompressed content object. Its restorer writes into an explicitly selected new directory. Restored working copies are context snapshots; do not copy an entire older worktree over the published application. Recreate Git branches from the preserved history bundle when needed, then use the per-worktree status and diffs.

[The complete history bundle](history/portfolio-local-history-through-760dcc6.bundle) preserves all 29 recorded refs, including all 33 local root continuation commits, without an external prerequisite. [The bundle receipt](history/local-history-bundle-receipt.json) records its verification and SHA256. The bundle ends at the final source checkpoint; the new handover artifacts are preserved by this GitHub branch itself.

## Worktree context map

| Original directory | Purpose and authority |
| --- | --- |
| `capiro-frontend-base` | Untouched published transfer/base at 02c02d95; historical baseline. |
| `capiro-frontend-portfolio` | Authoritative integrated Portfolio source through760dcc6; root reviews, all phase plans and combined qualification. |
| `capiro-portfolio-objective-intake` | Objective intake Figma and source continuation. |
| `capiro-portfolio-current-reads` | Early current-read and shared consolidation evidence. |
| `capiro-portfolio-work-current-reads` | Current Strategy/Work associations, document responsiveness and failure behavior. |
| `capiro-portfolio-profile-current-state` | Profile identity/client read gate, CRUD, and facility actions. |
| `capiro-portfolio-capability-presentation` | Figma capability form and scope/lifetime presentation work. |
| `capiro-portfolio-capability-documents` | Capability Documents and current file operations; its standalone outputs archive is also retained. |
| `capiro-portfolio-advocacy-filters-outcomes` | Timeline, filters and explicit outcome changes; frozen source integrated at f4731d2. |
| `capiro-portfolio-saved-submissions` | Current saved submissions and guarded removals; integrated at75409a9. |
| `capiro-portfolio-tracker-preferences` | Earlier Intel personal preferences/native identity continuation. |
| `capiro-portfolio-watchlist-current-state` | Final22-file Watchlist snapshot plus separate reviews; integrated ac66c061; finalCSS and all failed/passing cohorts. |
| `capiro-portfolio-alert-channels` | Final32-file personal preferences/OTP/test controls; integrated760dcc6; separate OPEN Watchlist review is additive outside original archive. |
| `capiro-portfolio-file-arrival` | CORE-109 exact current file arrival, OPP-01 discrepancy, latest Meri seam review and additive evidence/ledger proposals. |

All worktree `outputs/` roots are included, including archives outside `outputs/evidence/`. The package also preserves the original uploaded audit workbook, the extracted audit JSON, the P4 review/visual directories, native Tracker references, migration script and browser/runtime provenance identified by the collector. Two historical195-byte image-named fetch responses are retained as failed artifacts; their extensions do not establish valid image bytes.

Installed dependency trees, build caches, Git administrative directories and runtime executable downloads are reproducible environment artifacts excluded by the collector. The package records exclusions explicitly and retains lockfiles, configuration, public provenance and the source-history bundle reference. New handover tools, documents and archives are committed directly rather than recursively packed into themselves.

## Every canonical Markdown context document

The table below is generated from the exact760dcc6 Git tree. The current handover adds to these files; it does not erase their historical evidence. Native/Figma JSON, source, screenshots, ZIPs and other non-Markdown inputs are enumerated by the complete inventories.

| Repository file | Recorded heading | SHA256 |
| --- | --- | --- |
| [AGENTS.md](../../../AGENTS.md) | Capiro frontend implementation rules | `3889dd45c593695fbdbb3c3935eb06b0ee48c38c17d9ba3fcce0c606e5cf4389` |
| [README.md](../../../README.md) | Capiro frontend | `f1ff530e5b029304b84e5af49adce5501f8266d4546f843847573551e183a8a5` |
| [apps/web/AGENTS.md](../../../apps/web/AGENTS.md) | (no top-level heading) | `063098f6cb31bb44c6f8fbea25b3876de7ee1e5f7d00a50dbab506f6415eb7f0` |
| [apps/web/PORTFOLIO.md](../../../apps/web/PORTFOLIO.md) | Capiro 3.1 Portfolio | `56315c77dc594d3c688ff6cd7f65effbf61dc0a44f0b476042c88d30f056f804` |
| [apps/web/README.md](../../../apps/web/README.md) | Meri Home foundation | `7af630845055cd958131e85d8a177eaa0c09a2fd1dbec2bd2a58cccee18f1619` |
| [apps/web/deployment/portfolio/README.md](../../../apps/web/deployment/portfolio/README.md) | Isolated Portfolio preview deployment | `0f633cc6a62feae0888eac3ab71cd2e7556ae98103f9bde0da235c7e70017bd8` |
| [apps/web/public/fonts/newsreader/README.md](../../../apps/web/public/fonts/newsreader/README.md) | Newsreader | `a754f9ad051db3e9b81a86ac88cb4e63a7b34c8b95e23d7d052d4da5f3cd0f33` |
| [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) | Frontend ownership and implementation outline | `83574026d899a382d300c61b374f69b8c4dcc74a8e057eec1aaed4307f277432` |
| [docs/IMPLEMENTATION-STANDARDS.md](../../../docs/IMPLEMENTATION-STANDARDS.md) | (no top-level heading) | `d4f10f964ee207187abacd967649a1cfc9bdd468072dc01f859268f08b719959` |
| [docs/SHARED-FRONTEND-PREVIEW-GUIDELINES-2026-10-11.md](../../../docs/SHARED-FRONTEND-PREVIEW-GUIDELINES-2026-10-11.md) | Shared frontend preview and concurrent-agent guidelines | `d3f57b4963bffdc1ebda27553389a48482f9db89d4b129886cc3783b75a193b5` |
| [docs/SHARED-INTEGRATION-CONTRACT-2026-10-12.md](../../../docs/SHARED-INTEGRATION-CONTRACT-2026-10-12.md) | Shared frontend integration contract — proposed v0.1 | `baaf50eec9252f1caa721a113d137c57ab78ddb5316a24f215f16dec3f5e6ad1` |
| [docs/coordination/CODEX-FRONTEND-GUARDS-INDEPENDENT.md](../../../docs/coordination/CODEX-FRONTEND-GUARDS-INDEPENDENT.md) | Frontend guard repair independent recheck | `630b9ebd40ef5eb6276542c98d68b8c3ae4420bf4c85110647d2edf5e2557c7b` |
| [docs/coordination/CODEX-FRONTEND-GUARDS-REPORTS-FIX.md](../../../docs/coordination/CODEX-FRONTEND-GUARDS-REPORTS-FIX.md) | Frontend guard and historical-report repair | `20b2c3374793c33fd06528a0f63ee32f91b56c2f8d91aa409c0eaa2e3dee836a` |
| [docs/coordination/CODEX-FRONTEND-MIGRATION-ACCEPTANCE.md](../../../docs/coordination/CODEX-FRONTEND-MIGRATION-ACCEPTANCE.md) | Frontend source migration acceptance | `274be311a369ea2f75ef212d5e76f2060943f18ab4a12e134b1410e2981b228d` |
| [docs/coordination/CODEX-FRONTEND-OWNERSHIP-ACCEPTANCE.md](../../../docs/coordination/CODEX-FRONTEND-OWNERSHIP-ACCEPTANCE.md) | Frontend ownership integration acceptance | `5e9cdd83f01456fb849fa4e194a8f2e4b997173b9322050d5b0f2af6f130e075` |
| [docs/coordination/CODEX-FRONTEND-WORKSPACE-INDEPENDENT.md](../../../docs/coordination/CODEX-FRONTEND-WORKSPACE-INDEPENDENT.md) | Frontend workspace integration independent review | `aa2ceb153311fe23a897c1213152ebedb0b8df136cc2d5ae388c25a4fd8548e7` |
| [docs/coordination/CODEX-FRONTEND-WORKSPACE-INTEGRATION.md](../../../docs/coordination/CODEX-FRONTEND-WORKSPACE-INTEGRATION.md) | Frontend workspace integration | `4685643d34144b44ad5c52274cf69b5885e88a28256fffcdd42920ca7fa66e78` |
| [docs/coordination/CODEX-MERI-CLIENT-INDEPENDENT.md](../../../docs/coordination/CODEX-MERI-CLIENT-INDEPENDENT.md) | Independent public client and stream producer review | `93286664a8a462b35ba7a09538cc776f7eb72493bacd9f40f25a154331923391` |
| [docs/coordination/CODEX-MERI-CLIENT-MIGRATION-REPORT.md](../../../docs/coordination/CODEX-MERI-CLIENT-MIGRATION-REPORT.md) | Public browser client migration candidate | `ceb345a18899286ad4bb7c57a56348d21754cabfeca96c6bdd9fac17f0b91b26` |
| [docs/coordination/CODEX-MERI-CLIENT-MIGRATION.md](../../../docs/coordination/CODEX-MERI-CLIENT-MIGRATION.md) | Browser transport ownership migration | `e99c4f49c5b4f3b16ac47ad05a466656d9070b4106605bd8f4ae738c1fa10b0d` |
| [docs/coordination/CODEX-MERI-FRONTEND-FOUNDATION.md](../../../docs/coordination/CODEX-MERI-FRONTEND-FOUNDATION.md) | Meri frontend foundation — bounded Codex outline | `6a15360f6c66960c3fa8b0c43828f5bd800cc2864b89377e1e2c09738ec254c5` |
| [docs/coordination/CODEX-MERI-HOME-FINAL-ACCEPTANCE.md](../../../docs/coordination/CODEX-MERI-HOME-FINAL-ACCEPTANCE.md) | Final Meri Home independent acceptance | `562e298e20b97bc11a0f8bdb903e935a1a7f065860589392c442e06b11556efe` |
| [docs/coordination/CODEX-MERI-HOME-FINAL-REFERENCE.md](../../../docs/coordination/CODEX-MERI-HOME-FINAL-REFERENCE.md) | Final Home reference amendment | `86ef6a609c91e8f6cfae95a1c63d33b1bc304bec297ebc32c80cd8f320eaf201` |
| [docs/coordination/CODEX-MERI-HOME-INDEPENDENT.md](../../../docs/coordination/CODEX-MERI-HOME-INDEPENDENT.md) | Meri Home independent foundation review | `bf647f50bbdd88a7d923979091bbe3c65afca8fe9c25ebd1cce8bd70d1a724d7` |
| [docs/coordination/CODEX-MERI-HOME-RESPONSIVE-ACCEPTANCE.md](../../../docs/coordination/CODEX-MERI-HOME-RESPONSIVE-ACCEPTANCE.md) | Integration owner: responsive Home repair acceptance | `fa2393fa11c7a4aa860f66a3fed3cff4f5143771bd092b321e53c3c2b33851f7` |
| [docs/coordination/CODEX-MERI-HOME-RESPONSIVE-FIX.md](../../../docs/coordination/CODEX-MERI-HOME-RESPONSIVE-FIX.md) | Meri Home narrow-screen overflow repair | `03605b2818c2f6f78293c8b889091a76ae740ada40c4a16709c4fa9e4bbaff87` |
| [docs/coordination/CODEX-UI-PROMOTION-INDEPENDENT.md](../../../docs/coordination/CODEX-UI-PROMOTION-INDEPENDENT.md) | Codex independent UI promotion review | `6bf6c460629c7d988fa1e0ee0d3eef9288bfc872a2ef91fa7f7635158ee72eed` |
| [docs/coordination/CODEX-UI-PROMOTION.md](../../../docs/coordination/CODEX-UI-PROMOTION.md) | Canonical UI component promotion | `d5b1f8cd9e9c44643df31f7f06c60518d4231c0d140c4a9ee957ddefa2532c13` |
| [docs/portfolio-31/ACTIVITY-ACTIONS-CHECKPOINT.md](../../../docs/portfolio-31/ACTIVITY-ACTIONS-CHECKPOINT.md) | Recorded activity actions — 2026-10-11 | `18499e957e150a875b7554b034b8276147d326140737202231a330d702bef194` |
| [docs/portfolio-31/ADVOCACY-CORRECTIONS-CHECKPOINT.md](../../../docs/portfolio-31/ADVOCACY-CORRECTIONS-CHECKPOINT.md) | Advocacy corrections — implementation checkpoint | `a009cda4fb827ca24965d4600e84890ff7d826b0a70245dd6ea7988179aa3a92` |
| [docs/portfolio-31/ADVOCACY-FILTERS-OUTCOMES-CONTINUATION.md](../../../docs/portfolio-31/ADVOCACY-FILTERS-OUTCOMES-CONTINUATION.md) | Advocacy continuation: OBJ-02, OBJ-03 and OBJ-06 | `f1ef86e3b427eddeccb1f4afaa27bc1a89bb39d8456e0b780e466a090cafcf25` |
| [docs/portfolio-31/ARCHITECTURE-REVIEW-ALERT-CHANNELS-20261012.md](../../../docs/portfolio-31/ARCHITECTURE-REVIEW-ALERT-CHANNELS-20261012.md) | Alert preferences and channels responsibility review — 12 October 2026 | `c680adcf28b8f0a110ea173b6733e78d5bac871a0d5028e3450ea849fcc37316` |
| [docs/portfolio-31/ARCHITECTURE-REVIEW-P3.md](../../../docs/portfolio-31/ARCHITECTURE-REVIEW-P3.md) | Portfolio P3 cohesion review — Calendar and Relationships | `b83e08a14d04cf0621289925e351d7b4d37dc0dbfdc291305c5f296f6b00012d` |
| [docs/portfolio-31/ARCHITECTURE-REVIEW-P4-PROFILE.md](../../../docs/portfolio-31/ARCHITECTURE-REVIEW-P4-PROFILE.md) | Architecture review — Prospects, Files, client profile and intake | `f70b717cf472015d20cf4bba54ac33fcca9fee95ae2c234ec7a7b86fbb7d2964` |
| [docs/portfolio-31/ATTENDANCE-CHECKPOINT.md](../../../docs/portfolio-31/ATTENDANCE-CHECKPOINT.md) | Meeting attendance / client preferences checkpoint | `d9438d9f532441345f445e88b44531cb6d039b479331b2c7a2f105e3df0eb26d` |
| [docs/portfolio-31/BILL-HEARINGS-CHECKPOINT.md](../../../docs/portfolio-31/BILL-HEARINGS-CHECKPOINT.md) | Bill Tracker hearings checkpoint | `99776787384ce9c41931cb1dd59a654ce9b4bc60e21778bf10a6cb8b51ecbd35` |
| [docs/portfolio-31/BILLING-FLOW-REVALIDATION.md](../../../docs/portfolio-31/BILLING-FLOW-REVALIDATION.md) | Portfolio billing revalidation: CORE-077–082 | `50cb476a06f4e52ad872f730c467c89ffa0df43773460d1ec81a28e0f70e3fb9` |
| [docs/portfolio-31/BILLING-SUMMARY-CHECKPOINT.md](../../../docs/portfolio-31/BILLING-SUMMARY-CHECKPOINT.md) | CORE-075 — billing summary | `56ced371eddae98ff699b2dfcb874d1df1b45ffd7f2d36b2515b8f2529de35a1` |
| [docs/portfolio-31/CALENDAR-ACCESS-BOUNDARY.md](../../../docs/portfolio-31/CALENDAR-ACCESS-BOUNDARY.md) | Shared calendar access boundary | `5ccef11f9d49d25cc21ac2b11d2f88129c441536da6c48c96de47194b6c9a491` |
| [docs/portfolio-31/CALENDAR-CURRENT-READS-20261011.md](../../../docs/portfolio-31/CALENDAR-CURRENT-READS-20261011.md) | Calendar current-read correction — 11 October 2026 | `6625af44bafd70a00d5ea20ec8020deccb2bda4196948699690f32b4c340490d` |
| [docs/portfolio-31/CALENDAR-SYNC-CHECKPOINT.md](../../../docs/portfolio-31/CALENDAR-SYNC-CHECKPOINT.md) | Calendar sync checkpoint | `83e5c0bc305c06afd9f2e45a603bb0b5c763e334b7717045a134124ddf7e48de` |
| [docs/portfolio-31/CAPABILITY-DOCUMENTS-CONTINUATION.md](../../../docs/portfolio-31/CAPABILITY-DOCUMENTS-CONTINUATION.md) | CAP-05/06/07 capability documents continuation | `8a7098025c3a67f8bac2f225464bec539b72f54c115b200332d6f31d60a77f47` |
| [docs/portfolio-31/CAPABILITY-PRESENTATION-CONTINUATION.md](../../../docs/portfolio-31/CAPABILITY-PRESENTATION-CONTINUATION.md) | Capability editor presentation continuation | `04212cf00168817e04637785d18a9e1a15b10efec5c65882cea8d7fab15abad7` |
| [docs/portfolio-31/CONTINUATION-2026-10-11.md](../../../docs/portfolio-31/CONTINUATION-2026-10-11.md) | Portfolio continuation — 11 October 2026 | `18a6f9971f5342c14a550c5dc31226e10231703b88b6d44db4865c8cb35e32c1` |
| [docs/portfolio-31/COORDINATION-HANDOFF-2026-10-12.md](../../../docs/portfolio-31/COORDINATION-HANDOFF-2026-10-12.md) | Portfolio integration coordination snapshot — 12 October 2026 UTC | `92ac287c134be5ca04f3b1e49126f3c747b38329ead736d487d91b52f093d2c3` |
| [docs/portfolio-31/CORE-109-FILE-ARRIVAL-20261012.md](../../../docs/portfolio-31/CORE-109-FILE-ARRIVAL-20261012.md) | CORE-109 — activity attachment arrival | `116132753c9048d6c8480de0ede9fe5dc9afbc8a43d82a2f967509b745f2e2ca` |
| [docs/portfolio-31/CORE-128-SAVED-SUBMISSIONS-CONTINUATION-20261011.md](../../../docs/portfolio-31/CORE-128-SAVED-SUBMISSIONS-CONTINUATION-20261011.md) | CORE-128 — Saved submissions in Capabilities | `1601ba45f9ba61f6ed2f34b9dbb94148613ed24c6cf8319c06d082b96abd9291` |
| [docs/portfolio-31/CORE-FACILITY-ACTIONS-20261011.md](../../../docs/portfolio-31/CORE-FACILITY-ACTIONS-20261011.md) | Facility address-action lifetime continuation — 11 October 2026 | `f5f5ad859b501d1a137dfaf856493722173295f28b78127ba44835a2ab2b8c5e` |
| [docs/portfolio-31/CORE-PROFILE-CURRENT-STATE-20261011.md](../../../docs/portfolio-31/CORE-PROFILE-CURRENT-STATE-20261011.md) | Core profile current-state continuation — 11 October 2026 | `501a1a768ec5fea628e567d888406956d5d216f81040912235b0ab077eddf9ac` |
| [docs/portfolio-31/CURRENT-PROJECTIONS-CONTINUATION-20261011.md](../../../docs/portfolio-31/CURRENT-PROJECTIONS-CONTINUATION-20261011.md) | Current Portfolio list and activity projections — 11 October 2026 | `5076d2c12779671ea8eae9e41444df54c185e523b099f20a8ea59237a6086b21` |
| [docs/portfolio-31/EMAIL-COMPOSE-CHECKPOINT.md](../../../docs/portfolio-31/EMAIL-COMPOSE-CHECKPOINT.md) | Relationships mail controls checkpoint | `665c4d0c0d360e377a579f27dfe90a9393b8def528d8ec4aa81920776da31d5c` |
| [docs/portfolio-31/ENRICHMENT-CHECKPOINT.md](../../../docs/portfolio-31/ENRICHMENT-CHECKPOINT.md) | Client profile enrichment review | `05e95d88427f0016c80ce68811ccc46e38f8f91f9c6ed99660f10761abbc5c77` |
| [docs/portfolio-31/FACILITIES-CHECKPOINT.md](../../../docs/portfolio-31/FACILITIES-CHECKPOINT.md) | Facilities implementation checkpoint | `f0b56e1da54a573f7ba06d76e27aa7789d41da53a7366e05961fee3a3503991b` |
| [docs/portfolio-31/GLOBAL-OBJECTIVE-CHECKPOINT.md](../../../docs/portfolio-31/GLOBAL-OBJECTIVE-CHECKPOINT.md) | Global objective client picker — OBJ-19 | `671663b996e08beef98a1d8eabb3d0f8e35ad1ac11370d89db650f6c41362a44` |
| [docs/portfolio-31/IMPLEMENTATION-CHECKPOINT.md](../../../docs/portfolio-31/IMPLEMENTATION-CHECKPOINT.md) | Capiro 3.1 Portfolio implementation checkpoint | `5a2ee50053f3d679a8e1b841646b02915628c02fbc5cdf709386d1801e127553` |
| [docs/portfolio-31/IMPLEMENTATION.md](../../../docs/portfolio-31/IMPLEMENTATION.md) | Portfolio 3.1 implementation | `e005e1bfc42e47dcd9a54bab74fbf33406a03623df2289499d966f36da05585c` |
| [docs/portfolio-31/INTAKE-CHECKPOINT.md](../../../docs/portfolio-31/INTAKE-CHECKPOINT.md) | Client intake checkpoint — 2026-10-11 | `85f992bbf0f7467d84202d4bfd5acf44e0f53e31086174c0e2ef5e4f47ceb86b` |
| [docs/portfolio-31/MANUAL-DEBRIEF-CHECKPOINT.md](../../../docs/portfolio-31/MANUAL-DEBRIEF-CHECKPOINT.md) | Manual meeting debrief source | `356400ba741ef2d980db98aed1e2798eff30642774a6ddd20dd1bb302513f52c` |
| [docs/portfolio-31/MEETING-COMPOSITION-CHECKPOINT.md](../../../docs/portfolio-31/MEETING-COMPOSITION-CHECKPOINT.md) | Meeting composition | `6ffe95cbf91f71a05bd54102b6a35718704fb803d406c4e122067113cb3ae24e` |
| [docs/portfolio-31/MEETING-DOCUMENTS-CHECKPOINT.md](../../../docs/portfolio-31/MEETING-DOCUMENTS-CHECKPOINT.md) | Saved meeting document preview and preparation PDF attachment | `33fa5b6f51fa48533aaf74cfb5586235dea551e96ed033dbb4b2864eee1f9fa9` |
| [docs/portfolio-31/MEETING-LIBRARY-CHECKPOINT.md](../../../docs/portfolio-31/MEETING-LIBRARY-CHECKPOINT.md) | Calendar library and assignment checkpoint | `02b3caf3b69e23f0cb1b10b2ce0ea6d2a87303dbe07c6ea4a951a59b90f27e41` |
| [docs/portfolio-31/MEETING-PREPARATION-CHECKPOINT.md](../../../docs/portfolio-31/MEETING-PREPARATION-CHECKPOINT.md) | Calendar meeting preparation checkpoint | `1f86ee90e2b251093517bb61cdcb8ccbce0f0c0979bb96648939f32ade632d77` |
| [docs/portfolio-31/MEETING-REVIEW-CHECKPOINT.md](../../../docs/portfolio-31/MEETING-REVIEW-CHECKPOINT.md) | Meeting attachment approval and saved-note debrief source | `9eeb1d94129d0d805715302ecdb7cf2000b1de92022b4d7bc23f91e5d53dda42` |
| [docs/portfolio-31/MEMBER-QUICK-LOG-CHECKPOINT.md](../../../docs/portfolio-31/MEMBER-QUICK-LOG-CHECKPOINT.md) | Member Quick log — CORE-093 / CORE-094 | `bb4757f6d7d81e5d8d6c11ba5d6a48f6e0bd63cb017030f1a0892911914a5a30` |
| [docs/portfolio-31/MERI-PR4-SEAM-REVIEW-2026-10-12.md](../../../docs/portfolio-31/MERI-PR4-SEAM-REVIEW-2026-10-12.md) | Meri PR #4 / Portfolio shared integration seam review | `47f1352af2c57d035d8d89e63b14b03168474348208bdbd0286513ea4e2895c5` |
| [docs/portfolio-31/OBJECTIVE-INTAKE-CONTINUATION-2026-10-11.md](../../../docs/portfolio-31/OBJECTIVE-INTAKE-CONTINUATION-2026-10-11.md) | Objective full-page intake continuation | `33b53e86249e9bfe7b98b41124df7382c72a3278b1e5f8399bfc0c3b020d8297` |
| [docs/portfolio-31/OBJECTIVE-RECEIPTS-CHECKPOINT.md](../../../docs/portfolio-31/OBJECTIVE-RECEIPTS-CHECKPOINT.md) | Objective operation receipts | `21d48d74ae32c745c27f89d0a841264d32b3f02e7d2192aea288c9ec4979e270` |
| [docs/portfolio-31/OVERVIEW-REMOVAL-CHECKPOINT.md](../../../docs/portfolio-31/OVERVIEW-REMOVAL-CHECKPOINT.md) | Saved submission removal and just-created Quick log Undo | `9ef18d63600650079c8608aa8dbdf000a002e967a63f911aa0380ebf7eb63220` |
| [docs/portfolio-31/P3-CALENDAR-RELATIONSHIPS-CONTINUATION-20261011.md](../../../docs/portfolio-31/P3-CALENDAR-RELATIONSHIPS-CONTINUATION-20261011.md) | P3 Calendar and Relationships continuation — 11 October 2026 | `86227f126992ac9cf5ba81bace994f49ad55799ca0887887baaf9b92ccfc7016` |
| [docs/portfolio-31/P4-PROSPECT-FILES-CONTINUATION.md](../../../docs/portfolio-31/P4-PROSPECT-FILES-CONTINUATION.md) | P4 prospect overview and file-read continuation | `e991f5b638b790c1d463ee8c71e6ee6893ab08e9f0e79f1daffca1b36319e022` |
| [docs/portfolio-31/P6-ALERT-CHANNELS-20261012.md](../../../docs/portfolio-31/P6-ALERT-CHANNELS-20261012.md) | BILL-11/12 personal preferences and alert channels — 12 October 2026 | `0b75b1d452bbf6ef43d8199ed255b5a7abe73824f670c34f829f7c8bf04a3b9d` |
| [docs/portfolio-31/P6-CAPABILITY-OPPORTUNITY-CURRENT-READS.md](../../../docs/portfolio-31/P6-CAPABILITY-OPPORTUNITY-CURRENT-READS.md) | P6 capability and opportunity current-read continuation | `cab8ae06d5765d339989954c88c6236f30500a35663c74c441374797d86be318` |
| [docs/portfolio-31/P6-TRACKER-PREFERENCES-20261011.md](../../../docs/portfolio-31/P6-TRACKER-PREFERENCES-20261011.md) | P6 Bill Tracker preferences and current records — 11 October 2026 | `5c3b23165ca11ed4d281e0c1c43387876a17f0650f72f040d2595ade5d6d3fd9` |
| [docs/portfolio-31/P7-WORK-CURRENT-READS-20261011.md](../../../docs/portfolio-31/P7-WORK-CURRENT-READS-20261011.md) | P7 Work current reads — 2026-10-11 | `c7cbf60ec5ffb2f2928757c177ef37dcfae27b664f9930cc08f2a675ce54632a` |
| [docs/portfolio-31/P7-WORK-PRESENTATION-20261011.md](../../../docs/portfolio-31/P7-WORK-PRESENTATION-20261011.md) | P7 Work presentation — 2026-10-11 | `8214ffbf15ba3436bc8e400216d770f3b64d30abf33f20464aaff38b3c4a3c03` |
| [docs/portfolio-31/PORTFOLIO-INDEX-CHECKPOINT.md](../../../docs/portfolio-31/PORTFOLIO-INDEX-CHECKPOINT.md) | Portfolio index and profile chooser checkpoint | `d481d2946ae33d8cad2b8a88f6c2e17f215a85c6e2417b694f50e2762776dba1` |
| [docs/portfolio-31/PROFILE-CAPACITY-CHECKPOINT.md](../../../docs/portfolio-31/PROFILE-CAPACITY-CHECKPOINT.md) | Profile capacity — bounded implementation outline | `358a9d6cd3be94d0a74b13f2df1552f4f61bd04c0637d686bcf42765a66cea0b` |
| [docs/portfolio-31/PROFILE-INTEGRATION-OUTLINE.md](../../../docs/portfolio-31/PROFILE-INTEGRATION-OUTLINE.md) | Profile and debrief integration | `08c0ea6618a7ba171116cf030cdea0097b7175071e53fd8337a3ad2a8a8b1700` |
| [docs/portfolio-31/PROFILE-TOOLS-CHECKPOINT.md](../../../docs/portfolio-31/PROFILE-TOOLS-CHECKPOINT.md) | CSV import, focus tags and profile JSON | `7c596d3a4e79ae3831ba38939e17a9a4f857f6947b9fad49e64a5568a0e7d9a8` |
| [docs/portfolio-31/PROGRAM-ELEMENTS-CHECKPOINT.md](../../../docs/portfolio-31/PROGRAM-ELEMENTS-CHECKPOINT.md) | Portfolio summary / Needs attention checkpoint | `5183fd6646bd8e20f4f1163830d2802d3346a188d1c44d928464e2ceacb4cc2a` |
| [docs/portfolio-31/PROPOSAL-PERSISTENCE-CHECKPOINT.md](../../../docs/portfolio-31/PROPOSAL-PERSISTENCE-CHECKPOINT.md) | Proposal persistence discovery checkpoint | `7fd186d1d4a5d413cf82b53d3fa87cdc960616b7d5d5b6df5c8ac0bf23ce5023` |
| [docs/portfolio-31/PROPOSAL-PERSISTENCE-CONTRACT.md](../../../docs/portfolio-31/PROPOSAL-PERSISTENCE-CONTRACT.md) | Prospect proposal contract candidate | `fa5ce8dfe00e86d775ac8874ac2c4ce4a29a8cab3b2838dbe9420dd446e6f439` |
| [docs/portfolio-31/PROPOSALS-CHECKPOINT.md](../../../docs/portfolio-31/PROPOSALS-CHECKPOINT.md) | Prospect proposals checkpoint | `b52bf6a92186bde035d123427e75f0f415c2d44cebdb8324ba3f7715156551e8` |
| [docs/portfolio-31/PROSPECT-BRIEF-CHECKPOINT.md](../../../docs/portfolio-31/PROSPECT-BRIEF-CHECKPOINT.md) | Prospect federal strategy brief checkpoint | `9fbdda54a4cf4104e5a490cefadf7fdefe6d688f4e7f7145a3992e89bcd33e6d` |
| [docs/portfolio-31/PROSPECT-CONTACTS-CHECKPOINT.md](../../../docs/portfolio-31/PROSPECT-CONTACTS-CHECKPOINT.md) | Prospect Contacts — PROS-017 | `13fee68ffa6ab59f0f368089a2beac0a19843424cf75dacbd15b7d68d9d0a2df` |
| [docs/portfolio-31/PUBLIC-EVENT-CHECKPOINT.md](../../../docs/portfolio-31/PUBLIC-EVENT-CHECKPOINT.md) | Public proceeding detail | `2ffc1d9dbbaa363fec0c5a65c3bc90b6634f64c4e676f843014954902616e9f5` |
| [docs/portfolio-31/QUICK-LOG-MEETING-HANDOFF-2026-10-11.md](../../../docs/portfolio-31/QUICK-LOG-MEETING-HANDOFF-2026-10-11.md) | Quick log meeting handoff — CORE-102 | `29a3c009ea12dddc7f378ecede43099ca81244cc9857c8b72abf6bb64f1fcd9f` |
| [docs/portfolio-31/REGISTRANT-INTAKE-CHECKPOINT.md](../../../docs/portfolio-31/REGISTRANT-INTAKE-CHECKPOINT.md) | Registrant intake checkpoint | `4c6372094245b05565bc93f3e1d38494f6c21688966d66045ca96d06b97d2884` |
| [docs/portfolio-31/RELATIONSHIPS-CHECKPOINT.md](../../../docs/portfolio-31/RELATIONSHIPS-CHECKPOINT.md) | Organization Relationships checkpoint | `974cb5c95a3158797cbd90b4e4fd45590ac82372c04abc973d3dc826f08bce49` |
| [docs/portfolio-31/REPOSITORY-MOVE-OUTLINE.md](../../../docs/portfolio-31/REPOSITORY-MOVE-OUTLINE.md) | Portfolio frontend repository move — implementation outline | `909d0a113e4e930fe8fc01ec662e056d2d5a845a140582b690df5b874a4e83e3` |
| [docs/portfolio-31/SAVED-LAYOUT-FRONTEND-CHECKPOINT.md](../../../docs/portfolio-31/SAVED-LAYOUT-FRONTEND-CHECKPOINT.md) | Saved Portfolio ordering frontend — CORE-098 | `580711c1356acdb74cae5ed2152a0bb9d9ea3045614199931474c5c2a825bf09` |
| [docs/portfolio-31/TASKS-CONTRACT-CHECKPOINT.md](../../../docs/portfolio-31/TASKS-CONTRACT-CHECKPOINT.md) | Portfolio follow-up tasks: contract checkpoint | `c843913b6e8fc85ae0f284dad14ce67faf371e44f179f1ca1aee5750f2a88cb7` |
| [docs/portfolio-31/THREAD-MAIL-CHECKPOINT.md](../../../docs/portfolio-31/THREAD-MAIL-CHECKPOINT.md) | Synced timeline email — CORE-107 / CORE-108 | `b2731ad622ac629287250195908462026c317de9a4aa55b36a095b0396844f31` |
| [docs/portfolio-31/VISUAL-ASSERTION-CHECKPOINT.md](../../../docs/portfolio-31/VISUAL-ASSERTION-CHECKPOINT.md) | Engagement pulse visual assertion | `01290ba528dfb1c2e8be5d08d6d55f3946c75e8f41cec3300bd450b14c2a20bf` |
| [docs/portfolio-31/VOICE-SOURCE-CHECKPOINT.md](../../../docs/portfolio-31/VOICE-SOURCE-CHECKPOINT.md) | Voice-memo debrief source | `2e0f860e2d7ef61bd8914bab10f6220769eb3a617eb4ab519d21eb9cb7ac0b71` |
| [docs/portfolio-31/WATCHLIST-CURRENT-STATE-CONTINUATION.md](../../../docs/portfolio-31/WATCHLIST-CURRENT-STATE-CONTINUATION.md) | BILL-11/12 — shared Watchlist current state | `437beec06940fae8ad14c6674b4c691180c223ea6a6095e5d9d08133989cc913` |
| [docs/portfolio-31/WORK-HANDOFF-CHECKPOINT.md](../../../docs/portfolio-31/WORK-HANDOFF-CHECKPOINT.md) | Client Work native handoffs | `93c1f93ae164f5e325bbfc905e833964c5724a11b4f030ec4973b3063d2f918c` |
| [docs/portfolio-31/handover-2026-10-11/Email-Prep-Sender-Contract-Review-2026-10-11.md](../../../docs/portfolio-31/handover-2026-10-11/Email-Prep-Sender-Contract-Review-2026-10-11.md) | Email prep sender selection: contract review | `6b5c40f662737e9189c24173fa0346a37a32d7fd0d363068895342cf86dc1fe5` |
| [docs/portfolio-31/handover-2026-10-11/HANDOVER.md](../../../docs/portfolio-31/handover-2026-10-11/HANDOVER.md) | Capiro 3.1 Portfolio — portable session handover | `42c892986b074a5a1e9555839a420b5e5be5f63582a5c518d6e7f87bb923322b` |
| [docs/portfolio-31/handover-2026-10-11/Objective-Cross-Navigation-Contract-Review-2026-10-11.md](../../../docs/portfolio-31/handover-2026-10-11/Objective-Cross-Navigation-Contract-Review-2026-10-11.md) | Objective cross-navigation contract review | `4c4a75df4bad71488fc316ab496cb6812631234ff0bdc27f9e23a375d7775be3` |
| [docs/portfolio-31/handover-2026-10-11/Ordered-Client-Owners-Contract-Review-2026-10-11.md](../../../docs/portfolio-31/handover-2026-10-11/Ordered-Client-Owners-Contract-Review-2026-10-11.md) | CORE-099 ordered client owners: current contract review | `9e1e43482619f3e50eaa50aa63ee65d297aaccd996933ad458109662d668feed` |
| [docs/portfolio-31/handover-2026-10-11/PHASED-PLAN.md](../../../docs/portfolio-31/handover-2026-10-11/PHASED-PLAN.md) | Capiro 3.1 Portfolio phased continuation plan | `9430fb6c01266bcf0778aee6f9a5084502f7f2e0f9f5f16c3e8d6cfc7c59a94e` |
| [docs/portfolio-31/handover-2026-10-11/Portfolio-345-Row-Reconciliation-Summary-2026-10-11.md](../../../docs/portfolio-31/handover-2026-10-11/Portfolio-345-Row-Reconciliation-Summary-2026-10-11.md) | Capiro 3.1 Portfolio row reconciliation | `4a7b8f0edc88343fc3861ce66525193c7664d6d99060a6752eb90098b04bb6dc` |
| [docs/portfolio-31/handover-2026-10-11/Portfolio-AWS-CLI-Preview-Readiness-2026-10-11.md](../../../docs/portfolio-31/handover-2026-10-11/Portfolio-AWS-CLI-Preview-Readiness-2026-10-11.md) | Portfolio AWS CLI preview readiness | `d562789578da90d80bff4e393efa9e57b98482c32b79499bc23f20ebf65f4640` |
| [docs/portfolio-31/handover-2026-10-11/Portfolio-Image-Scan-Assessment-2026-10-11.md](../../../docs/portfolio-31/handover-2026-10-11/Portfolio-Image-Scan-Assessment-2026-10-11.md) | Portfolio preview image scan assessment | `ccd296da5ca6b012ba76d61484493301eb4fed0bebaddff3caf449ad28cf8913` |
| [docs/portfolio-31/handover-2026-10-11/Portfolio-Single-Environment-Test-Plan-2026-10-11.md](../../../docs/portfolio-31/handover-2026-10-11/Portfolio-Single-Environment-Test-Plan-2026-10-11.md) | Portfolio acceptance using one Capiro environment | `6e21bfa67e4b530b13c148c92be57d66d54dcfd32ce379e4bfc9b08426f28fe6` |
| [docs/portfolio-31/handover-2026-10-11/Prospect-Files-Workspace-Contract-Review-2026-10-11.md](../../../docs/portfolio-31/handover-2026-10-11/Prospect-Files-Workspace-Contract-Review-2026-10-11.md) | Prospect Files and Workspace: contract review | `edaf05bcce1fb1e870f9ec6eebbc5bf199a692e04efd80db9a774d61c25998dc` |
| [docs/portfolio-31/handover-2026-10-11/Quick-Log-Commitment-Contract-Review-2026-10-11.md](../../../docs/portfolio-31/handover-2026-10-11/Quick-Log-Commitment-Contract-Review-2026-10-11.md) | Quick log commitment and follow-up contract review | `71c2cb6c44a1d51b96e717f4d888c1d51dee733a2f0b6f5a16324e7b24b6204a` |
| [docs/portfolio-31/handover-2026-10-11/references/HANDOVER.md](../../../docs/portfolio-31/handover-2026-10-11/references/HANDOVER.md) | Capiro 3.1 Portfolio implementation handover | `5d5e7842df16a2be17a5c428d57546a99916889241433ec4dd9437c9555b4068` |
| [docs/portfolio-31/handover-2026-10-11/references/billing-flow-revalidation.md](../../../docs/portfolio-31/handover-2026-10-11/references/billing-flow-revalidation.md) | Portfolio billing revalidation: CORE-077–082 | `50cb476a06f4e52ad872f730c467c89ffa0df43773460d1ec81a28e0f70e3fb9` |
| [docs/portfolio-31/handover-2026-10-11/references/frontend-checkpoint.md](../../../docs/portfolio-31/handover-2026-10-11/references/frontend-checkpoint.md) | Capiro 3.1 Portfolio implementation checkpoint | `46e5cffbe148daf581eee62e7a1a8949b33699c9e21a5213e1cedb2c94b1c838` |
| [docs/portfolio-31/handover-2026-10-11/references/meeting-review-checkpoint.md](../../../docs/portfolio-31/handover-2026-10-11/references/meeting-review-checkpoint.md) | Meeting attachment approval and saved-note debrief source | `9eeb1d94129d0d805715302ecdb7cf2000b1de92022b4d7bc23f91e5d53dda42` |
| [docs/portfolio-31/handover-2026-10-11/references/tasks-contract-checkpoint.md](../../../docs/portfolio-31/handover-2026-10-11/references/tasks-contract-checkpoint.md) | Portfolio follow-up tasks: contract checkpoint | `c843913b6e8fc85ae0f284dad14ce67faf371e44f179f1ca1aee5750f2a88cb7` |
| [packages/meri-client/README.md](../../../packages/meri-client/README.md) | Meri browser client | `5e7e5306acf497c194bf6bfb10069d89693bec6508ebbeeec2bafcf657fcddf7` |
| [packages/qualification-elements/README.md](../../../packages/qualification-elements/README.md) | Canonical UI export qualification | `41d9a2b009482d0babbfd6b10d73bcf78d92815dbfddafa504b033d79c4ab6c4` |
| [packages/qualification-transport/README.md](../../../packages/qualification-transport/README.md) | Public UI transport qualification | `9ca5d5ac60cc3782d5be2d9a7cab166922ed99f298d5eb0ab4a41ad5d528de83` |
| [packages/ui/README.md](../../../packages/ui/README.md) | Canonical Capiro UI components | `0b8109304bece8042f4c9e34b891808c52f6454758be860307e6ce1fdb356d90` |
| [packages/ui/THIRD-PARTY-NOTICES.md](../../../packages/ui/THIRD-PARTY-NOTICES.md) | Third-party source and dependency notices | `426839e3d05bd6959adeff7cc7081c8e1e8aee6a4dda7668ec9ede77361ad0c1` |
| [packages/ui/notices/UI-NOTICE-SUPPLEMENT.md](../../../packages/ui/notices/UI-NOTICE-SUPPLEMENT.md) | UI notice supplement - partial exact-version coverage | `0799cb0ed43070242a9d0eccccdf59941a0cbf899c035e13ae91a6f8537d95fb` |
| [scripts/architecture/MIGRATION-RESULTS-2026-10-11.md](../../../scripts/architecture/MIGRATION-RESULTS-2026-10-11.md) | Portfolio architecture migration — verified checkpoint | `8726883b9d7ab84ac2d8261bbcf61350c5cba2bc4a14ab73bdd1f97fa122e8d7` |
| [scripts/architecture/README.md](../../../scripts/architecture/README.md) | Frontend architecture checks | `f9db8ca6da62fc245c1e13f69a989831f433ef417aeffd2caa31f63c5ff3c092` |
| [vendor/README.md](../../../vendor/README.md) | Public backend package inputs | `b2d8b9b4b7366c3cc073b3dde07a6e959fb9dae56b387d90c921de61bdde5eb4` |

## Tool and design context

The Figma source remains file `Zc2dEN5aLU47dVdsewDmiJ`, Portfolio page `411:40601`. Per-slice manifests preserve exact original and authored component/frame IDs, returned design-context text, builder scripts, mutation receipts and image bytes. The most recent root Watchlist/alert contexts are under restored `capiro-frontend-portfolio/outputs/evidence/handover-preservation-20261012/fresh-figma/`. Read the currently available Figma design-to-code/use/design-generation skill instructions again before the next tool interaction; saved design observations are historical snapshots.

The original current-source gate runner, portable verification assembler and ledger reconciler remain under restored root `outputs/evidence/portfolio-shared-integration-20261011/` and are copied into `tools/` here for direct access. These scripts preserve their original paths and assumptions; inspect and relocate those assumptions before use on a new machine. The lane-preservation script records the already completed byte-exact copies and must not be blindly rerun against a different HEAD.

The historical 62-item selected-evidence plan remains unchanged. P4 supplied a31-item proposal and6-item supplement; these are preserved as proposals under `reviews/`, not falsely claimed as a completed final qualification packet. The full context archive is broader and includes those source artifacts regardless of whether final qualification selection has been reconciled.
