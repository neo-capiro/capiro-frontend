# Retained evidence and Coverage consumer delta

Author handoff, 27 October 2026. This is a finite source delta for DI07/S15/S14, not independent acceptance or a statement that the research corpus is complete.

## Scope and provenance

- Isolated frontend base: `e3875a64b459b6a301f05bd687e55031ceea1b52`; checkout `C:/dev/w4-evidence-coverage-20261027`. The frozen shared checkout is untouched.
- Core counterpart: `b49f010174de9a2dfaa598f327caf62761138283` at `C:/dev/w4-evidence-coverage-contracts-20261027`. The fixed operation descriptors record this producer pin.
- Existing native owners remain `DefenseResearchController` evidence, occurrence and product-coverage reads, plus `FederalEvidenceReadService.lifecycleTimeline`. No new backend command or source relationship is implied by the frontend.
- No package, lock, catalog, shared archive, migration, service configuration or target-data change. Frozen Meri contracts `0.1.21`, UI stream `0.1.8` and catalog `0.2.23` are unchanged.

## Native behavior

The existing evidence inspector renders returned printed page, table/row/column labels, source text offsets, bounding-box coordinates and units, structured-element path/identity and companion/span hashes. Omitted details and individual absent fields remain explicitly unavailable. Unavailable details do not display retained coordinates. Existing document/revision/content-hash and page/section/occurrence checks remain; captured detailed coordinates are also compared when supplied.

The occurrence reader deliberately embeds the unchanged base evidence reference. Its admission therefore compares base identity and retained offsets against the inspector's detailed span, without requiring the nested reference to duplicate native-only enrichment. Missing or changed offsets are refused when a captured span exists. Offset zero remains a valid value. An unavailable nested evidence reference is refused.

Congressional Changes mounts a PE-scoped Federal evidence revisions panel beside the existing relevant-bills context. The only new operation is fixed `GET /federal-evidence/timeline`; the receiver requires the existing selected PE, limits the native page to 25 events, validates the optional ISO knowledge time, and stores knowledge time/cursor in URL state. Changing the selected PE or knowledge time resets the cursor. Refresh and Latest events are reads with explicit non-submit button types. Immutable event IDs identify expandable rows.

Each event's Before and After is displayed independently. A side needs the corresponding previous/current revision ID, a supplied content hash and available/partial qualification before its source link, snippet or locator is shown. One side never fills the other. Historical event evidence is explicitly distinguished from current publication eligibility. Raw event `before`, `after`, evidence and internal extra fields are stripped by the receiving whitelist.

Coverage adds read-only recorded outcomes to existing cohort rows: current source state, last source observation with revision kind/time, and the current tenant's last governed resolution/time. These remain separate from counts, publication status and denominator knowledge. Missing records are explicit. No ingestion, resolution or recheck command was added.

## Bounded author checks

- Windows Node `24.22.1`; existing qualified dependency tree reused through a new-checkout-only ignored junction, authorized by root. No install or cache mutation.
- `vitest run tests/defense-evidence-consumer.test.ts tests/defense-research.test.ts`: 11 passed. Seven new cases exercise retained/absent coordinates, invalid offsets/units, captured identity/coordinate refusal, valid base occurrence plus offset/hash/unavailable negatives, sanitized read-only outcomes, strict bounded timeline requests/raw-field stripping, and independent before/after withholding.
- Existing Capiro `registry.test.ts`: 5 passed, with the new operation registered in the same allowlist/group test.
- Affected ESLint: exit 0. Scoped TypeScript over the changed source/tests and their imports, with the installed Next global declaration owner: exit 0. Initial gate configuration omitted those Next CSS declarations; it was corrected without a product workaround.
- Prettier and `git diff --check` are recorded at freeze. No broad suite, build, browser acceptance, live request or provider/source action was run for this delta. Hermes owns independent review and visual/live acceptance.
- Bounded frozen Meri `apps/` + `packages/` search found no `DefenseEvidenceRef`, `DefenseCoverageRecordedOutcome`, `DefenseFederalEvidenceSide`, native evidence/occurrence/product-coverage route, or federal timeline receiver. Native-only Core detail enrichment deliberately leaves internal sharing evidence unchanged. This is source-search compatibility evidence, not a new end-to-end Meri claim.

## Architecture review signals

No new authority layer, proxy, cross-feature dependency or generic schema adapter. The coordinate, outcome and historical-side displays are small presentation owners reused by the existing inspector/table/panel. Three coherent UI functions exceed the existing 80-nonblank-line signal and require Hermes review of their exact bodies; root integrates approved registry entries after review.

| Function                  | Nonblank body | SHA256                                                             |
| ------------------------- | ------------: | ------------------------------------------------------------------ |
| `CongressionalChanges`    |           107 | `a163132241b9eefa65da60b3e39c6867ab695a8adc33cdace39eb2f849326ca1` |
| `ResearchCoverage`        |           188 | `d6977a0e93b725c05c94f4dfa0bb0226aa97618ab3e5fbaf9bff10c3a43d7c41` |
| `FederalEvidenceTimeline` |           125 | `0b94b713d1f526b11082e292c8e9c8a24c2b73bf860664e02f0972e120a5d417` |

## Actual remaining limits

- Coordinates are displayed only when already retained and qualified by Core. The frontend does not infer a table, row, column, bounding box, character position or structured element for sources that lack it; no visual PDF overlay or new locator extraction is claimed.
- Before/after is limited to the existing federal lifecycle event's true previous/current revision proof. It does not create an arbitrary occurrence-to-event association, reconstruct missing revisions, or calculate downstream after-impact or a global correction graph.
- Recorded Coverage outcomes are existing sanitized observations/resolutions. Unknown corpus denominators remain unknown; this UI does not qualify source cohorts, ingest missing sources, repair resolution data or execute rechecks.
- Source publication eligibility, tenant/client authorization, live data availability, visual behavior and the final combined cohort remain release/Hermes responsibilities. Earlier accepted unchanged SQL/DOCX proofs are not repeated. Q07 remains skipped.
