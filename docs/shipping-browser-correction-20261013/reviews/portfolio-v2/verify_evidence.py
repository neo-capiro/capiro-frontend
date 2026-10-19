"""Read-only review of existing gate receipts; never invokes the application/tests."""
import collections
import datetime
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import zlib

OUT = Path(__file__).parent
RAW = Path('/tmp/capiro-shipping-browser-correction-20261013')
REPO = Path('/workspace/capiro-shipping-browser-20261013')
SOURCE = 'd4be41e60516e576c74afa304b50ed67da15cb93'
OLD = '1585438295776604f23a5cb5ab592729f7c468ca'
references = {}

def reference(path):
    path = Path(path)
    data = path.read_bytes()
    record = {'path': str(path), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    references[str(path)] = record
    return record

def read_json(path):
    reference(path)
    return json.loads(Path(path).read_text())

def git(*args):
    return subprocess.check_output(['git', '-C', str(REPO), *args])

def specs(suites):
    for suite in suites:
        yield from suite.get('specs', [])
        yield from specs(suite.get('suites', []))

def inventory(records):
    return collections.Counter((s['file'], s['title']) for s in records)

def png(path):
    record = reference(path)
    data = Path(path).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    pos = 8
    chunks = []
    while pos < len(data):
        size = struct.unpack('>I', data[pos:pos+4])[0]
        kind = data[pos+4:pos+8]
        body = data[pos+8:pos+8+size]
        crc = struct.unpack('>I', data[pos+8+size:pos+12+size])[0]
        assert zlib.crc32(kind + body) & 0xffffffff == crc
        if kind == b'IHDR':
            record['width'], record['height'] = struct.unpack('>II', body[:8])
        chunks.append(kind.decode())
        pos += size + 12
    assert pos == len(data) and chunks[0] == 'IHDR' and chunks[-1] == 'IEND'
    record['completePngWithValidChunkCrcs'] = True
    return record

current = read_json(RAW / 'final-portfolio-browser-v2-results.json')
previous = read_json(RAW / 'final-portfolio-browser-results.json')
old = read_json('/tmp/capiro-remaining-qualification/final-1585438/portfolio-browser-results.json')
exit_receipt = read_json(RAW / 'final-portfolio-browser-v2-exit.json')
prior_exit = read_json(RAW / 'final-portfolio-browser-exit.json')
records = list(specs(current['suites']))
prior_records = list(specs(previous['suites']))
old_records = list(specs(old['suites']))
assert len(records) == 1122 and len(old_records) == 1118
assert current['stats']['expected'] == 1122
assert all(current['stats'][k] == 0 for k in ('skipped', 'unexpected', 'flaky'))
assert not current['errors']
tests = [t for s in records for t in s['tests']]
assert len(tests) == 1122
assert all(s['ok'] for s in records)
assert all(t['expectedStatus'] == 'passed' and t['status'] == 'expected' and len(t['results']) == 1 for t in tests)
assert all(r['status'] == 'passed' and r['retry'] == 0 and not r['errors'] for t in tests for r in t['results'])
assert current['config']['workers'] == 3 and current['config']['shard'] is None
assert len(current['config']['projects']) == 1
project = current['config']['projects'][0]
assert project['retries'] == 0 and project['repeatEach'] == 1 and project['timeout'] == 30000
assert project['testMatch'] == ['**/*.spec.ts'] and project['testIgnore'] == []
timeouts = collections.Counter(t['timeout'] for t in tests)
assert timeouts == {30000: 1118, 90000: 4}
assert inventory(records) == inventory(prior_records)
assert {s['id'] for s in records} == {s['id'] for s in prior_records}
assert not inventory(old_records) - inventory(records)
added = list((inventory(records) - inventory(old_records)).elements())
assert len(added) == 4
assert exit_receipt['exitCode'] == 0 and exit_receipt['sourceChanged'] is False
assert exit_receipt['sourceBefore'] == exit_receipt['sourceAfter']
pin = exit_receipt['sourceAfter']
assert pin['head'] == SOURCE and pin['sourceDiff'] == ''
assert git('rev-parse', SOURCE + '^{tree}').decode().strip() == pin['tree']
assert git('rev-parse', SOURCE + ':apps/web').decode().strip() == pin['applicationTree']
scope = ['apps', 'packages', 'scripts', 'vendor', 'package.json', 'package-lock.json', '.dockerignore', 'docs/architecture-size-reviews.json']
assert not git('diff', SOURCE, '--', *scope)
runtime_observation = {'head': git('rev-parse', 'HEAD').decode().strip(), 'scopedDiffEmpty': True,
    'scopes': scope, 'trackedWorktreeStatus': git('status', '--porcelain', '--untracked-files=no').decode()}
assert runtime_observation['head'] == SOURCE
assert prior_exit['exitCode'] == 1 and prior_exit['sourceChanged'] is False
assert prior_exit['sourceBefore'] == pin == prior_exit['sourceAfter']
assert previous['stats']['expected'] == 1121 and previous['stats']['unexpected'] == 1
assert previous['stats']['skipped'] == 0 and previous['stats']['flaky'] == 0
failed = [s for s in prior_records if not s['ok']]
assert len(failed) == 1
failed = failed[0]
assert failed['file'] == 'portfolio-layout-integration.spec.ts' and failed['line'] == 31
assert 'ENOSPC' in failed['tests'][0]['results'][0]['error']['message']
target = next(s for s in records if s['id'] == failed['id'])
assert target['tests'][0]['results'][0]['duration'] == 12101
test_path = 'apps/web/tests/browser/portfolio-layout-integration.spec.ts'
test_bytes = (REPO / test_path).read_bytes()
assert test_bytes == git('show', SOURCE + ':' + test_path) == git('show', OLD + ':' + test_path)
config_path = 'apps/web/playwright.config.ts'
config_bytes = (REPO / config_path).read_bytes()
assert config_bytes == git('show', SOURCE + ':' + config_path)
assert b'trace: "retain-on-failure"' in config_bytes
reference(REPO / test_path)
reference(REPO / config_path)
screens_dir = RAW / 'final-portfolio-browser-v2-artifacts/portfolio-layout-integrati-0c394-nd-restores-it-after-reload'
screens = [png(screens_dir / name) for name in ['portfolio-saved-order-desktop.png', 'portfolio-saved-order-mobile-dark.png']]
assert not list(screens_dir.glob('*.zip'))
affected_files = {'mail-rich-compose.spec.ts', 'profile-tools-integration.spec.ts', 'profile-identity-layout.spec.ts'}
affected = [s for s in records if s['file'] in affected_files]
assert len(affected) == 22
assert collections.Counter(s['file'] for s in affected) == {'mail-rich-compose.spec.ts': 18, 'profile-tools-integration.spec.ts': 3, 'profile-identity-layout.spec.ts': 1}
for name in ['final-portfolio-browser-v2.log', 'final-portfolio-browser.log', 'final-controlled-selection.log', 'final-controlled-selection-v2.log']:
    reference(RAW / name)
assert '1122 passed' in (RAW / 'final-portfolio-browser-v2.log').read_text()
assert 'No tests found' in (RAW / 'final-controlled-selection.log').read_text()
assert "Cannot find module '@playwright/test'" in (RAW / 'final-controlled-selection.log').read_text()
assert '3 passed' in (RAW / 'final-controlled-selection-v2.log').read_text()
control_before = read_json(RAW / 'final-controlled-selection-exit.json')
control_after = read_json(RAW / 'final-controlled-selection-v2-exit.json')
assert control_before['exitCode'] == 1 and control_after['exitCode'] == 0
environment = read_json(RAW / 'FINAL-ENVIRONMENT.json')
visual = read_json(RAW / 'BOUNDED-VISUAL-REVIEW.json')
for record in visual['files']:
    actual = reference(RAW / record['path'])
    assert actual['bytes'] == record['bytes'] and actual['sha256'] == record['sha256']
reference(RAW / 'AWS-FAILURE-EVIDENCE.json')
reference(RAW / 'run-gate.py')
receipt = {
    'schemaVersion': 1, 'reviewedUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'verdict': 'PASS_bounded_existing_Portfolio_gate_evidence_review',
    'reviewMethod': 'Read-only JSON/source/log/hash/PNG inspection. No tests, runtime, browser, build or native calls executed by reviewer.',
    'source': pin, 'currentScopedObservation': runtime_observation,
    'completedGate': {'stats': current['stats'], 'endedUTC': exit_receipt['endedUTC'], 'exitCode': 0,
        'specs': len(records), 'tests': len(tests), 'results': 1122, 'eachResultPassedAtRetryZero': True,
        'workers': 3, 'repeatEach': 1, 'retries': 0, 'effectiveTimeoutCountsMs': dict(timeouts),
        'fullyParallel': current['config']['fullyParallel'], 'sourceChanged': False},
    'inventory': {'priorSource': OLD, 'originalCases': 1118, 'originalCasesMissing': 0,
        'addedCases': [{'file': f, 'title': t} for f, t in added],
        'firstAndSecondFullRunInventoriesAndIdsEqual': True,
        'affectedCasesTotal': 22, 'affectedIncludesAllFourAddedCases': True,
        'affectedByFile': dict(collections.Counter(s['file'] for s in affected))},
    'preservedAttempts': {
        'firstFull': {'status': 'FAILED', 'passed': 1121, 'failed': 1, 'skipped': 0, 'flaky': 0,
            'exitCode': 1, 'sourceChanged': False, 'cause': 'ENOSPC writing first screenshot; later assertions were not reached'},
        'controlledSelectionSetup': {'status': 'SETUP_FAILED', 'testsExecuted': 0,
            'exitCode': 1, 'cause': "External harness could not resolve @playwright/test; No tests found"},
        'controlledSelectionCorrected': {'status': 'PASSED', 'testsExecuted': 3, 'exitCode': 0}},
    'enosPcCase': {'originalFailedSpec': failed, 'rerunSpec': target, 'screenshots': screens,
        'testSourceByteIdenticalTo158AndD4be': True,
        'postScreenshotTail': ['75-76: set mobile 390x844 and dark mode',
            '77-84: body/card dark background assertions', '85-89: no horizontal document overflow',
            '90-93: mobile-dark screenshot', '94: exactly one write', '95: no unexpected request'],
        'evidenceBasis': 'Passed result, unchanged straight-line test body and complete later mobile screenshot establish tail completion. No successful trace is retained under retain-on-failure.'},
    'environment': environment,
    'visualEvidence': {'referencedParentReceiptAndThreeScreenshotHashesVerified': True,
        'newIndependentVisualOrFigmaReview': False},
    'limits': ['Portfolio fixture gate only; no native row acceptance, backend/provider execution, deployment acceptance, full accessibility or Figma conformance.',
        'Actual local Chromium154 differs from original AWS pinned149; no browser environment equivalence claim.',
        'Modules/build/actual-server gates are outside this review and were pending/running at assignment.',
        'Whole-worktree cleanliness is not claimed: IMPLEMENTATION.md has a concurrent documentation-only edit. Runtime scoped diff is empty.'],
    'references': sorted(references.values(), key=lambda r: r['path'])}
(OUT / 'RECEIPT.json').write_text(json.dumps(receipt, indent=2) + '\n')
(OUT / 'AFFECTED-CASES.json').write_text(json.dumps(affected, indent=2) + '\n')
print(json.dumps({'verdict': receipt['verdict'], 'records': len(records), 'added': added,
    'source': SOURCE, 'screenshots': screens, 'references': len(references)}, indent=2))
