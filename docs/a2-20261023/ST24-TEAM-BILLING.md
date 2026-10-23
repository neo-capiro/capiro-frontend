# ST24 Team and Billing continuation — 23 October 2026

The Team and Billing screens now compose their existing mutation lifecycle with cohesive views. Team membership cells, invitations and explicit removal confirmation remain separate from the current read/rejection lifecycle. Billing current-state checks, plan presentation and checkout/cancellation dialogs retain the existing hosted-session protocol. This adds no state machine, transport, authorization or recovery owner.

## Preserved behavior and ownership

- `useSettingsMutation`, `executeSettingsWrite`, receipt readers and the scoped nonreplayable journal remain canonical and unchanged.
- Team still reports definitive rejection to `SettingsScreen` before the authority reload. Permission loss removes the screen. Self/staff, inactive-member and billing-admin predicates remain in `teamPermissions`.
- Removal and resend still require a delivered receipt followed by matching current readback. A lost response cannot be resolved from equal current state alone.
- Billing still re-reads summary/state before dispatch. It never silently switches checkout to portal. Only exact approved hosted origins navigate; an unrelated destination retains uncertainty.
- Cancellation remains an explicit hosted action. The explanatory text now describes the user's confirmation step without internal API details.
- Old oversized screen bodies are replaced in place, not retained as alternate paths. Supporting files live only in `features/settings/team` and `features/settings/billing`.

## Verification

On the extraction source based on FE `73f571a0c21241c8ef8aba3e99c7a5671dfb3193`:

- Eight real Chromium scenarios passed, zero skips/page errors: definitive Team rejection with refresh/revocation; lost-response reload fence despite equal state; removal duplicate/busy dismissal/delayed readback; exact replacement invitation identity; matching versus wrong-member role receipt; Billing flow change before dispatch; checkout busy controls/wrong hosted origin/reload fence; explicit intercepted hosted cancellation navigation.
- All eight also passed with the original `TeamSettings.tsx` and `BillingSettings.tsx` from that base temporarily substituted. Both sources were restored byte-for-byte in `finally`.
- Deliberately removing the delivered-receipt prerequisite from `reconcileSettingsWrite` failed the lost-response browser scenario: equal coincidental state incorrectly cleared uncertainty. The canonical source was restored byte-for-byte. A subsequent restored-source case is recorded separately in the local evidence.
- Focused Settings source tests: 31/31 passed. Web TypeScript and touched-source ESLint passed with no errors/warnings. Formatting and diff checks passed.
- Architecture remains **exit 1**, with 23 blocking size-review obligations (previously 26). Team/Billing extraction paths add no new size findings. This is not an architecture gate pass.

Synthetic fixtures intercept only the intended loopback API routes and assert no unexpected calls. Hosted navigation is intercepted with local synthetic HTML; there are no provider requests. The first fixture attempt used invalid synthetic user IDs and notice-heading selectors, and was stopped after failures. The corrected ID/tab fixtures produced seven passes and one overly strict notice-text locator failure; the final corrected suite passed all eight. No product assertion was weakened to hide a behavior failure.

Local evidence: `C:/Users/Administrator/Documents/Codex/2026-10-22/se/work/a2-repairs-20261023/settings-browser-controls/` (`extracted-positive.json`, `original-views.json`, `original-views.log`, `unconfirmed-state-mutant.json`, `unconfirmed-state-mutant.log`, `results.json`). These are synthetic, native-browser controls; independent exact-head review and production/preview acceptance remain separate.

## Remaining full ST24 and A2 scope

This is a bounded Team/Billing continuation. The remaining HQ, mappings, analyst bulk, signature/file and delayed-readback browser inventory is still open, as are the other 23 architecture obligations. Full A2 requirements remain in `PREREQUISITES.md`: this continuation does not close ST24 or any missing Core/provider/live acceptance prerequisite.
