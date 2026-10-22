# PR120 revision 2 correction receipt

This is an M1 correction to the exact reviewed source `d637c158598c1f522da0030bd61b41fa349eb4e0`, tree `08c90ab6f1afb3f8bc25ce16efbed3190e6d03b0`, stacked on PR119 `5c86f9b3e6b138fe1b572b071d66766591f6dd7e`. The published resulting commit/tree and separate correction commits are recorded in the PR body. PR119 is unchanged.

The complete review and gate footers were read: [COORD-W1-BROWSER120-20261022-01 revision2](https://github.com/neo-capiro/capiro-frontend/pull/120#issuecomment-6331609812), updated 2026-10-22T03:04:14Z. Its synthetic execution is authoritative for the prior head: main 159 pass / 3 fail; PR119 164 pass / 3 fail / 3 skip; PR120 155 pass / 17 fail / 1 skip. Every declaration was accounted for. Those results are not rerun results for this correction.

## Integration corrections

- Reload now reads exact-run history through the existing SDK even when the retained request is unknown. SDK validation admits the view needed by Stop; its `no-admitted-run` guard is unchanged. Stored journal bytes never establish authority, and reload does not resend them.
- Positive non-queued SDK history and the same scoped/run-selected canonical saved request can mark a matching retained request observed without dispatch. Request ID, prompt, requested window and selected skill must match. Missing, unavailable, queued or mismatched evidence cannot acknowledge it.
- A matching queued canonical request offers **Continue accepted request**, using the existing explicit recovery operation and original bytes. No automatic continuation, fresh allocation or replacement request is introduced.
- Saved running presentation alone cannot enable Stop. The composer waits for the SDK's admitted ready observation; failed read-only recovery leaves an explicit verification reason.
- Ordinary opaque-session expiry keeps the last service-bound conversation as a local draft/reopening selector. It is not current authority. A fresh ready session is still required; retry keeps the exact run. Access loss, application-session expiry, sign-out and identity replacement retain their existing purge behavior.
- A same-identity Meri route transition explicitly preserves the exact journal content and active writer. Navigation is not sign-out.

The canonical owners remain unchanged: the SDK validates and admits the current view; public/native history owns saved facts; the per-scope journal owns uncertainty; the application boundary owns identity clearing. No public contract, SDK guard, proxy route, shell implementation, dependency or feature default changed.

## Browser contract/locator reconciliation

The following existing cases retain their behavioral assertions and remain coordinator-run:

| Existing case                                                                                                      | Bounded correction                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| selected conversation reload keeps the exact selector and admitted transcript                                      | Recovered hint includes the exact admitted `runId`; initial issuance remains conversation-only; zero effect requests are explicit.                     |
| a transient stored-session failure keeps the Core conversation, draft and exact retry                              | Recovered/retried hints pin the same run; original bootstrap request ID and exact issuance counts remain; no mutation requests are allowed.            |
| synthetic desktop hard reload recovers positively stored initial input without minting another allocation identity | Before explicit Continue, allocation/admission counts remain one and submit count remains zero. Existing post-click identity/count assertions stay.    |
| disabled owner review makes no memory request                                                                      | Capability presentation uses “Personal memory review unavailable”; held reason, absence of correction controls and zero private reads remain asserted. |
| sign-out removes identity and prevents reads after client navigation                                               | Match the actual status text and exact `/sign-in` link; identity absence and no subsequent reads remain asserted.                                      |
| native discovery pagination/reload                                                                                 | Recovered final hint pins the exact run; filtering, selected URL, mobile discovery and unexpected-request checks remain.                               |

No case, threshold, retry policy or skip was removed or loosened. Browser bodies and browser mutation runs were not attempted in this session; prior Chromium singleton-socket EPERM and failed scoped escalation remain restrictions. The coordinator owns the complete new-head browser comparison.

## Separately identified inherited failures

1. **History first-page fixture:** the real consumer intentionally sends `{}` for the public default first page. The synthetic fixture now uses the published contract's default limit when omitted, while respecting explicit limits and cursors. The existing client filters and pagination assertions are preserved. A direct test invokes the real fixture handler without a browser or network.
2. **Neutral-client locator:** the existing UI uses a `summary` named “Choose client”, not a button named “No client selected”. The fixture assertion now checks that selector and the neutral current-client guidance; no-sample and unexpected-request assertions remain.
3. **Desktop alignment remains OPEN:** the canonical receipt identifies a 4px horizontal deviation for the status-filter menu against a <=3px assertion. Its signed observed coordinate, trigger bounds and resolved font metrics are not in the delivered evidence. Read-only current Figma context at file `IXJzJUkXcUTkySHir5JNea`, node `3067:40882`, menu `3067:41123`, gives x805/y219/width480; the historical test expects x804/y219/width480. This is not verified to be the historical test's design revision. Neither the test anchor/tolerance nor CSS was changed to turn the failure green. The retained trace measurements and intended pinned design revision are required to resolve it.

The inherited fixture/locator changes are a separate commit from the integration corrections. The alignment failure stays visible and blocks qualification as before.

## Verification

Final combined source checks: **72 Meri test files / 929 tests PASS**, zero failed/skipped; full web TypeScript (`tsc --noEmit --incremental false`, 4 GiB heap) PASS; architecture **0 errors / 0 blocking** (539 findings: 521 reviewed and 18 inherited). The final run includes the last Stop-availability correction. Changed-path formatting and whitespace checks PASS; scoped ESLint has 0 errors and one unchanged `_state` unused-variable warning in `run-commands.ts`. Earlier development receipts are separate, not additive:

- Expiry, revoked-recovery and draft-retention: 13/13; session boundary: 6/6.
- Readmission, initial recovery and readiness: 20/20.
- Direct history fixture: 1/1.
- Sixteen targeted mutants killed, with restored sources green: ten readmission/request/queued-continuation/Stop checks; four exact-scope/renewal/navigation checks; two default/explicit pagination checks. The new unit cases each have a detecting mutation. These are source/composition checks, not browser/native/live qualification.

The full source check initially required restoring sixteen missing architecture evidence files from the exact baseline into the sparse checkout. Their bytes and review rules were unchanged. An initial TypeScript check identified the new SDK test fixture's missing required `onAccessLost` callback; the callback was supplied before final validation. No test or gate was disabled for either issue.

## Remaining holds

The prior exact-head production build passes apply to main, PR119 and old PR120 only. This session does not promote them to the new head. Full current-head synthetic browser comparison, production build, standalone-runtime/image/native/live gates and the inherited alignment finding remain with the qualification/release owner. Synthetic retention and unit results do not qualify native revocation, physical retirement, deployed renewal/reopening or provider outcomes. The opt-in live case remains held without separate inputs/authorization.

Core PR108 remains NOT DEPLOYABLE with its nineteen SQL holds and unresolved consumer/collision prerequisites. Workspace PR105's ACL release hold, P2/P1/M1 sequencing and Fable's active-operation boundary remain. No merge, deployment, AWS action, migration or SQL execution occurred. No ticket is declared closed or ship-request issued by this correction.
