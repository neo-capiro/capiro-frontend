# Capiro 3.4 desktop audit additions — 26 October 2026

Source requests: [NEO-DESIGN-REQUESTS.md](https://github.com/neo-capiro/capiro-frontend/blob/main/docs/figma-34-audit-20261016/NEO-DESIGN-REQUESTS.md), [Portfolio register](https://github.com/neo-capiro/capiro-frontend/blob/main/docs/figma-34-audit-20261016/portfolio/DESIGN-GAPS.json), [Modules register](https://github.com/neo-capiro/capiro-frontend/blob/main/docs/figma-34-audit-20261016/modules/DESIGN-GAPS.json).

This is a dated design-delivery record, not a new implementation or release authorization. Recheck the current canonical source before implementation; later source changes take precedence over this snapshot.

The current main source was checked where the older audit left authority or fields ambiguous. Existing completed mockups were retained. No application code or backend configuration was changed.

## Review entry points

- [Portfolio Objectives, evidence and receiving](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3117-77962)
- [Portfolio scope, metrics, billing and command recovery](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3109-58750)
- [Full Portfolio recovery directory](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3113-77337)
- [Modules audit review index](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3191-124148)

## Portfolio register

| Gap | Design coverage | Limits retained |
|---|---|---|
| DG-01 | Five work kinds; scoped drill-down, loaded-level search/pagination, loading/empty/failed/revoked, review, exact manual removal, current-set conflict, pending/unknown/receipt result, direct/inherited/generated provenance; 1440 and 1024. | Independent current ACLs; no new link permission; optional human cycle annotation is not cycle CRUD. |
| DG-02 | Multiple projects/shared tasks; current open versus generated receiving, partial and unavailable outputs, stale draft, explicit unavailable requested/applied lineage. Original Planner wording already corrected and retained. | No invented generation state, task cap, automatic continuation or semantic readiness. |
| DG-03 | Existing ten-category profile preserved; existing whole-load/retry/access/moved/deleted states retained. Added section loading, limited-window empty result, earlier period, source conflict, synthetic evidence and honest federal coverage. | Verified populated live examples require owner-proven source/unit/geography/period mappings. Synthetic figures are labeled. Missing is not zero. |
| DG-04 | Reviewable typed-entry and import-review proposals with malformed/conflicting row examples and disabled commit. | Exact economic authoring/import mutation, overwrite/merge and period admission remain unaccepted. No simulated successful import or safe-replay route invented. |
| DG-05 | Client-count loading/complete zero/positive/drilldown and partial/failure/permission/stale; unsupported metrics unavailable. | Full aggregate definitions, linkage denominator/ignore semantics and completeness remain owner dependencies. |
| DG-06 | No-charge/unavailable inline billing; accepted new-client conversion review, capacity/role changes, duplicate/unknown/receipt reconciliation. | Conversion consumes one available slot without purchase; no fabricated pricing, automatic carry-over or payment authority. |
| DG-07 | Index loading/empty/no match/owner catalog failure/retry/access removed, long names and 1024 layouts. | Failed scope reads never broaden visibility. |
| DG-08 | Advocacy read states, exact correction review, current-snapshot changes, unknown versus acknowledged result, read-only reconciliation. | Current source has no persistent immutable receipt/replay API. Not-advocacy absence in a limited window is not success proof. |
| DG-09 | Timeline unknown update/removal, retained draft, latest-read comparison, changed actor/client and explicit unconfirmed result. | Current source has no immutable receipt/replay or wire-version contract. Refresh is read-only and does not prove a command result. |
| DG-10 | Enter/exit scrim bound to visible nodes 1118:278935/1118:278937; 180 ms entry, 120 ms exit; 80 ms interrupted-close example; static reduced-motion endpoints. Hidden legacy tracks cleared. | Prototype timeline demonstration is not a production repeat loop. Runtime interrupted animation behavior remains an implementation check. |
| DG-11 | Authorized ordinary open, client changed, hidden/unavailable resource, partial multi-project/shared-task union, missing receipt mapping and suppressed generated open. | Current resource access is not applied-generation proof; unavailable lineage stays unavailable. |
| DG-12 | 1440/1024 states, long source overflow with fixed modal header/footer, focus/error/retry treatments and interaction notes. | Focus trapping, 200% zoom and assistive-technology behavior are specified, not browser-tested. Phone remains deferred. |
| DG-13 | Existing empty five-field form, four-required validation, retained draft, blank-draft save result reused. | Saving an incomplete draft is allowed; completeness is not semantic readiness. |

## Modules register

Modules coverage and final source-specific limitations are documented in the [Modules handoff](./modules/HANDOFF.json). All MOD-D01–MOD-D07 presentation requests are mapped there. The build includes 74 state screens plus a review index and four reusable field masters: Newsletter start/first edit, Template Studio loading/error, honest Strategy freshness, bounded manual Plan states, Research Portfolio creation and list/detail recovery, existing New meeting creation, and once-on-open/close/reduced-motion drawer/dialog examples. Plan and Calendar include 1440 and 1024 layouts. Manual Plan operations remain held behind 503 responses; mockups do not imply deployment availability.

Final linked-flow corrections: original Objective detail 1064:175923 now shows unsupported progress, decision/question and cycle assessments as unavailable or not assessed. Its Planner entry opens the current-work receiving state. The ordinary current-project action opens the existing Modules project 1064:209988. That linked screen's obsolete 30-day task-cap copy was removed, its header compacted, and its revised screenshot checked.

## Design and validation

- Existing Capiro shell, Geist / Geist Mono, neutral surfaces, thin borders, black gradient actions and existing components retained.
- Native editable layers and instances; image fills are discrete existing wordmarks, not flattened screens.
- Root Portfolio set: 80 frames, including all association/receiving 1024 counterparts, index and motion/long-content examples. An 80-frame structural read found no font mismatch or missing prototype destinations. Narrow location overflow was corrected and the post-fix check passed.
- Separate Portfolio recovery set: 58 frames, 274 prototype links, no font or horizontal-overflow issues in its final check.
- Semantic source evidence: [portfolio-contracts.md](./portfolio-contracts.md).
- Durable root node ledger: [ROOT-FINAL-LEDGER.json](./ROOT-FINAL-LEDGER.json). Final source-screen edits and post-fix QA: [FINAL-ADDENDUM.json](./FINAL-ADDENDUM.json).
- Separate recovery handoff: [Portfolio recovery](./portfolio-recovery/HANDOFF.md).

Design coverage does not certify backend availability or deployed frontend parity. Unsupported operations remain visibly unavailable rather than becoming invented product contracts.

## Repository package

Published under `docs/figma-34-audit-20261026/`. The eight files contain the handoffs and final evidence only; temporary construction scripts and intermediate snapshots are not delivery inputs. The root ledger preserves pre-fix findings under `qaBeforeFix` and the corrected outcome under `finalQa`.

Validation for this documentation publication: parsed all JSON files; checked relative Markdown links, source references, local-path removal and absence of embedded raster data. Application tests, typechecking, builds and deployment gates were not run because this commit changes documentation only.
