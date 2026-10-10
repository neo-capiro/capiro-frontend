# Frontend guard repair independent recheck

Outline before checks: review exact `5016b0dce5c28d867a5052a649a92c535baee8e5` above `6ebc3e3351c2c56f31eb72c8c1fd79476f3d3c72` in this dedicated review worktree. Scope is the seven-path guard/report repair closing the three findings in `d8f97150b9a493826d13b87386394a888c7b8740`. Inspect both focused modules and their added cases, re-run only the exact nine independent controls, verify both original report byte relations, and corroborate the author's bounded evidence as DATA. No full canonical/build/browser replay or UI/client source acceptance.

## Decision

PASS for closure of the three scoped findings. No remaining blocker was found in this repair. Parent owns repository integration and gate acceptance; this review supplies no runtime, security, Home visual or G1 grant.

The architecture change adds a containing `apps/<app>`/`packages/<package>` owner check after actual relative resolution. Both previously accepted cross-owner edges now produce a refusal. Existing same-owner resolution, feature/cycle rules and public-export behavior remain. The added two architecture declarations cover both directions through import, re-export and literal dynamic import, and separately preserve same-owner/public paths.

The artifact checker now validates ordinary record shape, own data fields and primitive filename/commit/hash types before artifact reads. It validates the whole list into primitive snapshots before invoking the reader. The three added package-checker declarations cover coercible/nonstring fields, malformed and late-invalid records with zero reads, and a reader mutating a later input. This closes the array commit finding without claiming arbitrary hostile Proxy safety. Public signature, bytes/hash verification and CLI remain unchanged.

Both author reports exactly equal their binary Git blobs at `45c70daa1f525df04562d7a05b171150d003fdfb`, with the single original63-character ASCII lock hash replaced by its measured64-character value and an independently fixed literal ASCII appendix. Every other original byte is preserved, including Unicode. Original/corrupted/intermediate evidence and the failed earlier restoration assumption remain retained. No historical result is reclassified or erased.

## Actual independent evidence

Dedicated worktree `C:/dev/main/capiro-frontend-worktrees/frontend-guards-review`, branch `review/frontend-guards-repair`. I read standards, the prior findings, both complete guard modules/tests and the candidate report/diff. Exact parent and seven-path scope were checked. All seven current candidate files match rawGit; all101 protected current files match their retained records, actual candidate tree OIDs and recomputed raw Git blob OIDs. Root package/lock, app/CSS, UI/client implementations and public archives are unchanged by this candidate.

I copied the exact original2407-byte witness without changing its assertions or fixtures: SHA256 `fbe7eca831fe9202722a3a4644f453183cf4c2adbe62675956cd52a4240858d8`. Its nine controls ran once against the repaired production scripts: **9PASS**, including all three former failures. The raw915-byte result SHA256 is `8ee3bf8061f8ec4c319741c86a91954ce598e851d5aa47882a830f3cebc0736a`. The previous964-byte output with three failures remains unchanged in the earlier review.

Actual architecture and public-artifact CLIs each ran once: both exit0/empty stderr. Architecture has no current errors/review signals; both accepted public archives retain exact byte/hash bindings. All three direct children use explicit argv, shell:false, a replacement environment and15s bounds. Durations were0.407s witness,0.250s architecture and0.063s artifact check. All108 scoped source files plus Node and the selected TypeScript metadata/entry remained exact before/after. Borrowed dependencies remain an explicit read-only junction to the integration owner's tree; they were not disposed or changed.

No canonical10/12/21/15, application build/browser or unchanged passing suite was replayed. DATA inspection of the author's three binary envelopes corroborates its **12 focused script tests**, architecture and artifact CLI, each exit0/empty stderr/source-runtime stable. Those12 exclude the three unchanged app fixtures; they are not misreported as a full root suite replay here.

The author manifest SHA256 `7a9b309537e4a24b645ed2a2076ae72abb6a8c9e3470e63dbc6e65ffcccb7777` and all41 declared evidence payloads were remeasured. Main corroboration completed172 explicit comparisons with no discrepancy. Supplemental DATA binds all101 candidate tree/current blob identities and the three author envelopes. This validates retained execution facts; it is not an independent execution of those suites.

## Preserved failures and limits

My first DATA reader used the wrong manifest field `readonly` rather than `readonlyRawGitCurrent` and stopped before any Node command. The original script and traceback remain; v2 changes only that field name at three occurrences. All actual Node commands still ran once. A later display-only Python command failed encoding a checkmark to its Windows console after reading author envelopes; no candidate/check rerun followed. An exploratory report filename was absent and corrected. These are reviewer instrumentation failures, not source defects or passing candidate claims.

Evidence is in this worktree's ignored `.task-inputs/guard-review-1/`: `result.json`170586bytes/SHA256 `bf67e0204e0036c8b7e1614eef0c473b3e6b8de28b837ee12045a69fa4331c8c`; `data-supplement.json`13672bytes/SHA256 `4041f7d01938de7f38f498129d397237f2cc2e25001130d72592817b0cac64bb`; raw candidate tree13077bytes/SHA256 `8a66a49415fab81b8966ac6e61b2cfe897e39be6fab194f6eb3a223d0c3bc56e`. The local final manifest binds these records and the report without including itself.

The guards support ordinary source/manifest data in a trusted local checkout. Direct-child bounds and a post-completion2MiB cap do not prove OS network containment, descendant cleanup, hostile filesystem safety or full installed dependency integrity. No install, server, browser, cloud/provider/Hermes, source access, backend deletion or current Capiro action occurred. Parent's separate responsive repair and ongoing refreshed Figma acceptance retain their own evidence and decisions. CLOSED; only this new report is committed.
