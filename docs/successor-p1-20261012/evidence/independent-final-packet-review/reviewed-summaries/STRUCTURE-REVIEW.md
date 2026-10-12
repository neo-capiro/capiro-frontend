# Successor repair structure review

The shared frontend owner integrated bounded, disjoint repair commits on `integration/capiro-p1-successor-20261012`, based on frozen evidence commit `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d`. No rule, transfer baseline, package manifest or lockfile is weakened or changed. The frozen `4a1614886fd98bb42d529f1ef59b3d01d7ff9173` source is a packaging checkpoint only.

The repaired files use one canonical source-hash review in `docs/architecture-size-reviews.json`; the scanner derives exact function fingerprints only when those source bytes and this evidence match. Other existing explicit reviews remain in `scripts/architecture/reviewed-size-findings.json`. Duplicate records were removed from that second registry after the unchanged guard correctly rejected them. Size findings remain visible. Independent reviewers own no implementation or shared registry edits.

| Owner | Reviewed responsibility | Review |
| --- | --- | --- |
| BillingSettings / billingFlow | One billing screen; fresh-read flow selection and hosted destination checks are a separate narrow owner | Independent objectives_work_intel_review and root |
| Workspace DraftEditor | One prospect draft; existing save hook owns concurrency and journal/CAS; pending inputs preserve the submitted snapshot | Independent objectives_work_intel_review and root |
| Files MoveFile | One folder dialog; metadata hook/actions own authority lifetime, receipt validation and uncertain recovery | Independent core_intake_review and root |
| Calendar ArtifactEditor and its row | One notes/debrief interaction; native contracts, dispatch and attempt lifetime are separate cohesive modules | Independent core_intake_review and root |
| Calendar MeetingForm | One meeting draft and date conversion; meeting-save owns receipt matching and mutations owns lifetime | Independent core_intake_review and root |
| ObjectivesPage | One client list, local status filter, URL selection and failure cleanup; existing editor/mutation owners remain | Independent objectives_work_intel_review and root |
| ProspectsIndex | One list/filter/URL interaction; current successful reads gate content and dialogs; query hook owns freshness | Independent objectives_work_intel_review and root |

These are function-specific reviews, not path exemptions. No dependency cycle, authority implementation, copied backend service, generic cache framework or unrelated responsibility is introduced. The only existing-test fixture correction replaces an id-only debrief acknowledgement with metadata required by the existing native contract; all original assertions survive.

All new behavior uses synthetic fixtures and the existing interfaces. Backend authorization remains authoritative. Calendar creation lacks native durable idempotency; browser uncertainty fences cannot promise hard-reload or cross-tab deduplication. Files current GET review proves current state, not attribution of a previous uncertain PATCH. These boundaries remain visible in the application and repair reports.


## Changed test structure

[TEST-STRUCTURE-REVIEW.json](TEST-STRUCTURE-REVIEW.json) binds the changed first-party test files and their sixteen observed size signals (seven fresh reviews, five carried reviews, and four unchanged inherited functions still unreviewed). Root reviewed the test responsibilities as well as production files; the existing scanner and thresholds are unchanged. Files receipt browser cases share one narrowly scoped fixture and cover contradictory/matching effects, explicit review, close/reopen and authority replacement. The 401-nonblank-line suite remains one behavior family. Calendar artifact and Files mutation describe callbacks group distinct assertions around one native contract or mutation lifetime; moving their cases only to evade callback measurement would not create another owner. The 82-line Workspace replacement case captures one interrupted PATCH sequence and its journal outcome. The inherited 738-line Meeting review suite and 126-line setup changed only the debrief receipt fixture fields, preserving every assertion and original flow.

The shared Dialog repair uses a separate focus hook with one cleanup-owned observer. Its four browser controls cover initial autofocus and button focus at both mobile and desktop widths. It adds no authority, persistence, provider or layout owner. The independent visual reviewer accepted this bounded ownership after reproducing the prior focus escape.

Final native Calendar corrections are bound by [the supported Markdown evidence entry](CALENDAR-NATIVE-CORRECTION-REVIEW.md) and its exact fingerprint record. The source registry has one owner; no duplicate review, threshold change or scanner exemption was introduced. [Final test review](evidence/independent-final-test-structure/report.md) preserves the narrower fixture claims: synthetic post-save library rows are not full native GET qualification, and the note-share unit fixture tests share metadata rather than the complete approved-row lifecycle. Independent native-derived parser/browser cases separately cover the relevant actual shapes.
