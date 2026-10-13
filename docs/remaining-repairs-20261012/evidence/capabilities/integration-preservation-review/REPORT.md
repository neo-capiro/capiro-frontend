# Independent Mail and Intake preservation audit

No blocking source or test-preservation defect was found in this bounded read-only audit.

Reviewed baseline `7aca86e7d64cfdb85d09d424a07e6186339fc24c`, Mail owner `685e55039d5d3945c76085513cde8bc6c33cb55d` integrated as `ceed53a`, and Intake owner `ced1d1b428f57a5cd8628ece6222924c0ebcf0f2` integrated as `8daaf2822f282fa1f764cf795a2bdb5668928beb`. The superseded Intake callback commit `24ac231` is excluded.

## Preservation and exact source

All 14 Mail and 34 Intake final source records match their owner commits, integration commits and captured integrated working files: zero mismatches. Seven production size findings were independently recomputed with the repository source-only scanner; all fingerprints, line numbers and nonblank counts match the final owner records, including the 129-line ClientViewSwitcher fingerprint `04e69dacf0fad530f3c0f798f0686fbc9e8b8d43312b3cace8fc103ad422680e`.

All 24 adapted Mail expectations preserve the identical expected expressions: 8 compose, 7 local-draft, 9 rewrite. Each complete prior test AST equals the candidate after only replacing Message value assertions with the exact paragraph-text adapter and adding its import. The complete client-header test AST likewise equals its baseline after only menu/listbox and menuitem/option role adaptations. Navigation, dialog cleanup, authority, persistence, uncertain-send and unexpected-request assertions were not removed or weakened. Raw comparison methods and results are preserved alongside this report.

The Mail adapter intentionally covers these existing plain paragraph expectations; it does not claim to serialize arbitrary nested rich documents. The added rich tests inspect DOM formatting and serialized body HTML separately. The final editor keeps local text/HTML atomic, applies existing rewrite revision/authority fencing to formatting edits, freezes HTML for explicit review, and resets native history for external rewrite/guarded-Undo document replacements. Transport, signatures and attachments retain their prior owners.

Intake detail rows stay under the current ClientOverview read/error gate and consume canonical saved-field adapters. Team extraction preserves owner/removal fences; choice variants preserve data and payload rules. The view picker reuses the canonical route catalog and scoped keyboard listener. Its final correction deliberately retains `scrollIntoView` while making only the list scrollable, preserving the search header. The earlier picker fingerprint question is resolved by exact source recomputation and is not an open finding.

## Evidence qualification

Mail's final changed-owner replay is **45/45** in `history-green-results.json` after the native-history fix. Its earlier 79/79 run is historical and is correctly described that way by the owner. All eight reported Mail run statistics match their raw JSON. The older production snapshot and pre-history review do not describe final source.

Intake's final popup replay is **10/10** in `popup-green-results.json`; the earlier 46/46 cohort and earlier 10/10 run precede the popup correction. The owner explicitly preserves and labels the superseded callback evidence. Final source hashes and review records match the delivered commit.

This audit ran source/blob/AST checks only. No independent browser, server, build, full TypeScript, native/provider action or source/registry edit occurred. Owner browser results remain synthetic fixture evidence, not native or complete-row acceptance. Root remains responsible for combined qualification and publication; the root worktree was mutable outside these reviewed files.

Details: `review.json`, `source-consistency.json`, `assertion-preservation.json`, `size-record-consistency.json`, `evidence-result-provenance.json`, original diffs and captured source under `reviewed-source/`.
