# Portfolio scope and command recovery — 26 Oct 2026

Saved in Portfolio 3.4, section **03.16 · Portfolio · Scope and command recovery**.

- [Review entry](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3109-58750)
- [All states directory](https://www.figma.com/design/mpXWnySldUFzdVna8i69Ki?node-id=3113-77337)
- Section: 3109:58742
- 58 frames: 56 desktop 1440 + 2 tablet 1024; 2 reusable local components; 274 wired click paths; 20 Stay here/reload-self controls intentionally do not navigate.
- All existing screens and shared masters preserved. No application code changed.

## Coverage

DG05: pulse loading, complete zero and positive (client count only), partial unknown, failed/retry, denied, stale, unavailable definition/drilldown.

DG06: no-charge billing, reviewed current-capacity conversion, pending/unknown original request, receipt confirmation, definite refusal and reconciliation, capacity/role/quote uncertainty, duplicate request, opened created client.

DG07: loading/no-profiles/no-matches, owner catalog failure with selected scope retained, read failure, access loss, long names and keyboard focus at 1024.

DG08: read loading/error/empty/revoked, unverifiable attribution, exact reassign preview, changed current snapshot, no-submit state vs uncertain dispatched correction, separate uncertain merge/reassign/detach/not-advocacy, current-state checks with explicit limitations.

DG09: uncertain update/removal, retained open-editor draft, latest activity read, no-replay comparison, validation/no-submit, changed snapshot, actor/client change, acknowledged save/removal examples and focus return, missing-current-entry without claiming removal proof.

## Current source boundaries

- DG05: aggregate definitions/completeness for attention, objectives, off-track, strategies, work-linked, touches, reply, overdue and deadlines are not provided. Mockups show unavailable rather than inferred zero; only complete selected-scope Client counts use illustrative 0/2.
- DG06: current new-client conversion consumes one existing slot, no purchase. Inline billing/quotes/payment commands remain unavailable/no-charge. Unknown conversion recovers original accepted receipt before another request.
- DG08: current Advocacy has no immutable request/receipt/replay route. Check current result is read-only. Not-advocacy cannot be confirmed from absence in latest 500; authoritative audit receipt remains missing.
- DG09: timeline session attempt is not native receipt; no immutable request-ID/version field/receipt lookup/replay. Latest activity read is a comparison, not command proof. Saved/removal success examples require acknowledged response.

Current source paths verified by portfolio_contracts agent: NewClientConversion.tsx, new-client-command.ts; PortfolioPulse.tsx; OverviewSignals.tsx; advocacy/CorrectionDialog.tsx, correction.ts, useCorrection.ts; client-profile/activity-attempt.ts, activity-change.ts, activity-mutations.ts, ActivityDialogs.tsx. See the [source contract audit](../portfolio-contracts.md).

## Validation

58 frames inspected; 1772 text nodes all Geist/Geist Mono; zero text horizontal overflow. Screens consist of native layers and component instances; only image fills are the reused 77×26 Capiro wordmark. Final screenshots reviewed for coverage, 1024 index, conversion uncertainty, merge uncertainty and 1024 timeline. No complete-screen rasters.

[FINAL-LEDGER.json](./FINAL-LEDGER.json) records the completed state set. [SIDEBAR-POLISH.json](./SIDEBAR-POLISH.json) records the final navigation correction. Intermediate construction scripts and snapshots are deliberately excluded from this delivery; they are not implementation inputs.

Final targeted sidebar polish is recorded in SIDEBAR-POLISH.json: 28 screens now select Objectives for Advocacy, Prospects for conversion/billing, and Clients for the confirmed created-client view. Selected/inactive label contrast is corrected. Targeted post-fix screenshots passed.
