# Files browsing and selection

Based on PR27 `4465f5f1cfb1b807c97106433b70a0ccd480c4a2`; frozen PR25 and its qualified shipping source remain unchanged. This bounded follow-up addresses observable Files navigation and selection failures related to CORE-053/CORE-062. It does not accept either row or alter the 337-row native ledger.

Before production edits, four mounted browser regressions failed: All files retained both named and Unfiled folder filters; partial visible selection lacked a mixed checkbox state; an empty result retained an enabled select-all control. The baseline and traces are preserved in `/workspace/capiro-files-selection-evidence-20261014`.

FilesPage remains the canonical owner of reader-scoped filters, selection and dialog intent. All files clears only the folder filter. FileTable owns native visible-row checkbox presentation and existing union/subtraction behavior. A small FileSelectionBar owns the count, hidden-selection disclosure, clear intent and existing single-file move availability; it owns no state or transport. Current reader replacement and current-file mutation guards remain unchanged. No new package, endpoint or authority is introduced.

Verify keyboard selection, visible-subset preservation, empty results, source/search/sort retention, reader replacement, existing file boundary/recovery cases, desktop/mobile overflow, accessibility, and comparison with Figma `411:52484`. Run relevant unit, type, lint, format, public-package, architecture and build checks; distinguish fixture checks from native service acceptance.

Dependency correction: the coordinator's latest backend-owner audit says the private receiving backend contains all four previously questioned API families. PR4 currently pins `a65ae3c8a9f1f0cf96d4f7d2ae30aad2fff172ff`. Earlier absence inferred from capirov2 or one guessed module path is not evidence of missing private implementations. Saved layout needs concrete route/configuration/data bindings and native qualification, to be supplied through the coordinator; no duplicate API work is requested. This Files repair uses the existing attachments read contract and is independent of those bindings.
