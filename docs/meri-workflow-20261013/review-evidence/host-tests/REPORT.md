# Meri host controller and cache journal pure controls

Final result: **19/19 passed**, zero failed or skipped, exit 0, source unchanged during execution. Only `apps/web/tests/meri-action-host.test.ts` was authored for this assignment. No production/shared source, config, dependencies or review registry was changed by this reviewer. No native bootstrap, provider, browser or build execution occurred.

The first run preserved a real canonical-cache-clear defect: 14 passed / 1 failed. Disposing a dispatched old execution wrote its unknown settlement back into a cleared QueryClient. Root corrected the journal to retain the owned Query object identity, refusing writes after canonical removal or replacement. The final existing control proves no cache recreation; a companion proves an old journal cannot overwrite a newly created same-key query. `generation-baseline-*` is an interim **16/16 post-fix green**, not a failing baseline. The companion's evidence is green-only. The original raw failure and the three pre-fix source snapshots remain unchanged.

Final controls cover explicit-only bootstrap; exact captured hints; contradicted client rejection; held bootstrap disposal; StrictMode attach/detach; expiry and validated access-loss removal; same-cache navigation fence; independent QueryClient and all five correlation fields; zero cached credential, task title or proposal fields; and canonical-clear generation safety. Three additional pause/revoke controls prove: unavailable clients cannot connect or dispatch; resumption retains the identical ready port without automatic calls; a receiver-valid held execution returned while paused cannot publish success and remains unknown after resumption; revocation removes ready state, aborts authority and clears its expiry timer.

`final-receipt.json` binds every shared Meri source file read by the run plus fixtures/config/test bytes before and after. `final-source/` preserves the exact final bytes. `SOURCE-BINDING.json` separately verifies the two previously sealed transport/session tests and their packet manifest are unchanged. ESLint passed; formatting was unchanged. The canonical source-only scanner reports three author-review signals (module 431 nonblank lines; explicit-lifetime group 142; cache-journal group 119), with cohesive responsibility rationales in `STRUCTURE-REVIEW-PROPOSAL.json`. Root independent size review remains necessary; there is no guard waiver.

Exact key hashes:

- Host tests: `e1939e567697a279330f1c1f2568af0ab4fa25d4a2f05019b2082723014fe068`
- Host controller: `031c98f9dfdba27ecd42512cee985dc05461dda5ea64d8d7738468f8df354eb3`
- Query journal: `8249df4b758ef20b7bc83776555eea5639c8f1a15cd6a13d4ea40b5fe62be171`
- Workflow adapter: `1d35e9a68d713bd1088d4141aaead81d0d5d0a5ceb8371736feed5f568abe458`

Evidence index: `RUN-INDEX.json`, `initial.log` / `initial-results.json`, `generation-baseline.log` / `generation-baseline-results.json`, `final.log` / `final-results.json`, `final-receipt.json`, `SOURCE-BINDING.json`, `checks.json`, `structure-scan.json`, and `STRUCTURE-REVIEW-PROPOSAL.json`. This is bounded synthetic behavior evidence, not native authorization, browser integration, deployment or full-suite acceptance. No unresolved behavioral failure remains in these 19 controls.
