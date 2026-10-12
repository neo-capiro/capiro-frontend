# Seven scoped presentation repairs

Candidate branch: `integration/capiro-visual-closeout-20261012`, [draft PR10](https://github.com/neo-capiro/capiro-frontend/pull/10), based on evidence head `a397d45c461b24eb741afcd3b7cf28ca354d1e96`. Application source `4a1614886fd98bb42d529f1ef59b3d01d7ff9173` completed all 15 required author offline gates on a clean checkout at 12:24 UTC: 934 Portfolio and 121 Modules browser tests passed with zero failures, skips or flakes. Root tree: `16c0b62901859aa4ff3f2ea01856aa13e13c65cd`; application source tree: `46cebca97ccfc1facc1c1a939beb6f4d7730685b`. The previous qualified application checkpoint `2d50edd8f3c5ea232db8e1338566f0667db4b4bd` and its image proposal remain preserved. Independent visual review is pending; final image-source binding remains held.

| Finding | Repair | Preserved behavior |
| --- | --- | --- |
| VD01 | Dedicated Owners dialog with avatar/rank cards, explicit reordering, Cancel and Save owners | Current Team gate, version/source binding, no implicit promotion, read-back, interrupted writes, identity replacement |
| VD02 | Reordering guidance appears only when editing is available and explains explicit Save | Unavailable operations stay disabled; no new endpoint or write availability |
| VD03 | Owner and Customize in the title toolbar; compact secondary filters | Canonical catalog, all filters/views/sorts, New objective, deep links, loading/error recovery |
| VD04 | Inline Name required marker; Type/Sector choice indicators and current-record suggestions | Arbitrary typed strings and exact payloads; saved Details variant |
| VD05 | Compact Bill Tracker title and inner results header/table/footer | Table/board/filter controls, original paging, current reads and action guards |
| VD06 | Calendar-specific compact shell/header composition | Modules navigation, scoped switcher, browser history, search and incomplete-source disclosures |
| VD07 | Sharp dimmed Portfolio modal background | Canonical dialog focus, outside click, Escape and nesting |

Figma targets retrieved with full design context/screenshots before implementation: `411:41685`, `411:41421`, `411:55155`, `411:56471`, `460:90798` in the Capiro 3.0 redesign. Existing source assets remain byte-identical. No design text is promoted into a new backend enum or endpoint. The fixture content, unavailable data and retained guarded extensions are intentionally visible; this is bounded visual repair, not acceptance of all content in those frames.

Seven externally held regression controls failed on the clean base before editing (six Portfolio, one Modules) and passed unchanged after the first repair pass. Their immutable hashes and preparatory setup failures are in BASELINE-RECEIPT.json. Original browser assertions remain, with only intentional entry/control mechanics updated. New tests exercise owner keyboard/pointer ordering, cancel/focus, closing during a write, Customize availability, free-string suggestions, results composition and Calendar navigation.

Development and terminal evidence are archived under [evidence/candidate-4a16148](evidence/candidate-4a16148/QUALIFICATION.md). The first affected run had two accessible-label failures; the label was corrected without changing those assertions. A subsequent desktop saved-capability geometry failure was corrected without relaxing its 12px gap check. Two new Calendar-test setup/locator errors and the Customize focus correction are retained. The failed default-cache install and old-import objective-wrapper attempt are also retained and distinguished from the successful clean-source gates. Development passes do not substitute for qualification.

No shared HeaderFrame, auth/session/client scope, governed transport, root manifest/lock, public package or backend contract changes. Meri, Modules CommitmentView and the Portfolio historical archive remain preserved. Architecture reviews are exact, responsibility-specific records; no scanner/rule/test weakening. All 337 Portfolio rows remain unaccepted against full/native criteria. No deployment, AWS build/upload, resource, credential, database, real provider message, billing or paid-model action occurred.

## Review evidence

- [Terminal qualification](evidence/candidate-4a16148/QUALIFICATION.md), [machine receipt](evidence/candidate-4a16148/TERMINAL.json) and [file checksums](evidence/candidate-4a16148/SHA256-MANIFEST.json).
- [Seven-finding visual delta](evidence/candidate-4a16148/VISUAL-DELTA.json) and [bounded author comparison](evidence/candidate-4a16148/VISUAL-AUTHOR-ASSESSMENT.json). The original 345-row ledger (337 in scope, eight exclusions) is unchanged. Historical control screenshot filenames include `before` in both runs; the dedicated Owners screenshots are in the complete Portfolio artifact folder, as recorded in the comparison.
- [Read-only shared-resource inventory](evidence/candidate-4a16148/SHARED-RESOURCE-ASSESSMENT.md): canonical shell, scope, primitives and contract owners, remaining presentation duplication and architecture limits. This assessment adds no consolidation code.
- [Current owner heads](evidence/candidate-4a16148/FINAL-OWNER-HEADS.json), [preservation](evidence/candidate-4a16148/PRESERVATION.json), [unchanged boundaries](evidence/candidate-4a16148/UNCHANGED-BOUNDARIES.json) and [independent-review status](evidence/candidate-4a16148/INDEPENDENT-REVIEW-STATUS.json).

The next gate belongs to the parent coordinator: independent bounded review of this exact source and its evidence. After that review, the designated shipping session can bind and review a new reproducible source archive and per-run image-build inputs. No new archive, upload or image build is represented by the old `2d50edd` proposal.
