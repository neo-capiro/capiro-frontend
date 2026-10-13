# Frozen83 ENOSPC failure and continuation audit

**Initial Portfolio qualification remains FAILED due to one infrastructure ENOSPC result. Recovery is PENDING.** Shard1 passed285 cases; shard2 passed297 and failed one, with child gate exit1. Retaining completed individual passes is supported; relabelling shard2 as a passing gate is not.

Both completed gate receipts bind unchanged commit `83f54f5ac0107822833adbbfef2b453e0240bc56`, root `760b05a7a7feacee16815da2767cb83dbb600d95`, application tree `67f821a13c8470ceeb5222eb89d43cea58b1a8c8`, with empty before/after source diffs. They used two workers, configured retries0 and default30000ms. The discovery has1139 unique IDs. The completed shards contain583 disjoint discovered IDs:582 actual passes and one failed/incomplete case;556 IDs remained unrun at the original stop. Top-level reporter`errors:[]` does not erase the failed case's own errors.

## Exact failed case

- `mail-rich-compose.spec.ts:267`, “keyboard formatting and mobile toolbar remain reachable”.
- ID`23d8565415e63e119d0c-89fa0e1fae3f9fed8d24`.
- Attempt began2026-10-13T08:16:44.821Z, duration5018ms, retry0.
- Failure is`ENOSPC: no space left on device, mkdir` at line290, where`test.info().outputPath("mobile-rich.png")` creates the requested artifact directory. This occurs while evaluating the screenshot arguments, before calling`page.screenshot`.
- Original shard2 gate ended2026-10-13T08:18:27.786577+00:00, exit1. The outer orchestrator also recorded1 and stopped before shard3; this differs from frozen93's outer120/child0 event.

The attached trace exists:411258bytes,24 entries, valid ZIP integrity. Its embedded test source exactly matches the frozen test. Trace steps show the bold content, four focus checks and all toolbar horizontal bounds completed without error. There are zero browser screenshot calls. Requested`mobile-rich.png` and`error-context.md` are absent. The final unexpected-request assertion at line292 was not reached. Thus this is an artifact-path storage failure, with no product assertion failure shown, but the whole case has not passed. The trace is not truncated and should be preserved.

[Failed case](FAILED-CASE.json), [trace inspection](TRACE-EVIDENCE.json), [source-bound receipts](VERIFICATION.json) and [original failed progress](ORIGINAL-FAILED-PROGRESS.json) retain these distinctions.

## Truthful continuation and aggregate

Root is continuing only the unrun shards3/4 and then running the unchanged affected case separately after reclaiming storage. This reviewer launches no commands for that work.

A reconciled result can be accepted only after proving:

1. Shards3/4 complete successfully on identical frozen source, tests, fixtures, timeout and retry settings; their IDs are disjoint from the583 already attempted and complete the exact1139-ID discovery.
2. The separately named rerun contains only the original failed ID, has one actual passed result, and completes both screenshot creation and the final request-ledger assertion. Bind its source and raw receipts explicitly.
3. Original shard2 exit1, the ENOSPC errors and trace remain immutable. Record the rerun as another attempt instead of rewriting or dropping the original failure.

If those conditions hold with no further failures, report **1139 unique cases successfully covered after one separately documented infrastructure rerun**. The four original shards would contain1138 passed cases plus one ENOSPC failure; adding the targeted pass gives1140 actual executions across1139 unique cases. The original shard2 remains failed. Do not claim four passing shards, an uninterrupted1139/1139 first pass, or no re-execution. Configured Playwright retries0 and one deliberate infrastructure rerun are compatible facts and should both be stated. No product fix is established by restoring artifact storage.

## Owned storage candidates; no deletion

[Complete cache inventory](OWNED-CACHE-INVENTORY.json) records every relative filename, SHA256, byte count and mode for eight old owner-generated Vite cache directories. They contain373 regular files totaling118457603bytes; no symlinks or special files were found. Browser traces/screenshots, raw JSON/logs, Figma material, source snapshots and reports are excluded.

| Location | File bytes | Reclaims which mount |
|---|---:|---|
|`/workspace/capiro-preserved-evidence-storage/profile/vite-cache`|26646516|workspace|
|`/tmp/capiro-p1-files/vite-cache`|13122509|tmp|
|Six`/tmp/capiro-next-delete-evidence/vite-cache-*` directories|78688578|tmp|

These are historical generated caches from previously released owner servers, not the active83 fixture/build graph. They are **archive candidates**, not already verified-retirable directories. Root should archive the selected exact directories, reopen and verify every recorded byte/mode/link target, preserve the archive and a relocation/retirement receipt, and only then retire expanded copies. No deletion or archive creation was performed here.

The six Delete caches share40 identical generated files each. Their`deps/_metadata.json` files differ and must be retained. [Duplicate comparison](OWNED-CACHE-DUPLICATES.json) explicitly rejects a full-directory identity claim. Freeing tmp does not directly free workspace; mount-aware placement is required. Other large inspected owned directories contain unique historical evidence and are not proposed for deletion.

Root's already-created inactive93 runtime archive was independently hashed:62949896bytes, SHA256`443dc6e8b57d090f031800ec14a4ee0659646cbd962d16f7c67f58d78d823487`, matching its receipt. That receipt reports5010 regular files/two links verified before retirement. This review did not independently compare the now-retired originals and does not imply it did.

## Limits

This is a bounded read-only source/result/trace/storage audit. No source, existing evidence, tests, browser, build, install or server was changed or executed. No storage was deleted. Fresh full qualification remains pending; native337/Figma/accessibility/musl/image/provider/deployment limits remain unchanged. A later separate addendum can reconcile completed continuation evidence without altering this failed-attempt record.
