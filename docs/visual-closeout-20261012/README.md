# Seven scoped presentation repairs

Candidate branch: `integration/capiro-visual-closeout-20261012`, based on evidence head `a397d45c461b24eb741afcd3b7cf28ca354d1e96`. The qualified application checkpoint `2d50edd8f3c5ea232db8e1338566f0667db4b4bd` and its image proposal remain preserved. This candidate is not yet a qualified image source.

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

Development evidence is retained outside the checkout under `/tmp/capiro-visual-closeout`. The first affected run had two accessible-label failures; the label was corrected without changing those assertions. A subsequent desktop saved-capability geometry failure was corrected without relaxing its 12px gap check. Two new Calendar-test setup/locator errors were retained and corrected. Final candidate qualification will record all exact-source gates and before/after evidence separately; development passes do not substitute for it.

No shared HeaderFrame, auth/session/client scope, governed transport, root manifest/lock, public package or backend contract changes. Meri, Modules CommitmentView and the Portfolio historical archive remain preserved. Architecture reviews are exact, responsibility-specific records; no scanner/rule/test weakening. All 337 Portfolio rows remain unaccepted against full/native criteria. No deployment, AWS build/upload, resource, credential, database, real provider message, billing or paid-model action occurred.
