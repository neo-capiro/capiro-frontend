# BILL-11/12 — shared Watchlist current state

## Scope and outline recorded before implementation

This continuation repairs the existing Portfolio Configure flow on source `75409a96d6c58a53c7d44eb6053cc291995caf80`. It retains the configured Core or Intel owner, the existing targeting fields and native create/edit bodies, local drafts, Intel conflict and partial-rejection behavior, and the separate personal-preferences entry. It does not introduce a backend, deploy a service, or exercise a live write/provider action.

1. Pin and inspect the published controllers, DTOs, and service code; capture the actual Configure Figma context or, if absent after targeted discovery, author the authorized missing continuation component before UI implementation.
2. Preserve the four original Watchlist source inputs and two existing test files. Add a standalone synthetic harness and focused regression cases for retained failed reads, current actor/client/read provenance, exact receipt/version validation, interrupted/closed editor lifetimes, and uncertain dispatch retry fencing. Record actual pristine-source browser failures before fixed-source browser qualification.
3. Reuse the canonical Profile actor/client/source implementations through one approved `client-profile/read-public.ts` façade. Keep owner-specific Watchlist read keys/query projection separate from native write dispatch and the single editor lifetime. Extract the existing form presentation only to keep these responsibilities cohesive; `WatchlistTopics` remains the topic-field owner.
4. Withhold failed, invalidated, fetching, or actor-obsolete source values and actions while retaining this editor's local draft. Require a current exact client plus current targeting/taxonomy/jurisdiction inputs at save/reload boundaries. Interruption latches synchronously; late results cannot change a replacement view or publish obsolete cache data.
5. Preserve the real response differences: Core returns a normalized full `{issueAreas,tags}` projection without echoed client/version; Intel returns exact `clientId`, a checked version and explicit partial rejections. An unconfirmed write cannot be silently retried or represented as saved. Browser abort does not prove server cancellation.
6. Qualify the bounded units, original and new browser assertions, current-source type/lint checks and desktop/phone visuals. Freeze exact preimages, final source hashes, native/Figma evidence, and individual changed size-review records for root integration. No audit row receives native or signed-in acceptance from these synthetic checks.

## Ownership

Owned source is `bill-tracker/WatchlistDialog.tsx`, `WatchlistTopics.tsx` only if a concrete need arises, `watchlist-contracts.ts`, `watchlist-queries.ts`, and focused new Watchlist form/read/session/writer owners. Root authorized the single pure-export `client-profile/read-public.ts` façade. Dedicated Watchlist unit/browser harness/spec files and this report are owned. `AlertPreferencesDialog.tsx` and `alert-preferences/*` belong to P3; the only coordinated integration is an explicit `backend` prop on the public personal entry for both configured owners.

## Published native reference

Fresh `main` lookup returned `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`. Complete fetched reference files and blob IDs are preserved under `outputs/evidence/watchlist-current-state-20261011/native/`.

- Core `TrackerController` permits `standard_user` at the controller and passes the database user ID. GET/PUT use `intelligence/clients/:clientId/tracker/watchlist`. PUT verifies the parent client, trims/deduplicates supported tag fields and issue areas, and returns only `{issueAreas,tags}`. GET defaults do not prove parent availability. There is no native version/CAS or user/client echo to invent.
- Intel `TrackerWatchlistController` uses the configured Intel owner guard and passes the actual Clerk user ID. The service verifies parent tenancy and current administrator membership, reconciles topics by label (the echoed topic ID is not mutation authority), checks `expectedVersion` and increments the revision. It returns a fresh exact-client watchlist plus topic/term rejection details. PUT readback happens after the write transaction, so the frontend must not claim a transaction-bound causal receipt that the service does not supply.
- Intel limits remain 200 topics, 500 terms per topic, label/issue area 120 characters, term value 200 characters, and explicit native type/position/priority enums. No preference DTO is copied into the shared targeting feature.

## Qualification status

This is a preservation checkpoint for draft publication and the next session, not final acceptance. The owned source passes 35 focused units (including the two untouched original units), final full web typecheck and scoped lint. All 35 unique focused browser cases have a passing receipt across the runs below. A subsequent independent review found the OPEN Intel accepted-projection issue described below; the existing tests do not qualify that missing guard. Source/Figma work does not close BILL-11/12.

| Source-bound run | Actual result | Meaning |
| --- | --- | --- |
| Exact `75409a96` original-source baseline, 18 cases | 2 original passes; 16 substantive new failures | Demonstrated the current-read/lifetime/receipt omissions before fixed browser qualification. |
| Four refined interruption cases against restored, hash-verified pristine source | 4 failures | Preserved all captured old-key cache checks and the no-late-value assertion while allowing legitimate replacement actor/revision child reads. |
| Fixed candidate 01, 35 cases | 26 passes; 9 failures | Seven failed only at an outside-modal synthetic close-count locator after their exact write/cache/privacy assertions passed. Two healthy-layout cases failed at exact nested-label lookup despite visible named comboboxes. |
| Corrected locators plus new pre-style topic geometry assertions, 10 cases | 8 passes; 2 expected geometry failures | Every changed lifetime locator passed, including the preserved unmount case. Actual desktop/phone topic geometry reproduced the Figma mismatch before CSS changes. |
| Final scoped topic CSS, two healthy layout cases | 2 passes | Both desktop/phone card geometry, viewport, keyboard focus and zero-console-error checks passed. |

The four original Watchlist source inputs and both original test files remain preserved in `baseline-source/`; `WatchlistTopics.tsx`, `tests/watchlist.test.ts` and `tests/browser/watchlist.spec.ts` are unchanged. The corrected locators retain the same exact counts and enabled-control assertions. No behavior assertion was deleted. `browser-qualified-cases.json` maps every one of the 35 unique cases to its passing receipt; this is not a claim that a single final 35-case combined run passed.

The only product delta after candidate 01 is the local topic-card CSS. TypeScript bodies and the public façade stayed byte-identical throughout all fixed cohorts. Final typecheck and scoped lint completed successfully after the test locator and CSS changes. Port 5191 was released after the owned runner exited and an explicit bind check succeeded; `browser-port-release.json` records the release. No further tests or source changes were performed after the user requested publication and full-context handover.

## OPEN independent-review finding: Intel accepted projection

After the focused qualification, P3 independently identified that `watchlist-writer.ts` checks exact Intel client ID and `version === expectedVersion + 1`, but does not compare the accepted returned targeting projection with the submitted one. A next-version response can therefore be accepted even when a remove-all-topics operation returns topics without a rejection, or a rename/edit returns old targeting without a matching rejection. These are source-review findings; no new browser reproduction or correction was run before this preservation freeze.

The pinned native `TrackerWatchlistService` commits the PUT transaction, then calls `getWatchlist`; that read loads its watchlist head, topics and terms separately. A matching next-version head does not establish that all returned target data belong to the submitted operation. The exact-client/current-source and next-version guards remain necessary, but do not replace checking the accepted native projection. Core already compares its native normalized full projection. See the full pinned [Intel service](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/intel-api/src/tracker/tracker-watchlist.service.ts) and the local complete copy in `native/`.

Keep this issue OPEN before integration acceptance. The next implementation should inspect actual native normalization and partial-rejection behavior, add meaningful baseline cases for remove-all and accepted-field mismatch, then validate only the accepted returned projection without inventing client/version/causality guarantees or rejecting legitimate explicit partial results. Preserve current actor/client/source checks, the synchronous interruption latch, draft retention, and the no-retry uncertainty fence. Root/P3 retain the separate independent finding artifact; no attempted fix is hidden in this snapshot.

## Figma reference and existing controls

The current Tracker board entry is [411:56471](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-56471). Targeted Portfolio-page discovery found no separate Configure form. The unrelated My budget alert frame `411:106678` was not used as Watchlist authority.

The authorized missing continuation is [1029:188497](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1029-188497), with desktop `1030:188498`, phone `1030:188650`, unavailable states `1030:188631`/`1030:188780`, and unconfirmed states `1030:188640`/`1030:188789`. Existing component instances and variables supply the controls. Instance-only overrides inside this new wrapper match Portfolio's Geist fields and hide the inherited unrelated type glyphs. Existing shared component definitions and baseline frames remain unchanged.

Fresh high-fidelity desktop, full-phone, and status context/screenshots were inspected before UI implementation. The imported Field/Input Code Connect location `apps/web/src/vnext/components/fields/index.tsx` is absent from the consolidated source. The extracted form therefore retains the current native Portfolio controls; the new notice actions use the canonical `@capiro/ui/button`. There are no new static image/SVG assets. The established shared Dialog continues to own its accessible close control and modal/focus behavior.

Actual rendering review found an inherited topic-card mismatch: desktop radius 16px/padding 22px 24px and phone radius 16px/padding 18px, with the legend at the border. The authored topic frames `1030:188540` and `1030:188692` specify radius 14px, padding 24px and an internal title. Watchlist-owned form-scoped CSS now overrides only these topic fieldsets and floats the semantic legend into the grid flow. Its measured top/left inset is 25px including the 1px border; the content padding remains exactly 24px and gap 16px. Global cards, native controls, disabled fieldset cascade and topic handlers are unchanged.

The four final healthy desktop/phone top/footer captures and the four unavailable/unconfirmed card captures were visually inspected. Titles, current fields, actions and status copy remain readable, phone content scrolls to the explicit save/reload controls without horizontal overflow, and the focus ring remains visible. The notices use 24px padding, 16px gap, 14px radius and the canonical 36px action. Fresh Figma PNGs were decoded directly from the original inline screenshot data without editing; their manifest records hashes and dimensions. No downloaded HTML was treated as an image asset.

## Native limits and uncertainty

Core's fresh preflight can detect an already-observed saved-value change; it cannot make the subsequent versionless PUT atomic with that read. Core returns its normalized full projection without a client/user/version echo. Only actual returned fields are compared, alongside the exact current client and source checks.

Intel's strict next-version check conservatively rejects a receipt newer than `expectedVersion + 1`, because its GET readback occurs after the write transaction and may observe a later writer. Such a response is unconfirmed for this attempt. It is not evidence of rollback, original-operation causality, or a safe retry.

Once a dispatched operation becomes unconfirmed, a QueryClient-session fence retains the sent draft for this actor/client/configured backend. Closing and reopening does not resend or clear that fence. Explicit reload updates the displayed draft from a new read but leaves saving fenced: a current GET cannot prove that a lost acknowledgement or still-running request never committed. The UI states that this session will not resend and that reload only reads saved values. Browser abort closes the local lifetime; it does not claim server cancellation.

## Coordinated personal-preference dependency

The Configure public call now passes its actual `backend` and disables the entry while shared source data are unavailable or its save/reload is pending. P3 owns the personal-preferences implementation. Its 21 production inputs and one affected Tracker test harness are copied as exact excluded dependencies for combined Configure qualification, recorded in `alert-dependency-candidate-02.json`. None belongs to this lane's integration dispositions.

P3's final producer manifest is `capiro-portfolio-alert-channels/outputs/evidence/alert-channels-20261012/frozen-manifest.json`, SHA-256 `c1162e5fc5f9f8fa759017480530e941d0ed32f0a63b37a72cf1a75f82fc67fc`. The Watchlist production dependency remains exactly candidate 02/03; no producer source changed during Watchlist qualification. Root must integrate the approved façade/Watchlist caller before the producer to preserve the explicit owner seam.

One recorded combined-test adjustment remains root-owned: the old Core-unavailable preference test expects no personal entry. The current Configure shows the configured entry disabled when its source is unavailable. Update only that visibility expectation to disabled while preserving its exact unavailable reason and zero Intel preference calls. Do not delete the refusal test. This lane's two new entry cases verify healthy Core/Intel exact-owner GET routing, while the failed-read cases verify the disabled entry. Root's final combined gate and signed-in/native acceptance remain pending.

## Evidence and next-session locations

- Worktree: `/workspace/scratch/158b6018a5d3/capiro-portfolio-watchlist-current-state`, branch `codex/portfolio-watchlist-current-state-20261011`, base `75409a96d6c58a53c7d44eb6053cc291995caf80`.
- Complete bounded evidence root: `outputs/evidence/watchlist-current-state-20261011/`. It contains original baseline copies/manifest, the immutable `fixed-candidate-01/`, honest `browser-source-switch.json`, every log/result/artifact cohort, exact locator diffs, topic-style expected-failure/fixed evidence, unit/type/lint logs, port release, and the case-to-receipt inventory.
- Native references: `native/references.json` plus complete Core and Intel controller/service/DTO copies, pinned to published `capirov2` `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`.
- Design references: `figma/manifest.json`, four fresh context JSONs and original PNGs; current Tracker board `411:56471`, new Configure wrapper `1029:188497`, and its named desktop/phone/current-data/unknown children above.
- Cohesion review proposals: `docs/portfolio-31/WATCHLIST-CURRENT-STATE-SIZE-REVIEWS-20261012.json`, with five exact current function-body fingerprints and individual ownership rationales. The two large `WatchlistTopics` bodies remain unchanged inherited signals. No owned module exceeds 400 nonblank lines; no central architecture registry was edited.
- Frozen preservation delivery: `frozen-final/manifest.json` and `frozen-final/files/`, with all 22 candidate-owned files, one separately listed cohesion-review artifact, exact base preimages, excluded producer dependencies and canonical input references. Root owns final publication, integration reviews and central audit reconciliation.

Restart by reading this report and the root handover, verifying the frozen hashes and current published refs, then addressing the OPEN Intel projection finding and the narrow Core refusal-test seam. Do not infer a successful live operation, provider action, signed-in acceptance, audit closure, backend deployment or safe retry from this synthetic checkpoint.
