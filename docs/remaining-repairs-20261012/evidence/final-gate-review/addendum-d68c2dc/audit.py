"""Read-only receipt, source and artifact audit; executes no application/test tools."""
import collections
import datetime
import hashlib
import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path('/workspace/capiro-remaining')
BASE = pathlib.Path('/tmp/capiro-remaining-qualification')
E = BASE / 'final-d68c2dc'
OUT = pathlib.Path(__file__).parent
HEAD = 'd68c2dc6b80c400b8ce9b07837f7a14cabb5d616'
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat()

def js(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def rec(p): return {'path': str(p), 'bytes': p.stat().st_size, 'sha256': sha(p)}
def git(*args): return subprocess.check_output(['git', '-C', str(ROOT), *args], text=True).strip()
def architecture(s): return json.JSONDecoder().raw_decode(s[s.index('{\n  "errors"'):])[0]
def flatten(d):
    result = []
    def walk(suites):
        for suite in suites:
            for spec in suite.get('specs', []):
                for t in spec.get('tests', []):
                    result.append({'file': spec['file'], 'line': spec['line'], 'title': spec['title'], 'status': t['status'], 'attempts': [{'status': r['status'], 'retry': r['retry']} for r in t['results']]})
            walk(suite.get('suites', []))
    walk(d['suites'])
    return result

assert git('rev-parse', 'HEAD') == HEAD
assert git('status', '--short') == ''
identity = js(E / 'BUILD-IDENTITY.json')
assert identity['source'] == HEAD
for key, ref in [('rootTree', 'HEAD^{tree}'), ('applicationTree', 'HEAD:apps/web'), ('runtimeSourceTree', 'HEAD:apps/web/src')]:
    assert git('rev-parse', ref) == identity[key]
assert (ROOT / 'apps/web/.next/BUILD_ID').read_text().strip() == identity['buildId']

# Deliberately restrict to the completed gates assigned by the parent. Do not
# consume a live suite or infer its outcome from its progress log.
gate_names = ['clean-install', 'corrected-regressions', 'combined-check', 'elements-prepare', 'elements-check', 'production-build', 'production-server', 'docker-context', 'docker-build', 'modules-browser']
gates = []
for name in gate_names:
    p = E / (name + '-exit.json')
    d = js(p)
    assert d['sourceBefore'] == d['sourceAfter'] and not d['sourceChanged']
    assert d['sourceBefore'] == {'head': HEAD, 'tree': identity['rootTree'], 'applicationTree': identity['applicationTree'], 'sourceDiff': ''}
    assert d['exitCode'] == (1 if name in ['docker-build', 'modules-browser'] else 0)
    gates.append({'name': name, 'status': 'failed_before_application_compile' if name == 'docker-build' else 'failed' if name == 'modules-browser' else 'passed', 'receipt': rec(p), 'raw': d, 'log': rec(E / (name + '.log'))})

log = (E / 'combined-check.log').read_text()
oldlog = (BASE / 'final-adbc84b/combined-check.log').read_text()
firstlog = (BASE / 'final-104495d/combined-check.log').read_text()
counts = [int(v) for v in re.findall(r'ℹ tests (\d+)', log)] + [int(v) for v in re.findall(r'Tests\s+(\d+) passed', log)]
assert counts == [59, 21, 1275, 117] and sum(counts) == 1472
assert re.findall(r'Test Files\s+(\d+) passed', log) == ['89', '21']
assert re.findall(r'ℹ pass (\d+)', log) == ['59', '21']
assert re.findall(r'ℹ (?:fail|cancelled|skipped|todo) (\d+)', log) == ['0'] * 8
arch, oldarch, firstarch = map(architecture, [log, oldlog, firstlog])
assert arch['errors'] == []
assert arch['sizeSummary'] == {'total': 427, 'reviewed': 403, 'inheritedUnreviewed': 24, 'blocking': 0}
unreviewed = [x for x in arch['sizeFindings'] if x['reviewStatus'] == 'unreviewed']
assert len(unreviewed) == 24 and all(x['provenance'] == 'inherited-unchanged' and not x['blocking'] for x in unreviewed)
assert unreviewed == [x for x in oldarch['sizeFindings'] if x['reviewStatus'] == 'unreviewed']
assert unreviewed == [x for x in firstarch['sizeFindings'] if x['reviewStatus'] == 'unreviewed']
def lint_section(s): return s[s.index('> eslint src tests'):s.index('> prettier --check')]
lint = lint_section(log)
assert lint == lint_section(oldlog) == lint_section(firstlog)
warnings = [x.strip() for x in lint.splitlines() if re.match(r'\s+\d+:\d+\s+warning\s+', x)]
assert len(warnings) == 76 and '76 problems (0 errors, 76 warnings)' in lint
assert 'All matched files use Prettier code style!' in log
package_scripts = js(ROOT / 'package.json')['scripts']
assert package_scripts['check'] in log
assert len(re.findall(r'^test\(', (ROOT / 'apps/web/test/run-workspace.test.mjs').read_text(), re.M)) == 9

browser = js(E / 'corrected-regression-results.json')
cases = flatten(browser)
assert len(cases) == 23 and all(x['status'] == 'expected' and x['attempts'] == [{'status': 'passed', 'retry': 0}] for x in cases)
assert browser['stats']['expected'] == 23 and all(browser['stats'][key] == 0 for key in ['unexpected', 'skipped', 'flaky']) and browser['errors'] == []
assert browser['config']['workers'] == 1 and all(p['retries'] == 0 and p['repeatEach'] == 1 for p in browser['config']['projects'])
modules = js(E / 'modules-browser-results.json')
module_cases = flatten(modules)
assert len(module_cases) == 208
assert sum(x['status'] == 'expected' for x in module_cases) == 207
assert sum(x['status'] == 'unexpected' for x in module_cases) == 1
assert all(len(x['attempts']) == 1 and x['attempts'][0]['retry'] == 0 for x in module_cases)
assert modules['stats']['expected'] == 207 and modules['stats']['unexpected'] == 1
assert modules['stats']['skipped'] == modules['stats']['flaky'] == 0
assert modules['config']['workers'] == 1 and all(p['retries'] == 0 for p in modules['config']['projects'])
assert not (E / 'portfolio-browser-exit.json').exists() and not (E / 'portfolio-browser-results.json').exists()

elements_log = (E / 'elements-check.log').read_text()
assert re.findall(r'ℹ tests (\d+)', elements_log) == ['15'] and re.findall(r'ℹ pass (\d+)', elements_log) == ['15']
assert re.findall(r'ℹ (?:fail|cancelled|skipped|todo) (\d+)', elements_log) == ['0'] * 4
receipt = js(E / 'elements-ssr/receipt.json')
assert sha(E / 'elements-ssr/receipt.json') == '6c6315f7d9fb239b2a9f7c455d897d291088cc94620ca43933aab11ce36b3d34'
elements_bindings = []
for kind, base in [('sources', ROOT), ('outputs', E / 'elements-ssr')]:
    for item in receipt[kind]:
        p = base / item['path']
        assert p.stat().st_size == item['bytes'] and sha(p) == item['sha256']
    elements_bindings.append({'kind': kind, 'checked': len(receipt[kind]), 'mismatches': []})
process = js(E / 'elements-captures/process.json')
assert process['status'] == 0 and process['error'] is None
for name, expected in process['streams'].items():
    p = E / 'elements-captures' / (name + '.bin')
    assert p.stat().st_size == expected['bytes'] and sha(p) == expected['sha256']
vendor = js(ROOT / 'vendor/meri-public-packages.json')
for item in vendor['artifacts']:
    p = ROOT / 'vendor' / item['file']
    assert p.stat().st_size == item['bytes'] and sha(p) == item['sha256']

context_path = pathlib.Path('/tmp/capiro-remaining-docker-evidence/context-frozen-d68c2dc')
context = js(context_path / 'report.json')
assert context['sourceCommit'] == HEAD and context['buildExitCode'] == 0
assert context['scriptSha256'] == sha(ROOT / 'scripts/docker-context-regression.mjs')
assert context['ignoreSha256'] == sha(ROOT / '.dockerignore')
assert len(context['checks']) == 33 and context['requiredApplicationFiles'] == 12
for i, check in enumerate(context['checks']):
    assert check['passed'] and check['present'] == check['expectedIncluded']
    output = context_path / 'output/context' / check['path']
    assert output.exists() == check['expectedIncluded']
    if output.exists():
        assert sha(output) == check['actualSha256'] == check['expectedSha256']
    if i < 12:
        assert sha(ROOT / check['path']) == check['expectedSha256']
docker_log = (E / 'docker-build.log').read_text()
assert 'DNS: transient error' in docker_log and '[base 2/3] RUN apk add' in docker_log and 'failed to build' in docker_log

production = js(E / 'production-artifacts/production-smoke.json')
http = [x for x in production['results'] if 'path' in x]
renders = [x for x in production['results'] if 'viewport' in x]
history = [x for x in production['results'] if 'crossMode' in x]
assert [len(http), len(renders), len(history)] == [11, 4, 2]
assert production['pageErrors'] == [] and all(x['headers'] == 'passed' for x in http)
assert all(x['portfolio']['fits'] and x['portfolio']['sameDocument'] and x['stylesRestoredOnReturn'] and x['clientNavigation'] and x['headerNavigation'] for x in renders)
assert all(x['sameDocument'] and x['history'] == 'back/forward' for x in history)

# Keep the prior mappings as source-only references. Their former browser pass
# records must never be promoted to this successor's pending full qualification.
prior = js(OUT.parent / 'report.json')
coverage = []
for item in prior['coverage']:
    row = {k: item[k] for k in ['id', 'coverage', 'testFiles', 'sourceReferences', 'limitations']}
    row['currentCompletedBrowserMatches'] = [x for x in cases if 'apps/web/tests/browser/' + x['file'] in row['testFiles']]
    row['currentModulesMatches'] = [x for x in module_cases if 'apps/web/test/browser/' + x['file'] in row['testFiles']]
    row['status'] = 'modules_contains_failed_keyboard_case' if any(x['status'] != 'expected' for x in row['currentModulesMatches']) else 'bounded_evidence_complete_portfolio_full_suite_not_run'
    if row['id'] == 'figma':
        row['limitations'] = ['Original preserved design evidence only; full composer target 435:82802 is 1x1 and parent 435:82147 clipped. No complete immutable Figma revision, full visual parity or native acceptance is established by these gates. No live design tools were used for this review.']
    if row['id'] == 'desktop_mobile_accessibility':
        row['coverage'] = 'Representative component specs assert desktop/mobile geometry, dark colors, image loading and control containment; dialog/editor/toolbar specs assert keyboard and focus behavior. This exact Modules run has one failed phone keyboard grouping case. Actual Next numeric theme/viewport measurements passed at 1440x1040 and 390x844 in light and dark; no new screenshot-to-Figma comparison was performed by this reviewer.'
    coverage.append(row)
source_names = {x['path'] for row in coverage for x in row['sourceReferences']}
source_names.update(x for row in coverage for x in row['testFiles'])
source_names.update(['AGENTS.md', 'docs/IMPLEMENTATION-STANDARDS.md', 'docs/ARCHITECTURE.md', 'package.json', 'package-lock.json', 'apps/web/package.json', 'apps/web/playwright.config.ts', 'apps/web/test/browser/playwright.config.ts', 'apps/web/tests/browser/fixtures.ts', 'apps/web/test/browser/fixtures.ts', 'apps/web/tests/browser/server.mjs', 'apps/web/test/browser/server.mjs', 'apps/web/test/run-workspace.test.mjs', 'apps/web/tests/production/run-standalone.mjs', 'apps/web/tests/production/verify-standalone.mjs', 'scripts/docker-context-regression.mjs', '.dockerignore', 'apps/web/Dockerfile', 'vendor/meri-public-packages.json', 'scripts/architecture/reviewed-size-findings.json'])
source_records = []
for name in sorted(source_names):
    p = ROOT / name
    assert p.is_file(), name
    blob = subprocess.check_output(['git', '-C', str(ROOT), 'show', HEAD + ':' + name])
    assert blob == p.read_bytes(), name
    source_records.append({'relativePath': name, **rec(p)})

checkpoints = []
for directory, exit_name in [('final-adbc84b', 'portfolio-browser-exit.json'), ('final-104495d', 'portfolio-meri-browser-exit.json')]:
    p = BASE / directory
    old = js(p / 'portfolio-browser-results.json')
    rows = flatten(old)
    checkpoints.append({'directory': str(p), 'result': rec(p / 'portfolio-browser-results.json'), 'receipt': rec(p / exit_name), 'exitCode': js(p / exit_name)['exitCode'], 'stats': old['stats'], 'records': len(rows), 'interrupted': sum(any(a['status'] == 'interrupted' for a in r['attempts']) for r in rows), 'unrun': sum(not r['attempts'] for r in rows), 'failures': [r for r in rows if r['status'] == 'unexpected']})
assert checkpoints[0]['stats']['expected'] == 1115 and checkpoints[0]['stats']['unexpected'] == 3
assert checkpoints[1]['stats']['expected'] == 163 and checkpoints[1]['stats']['unexpected'] == 7 and checkpoints[1]['interrupted'] == 3 and checkpoints[1]['unrun'] == 945
old_docker = [{'receipt': rec(p), 'exitCode': js(p)['exitCode']} for p in sorted((BASE / 'final-adbc84b').glob('docker-build*-exit.json'))]
assert len(old_docker) == 3 and all(x['exitCode'] != 0 for x in old_docker)

evidence = [rec(E / 'BUILD-IDENTITY.json'), rec(E / 'corrected-regression-results.json'), rec(E / 'modules-browser-results.json'), rec(E / 'elements-ssr/receipt.json'), rec(E / 'elements-captures/process.json'), rec(E / 'production-artifacts/production-smoke.json'), rec(E / 'production-artifacts/preview-root-smoke.json'), rec(context_path / 'report.json')]
failure_artifacts = E / 'modules-browser-artifacts/remaining-modules-MS08-sco-10d0d-ard-operable-at-phone-width'
for p in sorted(failure_artifacts.iterdir()):
    if p.is_file(): evidence.append(rec(p))
for g in gates: evidence.extend([g['receipt'], g['log']])

report = {
    'schema': 'capiro-independent-final-gate-addendum/1',
    'reviewedAtUTC': NOW,
    'reviewer': 'prospects_review',
    'status': 'failed_d68_checkpoint_modules_207_pass_1_fail_portfolio_not_run',
    'method': 'Read-only Git/source/raw receipt inspection and Python byte/count comparisons. No runtime, browser, test runner, build, typecheck, native call or source mutation by reviewer.',
    'source': identity,
    'sourceStatus': 'clean; every completed wrapper pins the same before/after commit/tree/applicationTree and empty tracked diff; mapped files also compared byte-for-byte to Git HEAD',
    'completedGates': gates,
    'combined': {'parts': dict(zip(['rootNode', 'transportNode', 'portfolioVitest', 'sharedCapiroVitest'], counts)), 'total': sum(counts), 'vitestFiles': [89, 21], 'checkScript': package_scripts['check'], 'workspaceTypechecks': ['@capiro/web', '@capiro/meri-client', '@capiro/qualification-elements', '@capiro/ui'], 'format': 'all matched files passed'},
    'architecture': {'errors': [], 'summary': arch['sizeSummary'], 'inheritedUnreviewed': unreviewed, 'identicalInheritedRecordsToAdbcAnd104': True, 'interpretation': '24 unchanged inherited findings remain unreviewed, not accepted design reviews; all 403 reviewed records remain visible separately.'},
    'lint': {'errors': 0, 'warnings': 76, 'diagnosticLines': warnings, 'fullDiagnosticRegionIdenticalToAdbcAnd104': True},
    'correctedBrowser': {'stats': browser['stats'], 'workers': 1, 'retries': 0, 'records': cases, 'scope': '23 synthetic Portfolio fixture cases; not additional distinct tests beyond the upcoming 1118 full suite.'},
    'elements': {'tests': 15, 'scope': receipt['scope'], 'receipt': rec(E / 'elements-ssr/receipt.json'), 'independentBindings': elements_bindings, 'captureStreamsVerified': True, 'receiptDependencyEntries': len(receipt['dependencies']), 'dependencyLimit': 'This independent audit rehashed 48 source and 3 output files plus captured streams; dependency closure is covered by the passed gate, not a second full dependency audit.'},
    'publicPackages': {'artifacts': vendor['artifacts'], 'independentByteHashesVerified': True, 'scope': 'Two governed Meri package inputs. Offline transport uses real public producer/factory and external Chat with injected mock fetch; it does not execute trusted backend admission or a model.'},
    'production': {'buildId': identity['buildId'], 'httpChecks': len(http), 'themeViewportRenders': len(renders), 'historyChecks': len(history), 'raw': production, 'previewRoot': js(E / 'production-artifacts/preview-root-smoke.json'), 'limit': 'Actual unauthenticated host standalone shell and fail-closed adapter checks; no fixture/service interception in this smoke, but no live sign-in or protected native data.'},
    'docker': {'context': {'checks': 33, 'requiredApplicationFiles': 12, 'independentOutputPresenceHashesVerified': True, 'report': context}, 'image': {'status': 'failed', 'exitCode': 1, 'phase': 'base image apk index DNS/package selection before application compile', 'successfulImage': False, 'containerSmoke': 'unrun'}, 'preservedAdbcBuildFailures': old_docker, 'limit': 'Scratch COPY context qualification is not an application image build or container runtime acceptance.'},
    'modulesBrowser': {'stats': modules['stats'], 'workers': 1, 'retries': 0, 'records': module_cases, 'failure': {'source': 'apps/web/test/browser/remaining-modules.spec.ts', 'testLine': 277, 'assertionLine': 301, 'expected': 'Group by contains None', 'actual': 'Group by · Client', 'diagnosis': 'Undetermined here; suspected focus-readiness synchronization requires separate owner trace review. Failure is retained, not excused or predicted fixed.'}},
    'pending': {'portfolioBrowser': {'planned': 1118, 'status': 'NOT_RUN', 'basis': 'Parent explicitly paused before starting Portfolio following the full Modules failure; no result/exit receipt exists.'}, 'updateRule': 'A successor source requires fresh gates. Preserve this failed d68 checkpoint; do not rewrite it into a success.'},
    'coverage': coverage,
    'meriLimit': '9 Node run-workspace cases are included in root59; 21 offline transport cases plus asset/shared-navigation/host-shell checks exist. No distinct fresh full Meri interaction suite is established by Portfolio1118 or Modules208.',
    'nativeLimit': 'Mocked identity/current reads/403/401/delayed writes and receipts qualify frontend behavior only. Native authentication, tenant authorization, persistence/CAS, DDL/deployment, S3, provider delivery/billing/model calls remain unrun here. No row-level native acceptance is closed by this audit.',
    'visualAccessibilityLimit': 'Representative fixture desktop/mobile and keyboard/focus controls plus host render measurements do not establish complete Figma parity, WCAG/screen-reader/contrast/zoom/touch or cross-browser certification. A phone keyboard grouping test failed on this exact source; full Portfolio is not run.',
    'priorCheckpointsPreserved': checkpoints,
    'sourceRecords': source_records,
    'evidenceRecords': evidence,
    'findings': [{'id': 'D68-GATE-01', 'kind': 'qualification_failure', 'summary': 'Full Modules phone keyboard grouping control failed at remaining-modules.spec.ts:301; 207 pass, 1 fail. No source/root-cause classification is made by this receipt audit.'}],
    'remainingBlockers': ['Modules failed; Portfolio1118 was not run. Owner diagnosis/correction and fresh successor qualification required.', 'Actual Docker image build blocked at Alpine DNS/index acquisition; no successful image/container smoke.', 'Native, full Meri interaction, complete Figma and comprehensive accessibility qualification remain outside this evidence.'],
}
(OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
(OUT / 'inherited-findings-and-warnings.json').write_text(json.dumps({'architecture': report['architecture'], 'lint': report['lint']}, indent=2) + '\n')
print(json.dumps({'source': HEAD, 'combined': sum(counts), 'correctedBrowser': len(cases), 'elements': 15, 'architecture': arch['sizeSummary'], 'sourceFilesPinned': len(source_records), 'evidenceRecords': len(evidence), 'status': report['status']}, indent=2))
