# Completed Portfolio shards1/2 — independent addendum

**The581 completed test passes are supported; the outer orchestration failed, and the full1122-case gate remains pending.** This separate supplement leaves the original sealed audit and all producer evidence untouched.

Read-only inspection of raw logs, result JSON, gate receipts, discovery IDs and the two wrapper scripts confirms:

| Evidence | Shard1 | Shard2 |
|---|---:|---:|
| Actual passed test results |283|298|
| Gate receipt child exit |0|0|
| Outer progress process exit |0|120|
| Unexpected/skipped/flaky/runner errors |0/0/0/0|0/0/0/0|
| Retries |0|0|
| Workers |3|3|
| Recorded timeouts |283×30000ms|295×30000ms;3×90000ms|

Both gate receipts independently capture source `93b3617f5d0599f34da373525a96dfc70eaa85d6`, root `871dfd1bf868527c605b0c2e78c83179db3baba2`, application tree `46fb1aae65c1cdc640c965254b947a149e982c17`, empty before/after source diffs and `sourceChanged:false`. Shard2's gate ended at2026-10-13T06:54:41.932862+00:00. Current checkout source is also exact and clean.

The JSON was checked below its aggregate stats: every case expects a pass and has exactly one actual passed result, retry0 and no result errors. The logs independently end with283 and298 passed. All581 IDs are unique, the two sets are disjoint, and every ID occurs in the1122-case discovery. There are541 uncompleted IDs. Discovery is list-only and is not execution evidence.

The discrepancy is between two distinct process layers. `run-gate.py` waits for the actual command, captures `code=p.wait()`, then captures final source, writes the gate receipt, prints the receipt and exits. Its shard2 receipt records the child command's0. `run-portfolio-shards.py` instead records the return code of that gate-wrapper process:120. Its completion condition requires that outer code be0; it therefore saved progress and stopped before starting shard3. The original outer120 must remain FAILED and must not be rewritten as0.

This is an outer wrapper/orchestration failure after the underlying tests produced complete passing evidence. **Its precise cause is not established.** Reported concurrent exec-server/transport disconnects provide context only. No captured exception or diagnostic in the reviewed packet proves a broken pipe, stdout flush failure or any other specific mechanism.

Retaining shards1/2 while resuming only3/4 is preservation-compliant: a later aggregate must cite both the successful underlying receipts and the failed original outer attempt, require unchanged source, verify each remaining shard's complete successful results and receipt, and independently prove the four-way union exactly equals all1122 discovery IDs without duplicate/missing IDs. It must not claim that the original outer run succeeded. No new runtime or test execution was performed for this addendum.

Root additionally reported two supplemental navigation probes attached to a closed5191 host and failed withERR_CONNECTION_REFUSED. Their raw paths were not supplied or independently assessed here. Treat that owner-reported setup failure separately; it establishes no product regression baseline and requires a correctly running host for meaningful replay.

[Verification](VERIFICATION.json) includes every completed test's status/ID and all remaining IDs. [Raw evidence bindings](RAW-EVIDENCE-BINDINGS.json) seal the observed producer bytes. [Outer progress snapshot](OUTER-PROGRESS-SNAPSHOT.json) preserves120. The previous audit's16 files and manifest hash were reverified unchanged. Full Figma/native337/accessibility/musl/image/deployment exclusions remain unchanged.
