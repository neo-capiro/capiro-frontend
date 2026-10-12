"""Complete the current handover from frozen preservation receipts, without product edits."""
from pathlib import Path
import hashlib
import json
import shutil
from datetime import datetime, timezone

WORKSPACE = Path('/workspace/scratch/158b6018a5d3')
PREP = WORKSPACE / 'handover-preparation'
REPO = WORKSPACE / 'capiro-frontend-portfolio'
DEST = REPO / 'docs/portfolio-31/handover-2026-10-12'
MANIFEST_SHA = 'c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')

def copy_exact(source, relative):
    target = DEST / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and digest(target) != digest(source):
        raise RuntimeError(f'Refusing conflicting destination: {relative}')
    if not target.exists():
        shutil.copy2(source, target)
    assert digest(source) == digest(target)

manifest_path = PREP / 'context/manifest.json'
assert digest(manifest_path) == MANIFEST_SHA
manifest = json.loads(manifest_path.read_text())
raw_scan = PREP / 'context/metadata/credential-scan.json'
extra_scan = PREP / 'context/metadata/ignored-context-credential-scan.json'
initial = json.loads(raw_scan.read_text())
extra = json.loads(extra_scan.read_text())
assert len(initial['findings']) == 2 and not initial['coverageLimits']
assert not extra['findings'] and not extra['coverageLimits']
reviewed = WORKSPACE / 'capiro-portfolio-alert-channels/outputs/evidence/alert-channels-20261012/watchlist-caller-prerequisite.json'
assert digest(reviewed) == 'deb6127073d2506559f5073de8c415fd9379ebd2464e4f9e3badfe85f5e82c9e'
assert json.loads(reviewed.read_text())['authorization'] == 'root approved sole excluded local backend prop prerequisite; P2 owns final caller'
write_json(DEST / 'receipts/credential-scan-disposition.json', {
    'recordedAt': datetime.now(timezone.utc).isoformat(),
    'contextManifestSha256': MANIFEST_SHA,
    'rawScans': [
        {'path': 'context/metadata/credential-scan.json', 'sha256': digest(raw_scan), 'candidateCount': 2, 'coverageLimitCount': 0},
        {'path': 'context/metadata/ignored-context-credential-scan.json', 'sha256': digest(extra_scan), 'candidateCount': 0, 'coverageLimitCount': 0},
    ],
    'reviewedFile': str(reviewed.relative_to(WORKSPACE)),
    'reviewedFileSha256': digest(reviewed),
    'disposition': 'Root inspected the exact source field. Both original candidates are the same non-credential approval prose, once inside the archive member and once in the enclosing decompressed tar. The supplemental ignored-context scan has no additional candidates. No credential value was identified in the flagged field; original bytes and raw scan dispositions remain unchanged.',
    'limits': 'This records a finite format/context scan and review of its findings, not a guarantee against every possible secret format. Runtime credential stores were excluded; no credential or network validation was performed.',
})
copy_exact(PREP / 'credential-scan-disposition-initial.json', 'receipts/credential-scan-disposition-initial.json')
copy_exact(PREP / 'process-closure.json', 'receipts/process-closure.json')
copy_exact(REPO / 'outputs/evidence/portfolio-shared-integration-20261011/portable-evidence-selection.json', 'receipts/historical-portable-evidence-selection.json')
copy_exact(PREP / 'context-pack-upload-plan-final.json', 'receipts/context-pack-upload-plan-final.json')

handover = DEST / 'HANDOVER.md'
body = handover.read_text()
replacements = {
    'ROOT_FILL_FINAL_DELIVERY_COMMIT': '[PUBLICATION.json](PUBLICATION.json) records the verified handover content commit and exact local/remote tree mapping. The PR head may be a later receipt-only commit; refresh it before restarting.',
    'ROOT_FILL_ARCHIVE_PATH_SIZE_SHA256': '[CONTEXT-DELIVERY.md](CONTEXT-DELIVERY.md), context/ and context-parts/ reconstruct the immutable packet: 166 packs, 330,942,983 compressed pack bytes. Each pack SHA-256 is pinned by the original manifest; delivery-part hashes are in context-delivery.json.',
    'ROOT_FILL_CONTEXT_INVENTORY_PATH_SHA256_AND_EXCLUSIONS': 'Materialized context/manifest.json; SHA-256 c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575; 35,264 paths across 14 worktrees, 9,729 distinct byte blobs, 202 metadata files. Explicit exclusions: dependency/runtime binaries, caches, Git administration, credential stores and recursive handover output. See REFERENCE-INDEX.md and CONTEXT-PRESERVATION-RESULT.md.',
    'ROOT_FILL_SELECTED_EVIDENCE_MANIFEST_PATH_SHA256': '[Historical 62-item selection](receipts/historical-portable-evidence-selection.json), SHA-256 d3b30b8a28999d29426cd224ba1b060b7915922722b8c6335afe8326dfac07d3. Later additive selections are preserved proposals, not applied. The complete context packet covers the later lane evidence and separate OPEN review. The four-gate release-verification assembler was not run.',
    'ROOT_FILL_IF_UPDATED_OTHERWISE_RETAIN_75409A9_AND_85_ROWS_19_GROUPS': 'Unchanged canonical reconciliation JSON, SHA-256 c669cd613e9dcab38b93016de5ff6a61ae32155556949b76be0ab639f1551bd8: source 75409a9, 85 rows with additive evidence in 19 overlapping groups; 337 open / 7 pending exclusions / 1 owner exclusion / 0 accepted. New CORE-109/Watchlist/alert groups remain preserved proposals.',
    'ROOT_FILL_ROOT_CLOSURE_RECORD_AND_ANY_INTENTIONAL_PREVIEW': '[Process/port receipt](receipts/process-closure.json), recorded 2026-10-12T01:43:00Z: explicit loopback bind on 5191 succeeded and closed; no active task Node/browser runners; no product preview intentionally left running; no process was killed.',
    'The final documentation/context commit and its inventory receipts are the remaining delivery fields for the integration owner.': 'The complete documentation/context delivery accompanies this source. Its publication receipt, original context manifest anchor and restoration instructions below distinguish preserved source from final acceptance.',
    'The latest ledger snapshot read for this draft describes product source 75409a9 with additive source evidence for 85 rows in 19 overlapping groups; root will record any later additive reconciliation without altering the original packet fields or acceptance counts.': 'The unchanged canonical ledger describes product source 75409a9 with additive source evidence for 85 rows in 19 overlapping groups. Later CORE-109, Watchlist and alert additions remain explicitly preserved proposals; this publication does not rewrite the original packet fields or acceptance counts.',
    'All available local continuation history is being preserved.': 'All available local continuation history is preserved in the qualified bundle and its separate historical predecessor.',
    'The final context inventory and archive receipt are added by the integration owner while packaging completes.': 'The complete context inventory, verification result, credential-scan disposition and delivery reconstruction receipt accompany this document. Read CONTEXT-DELIVERY.md before running the original verifier: the unchanged large manifest and two oversized packs are represented by exact transport parts in GitHub.',
    'Root must complete the final session/process inventory in the publication table.': 'The root process/port receipt in the publication table records no active task Node/browser runners and an explicitly released port 5191.',
    'The full context inventory supplied by root must map local locations below into the archive and distinguish source, immutable snapshots, raw evidence, native/Figma reference bytes and instruction context.': 'The full context inventory maps every selected original path below into exact byte blobs and distinguishes source, immutable snapshots, raw evidence, native/Figma reference bytes and instruction context.',
    'Its independent review is in the same evidence directory. The OPEN preservation addendum remains separate and must also travel.': 'Its independent review is directly preserved at reviews/alert-channels-independent-review-20261012.json. The OPEN preservation addendum is preserved separately at reviews/watchlist-accepted-projection-REVIEW.md and reviews/watchlist-accepted-projection-review.json, and its original context path is included in the archive.',
    'Before publishing this document as the final new-session entry, fill the publication table with actual remote readbacks, tree-equivalence proof, bundle and context archive hashes. Update only the current summary fields that final evidence supports; preserve older failed attempts and historical source/authority records. Verify that archive inventories include both final Tracker freezes and the separate OPEN finding/copy addendum.': 'The publication table and PUBLICATION.json bind the actual GitHub source and handover trees, history bundle, full context and exact verification receipts. Both final Tracker freezes and the separate OPEN finding/copy addendum are included. Earlier failed attempts and historical source/authority records remain preserved. The context manifest, all 166 packs, all 9,729 byte blobs, 202 metadata files and the qualified history bundle passed full verification. The published split representation was separately reconstructed and checked against the unchanged original packet.',
}
for old, new in replacements.items():
    if old not in body:
        raise RuntimeError(f'Missing expected handover preimage: {old[:100]}')
    body = body.replace(old, new)
assert 'ROOT_FILL_' not in body
handover.write_text(body)

index = DEST / 'REFERENCE-INDEX.md'
text = index.read_text()
text = text.replace('The `context/` package preserves selected original paths relative to `/workspace/scratch/158b6018a5d3`.', 'The immutable packet preserves **35,264 original paths across 14 worktrees**, relative to `/workspace/scratch/158b6018a5d3`, through **9,729 exact byte blobs, 166 packs and 202 metadata files**. The original manifest SHA256 is `c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575`. Read [CONTEXT-DELIVERY.md](CONTEXT-DELIVERY.md) first: GitHub stores the large manifest and two large packs as exact transport parts. `tools/prepare_context.py` reconstructs a new complete packet without changing the repository; then run the unchanged verifier/restorer.')
text = text.replace('All worktree `outputs/` roots are included, including archives outside `outputs/evidence/`.', 'All worktree `outputs/` roots are included, including archives outside `outputs/evidence/`. The final union also preserves ignored `apps/web/work/` evidence in seven worktrees and `apps/web/test-results/` artifacts in eleven worktrees; these added 3,832 paths while leaving every initial source/pack byte unchanged.')
text = text.replace('through760dcc6', 'through 760dcc6').replace('base02c02d95', 'base 02c02d95').replace('Its26 refs', 'Its 26 refs').replace('all13 recovered', 'all 13 recovered').replace('all33 root', 'all 33 root')
index.write_text(text)

readme = '''# Portfolio handover — 12 October 2026 UTC

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
python3 tools/verify_context.py /absolute/new-capiro-context \\
  --expected-manifest-sha256 c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575 \\
  --history-bundle history/portfolio-continuation-760dcc6-requires-02c02d9.bundle
python3 tools/restore_context.py /absolute/new-capiro-context \\
  --target /absolute/new-capiro-workspace \\
  --expected-manifest-sha256 c23fb2a329d4a6c314ef41bec572603049e2601168579b86d2dd94bba4aa2575
```

Restored working copies are context, not permission to overwrite a current branch. The tools refuse existing destinations and unsafe paths. Preserve original failures and stale snapshots as historical evidence; do not reinterpret them as current acceptance. The original scan's two flagged approval-prose candidates are addressed by [root's exact disposition](receipts/credential-scan-disposition.json), without altering the raw scan.

## Immediate next work

1. Reproduce and correct the Intel Watchlist accepted-projection gap, preserving valid normalization/partial outcomes and current-client guards. See the [OPEN review](reviews/watchlist-accepted-projection-REVIEW.md).
2. Apply and qualify the bounded PhoneVerification requested-state copy correction against Figma.
3. Update the old Core 404 browser assertion to require the visible disabled Configure entry, keeping its unavailable reason and zero Intel calls.
4. Pin the corrected combined source and run the required build, actual production smoke and complete browser gates before continuing row-level acceptance.

## Concurrent application integration and deployment

Preserve the [proposed shared integration contract](../../SHARED-INTEGRATION-CONTRACT-2026-10-12.md). The goal is one `apps/web` build: Portfolio at `/`, Meri at `/meri`, Modules at `/modules`, plus Settings. Current route/auth/client-scope mismatches are explicit in HANDOVER.md. Portfolio/root is the **proposed** common-shell owner pending Meri/Modules reconciliation.

Refresh **Meri draft PR #4** before integration; its last read was `3cc30ff3182e8050d563516607866cf07efe2aef`. PR #1 is preserved within that consolidation and must not be applied again. Modules/Settings' current contribution remains an incoming handoff. Keep Portfolio/Modules business records in existing `capirov2` services and Meri execution/control in `meri-greenfield`, through approved public contracts and the existing database/institutional-knowledge boundaries.

The intended shared preview remains `https://portfolio-preview.app.capiro.ai/`; its current AWS/DNS/Clerk state was not revalidated here. **No merge, deployment, AWS resource change, new credential flow or live provider/customer action is authorized by this handover publication.** Follow the existing holds and exact source/archive/build/image/task release chain in the handover.
'''
(DEST / 'README.md').write_text(readme)
print(json.dumps({'handoverBytes': handover.stat().st_size, 'handoverSha256': digest(handover), 'referenceIndexSha256': digest(index), 'readmeSha256': digest(DEST / 'README.md'), 'manifestSha256': MANIFEST_SHA}, indent=2))
