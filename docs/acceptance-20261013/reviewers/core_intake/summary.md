# CORE-001–065 reconciliation — 63 assigned rows

All **63** rows remain **OPEN_FINAL_ACCEPTANCE**. Frozen application `90ccdd47de7a989e822590d616d69baa15a37d5d` is byte-identical across application/packages/scripts/vendor/root manifests to publication `5875e240c7b266a0e63903c4d0ed9b30c08d4d9a`. This read-only mapping made no source/index/runtime/native changes. It does not change the other274 held rows or any of the eight exclusions.

| Primary group | Rows |
| --- | ---: |
| Actual missing implementation/protection | 1 |
| Existing behavior missing final evidence | 42 |
| Authentic backend/provider/product-contract dependency | 20 |
| Confirmed selected Figma3.1 mismatch | 0 |

The one implementation gap is **CORE-059 folder access**. Current `files/mutations.ts:12–35` accepts only `{updated:number}`, lacks the per-file path's unknown-write journal and has no captured actor/lifetime check before completion/invalidation. `FileAccess.tsx:57–72` only blocks the folder save while pending; after a lost response another save is available. The preserved native `setFolderAccess` source already returns normalized `folder`, `viewerMode`, `viewerUserIds`, `updated`, so receipt validation needs no invented endpoint. Root is independently reviewing this source candidate; held-request red controls have **not** been run in this mapping. This is not evidence of a backend authorization bypass. Real folder access applies only to currently visible files with that label, never automatic future inheritance.

The dependency group is **CORE-003,004,007,008,009,016,017,021,023,025,037,038,039,052,054,055,056,063,064,065**. Every other assigned row except059 is in existing-behavior/missing-evidence. A dependency here is specific, not a blanket claim that every native row needs new code. Ordinary authenticated reads and CRUD still need actual scope/evidence, which is recorded as secondary runtime limits. Zero confirmed Figma mismatches means this pass did not perform fresh screenshot comparison; it does not mean visual acceptance. Exact selected representative node references remain in every applicable row.

## Historical blockers corrected with current proof

- **CORE-002:** location/secondary-sector/owner search exists and current focused browser assertion searches `New York, NY`.
- **CORE-013:** saved ClientDetails/GovernmentInfo now exposes read-only intake fields, unknown codes and absent values; CI-01 is no longer a missing read surface.
- **CORE-027–032:** versioned ordered owners and current team/options/role/receipt checks exist. CI-03 supplied email/role/inline roster is implemented. Do not revert to the historical single-owner interface.
- **CORE-033–036/044:** current combined FacilitiesManager and reviewed current-state writers exist. Older missing-manager descriptions are historical. Geocoder/provider/CAS acceptance remains separate.
- **CORE-049:** generic Planner follow-up commands, original-key recovery and explicit resume are implemented. The old “follow-up orchestration open” statement is stale. The legacy term Commitment is not permission to add a second UI or native action model; generic follow-up has its own bounded contract and still needs native evidence.
- **CORE-056/058/060:** single-file semantic move/ACL recovery and delete uncertainty are implemented. Folder ACL059 remains a distinct gap. Empty folders/atomic multiple-file moves remain contract dependencies.
- **CORE-008:** current consumer is the bounded `portfolio-alerts` feed, not the old `portfolio-rollup` label. Its displayed count is not a next-touch/bill rollup or all-clear claim.

## Highest-value finite acceptance work

No new UI feature is a prerequisite to these read batches. They are ready to be scoped by root against the designated real identity/services; they were not executed here. `unblocked_now=true` on **43** rows means the immediate **offline** criterion/evidence preparation (including059 red-control preparation) can proceed under this session. It never authorizes a native call. All next-step booleans expressly refer to that offline sub-step.

1. **Catalog/profile/team read batch — CORE-001,002,005,006,011,013,026,027,028,030,045.** Use one designated tenant with two accessible clients, one denied/foreign/walled client, known owner/team and saved notes/intake values. Bind actual Core source/origin and real standard/admin/denied identities. GET clients/client/account-owner/options/team/ordered-owner/saved notes; verify exact IDs/values, search/layout/deep-link/reload and expiry/client replacement. No purchase, user change, mutation or provider call. Website subcriterion can use a benign approved URL.
2. **Firm read batch — CORE-019,020,022.** Designated existing tenant anchor; finite registrant search, anchor and candidate GETs only. Compare exact LDA IDs, aliases, existing-client disables and count. Do not link a firm or import on a shared tenant.
3. **Facility/geography read batch — CORE-033,040–044.** Existing resolved/unresolved facilities, manifest and current GeoJSON; compare IDs/coordinates/roster/actual Nexus data, source hash/vintage and keyboard/mobile map behavior. Confirm deployed GETs do not trigger provider writes. Do not press Resolve/Retry/Use this address.
4. **History/Files read batch — CORE-048,053,057,061,062.** Existing benign attachments and known activity entries; uploader/allowed/denied identities. Check scoped latest-500 history/timezones, visible folder counts/ACL, reader-scoped filters/selection and actual allowed bytes/MIME/current URLs. Avoid extraction/model action; browser disposal is not URL revocation. Canonical attachment subset of052 can progress separately from its smart-artifact dependency.
5. **Disposable native CRUD batch after explicit mutation/effect binding — CORE-012,014,015,024,029,031,032,034–036,046,047,050,051,058,060.** One existing available client slot, acceptance-owned client/location/recorded activity/file, approved tenant members and exact role matrix. Create/read/edit/clear/reload/deny/interrupt then agreed cleanup. Suppress or explicitly authorize automatic address geocoding; no billing purchase, customer record, outbound email or provider event. Storage deletion and ACL changes require their fixture scope. Versionless endpoints cannot be declared atomically race-free.
6. **Governed follow-up batch — CORE-049.** Separate disposable Planner task scope and deployed activity-command/Planner composition. Verify exact actor/client/request/task lineage, schedule/timezone, pending versus completed and recovery after lost create/reload. Existing generic follow-up should be tested before contemplating any additional feature.

## Work kept separate

- **Source candidate059:** prepare/reproduce exact semantic-receipt, lost-response/reopen and held actor/client/lifetime cases in a new root-owned coherent batch. Preserve frozen90cc. Do not delay the GET batches on this repair.
- **Analytics003/004/007–009:** authoritative metric/coverage/privacy contracts first, not fabricated browser counts/charts.
- **Logo/file storage016/017/054/055 and geocode037–039:** designated benign provider fixtures, deployment/source binding, effect limits and byte/scan/queue proofs. Existing synthetic positives are not native provider acceptance.
- **Firm writes021/023:** tenant-wide disposable anchor/capacity/receipt scope; no shared firm mutation. Expected-anchor/concurrency and durable import recovery limits remain explicit.
- **Sensitive export025:** native intelligence actor/memory-wall/source association must be evidenced before real private-data export.
- **Smart artifacts052 and folder056/063:** preserve canonical attachment versus Work semantics; obtain stable associations/atomic batch/empty-folder decisions before new composition.
- **Research064/065:** latest/run GET may perform legacy maintenance, so do not include it in “harmless reads” without owner confirmation. Preview-only research/worker activation and provider/model effects remain held; no fallback to legacy start/retry.

`rows.json` gives each original criterion, current source symbols/line/blob/SHA references, named recorded synthetic controls, typed blockers, finite native check and selected design references. `review.json` binds inputs and the frozen four-shard results without converting a broad pass count into row acceptance. Only the three assigned output files were written.
