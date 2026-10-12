# Portfolio handover — 12 October 2026 UTC

**Start with [HANDOVER.md](HANDOVER.md).** This is the complete continuation handoff, including the phased work, all current limits, exact commits, native/Figma references and coordination decisions. Portfolio remains unfinished: **337 in-scope rows are open and signed-in acceptance has not occurred**.

## Published source and review

| Item | Value |
| --- | --- |
| Repository and branch | `neo-capiro/capiro-frontend`, `codex/portfolio-continuation-20261011` |
| Preservation PR | [Draft PR #6](https://github.com/neo-capiro/capiro-frontend/pull/6), open and unmerged |
| Published product source | `abaeab37b36d60b3e5185755e1b2c9169d7c92f3` |
| Exact matching local source | `760dcc6c1179312c7f4b762e64cf3af1aad60c3e`, 33 local commits after base `02c02d95bdf3949662b9123f425271c6491ffdab` |
| Product tree | `46417a01484727747b0a2d81b3b4f278285cb709` |
| Handover content publication | [PUBLICATION.json](PUBLICATION.json), exact local/remote trees and readbacks |
| Current source check | [Verification summary](VERIFICATION-SUMMARY.json): 998 Portfolio + 32 foundation + 21 transport cases; types, lint, formatting, pins and architecture passed |
| Unrun at final source | Full build, actual standalone production/browser run, complete browser regression and signed-in hosted acceptance |

The source snapshot and original local commit history have different remote/local commit IDs. Exact tree equality is recorded. Recover original history through the qualified **base-dependent** bundle and [history instructions](history/README.md); the earlier all-refs attempt remains historical.

## Complete context and how to recover it

[REFERENCE-INDEX.md](REFERENCE-INDEX.md) indexes every canonical Markdown context document and all worktree/evidence roots. [SOURCE-INVENTORY.json](SOURCE-INVENTORY.json) records all 1,184 files at the product checkpoint. The complete context packet preserves **35,264 original paths**, including source snapshots, raw failed and passing test evidence, ignored work/test-results, screenshots, traces, Figma/native readbacks, the original workbook, branch/status/diff metadata and review addenda. Runtime dependencies/binaries, caches, Git administrative data and credential stores are explicitly excluded.

Read [CONTEXT-DELIVERY.md](CONTEXT-DELIVERY.md) and [CONTEXT-PRESERVATION-RESULT.md](CONTEXT-PRESERVATION-RESULT.md). The GitHub connector's request limit requires the unchanged large manifest and two large packs to be carried as exact parts. Materialize a new packet first, then verify it against the trusted original manifest hash:

```sh
# Run from this handover directory in the cloned repository.
# Use new absolute directories whose parents already exist.
python3 tools/prepare_context.py . --target /absolute/new-capiro-context
python3 tools/verify_context.py /absolute/new-capiro-context \
  --expected-manifest-sha256 c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575 \
  --history-bundle history/portfolio-continuation-760dcc6-requires-02c02d9.bundle
python3 tools/restore_context.py /absolute/new-capiro-context \
  --target /absolute/new-capiro-workspace \
  --expected-manifest-sha256 c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575 \
  --history-bundle history/portfolio-continuation-760dcc6-requires-02c02d9.bundle
```

Restored working copies are context, not permission to overwrite a current branch. The tools refuse existing destinations and unsafe paths. Preserve original failures and stale snapshots as historical evidence; do not reinterpret them as current acceptance. The original scan's two flagged approval-prose candidates are addressed by [root's exact disposition](receipts/credential-scan-disposition.json), without altering the raw scan.

[DELIVERY-INVENTORY.json](DELIVERY-INVENTORY.json) records the final handover files and exact byte hashes. `DIRECT-ARTIFACTS.json` remains the initial 29-file preparation receipt. Files under `history/`, including the prepublication draft and packs-only delivery attempt, retain their original chronology and superseded fields. The operational recovery tools are the three commands above; absolute-path integration/packaging scripts are preserved provenance and must not be run blindly in a new workspace.

## Immediate next work

1. Reproduce and correct the Intel Watchlist accepted-projection gap, preserving valid normalization/partial outcomes and current-client guards. See the [OPEN review](reviews/watchlist-accepted-projection-REVIEW.md).
2. Apply and qualify the bounded PhoneVerification requested-state copy correction against Figma.
3. Update the old Core 404 browser assertion to require the visible disabled Configure entry, keeping its unavailable reason and zero Intel calls.
4. Pin the corrected combined source and run the required build, actual production smoke and complete browser gates before continuing row-level acceptance.

## Concurrent application integration and deployment

Preserve the [proposed shared integration contract](../../SHARED-INTEGRATION-CONTRACT-2026-10-12.md). The goal is one `apps/web` build: Portfolio at `/`, Meri at `/meri`, Modules at `/modules`, plus Settings. Current route/auth/client-scope mismatches are explicit in HANDOVER.md. Portfolio/root is the **proposed** common-shell owner pending Meri/Modules reconciliation.

Refresh **Meri draft PR #4** before integration; its last read was `3cc30ff3182e8050d563516607866cf07efe2aef`. PR #1 is preserved within that consolidation and must not be applied again. Modules/Settings' current contribution remains an incoming handoff. Keep Portfolio/Modules business records in existing `capirov2` services and Meri execution/control in `meri-greenfield`, through approved public contracts and the existing database/institutional-knowledge boundaries.

The intended shared preview remains `https://portfolio-preview.app.capiro.ai/`; its current AWS/DNS/Clerk state was not revalidated here. **No merge, deployment, AWS resource change, new credential flow or live provider/customer action is authorized by this handover publication.** Follow the existing holds and exact source/archive/build/image/task release chain in the handover.
