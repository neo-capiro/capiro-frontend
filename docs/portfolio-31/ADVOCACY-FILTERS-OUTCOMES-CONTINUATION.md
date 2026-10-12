# Advocacy continuation: OBJ-02, OBJ-03 and OBJ-06

## Scope and pre-code outline

Date: 2026-10-11. Isolated branch `codex/portfolio-advocacy-filters-outcomes-20261011`, source base `3eeaeb785bf131d41f7bcdc28170d5bfa587cd0a`. Published native main was freshly checked at `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`. This report records local implementation and synthetic qualification; no final audit acceptance or live mutation is implied.

The parent authorized three bounded corrections after a read-only reconciliation of all 345 canonical rows: a dated Advocacy timeline (OBJ-02), local search and exact status filtering (OBJ-03), and edit-matter outcome confirmation (OBJ-06). Existing create, add-record, detail and correction actions remain reachable. Create/add-record writer semantics are outside this change.

### Owners and dependency direction

- `advocacy/AdvocacyHistory.tsx` remains the parent composition and dialog selection owner. Dedicated browsing/filter/timeline views own their own presentation and local selection.
- `advocacy/contracts.ts` will project the already-returned optional nullable `primaryPeCode` and `primaryBillId`. No native fields are invented. Existing list/detail/timeline readers stay the network owners.
- A pure matter-edit model owns status vocabulary, field normalization, outcome evidence/confirmation, source comparison and exact readback comparison. A separate update-only writer owns native PATCH plus scoped GET readback; a controller owns captured actor/client/matter/view lifetime, current reads, no duplicate dispatch, error/retry and unknown-result recovery. Existing create/add-record mutations are not silently widened.
- Canonical `currentClientWriter` / `assertClientWriter` and the shared API transport are reused. No new generic workflow framework, shared auth changes, locks, routes, backend service, architecture registry change or commit.
- Dedicated tests and this report are owned by this lane. Baseline source and raw evidence live under `outputs/evidence/advocacy-20261011/`.

### Native contract decisions

The exact controller/service are [client-advocacy-matter.controller.ts](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-advocacy-matter.controller.ts) and [client-advocacy-matter.service.ts](https://github.com/neo-capiro/capirov2/blob/4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace/apps/api/src/clients/client-advocacy-matter.service.ts). Class read permission is standard_user; the update route requires user_admin.

| Row | Published support | Bounded implementation and limits |
| --- | --- | --- |
| OBJ-02 | GET `clients/:clientId/advocacy-matters/timeline`; `getTimeline` emits actual record activityDate or dated-link metadata.occurredAt, kind/subtype/title/matterId/matterTitle/evidenceClass/confidence/attributionNeedsReview. | Dedicated latest-first Timeline, undated records last, actual association retained. Native result is capped at 500 combined entries; counts say loaded events. Undated links are omitted by the native service. No events are fabricated from matter updatedAt, no total-history claim, and no missing association is inferred. |
| OBJ-03 | GET matter list returns title, summary, status, primaryPeCode and primaryBillId; timeline supplies actual entry title/association. | Local text and exact status filtering. Timeline may independently render from a successful current feed; filters requiring a matter catalog are unavailable when that catalog is unavailable. Unassigned/unknown associations are retained, not given a guessed status. |
| OBJ-06 | PATCH `clients/:clientId/advocacy-matters/:matterId` accepts title (300), summary (4000), native status and optional confirmOutcome. Service returns void. | Separate update owner, captured current scope and fresh list/detail preflight, strict empty acknowledgement, then exact scoped detail readback. A new transition to successful/partially_successful/unsuccessful needs an actual outcome_event link or explicit human confirmation. outcomeCount does not prove that link. Unchanged final status is not rechallenged. No CAS/version or cross-device atomicity is claimed; unknown dispatched results are never automatically replayed. |

### Figma decisions made before code

- Existing exact current timeline: [411:60560](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-60560), card `415:80045`, compact-event component `414:80880`. Fresh high-fidelity context and screenshot inspected.
- Existing search/chips: `411:59584`, within [411:59524](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-59524).
- Existing edit dialog `411:59639` already contains confirmation block `411:59659`; reuse this exact designed control rather than create a competing outcome design.
- A compact Timeline/Matters and filter variation will be authored in a separate named wrapper in the same page before source implementation, preserving all unrelated baseline frames, tokens and components. Its final IDs and visual comparison will be appended below.
- Code Connect search found no matching `*.figma.ts/js/tsx` files in this repository. Existing Figma buttons/event instances, Geist typography, bound card/border/foreground/muted/warning variables and existing text/effect styles were inspected. Canonical local Dialog/SelectField/TextareaField and input/button styles will be composed. Static icons will use exact existing or official exported assets with unchanged intrinsic geometry.

### Verification plan and source chronology

1. Preserve/hash exact base Advocacy files before edits. Prepare meaningful semantic regressions: timeline date/association/cap/failed-feed behavior; title/summary/PE/bill plus exact-status filtering; final-outcome human confirmation versus linked evidence and unchanged final status; fresh source/actor/client/view checks; wrong receipt and lost acknowledgement; retained existing detail/correction/create/add-record assertions.
2. Implement and run focused units, type and lint checks while another lane owns browser port 5191.
3. When released, run targeted tests against the preserved exact behavioral baseline, record actual failures and source hashes, then restore fixed source and run the final bounded cohort with source held constant. Inspect desktop/phone captures against exact Figma frames. Do not weaken prior assertions to hide a failure.
4. Record individual >80-nonblank function / >400-nonblank file reviews using the canonical scanner and exact fingerprints; parent owns integration and registry. Freeze exact source/tests/report manifest with immutable evidence.

## Remaining-work audit at source 3eeaeb7

The canonical matrix and 345-row reconciliation ledger are historical evidence plus explicit continuation records, not proof that every named frontend behavior exists. Describing all frontend implementation as complete at source 3eeaeb7 would be inaccurate.

| Priority / class | Exact rows | Source owner / evidence | Disposition |
| --- | --- | --- | --- |
| Concrete local omission | OBJ-02 | AdvocacyHistory rendered a matter list and optional unassigned records; current Figma415:80045 is a dated vertical timeline. Native getTimeline supplies all displayed date/association/evidence fields with a500-entry cap. | This lane, bounded dated/undated presentation and retained matter navigation. |
| Concrete local omission | OBJ-03 | AdvocacyHistory had no search or status controls despite native list fields and existing Figma toolbar. | This lane, local current-data filters. |
| Concrete local omission | OBJ-06 | MatterEditor omitted the three final outcome statuses and confirmOutcome despite the explicit native update gate and existing Figma confirmation block. | This lane, separate qualified edit writer. |
| Concrete local omission | CORE-128 | client-profile/past-performance/PastPerformance has no product consumer; native client-capabilities.controller.ts owns GET submission-history (200 cap) and DELETE history/:id. Existing removal Figma411:58348 /411:58549. | Parent assigned P2 placement/current lifecycle; no edits here. Historical matrix route spelling differs from actual controller; preserve the correct native route. |
| Concrete current-read omission | CORE-048/103 | ActivityTimeline renders cached rows/filter kinds alongside failed read; ClientOverview uses retained activity count. Native activity GET exists. | Parent owns independent current-read projections. No claim of unauthorized mutation from this display finding. |
| Concrete current-read omission | CORE-007/002 | PortfolioIndex hides failed client cards but retains clients.data in count/pulse/filter choices. Native GET clients exists. | Parent owns correction. |
| Evidence mapping correction | CORE-037/038/039 | Integrated facility provider-action checkpoint3eeaeb7 directly qualifies these action rows in addition to33–36context, but their continuation was absent in the frozen ledger. | Parent appends exact mapping and preserves historical fields. |
| Native/service semantics | CORE-098, CORE-099, CORE-106 | Saved-layout candidate registration/activation; only one primary owner plus unranked free-text team; activity feed is capped500 with no cursor/offset/total. | Do not invent native activation, rank or pagination. |
| Native/service semantics | CORE-009, CORE-087/089/090/112–115 | Existing six-quarter outreach/mail-thread counts do not prove specified30-day health/touches; objective lineage/status denominators/dependencies remain unverified. | Exact existing-service contract review or published capability required; not a replacement service design. |
| Source exists / signed-in gates | P1 shell, navigation, New objective, billing Settings and first-client flow | Current canonical source and prior local tests exist. Matching Clerk/backend pairing, permitted create/intake/LDA→Overview→Objectives persistence, role expiry, org/tenant/privacy acceptance are live requirements. | Synthetic checks cannot complete signed-in acceptance. Meri research worker/strict source completion remains an explicit native gate. |

Fresh native main reference is `4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`. This bounded audit did not inspect or authorize provider/AWS activity. No row is finally accepted from this continuation.

## Authored design and implementation checkpoint

The compact variation was authored before code in the existing Capiro file, without changing unrelated frames or shared variables/components:

- [Named review wrapper 1018:187915](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1018-187915).
- [Desktop card 1019:187976](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1019-187976), 360 px wide.
- [Phone card 1019:188028](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=1019-188028), 358 px wide.
- [Original edit dialog 411:59639](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-59639), including the already-designed explicit-judgment checkbox 411:59659.

The new instances reuse existing buttons/events and bound Portfolio colors, Geist typography, border/radius and effect styles. The imported Field/Input instance's own earlier type/radius choices were overridden only inside these new instances to match the current Portfolio controls. Fresh desktop/phone contexts and screenshots are saved under `outputs/evidence/advocacy-20261011/figma/`. The parent independently reviewed the final wrapper screenshot and geometry.

Code Connect points to `apps/web/src/vnext/components/fields/index.tsx` / `CapiroInput`, which does not exist in this repository. Implementation reuses canonical local `SelectField`, `TextareaField`, `Dialog`, labeled native inputs and existing button styles. No other application's private field source is imported.

The four unchanged SVG files under `advocacy/assets` were exported read-only from existing owning Figma components: users 24:391, file-text 24:382, landmark 20:370, mail 24:375. All root SVG dimensions and viewBoxes remain 16 × 16; the existing timeline's 14 px icon instances are represented by a 14 px slot with a uniform 0.875 transform of the intrinsic 16 px image. Bytes were never edited. The failed nested-instance export reported no visible layers and its tool transaction rolled back; a separate successful field-only transaction and official owning-component export produced the final evidence. `figma-assets.json` records exact file hashes.

### Source behavior and recovery ownership

`AdvocacyHistory` creates a client-keyed view lifetime. `ClientAdvocacyHistory` composes independent current list/detail/timeline reads and owns selection/dialog transitions. A changed client unmounts the previous edit controller. `AdvocacyBrowser`, `AdvocacyFilters` and `AdvocacyTimeline` own only local display, matching and expansion: the first five returned events are shown, and View all appears only when it reveals withheld loaded rows. Null dates remain Undated; unassigned entries are non-navigating articles; an actual returned matter ID may open its exact scoped detail. Unknown associations never inherit a guessed matter status.

`read-state` observes both identity and client-scoped query invalidation/error/fetch states. A retained successful payload is concealed during refresh, failure or invalidation. Read errors and retry remain independent, so an available matter catalog can still be used when the timeline fails, and an unfiltered current timeline can still display when the catalog fails. A filter-dependent join waits for the current catalog and retains the chosen filter.

`matter-edit` contains only the native field/status/evidence model. `matter-edit-scope` binds actor, client, exact matter and local query revisions; these local revisions are not sent as a native version token. `matter-edit-request` owns current list/detail preflight, strict void PATCH acknowledgment and exact detail readback. `matter-edit-attempt` retains same-cache uncertainty under the initiating actor/client/matter key across view changes. `useMatterEdit` owns the edit transaction and explicit read-only reconciliation/reload lifecycle; it does not change create or add-record writers.

New final statuses require the existing Figma confirmation whenever the current detail has no actual `outcome_event` link. A nonzero outcomeCount alone does not pass the gate. A current legacy value remains available with a legacy label; other legacy values are not offered as new transitions. Native field limits and exact submitted empty-string summary semantics are retained.

A fresh source conflict stops dispatch and preserves the draft. An explicit Reload current details performs scoped GETs, keeps the draft, shows current saved values for comparison, resets the human confirmation and requires another deliberate save. A dispatched uncertain operation disables another PATCH and exposes only Check current result. Lost acknowledgment plus matching GET uses qualified current-state language, not a claim that the original response was acknowledged. Abort after dispatch means the result is unknown, not that the service stopped. All post-await cache/local effects are fenced by current actor and view lifetime; source revisions also fence an ordinary save.

The published PATCH is unversioned. Fresh preflight plus exact readback cannot guarantee cross-device atomicity, remove the race between read and write, prove original-request causality after a lost response, or replace signed-in authorization/persistence acceptance. No provider calls, live mutations or new backend design were performed.

### Pre-browser checks

At the source preparation checkpoint, the focused unit cohort passed 42/42 (22 new history/edit cases and all 20 preserved correction cases), typecheck passed, and focused ESLint passed with zero warnings/errors. The first unit pass exposed a request-helper abort boundary; the fixed helper checks an already-aborted signal before issuing the PATCH. The source and synthetic fixtures subsequently added explicit client-prop lifetime coverage; browser fixtures retain native fields independently of the frontend parser so baseline and fixed code receive the same DTO shape. Final browser evidence, immutable source manifests and exact size reviews follow below after the owned port window.


## Final local qualification and truthful chronology

### Exact source candidates

All behavioral source restoration and fixed cohorts were recorded before running them. The pristine baseline is the 16 tracked Advocacy feature files from `3eeaeb785bf131d41f7bcdc28170d5bfa587cd0a`, preserved in `outputs/evidence/advocacy-20261011/baseline-source/manifest.json`. The source hashes were checked after the original-source runs before the fixed feature files were restored. New synthetic fixtures preserve the actual native DTO vocabulary independently of frontend parsing.

| Candidate / evidence | Exact result and interpretation |
| --- | --- |
| `baseline-browser-initial-results.json` | Six failures on pristine source. Three directly demonstrate missing timeline/search/current-feed behavior. Three stopped at an imprecise old-form status-label locator; they were not treated as outcome-confirmation proof. The earlier `baseline-collection-01.json` is a no-tests-found collection attempt, not an executed cohort. |
| `baseline-outcome-results.json` | The three final-status cases were rerun on the same pristine source using the actual Status combobox and an explicit option assertion. All three failed because successful, partially_successful and unsuccessful options were absent. Confirmation, exact PATCH body, readback and no-unexpected-request assertions were retained. |
| `fixed-source-01/manifest.json` | First immutable 45-file candidate, SHA256 `c8ccfdf13e8d63e14c67c70827560da9c744041f4e3e5144a4d8d7dc24370113`. Parent and P2 independently reviewed its native and frontend owners. |
| `actor-lifetime-preimage/manifest.json` and `actor-lifetime-baseline-results.json` | Three additional real failures against the pre-latch mutation owner: a held save dispatched PATCH after identity invalidation/restoration in one callback; a held result check cleared the unknown attempt after role loss/restoration; a held detail reload published a new review after identity interruption. All 45 inputs matched their saved hashes after the run. |
| `fixed-source-02/manifest.json` | Corrected authority lifetime plus actor/client view key and field concealment, SHA256 `33ba83fa0e27aba75a41c2269ba104f0cab59f23a26776c63e427544896fb463`. Its seven-file exact delta is `fixed-01-to-02.diff`; the three-file latch-only delta is `actor-latch-fix.diff`. P2 independently verified all 45 hashes and found no remaining bounded source blocker. |
| `fixed-02-browser-results.json` | **43 passed, 2 failed, 0 skipped, 0 flaky** in the complete 45-case cohort. All 15 unchanged correction cases and all three interrupted-actor cases passed. Both failures were test-fixture sequencing defects, described below; this result is preserved unchanged. |
| `geometry-preimage/manifest.json` and `geometry-baseline-results.json` | Two computed-style failures confirmed the visual observation: the later shared card rule produced `22px 24px` desktop padding and `18px` phone padding, instead of the authored `20px`. Existing content/association/expansion assertions still ran. |
| `fixed-source-03/manifest.json` | Only the local card-selector specificity and the dedicated browser spec changed from candidate02. SHA256 `28400289470497e16ae1cfebd3484fcf7c6a2a47acff49246ba31d3f7efc0b68`. Native model, reader, writer, controller, identity and receipt code are unchanged from the independently reviewed candidate02. |
| `fixed-03-focused-results.json` | **5 passed, 0 failed, 0 skipped, 0 flaky**: both corrected fixture cases, desktop timeline, phone timeline/outcome review with keyboard cancel, and desktop outcome review. All 45 candidate03 inputs matched their frozen hashes after the run. This is a separate focused run, not a fabricated single 45/45 cohort. Parent owns the final complete integrated suite. |

The first fixture failure restored the synthetic list response to 200 after observing the deliberately concealed intermediate fetch state but before observing the intended 503. It then waited for a Retry button that correctly disappeared after success. The correction adds an explicit assertion for the returned error before restoring the fixture. Every existing stale-row, selected-filter, empty-state and retry assertion remains.

The second fixture left the initiating preflight's list gate armed after changing actors. The replacement actor correctly made its own current GET, causing two gated completions instead of one. The test now disarms that gate after capturing the initiating preflight and before changing actors. It retains the exact single held-request completion, no-PATCH, old edit-dialog closure and no-unexpected-request assertions; it does not relax them to an arbitrary count.

The CSS correction is solely `.history:global(.card)`, which lets the authored 20 px padding and 12 px radius prevail over shared card defaults. It changes no shared style rule. Computed padding/radius assertions now accompany the retained intrinsic 16 px / rendered 14 px SVG, event expansion, responsive overflow, dialog bounds and keyboard cancellation checks.

### Current actor and request lifetime

The final `AdvocacyHistory` view key includes client ID and the actual returned tenant/user IDs. An actor or client replacement unmounts the old edit view. While the same actor's current authority is unavailable, the retained edit fields and current-value comparison are concealed; draft state remains retained rather than being silently submitted or discarded.

`watchMatterEditor` subscribes synchronously to identity-cache events and reuses `assertMatterEditor`, which delegates to canonical `assertClientWriter`. It aborts only the active save/check/reload controller when the captured authority becomes unavailable. A restoration before React's batched notification cannot restore that controller. The UI subscriptions remain batched, and this subscription performs neither a React state update nor an additional auth/network read. The existing post-await signal checks prevent dispatch or publication from the interrupted lifetime. A dispatched uncertain attempt remains unknown and requires an explicit read-only result check; abort is never presented as proof that the server cancelled the operation.

Two meaningful unit cases exercise invalidation and role restoration within one callback, including unaffected unrelated-cache and same-authority updates. The final focused units pass **44/44: 24 new history/edit cases and 20 unchanged correction cases** (`fixed-02-units.json`). Typecheck and focused ESLint pass (`fixed-02-typecheck.log`, `fixed-02-lint.log`); the final dedicated spec also passes lint after its fixture-only changes (`fixed-03-test-lint.log`).

### Audit-specific evidence and limits

| Row | Qualified local behavior / source owners | Remaining acceptance limit |
| --- | --- | --- |
| OBJ-02 | `AdvocacyBrowser`, `AdvocacyTimeline`, `history-model`, current `queries` and `read-state`: actual dated/undated entries, native association/evidence, independent timeline failure/refresh handling, first-five expansion of only withheld loaded events, exact assets and desktop/phone geometry. | Native timeline is bounded to the latest 500 combined entries, has no total/cursor, and omits undated links. No invented event or inferred timestamp/link. Signed-in actual data/permissions remain to be accepted. |
| OBJ-03 | `AdvocacyFilters`, `history-model`, `AdvocacyBrowser`: native title/summary/PE/bill search, exact returned status, current-catalog joins and preserved selection while reads fail. An independent unfiltered timeline remains reachable. | Filters describe loaded data. Missing/unassigned matter associations are not assigned a known status. This is not a new server-side search or pagination contract. |
| OBJ-06 | `EditMatterDialog`, `MatterEditFields`, `matter-edit*`, `useMatterEdit`: native lifecycle/legacy options, explicit new-final-status judgment or actual outcome link, exact scoped preflight/void acknowledgment/GET readback, draft-preserving explicit reload, known refusal retry and unknown-result reconciliation, actor/client/view/source guards. | Published PATCH has no CAS/version token or operation receipt. Exact current readback cannot prove original-request causality after a lost response or guarantee cross-device atomicity. Existing create/add-record writers remain unchanged and are not newly qualified by this edit-specific continuation. |

The browser test contexts use synthetic native-shaped responses only. No provider, paid service, AWS, live native mutation or deployment was performed, and no final audit acceptance is asserted.

### Final visual inspection

The final desktop and phone screenshots were inspected against the authored `1018:187915` wrapper / `1019:187976` and `1019:188028` cards and the existing `411:59639` outcome dialog. The measured card is 360 px desktop / 358 px phone with 20 px padding, 12 px radius, 28 px event rail and 14 px rendered exact icons. The desktop outcome dialog is 560 px wide at y=120; the phone dialog is 358 px wide within the 390 × 844 viewport. Long attribution text and confirmation copy wrap within their cards without horizontal overflow. The phone cancellation and existing correction keyboard assertions remain passing.

Final images are under `fixed-03-focused-artifacts/`: `advocacy-timeline-desktop.png`, `advocacy-timeline-phone.png`, `advocacy-outcome-desktop.png`, and `advocacy-outcome-phone.png` within their named test directories. Synthetic content differs from Figma example text; no pixel-perfect data equivalence is claimed. The visible loaded-count cap and retained Unassigned records action state the actual service boundary and preserve the existing correction entry.

### Individual size/cohesion review

The canonical TypeScript AST scanner found three changed/new functions over 80 nonblank lines and no changed/new file over 400. Exact records are in `fixed-02-size-reviews.json`; the candidate03 CSS/test-only changes leave these bodies unchanged. P2 independently reviewed the native/authority/lifetime delta and verified the immutable candidate.

| Function | Nonblank / fingerprint | Responsibility review |
| --- | --- | --- |
| `ClientAdvocacyHistory` in `advocacy/AdvocacyHistory.tsx` | 148 / `0d5c19ef71b35027b056b54beb0cb9e251cebd8f1b1d38005ce1224d154de1e5` | One actor/client-scoped view composition owns reader availability, selection and mutually exclusive dialogs. Browsing/filtering/timeline and mutation transactions are delegated; remaining callbacks coordinate that view without native parsing or an unrelated business workflow. |
| `EditMatterDialog` | 128 / `bd25515468f0ba0a3a55870e2a4d697b0674b0592fa0f1d36974089024d74df8` | One controlled form owns retained draft, current-value comparison and recovery presentation. Field rendering, validation, source review, native IO and transaction state have separate owners. Its states belong to the same review form. |
| `useMatterEdit` | 212 / `142e30df414752b5ab19408d59436a0493e26cee89e1e0f77777a2c399166954` | One update/recovery transaction shares actor/client/matter lifetime, active-request mutex and pending/unknown attempt. Pure model, native IO, exact readback, source checks and attempt-key storage are already extracted. Save/check/reload use those same invariants; no unrelated concern was found. |

The unchanged inherited `CorrectionDialog`, `MatterEditor`, `RecordCard`, `RecordDialog` and `useCorrection` size signals are explicitly outside these new review records. No blanket size approval or silent widening of their writer qualification is made.

### Integration boundary

The final frozen patch manifest contains only changed/new owned source, exact unchanged SVG exports, dedicated tests and this report. The single shared `tests/browser/fixtures.ts` timeline-GET fixture must be merged as its independent one-line hunk beside the existing matter-list response, preserving P2's separately owned submission-history addition. Unchanged source and the original correction test files are preserved in evidence but are not copied as new implementation changes. Parent owns commits, central audit continuation/architecture records and the complete integrated run.

### Final dark-theme correction pending the integrated browser gate

After the light-mode captures passed, the parent identified a concrete dark-theme contrast omission: the exact exported SVGs retain fixed `#0A0A0A` strokes, while the native Portfolio dark marker uses `--muted: #242424`. The local `history.module.css` now applies `filter: invert(1)` to `.icon img` only within `prefers-color-scheme: dark`, following the existing local icon treatment in `work/workspace-documents.module.css` and `relationships/committee/committee-picker.module.css`. All four SVG byte hashes remain unchanged, and no shared token/style or light-mode declaration changes.

Two dedicated cases in `tests/browser/advocacy-timeline-dark.spec.ts` are prepared for desktop and phone. They wait for all five actual images to complete with 16 px natural dimensions, render the real loaded SVG through the browser's computed image filter to sample opaque stroke colors against the actual marker background, require at least 3:1 icon contrast, and retain exact 14 px rendered icon / 28 px marker / 20 px card padding / 12 px radius and no-overflow checks. They save full actual dark screenshots and assert no native writes or unexpected routes. This is a focused visual/contrast check, not an assumption based solely on the existence of a CSS rule.

**These two new dark cases have not been run in this isolated lane.** Port 5191 was released to P2 and was not reclaimed. Parent's final integrated browser gate must run them and inspect their captures. The earlier light evidence remains exactly 43/45 plus the separate affected 5/5 cohort; no dark screenshot or pass is claimed here. The final Advocacy browser inventory is 47 cases: 32 new history/edit/dark cases and 15 unchanged correction cases. Final typecheck and focused ESLint pass with the dark cases included (`final-typecheck.log`, `final-lint.log`). The three function review fingerprints remain unchanged because this final delta adds only the local dark media rule, dedicated tests and documentation.
