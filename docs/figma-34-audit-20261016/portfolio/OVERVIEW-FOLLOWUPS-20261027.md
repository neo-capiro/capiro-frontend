# Overview source and design follow-ups — 27 October 2026

Frontend PR #244 and PR #251 are merged in main at d0a5707eedf269ae7294b45b33ee2e75833d336a and deployed as frontend 46. They fix Overview recovery initialization, failed-logo initials, and the existing notes/focus-tag constraint copy. They introduce no database migration, endpoint, or permission change. Hermes passed the affected live copy/layout checks at 13:03–13:05 UTC; that limited result is not full Timeline or Wave 4 acceptance.

The current closeout fixes the observed URL-specific logo-failure state, adjacent intake fallback, clipped health message and remaining notes/focus-tag presentation. Current-candidate review and deployment evidence belong to its PR; this discovery record does not mark those fixes accepted.

## Recovered design targets

The CSV/JSON parity inventories now register four exact nodes in file mpXWnySldUFzdVna8i69Ki. Existing inventory verification counters retain their original historical meaning.

| Node | Evidence | Remaining boundary |
| --- | --- | --- |
| 3139:86185 | More actions: exact node and prior PASS reported by the PR #251 author. The name is author-reported. | No fresh metadata/render review was performed for this documentation update. |
| 3139:85856 | Hermes fetched metadata and inspected pixels for `OV · notes · Profile notes`, 640×525. Existing copy/constraint checks passed on frontend 46. | Current layout refinements need Hermes verification. Shared TextareaField hint-above-control placement is an accepted deviation. |
| 3139:86035 | Hermes fetched metadata and inspected pixels for `OV · tag · Add focus tag`, 520×312. Existing constraint check passed on frontend 46. | Current placeholder refinement needs Hermes verification. |
| 3132:78373 | Timeline recovery: exact node reported by the author; its name is author-reported. | No frame audit is claimed. DG-09 remains governed by existing activity/mail contracts. |

The separate thirteen-target Timeline set has known endpoints 3110:63793 and 3113:77148; the eleven intermediate IDs and frame names remain unrecovered. Family prefixes 3132,3134,3139:87xxx,3140 and3146 are not complete node IDs. They have not been invented as inventory rows. Recover exact metadata before extending the register. A design frame cannot authorize a new receipt/replay endpoint or automatic resend after an unknown write.

## Metric source assessment

The unique twelve-row source assessment from closed, unmerged [PR #247](https://github.com/neo-capiro/capiro-frontend/pull/247), head 6abba465dbbcb1ce8d99aef5ef7c994ee04ef969, is retained in [METRIC-SOURCE-STATUS.md](METRIC-SOURCE-STATUS.md). It is historical implementation evidence, not a new metric contract or a fresh Core audit. The source contains no migration or product implementation. Later proposed objective lifecycle/off-track, interaction classification, contact cadence and activity actor changes must be identified and reviewed separately before anyone treats them as deployed database behavior.

Current frontend source still uses a CLIENT profileType filter in PortfolioPulse, while Need attention, Objectives, Off track, Strategies and linkage remain unavailable. This is a bounded source observation; it does not establish all underlying Core fields or approve a new aggregate. Preserve missing-versus-zero semantics and the existing unavailable states.

Evidence retained by the Wave 4 orchestrator: work/overview-release-20261027/OVERVIEW-DOCUMENTATION-HANDOFF.md and work/hermes-review/overview-release/{FIGMA-PREP-RESULT.txt,CLOSURE.txt,LIVE-ACCEPTANCE.txt,figma/OBSERVATIONS.md}. These are evidence locators, not additional live checks.
