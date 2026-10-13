# Newsletter public package verification

The immutable package is available and its provenance/static content checks pass. Backend draft [PR2427](https://github.com/neo-capiro/capirov2/pull/2427) was read at exact head `62d057b4a17b2c038920f10b93e83e51e46239bc`, tree `57166408367b1395c70e5872809501268b04e7d1`. This closes the missing packed-artifact handoff for frontend PR16. It does not implement or qualify frontend consumption, rich editor behavior or native delivery.

| Artifact binding | Verified value |
| --- | --- |
| File | [artifact/capiro-shared-0.0.0.tgz](artifact/capiro-shared-0.0.0.tgz) |
| Package | Private `@capiro/shared@0.0.0`; unchanged package metadata |
| Bytes | 510,772 |
| SHA-256 | `697d826647e88e7f8559da386be7de1ae6408dc61c73877b86c2e17275fd63ab` |
| Git blob | `04ea25adba740eca8f677c0259e45211b73c5f2e` |
| Integrity | `sha512-CK2DLxUPCTs+PkBwx8GOjRLfh6jssTddIX2zgxiFw2hjVcHLF65oA8vJJ+LIR00r9XBnxFdYYoD2ZAkgY698Sw==` |
| Original build source | `fe50dc1c2de1660a036e338cf81acdcf0f2fb26a`, tree `00ca67ae1f2cacc1ae0b51fff25cb33d58954f67` |

Bytes came through the authorized GitHub connector's exact-ref base64 file read, without using or preserving temporary download URLs. [ARTIFACT-ORIGIN.json](ARTIFACT-ORIGIN.json), safe PR/tree metadata and the member manifest bind the download to the immutable commit. The existing backend checkout was read only; its head remains `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`.

## Independently verified here

- All 182 tar entries are regular files, with exact path/mode/size/SHA-256 matches to the committed packed manifest; no links, duplicate paths or path escapes. Unpacked size is 2,223,132 bytes. Modes are 0600 for 144 dist entries and 0644 for 38 source/configuration entries; inspection copies are not a repack.
- All 38 packed source/package/configuration files and the root compiler configuration match the current pinned backend tree and the canonical build-source receipt by Git blob, size and SHA-256. Both existing public export mappings and all package export targets are present; package/version/DTO/renderer bytes were not changed. No runtime dependencies or install/prepare/pack lifecycle scripts are declared.
- All 36 declarations parse, all 72 JavaScript/declaration maps resolve inside the packed source tree, and all 144 `dist` files match their manifest hashes. No compiler/typecheck/re-emission was run here.
- Static AST traversal from `@capiro/shared/newsletter` and `@capiro/shared/newsletter-render` finds exactly five runtime modules: newsletter, newsletter-render, newsletter-fonts, newsletter-fonts.catalog and newsletter-social-share. No external imports, nonliteral module loading or unbound inspected Node/network globals are found. This is static closure evidence, not VM or browser execution.
- The five packed source modules are also byte-identical to the original source snapshots already preserved in frontend PR16 at `b680b65e14134be736942b29d715e49c2c6a8b19`. The current response/staging files and handover were read and bound to that pin without editing them.

Primary receipts: [STATIC-VERIFICATION.json](STATIC-VERIFICATION.json), [ENTRY-VERIFICATION.json](ENTRY-VERIFICATION.json), [SOURCE-CONTINUITY.json](SOURCE-CONTINUITY.json), [MAP-VERIFICATION.json](MAP-VERIFICATION.json), [BROWSER-CLOSURE-STATIC.json](BROWSER-CLOSURE-STATIC.json), [FRONTEND-READ-RECEIPT.json](FRONTEND-READ-RECEIPT.json). The first static scanner attempt mistook a block-local variable named `global` for a Node global; its script/log are retained. The corrected lexical-binding check records both local occurrences and passes without changing package bytes.

## Public consumption surface and limits

Use only the existing public subpaths. `newsletter` supplies rich content/stage types, block/catalog/default helpers, templates, fonts and local editing helpers. `newsletter-render` supplies `renderNewsletterDesign`, `renderNewsletterBlock`, `newsletterPlainText` and the existing escaping/style/URL/social helpers. Both `import` and `require` export conditions point to the existing CommonJS `.js` artifacts; declarations have explicit `types` targets. Do not deep-import packed `src`, `dist` or undeclared font subpaths, copy a renderer/DTO, or invent a new package version. Pin the artifact bytes/integrity because the existing package version remains 0.0.0. The full root export and unrelated subpaths are outside this browser-closure review.

The [accepted backend handoff](backend/docs/shared-newsletter-browser-handoff-20261012/HANDOFF.md) and [independent backend review](backend/docs/cleanup-shared-packed-newsletter-independent-review-20261012/FINAL-REVIEW.md) report actual CJS/ESM consumers, strict NodeNext/browser declaration checks including expected negative diagnostics, a five-module browser bundle/VM, 116 original/packed/browser renderer characterizations, and independent byte-exact re-emission of144 outputs. Those are inspected backend evidence, **not executions performed in this review**. They qualify no actual frontend page, visual/accessibility fidelity, deployed assets or native authorization.

The backend packet preserves its initial offline npm pack's update-notifier metadata GET, corrected notifier-disabled identical packs, and one unavailable initial esbuild timing log; all final raw logs are reported intact. No broad network-containment or complete initial-log-retention claim is adopted.

Rendering escapes content by default, but supplied sanitizer/link/survey callbacks remain caller policy. Link-rewrite output is escaped rather than revalidated. Recipient visibility and editor-mode hidden-block display retain existing semantics. Font and asset URL strings do not prove deployed retrieval. Existing local Date/Math-generated document IDs confer no stage/tenant/actor authority.

## Rich stage and saved-version boundary

The [receiving contract](backend/docs/contracts/newsletter-outreach-response-routing.md) preserves the existing `outbound_campaign` type with optional response-only `metadata.newsletterStageId` (RFC-variant UUID versions1–5) and optional positive safe-integer `newsletterRevision`. Missing/null metadata or an absent hint remains ordinary; malformed reserved fields require refusal, and unrelated metadata remains stripped. Current frontend `outreachRecord` still omits metadata and calls `.strip()`; source inspection confirms the pending receiving-boundary work, not a live customer incident.

A syntactically valid hint is only a routing candidate. Resolve the existing record ID through the canonical rich record/stage owners and recheck current actor, tenant, client/source grants, revision and applicable membership. Metadata cannot approve or authorize anything. Parsing/routing must not open/associate, prepare, test, send, upload, reinvite, generate or approve. Review/account-status GETs may have effects and must stay intercepted during synthetic qualification.

Rich `WsNewsletterStage` IDs remain separate from `WsDocVersion` IDs. The existing saved-version path binds its exact version/snapshot hash, existing OutreachV3 session, expected state version and durable receipt. No ID conversion, UUID bridge, alias, automatic migration, replacement endpoint/store or new wire version is justified.

## Next root steps — separate PR16

1. PR15 publication is complete per root; leave its frozen source/evidence untouched. Root may vendor these exact bytes and update the separate qualification workspace's manifest/lock/provenance through the canonical dependency owner, without source aliases or a backend checkout dependency.
2. Use the exact 116-case corpus and frozen expected outputs now preserved in [CONSUMER-PREPARATION.md](CONSUMER-PREPARATION.md), with [CORPUS-VERIFICATION.json](CORPUS-VERIFICATION.json) and explicitly derived minimal configs/entries. Run real packed public-import, strict declaration and browser-bundle checks against the receiving dependency/compiler versions. This review ran no install, package code, compiler, build, browser or native operation.
3. Response metadata parsing and deliberate rich-record resolution remain future app work outside this bounded preparation. Any later implementation must preserve strict requests/unrelated-field stripping and prove zero effectful decode/routing dispatch across ordinary, malformed, wrong-type, forged, stale, cross-scope/revoked and document-version-as-stage controls.
4. The rich Workspace/Engagement UI port, existing 43-path/37-history map and 179 assets remain separate future qualification. Existing saved-version/CAS/uncertain-receipt controls, desktop/mobile, keyboard, asset serving and native authority still require their own preserved evidence before rich parity can be claimed.

No repository/branch/index/manifests, prior `/tmp/capiro-remaining-*` evidence, provider/AWS/runtime source or package bytes were changed. Every write in this task is confined to `/tmp/capiro-newsletter-package-verification`. Artifact availability is verified; frontend adoption and acceptance remain root-owned.
