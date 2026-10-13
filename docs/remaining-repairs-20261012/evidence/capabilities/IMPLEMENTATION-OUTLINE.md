# OWI-F03 / OWI-F04 bounded presentation repair

Source baseline: 7aca86e7d64cfdb85d09d424a07e6186339fc24c. Owned feature: Portfolio capabilities, plus focused browser controls. No shared primitive, cache, adapter, mutation, session, or native contract changes.

Registrations owns one modal read/edit projection, existing current-client and identity gates, and existing save lifecycle. Reuse adopted Dialog and semantic definition list. A feature-local stylesheet sets the supplied 680px desktop dialog, 28px horizontal body inset, 170px label column, 16px column and row spacing, and 10px vertically padded divided rows. On narrow viewports columns shrink/wrap within the existing viewport margin. Preserve all eight currently projected native-backed fields and all form/confirmation/dismissal behavior. Do not fabricate the target frame's additional small-business, LDA, or contract metadata.

CapabilitiesPage owns selected capability navigation and list projection. Reuse existing buttons and maturity function. At <=680px, use one grouped list with compact rows, name and maturity on the first line, program mapping or honest fallback on the second. Hide decorative icon and description only in the compact list; editor retains all details. Desktop retains existing cards. No parallel mobile component/state or new data abstractions.

Figma evidence: file Zc2dEN5aLU47dVdsewDmiJ, frames 411:55825 and 411:86453, full context and initial screenshots captured in figma/. Implementation uses text/dividers/chips; no new raster/vector asset is needed for these owned facets. Existing shared header/navigation/avatar and wider frame fidelity are outside this repair.

Verification: author geometry/content/keyboard browser assertions before source changes, replay against immutable extracted baseline before candidate when a browser lease is granted; preserve existing registration and capability presentation/lifetime assertions. Check long/missing data, dark phone layout, desktop cards, native five-field saves and current-read denial teardown. Run bounded writer units, TypeScript, changed-file lint/format and architecture scan. Root reviews exact size triggers and runs combined production qualification.

Native acceptance remains held: local fixture browser runs and backend source inspection do not establish live endpoint, session, registry, or write behavior.
