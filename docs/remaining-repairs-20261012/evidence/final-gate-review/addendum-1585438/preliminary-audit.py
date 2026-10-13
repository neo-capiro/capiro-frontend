"""Read-only preliminary audit; intentionally excludes active browser producers."""
import datetime
import hashlib
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path('/workspace/capiro-remaining')
BASE = pathlib.Path('/tmp/capiro-remaining-qualification')
E = BASE / 'final-1585438'
OUT = pathlib.Path(__file__).parent
HEAD = '1585438295776604f23a5cb5ab592729f7c468ca'
PREVIOUS = 'd68c2dc6b80c400b8ce9b07837f7a14cabb5d616'
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat()
def js(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def rec(p): return {'path': str(p), 'bytes': p.stat().st_size, 'sha256': sha(p)}
def git(*args): return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True).strip()
def architecture(s): return json.JSONDecoder().raw_decode(s[s.index('{\n  "errors"'):])[0]
def flatten(d):
    rows = []
    def walk(suites):
        for suite in suites:
            for spec in suite.get('specs', []):
                for t in spec.get('tests', []):
                    rows.append({'file': spec['file'], 'line': spec['line'], 'title': spec['title'], 'status': t['status'], 'attempts': [{'status': r['status'], 'retry': r['retry']} for r in t['results']]})
            walk(suite.get('suites', []))
    walk(d['suites'])
    return rows

assert git('rev-parse', 'HEAD') == HEAD and git('status', '--short') == ''
identity = js(E / 'BUILD-IDENTITY.json')
assert identity['source'] == HEAD
for key, ref in [('rootTree', 'HEAD^{tree}'), ('applicationTree', 'HEAD:apps/web'), ('runtimeSourceTree', 'HEAD:apps/web/src')]:
    assert git('rev-parse', ref) == identity[key]
assert identity['runtimeSourceTree'] == git('rev-parse', PREVIOUS + ':apps/web/src')
assert (ROOT / 'apps/web/.next/BUILD_ID').read_text().strip() == identity['buildId']
delta = git('diff', '--name-only', PREVIOUS, HEAD).splitlines()
assert delta == ['apps/web/test/browser/remaining-modules.spec.ts', 'docs/remaining-repairs-20261012/STRUCTURE-REVIEW.md']

gate_names = ['clean-install', 'corrected-regressions', 'combined-check', 'elements-prepare', 'elements-check', 'production-build', 'production-server', 'docker-context', 'docker-build']
gates = []
for name in gate_names:
    p = E / (name + '-exit.json')
    d = js(p)
    assert d['sourceBefore'] == d['sourceAfter'] and not d['sourceChanged']
    assert d['sourceBefore'] == {'head': HEAD, 'tree': identity['rootTree'], 'applicationTree': identity['applicationTree'], 'sourceDiff': ''}
    assert d['exitCode'] == (1 if name == 'docker-build' else 0)
    gates.append({'name': name, 'status': 'failed_before_application_compile' if name == 'docker-build' else 'passed', 'receipt': rec(p), 'raw': d, 'log': rec(E / (name + '.log'))})

log = (E / 'combined-check.log').read_text()
counts = [int(v) for v in re.findall(r'ℹ tests (\d+)', log)] + [int(v) for v in re.findall(r'Tests\s+(\d+) passed', log)]
assert counts == [59, 21, 1275, 117] and sum(counts) == 1472
assert re.findall(r'Test Files\s+(\d+) passed', log) == ['89', '21']
assert re.findall(r'ℹ pass (\d+)', log) == ['59', '21']
assert re.findall(r'ℹ (?:fail|cancelled|skipped|todo) (\d+)', log) == ['0'] * 8
arch = architecture(log)
assert arch['errors'] == [] and arch['sizeSummary'] == {'total': 427, 'reviewed': 403, 'inheritedUnreviewed': 24, 'blocking': 0}
unreviewed = [x for x in arch['sizeFindings'] if x['reviewStatus'] == 'unreviewed']
assert len(unreviewed) == 24 and all(x['provenance'] == 'inherited-unchanged' and not x['blocking'] for x in unreviewed)
def lint_section(s): return s[s.index('> eslint src tests'):s.index('> prettier --check')]
lint = lint_section(log)
warnings = [x.strip() for x in lint.splitlines() if re.match(r'\s+\d+:\d+\s+warning\s+', x)]
assert len(warnings) == 76 and '76 problems (0 errors, 76 warnings)' in lint
for name in ['final-104495d', 'final-adbc84b', 'final-d68c2dc']:
    oldlog = (BASE / name / 'combined-check.log').read_text()
    assert lint == lint_section(oldlog)
    assert unreviewed == [x for x in architecture(oldlog)['sizeFindings'] if x['reviewStatus'] == 'unreviewed']
assert 'All matched files use Prettier code style!' in log
assert js(ROOT / 'package.json')['scripts']['check'] in log

browser = js(E / 'corrected-regression-results.json')
cases = flatten(browser)
assert len(cases) == 23 and all(x['status'] == 'expected' and x['attempts'] == [{'status': 'passed', 'retry': 0}] for x in cases)
assert browser['stats']['expected'] == 23 and all(browser['stats'][key] == 0 for key in ['unexpected', 'skipped', 'flaky']) and browser['errors'] == []
assert browser['config']['workers'] == 1 and all(p['retries'] == 0 and p['repeatEach'] == 1 for p in browser['config']['projects'])

elements_log = (E / 'elements-check.log').read_text()
assert re.findall(r'ℹ tests (\d+)', elements_log) == ['15'] and re.findall(r'ℹ pass (\d+)', elements_log) == ['15']
assert re.findall(r'ℹ (?:fail|cancelled|skipped|todo) (\d+)', elements_log) == ['0'] * 4
receipt_path = E / 'elements-ssr/receipt.json'
receipt = js(receipt_path)
check_args = js(E / 'elements-check-exit.json')['command']
assert 'MERI_ELEMENTS_SSR_RECEIPT_SHA256=' + sha(receipt_path) in check_args
element_bindings = []
for kind, base in [('sources', ROOT), ('outputs', E / 'elements-ssr')]:
    for item in receipt[kind]:
        p = base / item['path']
        assert p.stat().st_size == item['bytes'] and sha(p) == item['sha256']
    element_bindings.append({'kind': kind, 'checked': len(receipt[kind]), 'mismatches': []})
process = js(E / 'elements-captures/process.json')
assert process['status'] == 0 and process['error'] is None
for name, expected in process['streams'].items():
    p = E / 'elements-captures' / (name + '.bin')
    assert p.stat().st_size == expected['bytes'] and sha(p) == expected['sha256']
vendor = js(ROOT / 'vendor/meri-public-packages.json')
for item in vendor['artifacts']:
    p = ROOT / 'vendor' / item['file']
    assert p.stat().st_size == item['bytes'] and sha(p) == item['sha256']

context_path = pathlib.Path('/tmp/capiro-remaining-docker-evidence/context-frozen-1585438')
context = js(context_path / 'report.json')
assert context['sourceCommit'] == HEAD and context['buildExitCode'] == 0
assert context['scriptSha256'] == sha(ROOT / 'scripts/docker-context-regression.mjs')
assert context['ignoreSha256'] == sha(ROOT / '.dockerignore')
assert len(context['checks']) == 33 and context['requiredApplicationFiles'] == 12
for i, check in enumerate(context['checks']):
    assert check['passed'] and check['present'] == check['expectedIncluded']
    output = context_path / 'output/context' / check['path']
    assert output.exists() == check['expectedIncluded']
    if output.exists(): assert sha(output) == check['actualSha256'] == check['expectedSha256']
    if i < 12: assert sha(ROOT / check['path']) == check['expectedSha256']
docker_path = pathlib.Path('/tmp/capiro-remaining-docker-evidence/DOCKER-IMAGE-BLOCKER-1585438.json')
docker = js(docker_path)
assert docker['source']['head'] == HEAD and docker['attempt'] == js(E / 'docker-build-exit.json')
assert docker['logSHA256'] == sha(E / 'docker-build.log')
assert not docker['imageExists'] and docker['imageInspectExitCode'] == 1
assert docker['containerSmoke'] == docker['imageScan'] == 'NOT_RUN_NO_IMAGE'
docker_log = (E / 'docker-build.log').read_text()
assert 'DNS: transient error' in docker_log and '[base 2/3] RUN apk add' in docker_log and 'failed to build' in docker_log
absence = pathlib.Path('/tmp/capiro-remaining-docker-evidence/IMAGE-ABSENCE-1585438.log')
assert 'No such image: capiro-remaining:1585438-20261012' in absence.read_text()

production_path = E / 'production-artifacts/production-smoke.json'
production = js(production_path)
http = [x for x in production['results'] if 'path' in x]
renders = [x for x in production['results'] if 'viewport' in x]
history = [x for x in production['results'] if 'crossMode' in x]
assert [len(http), len(renders), len(history)] == [11, 4, 2]
assert production['pageErrors'] == [] and all(x['headers'] == 'passed' for x in http)
assert all(x['portfolio']['fits'] and x['portfolio']['sameDocument'] and x['stylesRestoredOnReturn'] and x['clientNavigation'] and x['headerNavigation'] for x in renders)
assert all(x['sameDocument'] and x['history'] == 'back/forward' for x in history)
assert production_path.read_bytes() == (BASE / 'final-d68c2dc/production-artifacts/production-smoke.json').read_bytes()
visual_reuse = []
for p in sorted((E / 'production-artifacts').glob('*.png')):
    assert p.read_bytes() == (BASE / 'final-d68c2dc/production-artifacts' / p.name).read_bytes()
    visual_reuse.append(rec(p))

map_root = pathlib.Path('/tmp/capiro-remaining-final-ledger-review/addendum-1585438')
mapped = js(map_root / 'SOURCE-LEDGER-VERIFICATION.json')
assert mapped['identity']['source'] == HEAD and mapped['sourceRecordCount'] == 140
for item in mapped['sourceRecords']:
    p = ROOT / item['path']
    blob = subprocess.check_output(['git', '-C', str(ROOT), 'show', HEAD + ':' + item['path']])
    assert blob == p.read_bytes() and sha(p) == item['sha256'] and p.stat().st_size == item['bytes']
    assert git('rev-parse', HEAD + ':' + item['path']) == item['gitBlob']
assert mapped['mappingCount'] == 21 and mapped['runtimeTreeUnchanged']
parsed = js(map_root / 'PARSED-ASSERTION-VERIFICATION.json')
assert parsed['source'] == HEAD and parsed['allOriginalStatementsPreservedInOrder'] and parsed['allOriginalAssertionsPreservedInOrder']
assert parsed['originalFileAssertions'] == 66 and parsed['finalFileAssertions'] == 76 and parsed['originalStatements'] == 20
assert parsed['originalKeyboardStatements'] == parsed['finalKeyboardStatements'] and len(parsed['originalKeyboardStatements']) == 6
assert parsed['allBytesOutsideTargetStatementUnchanged'] and parsed['testNamesUnchanged'] == 10
review_root = pathlib.Path('/tmp/capiro-remaining-capabilities-evidence/modules-keyboard-adapter-review')
review = js(review_root / 'review.json')
assert review['sourceSHA256'] == sha(ROOT / review['sourceFile'])
assert git('show', review['ownerCommit'] + ':' + review['sourceFile']) == (ROOT / review['sourceFile']).read_text().strip()

old = js(OUT.parent / 'addendum-d68c2dc/report.json')
coverage = []
for item in old['coverage']:
    row = {k: item[k] for k in ['id', 'coverage', 'testFiles', 'sourceReferences', 'limitations']}
    row['currentCompletedBrowserMatches'] = [x for x in cases if 'apps/web/tests/browser/' + x['file'] in row['testFiles']]
    row['status'] = 'preliminary_full_modules_and_portfolio_results_awaited'
    if row['id'] == 'desktop_mobile_accessibility':
        row['coverage'] = 'Source assertions cover selected fixture desktop/mobile, keyboard/focus and control containment. Fresh full-suite outcomes are pending review. Actual host has four theme/viewport numeric renders and two desktop-only history flows; no complete Figma or accessibility acceptance.'
    coverage.append(row)
source_records = []
names = {x['relativePath'] for x in old['sourceRecords']} | set(delta)
for name in sorted(names):
    p = ROOT / name
    assert subprocess.check_output(['git', '-C', str(ROOT), 'show', HEAD + ':' + name]) == p.read_bytes()
    source_records.append({'relativePath': name, **rec(p)})

library_paths = [pathlib.Path('/tmp/capiro-remaining-root-evidence/LIBRARY-ARCHIVE-SAVE-BLOCKER.json'), pathlib.Path('/tmp/capiro-remaining-docker-evidence/LIBRARY-MATERIALIZATION-BLOCKER.json'), pathlib.Path('/tmp/capiro-remaining-docker-evidence/LIBRARY-METADATA-NOTE.json')]
review_paths = [map_root / 'REPORT.md', map_root / 'SOURCE-LEDGER-VERIFICATION.json', map_root / 'PARSED-ASSERTION-VERIFICATION.json', map_root / 'MANIFEST.json', review_root / 'review.json', review_root / 'REPORT.md', review_root / 'SHA256-MANIFEST.json', pathlib.Path('/tmp/capiro-remaining-modules-evidence/production-1585438-review/report.md'), pathlib.Path('/tmp/capiro-remaining-modules-evidence/production-1585438-review/SOURCE-AND-GATE-BINDING.json'), pathlib.Path('/tmp/capiro-remaining-modules-evidence/production-1585438-review/VISUAL-REUSE.json')]
evidence = [rec(p) for p in [E / 'BUILD-IDENTITY.json', E / 'corrected-regression-results.json', receipt_path, E / 'elements-captures/process.json', production_path, E / 'production-artifacts/preview-root-smoke.json', context_path / 'report.json', docker_path, absence] + library_paths + review_paths]
for g in gates: evidence.extend([g['receipt'], g['log']])
checkpoints = [
    {'source': '104495d4cdc8251640b922aea431fa0e169fe935', 'status': 'FAILED_INTERRUPTED_CHECKPOINT', 'portfolio': {'passed': 163, 'failed': 7, 'interrupted': 3, 'unrun': 945, 'exitCode': 130}},
    {'source': 'adbc84b2251fe6b06cb7f75030026fba5b4ff498', 'status': 'FAILED_COMPLETED_CHECKPOINT', 'portfolio': {'passed': 1115, 'failed': 3, 'exitCode': 1}},
    {'source': PREVIOUS, 'status': 'FAILED_COMPLETED_MODULES_CHECKPOINT', 'modules': {'passed': 207, 'failed': 1, 'exitCode': 1}, 'portfolio': 'NOT_RUN'},
    {'source': HEAD, 'status': 'CURRENT_PRELIMINARY_QUALIFICATION', 'modules': 'ACTIVE_AT_ASSIGNMENT_FINAL_RESULTS_AWAITED', 'portfolio': 'FOLLOWS_MODULES_FINAL_RESULTS_AWAITED'},
]
prior_manifest = OUT.parent / 'addendum-d68c2dc/artifact-manifest.json'
for item in js(prior_manifest)['files']:
    p = prior_manifest.parent / item['path']
    assert sha(p) == item['sha256'] and p.stat().st_size == item['bytes']

report = {
    'schema': 'capiro-independent-preliminary-gate-review/1', 'capturedAtUTC': NOW, 'reviewer': 'prospects_review',
    'status': 'PRELIMINARY_FULL_BROWSER_RESULTS_AWAITED_NO_FINAL_VERDICT',
    'method': 'Read-only source, Git, raw results and byte hashing. No runtime, browser, suite, build, typecheck, Docker, provider/native execution or source/index mutation.',
    'source': identity, 'sourceCleanAtInspection': True, 'runtimeSourceUnchangedFromD68': True, 'deltaFromD68': delta,
    'completedGates': gates,
    'combined': {'parts': dict(zip(['rootNode', 'transportNode', 'portfolioVitest', 'sharedCapiroVitest'], counts)), 'total': sum(counts), 'vitestFileCounts': [89, 21], 'checkScript': js(ROOT / 'package.json')['scripts']['check']},
    'architecture': {'errors': [], 'summary': arch['sizeSummary'], 'inheritedUnreviewed': unreviewed, 'identicalInheritedRecordsToAllThreePriorCheckpoints': True},
    'lint': {'errors': 0, 'warnings': 76, 'diagnosticLines': warnings, 'entireDiagnosticRegionIdenticalToAllThreePriorCheckpoints': True},
    'correctedBrowser': {'stats': browser['stats'], 'workers': 1, 'retries': 0, 'records': cases, 'scope': '23 synthetic Portfolio cases overlap the intended full1118; no double count or full-suite substitution.'},
    'elements': {'tests': 15, 'scope': receipt['scope'], 'receipt': rec(receipt_path), 'independentBindings': element_bindings, 'captureStreamsVerified': True, 'limit': 'Dependency closure is covered by passed qualification; this reviewer separately hashed only the48 source,3 output and captured stream records.'},
    'publicPackages': {'artifacts': vendor['artifacts'], 'independentByteHashesVerified': True, 'scope': 'Governed public Meri contracts/writer inputs and offline21 transport controls; no backend/model run admission.'},
    'production': {'buildId': identity['buildId'], 'httpChecks': 11, 'themeViewportRenders': 4, 'desktopHistoryChecks': 2, 'raw': production, 'screenshotsIdenticalToD68': visual_reuse, 'visualReviewReference': str(review_paths[-3]), 'limit': 'Actual unauthenticated host shell and fail-closed routes. History is desktop-only; phone controls are header entry/return. clientNavigation means client-side routing, not selected-client authority. Earlier visual inspection is reused through equal hashes; this reviewer did not newly open screenshots.'},
    'docker': {'contextChecks': 33, 'requiredApplicationFiles': 12, 'contextOutputHashesVerified': True, 'context': context, 'image': docker, 'imageAbsenceLog': rec(absence), 'attemptHistory': 'Three failed adbc attempts plus one failed d68 and one failed1585438; none establishes an application image.', 'limit': 'Actual scratch COPY success does not qualify application image, container smoke, image scan or deployment.'},
    'sourceReviews': {'sourceMapRecordsIndependentlyRehashed': 140, 'ownerMappingsReportedByIndependentLedgerReview': 21, 'keyboardSourceHashVerified': True, 'sourceAndAssertionReviews': review_paths and [str(p) for p in review_paths], 'acceptedReviewScope': 'Bounded source preservation/cohesion only:66 original assertions retained,10 added,6 keypresses retained. Does not substitute for current full-suite results.'},
    'pending': {'modulesBrowser': 'Active at assignment; wait for root final result notification before audit.', 'portfolioBrowser': 'Follows Modules; wait for root final result notification before audit.', 'finalVerdict': 'NOT_SEALED'},
    'checkpoints': checkpoints,
    'coverage': coverage,
    'limits': {
        'native': 'No live authentication/tenant authorization, CAS/persistence/DDL/deployment, S3/provider/billing/model acceptance. No native row is newly closed.',
        'meri': '9 run-workspace Node cases within59,21 offline transport controls, assets/shared-mode/host-shell checks. Portfolio1118 and Modules208 are not full Meri interaction qualification.',
        'figma': 'Original preserved evidence only; composer435:82802 remains1x1 and parent435:82147 clipped. No complete Figma parity/file-wide revision acceptance.',
        'accessibility': 'Bounded semantics, geometry and keyboard/focus controls; no comprehensive WCAG/screen-reader/contrast/zoom/touch/cross-browser certification.',
        'library': 'Prior exact Library references were readable, but local materialization failed through proxy403; original-byte custody and authoritative content version were not established. The adbc source ZIP save failed at tools/list network discovery before upload creation. No Library upload/save of this1585438 source is evidenced.',
        'image': 'Current image absent after APKINDEX DNS failure. Container smoke and scan NOT_RUN_NO_IMAGE. No shipping/deployment claim.',
        'reviewBoundary': 'No PR16 newsletter asset/port evidence is included in this PR15 gate audit.',
    },
    'libraryReceipts': [{'record': rec(p), 'raw': js(p)} for p in library_paths],
    'sourceRecords': source_records, 'evidenceRecords': evidence,
    'priorD68PacketManifestVerifiedUnchanged': rec(prior_manifest),
    'findings': [],
    'remaining': ['Full exact-source Modules and Portfolio outcomes await root notification.', 'Actual image build/absence blocker remains.', 'Explicit native/Meri/Figma/accessibility/Library limits remain.'],
}
(OUT / 'preliminary-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'source': HEAD, 'combined': sum(counts), 'elements': 15, 'corrected': len(cases), 'sourceRecordsIndependentlyVerified': 140, 'additionalCoverageSourceFiles': len(source_records), 'evidenceRecords': len(evidence)}, indent=2))
