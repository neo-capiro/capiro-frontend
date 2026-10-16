"""Seal existing runtime receipts with stdlib only; never launch validation."""
import datetime
import decimal
import hashlib
import json
import pathlib
import re
import shutil

ROOT = pathlib.Path(r'C:\Users\neoma\Documents\Codex\2026-10-15\task-7')
EVIDENCE = ROOT / 'evidence'
REPO = ROOT / 'meri-ui-input'
DEST = REPO / 'docs/meri-figma-34-20261015/input-runtime-evidence-845ceb'
SOURCE = '845cebade818b8ceef1568574662196d813d14d0'
PROFILE = '8a4ff50a976f843f68a44cd246e29224b3142eef7685f2771b5bb0b4fba44131'
EMITTED = '9e46ca1eb522993b29f375afd62f4ddf6f737992ff9204d0dce1a5b3b9611232'
LOCK = '836ff4f6acde1857c6b66ccafe72d69250f7793a3efa090978f5563bc7dd3149'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def read(name):
    return json.loads((EVIDENCE / name).read_text(encoding='utf-8-sig'))

def seconds(value):
    # Preserve .NET's seventh fractional digit, avoiding PowerShell string rounding.
    match = re.fullmatch(r'(.+?)(?:\.(\d+))?([+-]\d\d:\d\d|Z)', value)
    base, fraction, zone = match.groups()
    whole = int(datetime.datetime.fromisoformat(base + zone).timestamp())
    return decimal.Decimal(whole) + decimal.Decimal('0.' + (fraction or '0'))

assert sha((REPO / 'package-lock.json').read_bytes()) == LOCK
generated = (REPO / 'packages/meri-client/dist/conversation-client.js').read_bytes()
assert sha(generated) == EMITTED and b'\r' not in generated
assert sha((EVIDENCE / 'MERI-INPUT-845-CHANGED-RUNTIME-SEALED.json').read_bytes()) == PROFILE

files = [
    'MERI-INPUT-845-CHANGED-RUNTIME-SEALED.json',
    'run-meri-input-845-stage.SEALED-HOLD.ps1',
    'run-meri-input-845-stage.ps1',
    'check-input845-installed-bytes.py',
    'input845-installed-consumer-bytes.json',
    'meri-input-ui-845.json',
    'INPUT-845ceb-CHANGED-PROOF.json',
    'seal-input845-runtime.py',
]
stage_rows = []
for stage in ['install', 'sdk', 'sdk-runtime', 'ui-runtime']:
    stem = 'input845-' + stage
    receipt = read(stem + '.result.json')
    assert receipt['source'] == SOURCE and receipt['profileSha256'] == PROFILE
    assert receipt['exitCode'] == 0 and receipt['rootExited']
    assert receipt['scopeValid'] and receipt['lockUnchanged']
    assert not any(receipt[key] for key in ['timedOut', 'pressureStop', 'monitorFailure', 'forcedCleanupPids', 'remainingDirectChildren'])
    if stage != 'install':
        assert receipt['generatedAfterSha256'] == EMITTED
    memory = receipt['memorySamples']
    commit = [receipt['capacity']['commitHeadroomMiB']] + [row['commitHeadroomMiB'] for row in memory]
    observed_rss = receipt['sampledAggregatePeakWorkingSetBytes'] or None
    stage_rows.append({
        'stage': stage, 'result': 'PASS', 'receipt': stem + '.result.json',
        'argv': receipt['argv'], 'cwd': receipt['workingDirectory'],
        'startedAt': receipt['startedAt'], 'endedAt': receipt['endedAt'],
        'elapsedMillisecondsExact': str((seconds(receipt['endedAt']) - seconds(receipt['startedAt'])) * 1000),
        'rootPid': receipt['rootPid'], 'exitCode': receipt['exitCode'],
        'startCommitHeadroomMiB': commit[0], 'minimumObservedCommitHeadroomMiB': min(commit),
        'sampledAggregatePeakWorkingSetBytes': observed_rss,
        'rssMeasurement': 'sampled, not guaranteed peak' if observed_rss else 'unobserved: process exited before a live RSS snapshot; raw zero does not mean zero consumption',
        'rootExited': True, 'forcedCleanupPids': [], 'remainingDirectChildren': [],
        'lockUnchanged': True, 'scopeValid': True,
    })
    files.extend(stem + suffix for suffix in ['.result.json', '.capacity.json', '.stdout.log', '.stderr.log'])

sdk_output = (EVIDENCE / 'input845-sdk-runtime.stdout.log').read_text(encoding='utf-8-sig')
assert re.search(r'\btests 12\b', sdk_output) and re.search(r'\bpass 12\b', sdk_output)
assert re.search(r'\bfail 0\b', sdk_output)
ui = read('meri-input-ui-845.json')
assert ui['success'] and ui['numPassedTests'] == ui['numTotalTests'] == 48
assert ui['numFailedTests'] == ui['numPendingTests'] == 0
worker = read('input845-ui-runtime.result.json')['ownedProcesses']
assert sum('forks.js' in item['commandLine'] for item in worker) == 1
assert any('forks.js' in item['commandLine'] and '--max-old-space-size=768' in item['commandLine'] for item in worker)
installed = read('input845-installed-consumer-bytes.json')
assert len(installed['consumerCopies']) == 2
assert all(len(item['rows']) == 35 for item in installed['consumerCopies'])

DEST.mkdir(parents=True, exist_ok=False)
file_rows = []
for name in sorted(files):
    original = EVIDENCE / name
    shutil.copyfile(original, DEST / name)
    data = original.read_bytes()
    assert (DEST / name).read_bytes() == data
    file_rows.append({'path': name, 'bytes': len(data), 'sha256': sha(data), 'byteDomain': 'original raw file bytes, preserved by local -text attributes'})

index = {
    'schema': 'meri-input-focused-runtime-terminal/1',
    'source': SOURCE, 'sourceTree': '26078557ee03e885d0e9f548eaa44f2aaca52076',
    'binding': 'Runtime tests executed reviewed source845 plus the newly compiler-emitted SDK file. Clean845 alone did not contain these generated bytes. The sealing successor adds exactly this generated file and documentation/evidence.',
    'generated': {'path': 'packages/meri-client/dist/conversation-client.js', 'bytes': len(generated), 'sha256': EMITTED, 'beforeSha256': 'd3afa6d2f64474c3e077ea1ef35d23b45caa3ab2cec3e117faccc13be4729f34', 'lineEndings': 'LF; zero CRLF'},
    'rootLockWorkingBytesSha256': LOCK,
    'contracts': {'version': '0.1.7', 'publication': 'a54239c5f252667b3aaaaa588ef1776219816075', 'artifactSource': '618db545b15b5c4bab58f0cd5d12cfb022232402', 'tarballSha256': '8f0c2e1435122c22f2a1ed7427dd744f361bc598e178f2ef842acd6f91b78daa', 'installedCopies': 2, 'byteEqualMembersPerCopy': 35, 'historicalRootVersion': '0.1.0'},
    'profileSha256': PROFILE, 'stages': stage_rows,
    'checks': {'sdkOnlyCompiler': 'PASS; only expected generated JS changed, declarations unchanged', 'sdkSynthetic': {'passed': 12, 'failed': 0, 'newInputCases': 8, 'changedExistingCases': 4, 'historicalUnmatchedCases': 'not selected, not run'}, 'uiProxySynthetic': {'passed': 48, 'failed': 0, 'files': [{'path': 'apps/web/tests/meri-input-recovery.test.ts', 'passed': 4}, {'path': 'apps/web/tests/meri-conversation-proxy.test.ts', 'passed': 44}]}},
    'priorEvidence': {'source033': '033a9862d1b4f3c2b98ac560d8737e2d8240d4a3', 'syntheticPassed': 65, 'rerun': False, 'terminalSummarySha256': 'c0ed9dfb63467402627ccf0f473865c5996850c30dc651fa4f1ac78f6a4d7066', 'scope': 'separate historical source/dependency evidence; not reclassified as845 runtime qualification'},
    'observabilityNotes': [
        'Original terminal console Select-Object summary rendered null because the object was a hashtable. Original JSON receipts were reread and are complete. No stage was rerun.',
        'Elapsed values here use raw ISO timestamp strings with seven fractional digits. A PowerShell diagnostic string conversion rounded timestamps; it did not alter raw receipts.',
        'Raw zero RSS on the fast SDK/compiler processes means unobserved, not zero. Sampling cannot establish an absolute peak.',
        'Original sealed supervisor is preserved separately. Executable copy differs only by its authorized-run sentinel after Qualification release; argv and guards are unchanged.',
        'Node24.19.0/npm11.17.0 were observed on Windows. Declared npm11.9 mismatch remains recorded; no Linux/browser equivalence is claimed.',
    ],
    'remaining': ['Parent accepted proposed original-input wire/store41c; public schema/export/version/artifact and actual authenticated service/HTTP implementation remain pending', 'Fresh initial Send remains blocked until reviewed public allocation consumer is connected; unknown/404/RESERVED is not fresh input authority', 'Whole-web typing, production build and browser checks remain UNRUN for this successor', 'Manual accessibility incomplete', 'No real authenticated native/backend/provider/DB/deployment acceptance'],
    'ownedProcessState': 'all stages terminal0/cleanup0; no remaining owned process; serialized slot released to Qualification',
    'files': file_rows,
}
(DEST / 'RUNTIME-TERMINAL.json').write_text(json.dumps(index, indent=2) + '\n', encoding='utf-8', newline='\n')
(DEST / '.gitattributes').write_text('* -text -whitespace\n', encoding='ascii', newline='\n')
print(json.dumps({'destination': str(DEST), 'rawFiles': len(file_rows), 'indexSha256': sha((DEST / 'RUNTIME-TERMINAL.json').read_bytes()), 'stages': stage_rows}, indent=2))
