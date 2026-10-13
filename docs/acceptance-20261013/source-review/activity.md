# Activity completion review addendum

**PASS — bounded source correction.** `ACTIVITY-REVIEW-01` is resolved in reviewed source; root's focused green replay remains required for verification closure. The earlier checkpoint and its genuine failures are preserved unchanged.

Reviewed helper `activity-completion.ts` SHA256 `1dabaeb2f6c8e24ad8159d468a7be6448127e976a1345dbe663fdaba0b41833f` and hook `activity-mutations.ts` SHA256 `02f1914c10ee48376fd2882bb6c56502fb339a14e0fe42224f386a50e9a2513e`. All nine owner source/test pins match current bytes.

The observer captures the exact identity and activity Query instances. Its synchronous listener permanently retires completion eligibility on authority/current-read loss or query replacement, including an A→B→A round trip. Missing capture is ineligible. It checks again immediately before exact-query invalidation, preventing adoption of another cache generation or descendant feed. Same-actor filter-only row disposal retains its original query/authority and therefore preserves the intended refresh. Nested finally unsubscribes and clears only the captured operation, including invalidation failure. Existing uncertainty/token settlement and explicit current-state review semantics are preserved.

Root's stable before-fix run proves both actor and tenant cases failed at invalidation count **1 versus expected0**, while the same-actor filter control passed. Production was the prior `bbb7a2fc…` on both sides of that run. The three rendered controls/harness remain byte-identical. Ten additional pure cases meaningfully cover exact-scope positive behavior, authority round trips, query generation replacement, missing capture and disposal. They have not been executed by this reviewer; no new green result is claimed here.

The hook's **208-line** responsibility remains cohesive at fingerprint `62da22b035a7877a5e68e1edb4c9a4fec62f497fabc57a5217661ff14ae04714`: it owns one mutation/recovery lifecycle and delegates only completion eligibility to the54-line helper. No generic framework, duplicate transport/schema or second state owner was added. The existing attempt test group's accepted fingerprint is unchanged. No architecture registry changes were made by this reviewer.

All18 original Activity/timeline test/fixture paths remain byte-identical to base. Native endpoints, receipt validators and transport are unchanged. Cache-local source correction is not native authorization or backend idempotency proof; all337 native acceptance rows remain open. No runtime, browser, build, install or source edit was performed.
