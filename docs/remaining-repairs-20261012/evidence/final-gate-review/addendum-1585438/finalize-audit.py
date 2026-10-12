"""Finalize only from completed receipts; no runtime or gate execution."""
import copy
import datetime
import hashlib
import json
import pathlib
import stat
import subprocess
import zipfile

O = pathlib.Path(__file__).parent
E = pathlib.Path('/tmp/capiro-remaining-qualification/final-1585438')
ROOT = pathlib.Path('/workspace/capiro-remaining')
HEAD = '1585438295776604f23a5cb5ab592729f7c468ca'
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat()
def js(p): return json.loads(p.read_text())
def sha(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''): h.update(chunk)
    return h.hexdigest()
def rec(p): return {'path': str(p), 'bytes': p.stat().st_size, 'sha256': sha(p)}
def git(*args): return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True).strip()
def flatten(d):
    rows = []
    def walk(suites):
        for suite in suites:
            for spec in suite.get('specs', []):
                for t in spec.get('tests', []):
                    rows.append({'file': spec['file'], 'line': spec['line'], 'title': spec['title'], 'status': t['status'], 'timeoutMs': t['timeout'], 'attempts': [{'status': a['status'], 'retry': a['retry'], 'durationMs': a['duration']} for a in t['results']]})
            walk(suite.get('suites', []))
    walk(d['suites'])
    return rows

assert git('rev-parse', 'HEAD') == HEAD
assert git('diff', '--name-only') == git('diff', '--cached', '--name-only') == ''
final_status = git('status', '--short').splitlines()
allowed_publication_drafts = {'?? docs/remaining-repairs-20261012/.gitattributes', '?? docs/remaining-repairs-20261012/HANDOVER.md', '?? docs/remaining-repairs-20261012/QUALIFICATION.md'}
assert set(final_status).issubset(allowed_publication_drafts)
for item in js(O / 'preliminary-inventory.json')['files']:
    p = O / item['path']
    assert p.stat().st_size == item['bytes'] and sha(p) == item['sha256']
base = js(O / 'preliminary-report.json')
for item in base['sourceRecords'] + base['evidenceRecords']:
    p = pathlib.Path(item['path'])
    assert p.stat().st_size == item['bytes'] and sha(p) == item['sha256']
identity = base['source']
for key, ref in [('rootTree', 'HEAD^{tree}'), ('applicationTree', 'HEAD:apps/web'), ('runtimeSourceTree', 'HEAD:apps/web/src')]:
    assert git('rev-parse', ref) == identity[key]

results = {}
new_evidence = []
new_gates = []
for name, count, workers in [('modules-browser', 208, 1), ('portfolio-browser', 1118, 3)]:
    result_path, receipt_path = E / (name + '-results.json'), E / (name + '-exit.json')
    d, receipt = js(result_path), js(receipt_path)
    assert receipt['sourceBefore'] == receipt['sourceAfter'] and not receipt['sourceChanged'] and receipt['exitCode'] == 0
    assert receipt['sourceBefore'] == {'head': HEAD, 'tree': identity['rootTree'], 'applicationTree': identity['applicationTree'], 'sourceDiff': ''}
    rows = flatten(d)
    assert len(rows) == count and all(t['status'] == 'expected' and len(t['attempts']) == 1 and t['attempts'][0]['status'] == 'passed' and t['attempts'][0]['retry'] == 0 for t in rows)
    assert d['stats']['expected'] == count and all(d['stats'][k] == 0 for k in ['unexpected', 'skipped', 'flaky']) and not d['errors']
    assert d['config']['workers'] == workers and all(p['retries'] == 0 and p['repeatEach'] == 1 and p['metadata']['actualWorkers'] == workers for p in d['config']['projects'])
    result = {'stats': d['stats'], 'recordCount': len(rows), 'attemptCount': sum(len(t['attempts']) for t in rows), 'workers': workers, 'retries': 0, 'records': rows, 'exitReceipt': receipt, 'resultRecord': rec(result_path)}
    results[name] = result
    new_evidence += [rec(result_path), rec(receipt_path), rec(E / (name + '.log'))]
    new_gates.append({'name': name, 'status': 'passed', 'receipt': rec(receipt_path), 'raw': receipt, 'log': rec(E / (name + '.log'))})
assert results['portfolio-browser']['resultRecord']['sha256'] == 'df511e86bf2b7e32102716d7509bff264b1a4fe8b51c48f1867fb3ecb88aa68f'
summary_path = E / 'PORTFOLIO-FINAL-SUMMARY.json'
summary = js(summary_path)
assert summary['source'] == HEAD and summary['statistics'] == results['portfolio-browser']['stats']
assert summary['testCount'] == summary['attemptCount'] == 1118 and summary['attemptStatuses'] == {'passed': 1118}
assert summary['retryValues'] == [0] and summary['fullSuiteCompleted'] and summary['sourceUnchanged'] and summary['server5191Closed']
assert summary['resultsSHA256'] == results['portfolio-browser']['resultRecord']['sha256']
overrides = [t for t in results['portfolio-browser']['records'] if t['timeoutMs'] != 60000]
assert len(overrides) == 4 and all(t['timeoutMs'] == 180000 for t in overrides)
for file in {t['file'] for t in overrides}:
    rel = 'apps/web/tests/browser/' + file
    assert git('rev-parse', HEAD + ':' + rel) == git('rev-parse', 'adbc84b2251fe6b06cb7f75030026fba5b4ff498:' + rel)
new_evidence.append(rec(summary_path))

# Verify the sealed independent archive review, stream the archive hash again,
# and cross-check all recorded member identities to Git and the owner's receipt.
# The profile reviewer performed the full decompressed member/CRC comparison;
# this audit does not repeat extraction or represent those operations as its own.
archive_review_root = pathlib.Path('/tmp/capiro-remaining-profile-evidence/source-archive-1585438-review')
manifest_path = archive_review_root / 'MANIFEST.json'
assert sha(manifest_path) == '03a5b364bfc3c3c342694e53606b79694a24e0912fd7cdc031f3d73fd9ae7274'
manifest = js(manifest_path)
for item in manifest['files']:
    p = archive_review_root / item['path']
    assert p.stat().st_size == item['bytes'] and sha(p) == item['sha256']
archive_review = js(archive_review_root / 'REVIEW.json')
assert archive_review['status'] == 'PASS' and archive_review['source'] == HEAD and archive_review['failures'] == []
archive = pathlib.Path(archive_review['archive'])
assert not archive.is_symlink() and archive.stat().st_size == 841126268
archive_hash = sha(archive)
assert archive_hash == archive_review['archiveSHA256'] == '0feb5ef3a18f4dffa872da5f733bb16eede65c8e2d3f25c0d13c136d4985bff1'
owner_receipt_path = pathlib.Path(archive_review['ownerReceipt'])
owner = js(owner_receipt_path)
assert sha(owner_receipt_path) == archive_review['ownerReceiptSHA256']
assert owner['commit'] == HEAD and owner['trackedBlobs'] == 9191 and owner['archiveSHA256'] == archive_hash and owner['archiveBytes'] == archive.stat().st_size
copied_receipt = pathlib.Path('/tmp/capiro-remaining-root-evidence/source-archive-1585438/SOURCE-ARCHIVE-RECEIPT.json')
assert sha(copied_receipt) == sha(owner_receipt_path)
members = [json.loads(line) for line in (archive_review_root / 'MEMBER-VERIFICATION.jsonl').read_text().splitlines()]
assert len(members) == len(owner['files']) == 9191
by_path = {x['path']: x for x in owner['files']}
assert len(by_path) == 9191 and {x['path'] for x in members} == set(by_path)
tree = {}
raw_tree = subprocess.check_output(['git', '-C', str(ROOT), 'ls-tree', '-rz', HEAD])
for row in raw_tree.split(b'\0'):
    if not row: continue
    meta, path = row.split(b'\t', 1)
    mode, kind, blob = meta.decode().split()
    assert kind == 'blob'
    tree[path.decode()] = (mode, blob)
assert set(tree) == set(by_path)
for member in members:
    original = by_path[member['path']]
    assert member['matchesFrozenGitBlob'] and member['matchesReceipt']
    for key in ['path', 'mode', 'bytes', 'gitBlob', 'sha256']: assert member[key] == original[key]
    assert tree[member['path']] == (member['mode'], member['gitBlob'])
assert sum(m['bytes'] for m in members) == archive_review['uncompressedBytes'] == 1292746432
with zipfile.ZipFile(archive) as z:
    entries = z.infolist()
    assert z.comment.decode() == HEAD
    files = [x for x in entries if not x.is_dir()]
    directories = [x for x in entries if x.is_dir()]
    assert len(entries) == 11443 and len(files) == 9191 and len(directories) == 2252
    assert {x.filename for x in files} == set(tree) and len({x.filename for x in entries}) == len(entries)
    assert all(x.create_system == 0 and x.external_attr == 0 for x in files)
    for x in files: assert x.file_size == by_path[x.filename]['bytes']

move_path = pathlib.Path('/tmp/capiro-remaining-root-evidence/PROFILE-EVIDENCE-STORAGE-MOVE.json')
move = js(move_path)
alias, physical = pathlib.Path(move['originalPath']), pathlib.Path(move['physicalPath'])
assert alias.is_symlink() and alias.resolve() == physical and move['verifiedUnchanged']
assert len(move['records']) == 549
for item in move['records']:
    p = alias / item['path']
    assert p.is_file() and not p.is_symlink() and p.stat().st_size == item['bytes'] and sha(p) == item['sha256'] and stat.S_IMODE(p.stat().st_mode) == item['mode']

prior_move_path = pathlib.Path('/tmp/capiro-remaining-root-evidence/PRIOR-ARCHIVE-STORAGE-MOVES-AFTER-FINAL-GATE.json')
prior_move = js(prior_move_path)
assert prior_move['sourceBytesUnchanged']
for item in prior_move['moves']:
    alias = pathlib.Path(item['oldPath'])
    assert alias.is_symlink() and alias.resolve() == pathlib.Path(item['storagePath'])
    for f in item['verifiedFiles']:
        p = alias / f['path']
        assert p.stat().st_size == f['bytes'] and stat.S_IMODE(p.stat().st_mode) == f['mode']
        if p.suffix != '.zip': assert sha(p) == f['sha256']

report = copy.deepcopy(base)
report['schema'] = 'capiro-independent-final-gate-review/2'
report['status'] = 'PASS_COMPLETED_LOCAL_GATES_IMAGE_BLOCKED_NATIVE_AND_OTHER_ACCEPTANCE_LIMITS_OPEN'
report['sealedAtUTC'] = NOW
report['method'] += ' Final completion independently flattened all1326 full browser records/attempts, rehashed final ZIP and checked every member record against Git and receipt; independent profile review supplies decompressed member/CRC validation.'
report['completedGates'] += new_gates
report['portfolioBrowser'] = results['portfolio-browser']
report['modulesBrowser'] = results['modules-browser']
report['portfolioFinalSummary'] = summary
report['inheritedTimeoutOverrides'] = overrides
report['pending'] = {'fullBrowserSuites': 'NONE; exact-source Modules208 and Portfolio1118 completed', 'finalVerdict': 'SEALED_BOUNDED_LOCAL_QUALIFICATION', 'shipping': 'NOT_ESTABLISHED_IMAGE_BLOCKED_NATIVE_AND_OTHER_LIMITS_OPEN'}
report['checkpoints'][-1] = {'source': HEAD, 'status': 'CURRENT_LOCAL_CHECKS_PASSED_IMAGE_GATE_FAILED', 'modules': {'passed': 208, 'failed': 0, 'exitCode': 0}, 'portfolio': {'passed': 1118, 'failed': 0, 'exitCode': 0}, 'dockerImage': 'FAILED_DNS_NO_IMAGE'}
for row in report['coverage']:
    row['currentCompletedBrowserMatches'] = [x for x in results['portfolio-browser']['records'] if 'apps/web/tests/browser/' + x['file'] in row['testFiles']]
    row['currentModulesMatches'] = [x for x in results['modules-browser']['records'] if 'apps/web/test/browser/' + x['file'] in row['testFiles']]
    row['status'] = 'completed_bounded_evidence_with_explicit_native_and_scope_limits'
    if row['id'] == 'desktop_mobile_accessibility':
        row['coverage'] = 'Completed fixture desktop/mobile, keyboard/focus and control-containment assertions plus four host theme/viewport numeric renders and two desktop-only history flows. No complete Figma or comprehensive accessibility acceptance.'
report['archive'] = {'status': 'PASS_SOURCE_ARCHIVE_INTEGRITY', 'archive': rec(archive), 'independentReview': archive_review, 'reviewManifest': rec(manifest_path), 'reviewManifestFilesVerified': 6, 'memberRecordsAgainstGitAndOwnerReceipt': 9191, 'zipDirectoryEntries': 2252, 'zipTotalEntries': 11443, 'zipCommentEqualsSource': True, 'modes': '9191 Git100644 blobs; ZIP DOS regular defaults, no executable/symlink semantics lost', 'methodBoundary': 'This gate reviewer rehashed the complete ZIP, checked the central-directory inventory and every reviewer member identity against Git/root receipt. The sealed profile reviewer streamed every decompressed member and verified Git/SHA256/CRC. No extraction by either reviewer.', 'libraryCustody': 'NOT_ESTABLISHED'}
report['preservation'] = {'profileMoveReceipt': rec(move_path), 'profileOriginalPath': str(pathlib.Path(move['originalPath'])), 'profilePhysicalPath': move['physicalPath'], 'independentlyVerifiedFileBytesModes': 549, 'profileOriginalAliasVerified': True, 'priorArchiveMoveReceipt': rec(prior_move_path), 'priorArchiveAliasesAndSizesModesVerified': True, 'priorArchiveHashVerification': 'Root move receipt reports complete ZIP hash verification; this review verified aliases, sizes/modes and non-ZIP hashes without rehashing the older large archives.', 'priorAuditPackets': 'Unchanged; original preliminary snapshot and completed Modules addendum also retained.'}
report['remaining'] = ['Actual application image unavailable after Alpine DNS failure; container smoke/image scan unrun.', 'Native authentication/authority/persistence/deployment/provider acceptance is separate and unrun here.', 'Full Meri interaction, full Figma fidelity/comprehensive accessibility and Library byte custody/save remain unestablished.']
report['evidenceRecords'] += new_evidence + [rec(p) for p in [manifest_path, archive_review_root / 'REVIEW.json', archive_review_root / 'MEMBER-VERIFICATION.jsonl', owner_receipt_path, copied_receipt, pathlib.Path('/tmp/capiro-remaining-root-evidence/source-archive-1585438/REPRODUCTION.md'), move_path, prior_move_path]]
report['preliminaryPacketPreserved'] = rec(O / 'preliminary-inventory.json')
report['completionChecks'] = {'allPortfolio1118RecordsPassedOnce': True, 'allModules208RecordsPassedOnce': True, 'zeroSkipsFlakyUnexpectedRetries': True, 'trackedSourceAndIndexUnchanged': True, 'finalWorktreeStatus': final_status, 'finalWorktreeNote': 'Root publication drafts are untracked and excluded from frozen source/archive/gate claims. The preliminary worktree and each completed gate receipt were clean. This final review does not claim the whole current worktree is clean.', 'noRuntimeExecutedByReviewer': True, 'server5191Closure': 'Confirmed by root final receipt, not probed by this reviewer'}
(O / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'source': HEAD, 'portfolio': 1118, 'modules': 208, 'combined': report['combined']['total'], 'elements': 15, 'archiveBytes': archive.stat().st_size, 'archiveSHA256': archive_hash, 'archiveBlobs': len(members), 'profileRecordsVerified': 549, 'sourceClean': git('status', '--short') == ''}, indent=2))
