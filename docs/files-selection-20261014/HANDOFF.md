# Files browsing and selection follow-up

Repair source: **`b8e81aafd0416f18b2e7706c3c8c301d76da7712`**, application tree `04b19356b5c7f8e236d62e8dbb758d5b1c012755`, runtime tree `2550a886910e4904bc9c8722971139204f28b53a`. Branch `repair/capiro-files-selection-20261014` is based on PR27 `4465f5f1cfb1b807c97106433b70a0ccd480c4a2`, retaining PR26/27. No merge conflict or donor rewrite was needed.

PR25 remains frozen at `257cf5b5db673b31c98264f9da33759c68066ba4`. Its shipping source remains **`5ca42049325881782bc9d2ac557450d642eccee8`**, with its existing build input and configuration. This follow-up does not substitute a source/image/configuration in the shipping lane. No new image was built or published.

## Behavior and ownership

Four mounted browser baselines on PR27 reproduced the failures: All files retained a named folder; All files retained Unfiled; partial visible selection did not set the select-all checkbox's mixed state; and an empty result left select-all enabled.

All files now leaves the selected folder while retaining search, source and sort. The native select-all checkbox reflects partial visible selection and is disabled for empty results. Selecting or deselecting visible rows retains selections outside the current filter. The count explicitly discloses those hidden selections; Clear selection clears them locally without changing filters or issuing a request. A named, focusable table region preserves keyboard scrolling when empty results have no enabled checkbox.

`FilesPage` retains sole ownership of reader-scoped filters, checked IDs and action lifetime. `FileTable` retains visible-row selection and typed action intent. The 50-line `FileSelectionBar` extracts the existing count, move availability and batch-unavailable explanation, adding hidden-count presentation and clear intent without state or transport. Single-file move availability, atomic-batch unavailability, current-file admission, actor/client replacement, unknown-write recovery and the canonical session boundary remain intact. No endpoint, package, backend implementation, authorization, manifest/lockfile, feature flag, shipping configuration or Commitments UI changed.

The two changed oversized functions received exact responsibility/fingerprint reviews in the existing architecture records; prior records are preserved in the evidence packet. The guard remains unchanged and reports 488 signals: 467 reviewed, 21 inherited unreviewed, zero blocking and zero boundary errors.

## Verification and design

The final source passes **60 mounted browser cases** (five new, 55 existing), **57 Files unit cases**, **111 root controls**, workspace typing, web lint (zero errors; 82 existing warnings), full formatting followed by changed-file verification, public-package verification, architecture, the production build and the actual Next standalone server/browser gate. The final browser run has zero retries, skips or flakes. New navigation/selection cases verify one initial attachments read and zero writes or unexpected routes.

The mounted browser suite covers Files and Prospect Files: keyboard select-all/clear/scrolling, hidden subsets, retained source/search/sort, empty results, source readiness, denied/stale reads, reader/client replacement, held writes, uncertain upload/delete/access outcomes, and existing 1440/360px selected-view contrast. Full-default axe reports no violations in the changed 1440px desktop and 390px dark mobile states. No rule was disabled. The actual-server check exercises unconfigured dynamic routes, Meri/Portfolio/Modules/Settings navigation, back/forward, desktop/mobile pages and zero page errors. It does not authenticate or call native services.

The Figma design-to-code skill was applied before fresh context and screenshot retrieval for `Zc2dEN5aLU47dVdsewDmiJ / 411:52484`, the existing CORE-062 Files target. Reviewed [desktop](files-selection-desktop.png) and [mobile](files-selection-mobile-dark.png) captures retain the existing folder/sidebar/table structure and tokens. Selection controls remain legible and wrap without page overflow; the table has its existing horizontal scroll. Fixture names, source labels and unavailable native metadata remain truthful. This bounded interaction comparison does not claim full-frame pixel parity, a new mobile design, assistive-technology certification or native ledger acceptance.

Preserved intermediate results: the original four intentional red baselines; a 58-pass/two-failure run whose screenshot writes exhausted storage; a 59-pass/one-failure run identifying the empty mobile scroll-region accessibility defect, now fixed; the expected architecture fingerprint-review gate before review; and a mistaken app-local ESLint CLI path followed by a passing root workspace invocation. No original assertion was weakened. All logs, exact baseline test source and final receipts are indexed in [EVIDENCE-MANIFEST.json](EVIDENCE-MANIFEST.json) and [evidence.tar.gz](evidence.tar.gz).

Dependencies were reused unchanged; a new clean install was not run. This owner's prior PR27 generated Next output was preserved byte-for-byte in a verified base-plus-delta archive (5,647 entries), and its browser cache was independently archived before replacing generated output. Byte-identical standalone dependency files were hardlinked only within this owner's generated output; dependency contents, source trees, old branches and shipping artifacts were not changed. Custody manifests record the required original archive paths and hashes. Those generated-output archives are retained locally, not embedded again in this PR.

## Corrected backend dependency map

The coordinator's latest backend-owner audit supersedes the earlier missing-implementation inference in PR27. The private receiving [backend PR4](https://github.com/neo-capiro/capiro-backend/pull/4), refreshed at **`a65ae3c8a9f1f0cf96d4f7d2ae30aad2fff172ff`**, contains all four previously questioned API families. Remaining gaps concern routing, configuration, data and native qualification. Absence from old capirov2/main or one guessed source path does not establish absence from that private backend. No duplicate backend API is warranted.

For saved layout, the next dependency is the backend owner's exact existing route/mount, configuration and data binding at its audited private source, supplied through the coordinator, followed by native catalog/receipt/version/persistence/membership checks. The historical `GET/PUT /api/me/portfolio-layout` candidate is not evidence of current private availability. This Files repair uses the existing attachments read and has no dependency on activating that candidate. No protected EngagementService implementation was read or changed.

## Remaining scope

There is no remaining source or local-test blocker for this bounded Files repair. Review and integration of this separate draft remain. Clean install/container/image qualification, live account login, tenant/session expiry and native read/write persistence were not run in this follow-up. Existing-account preview qualification remains with the frozen shipping lane; backend native qualification remains with its owner. No native row is accepted: both 337-row ledgers are byte-identical to PR27, and they do not gate basic preview access.

No live business record, provider send, paid call, other tenant, credential, privilege/security setting, resource, database, deployment or main merge was touched.
