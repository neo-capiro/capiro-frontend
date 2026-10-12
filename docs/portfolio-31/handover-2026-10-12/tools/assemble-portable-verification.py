"""Copy exact completed gate receipts and selected evidence into repository docs.

This helper remains an intermediate artifact. It refuses incomplete, changed-source,
or failing final gates; historical failed checkpoints are preserved separately.

Usage: python assemble-portable-verification.py COMMITTED_SOURCE
Exit 0: a new verified packet was published; exit 1: admission/publication failed;
exit 2: invalid arguments. Run from the repository root after all four final gates.
"""

import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone


ROOT = Path.cwd()
EVIDENCE = ROOT / 'outputs/evidence/portfolio-shared-integration-20261011'
DESTINATION = ROOT / 'docs/portfolio-31/verification-2026-10-11'
BASE = '02c02d95bdf3949662b9123f425271c6491ffdab'
RUNNER = EVIDENCE / 'run-final-checkpoint.py'
_spec = importlib.util.spec_from_file_location('final_checkpoint_helpers', RUNNER)
gate_helpers = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate_helpers)
require = gate_helpers.require


def read_json(path):
    return json.loads(path.read_text())


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def copied(source, target, description, expected=None):
    require(source.is_file(), 'Missing evidence input: ' + str(source))
    data = source.read_bytes()
    actual = hashlib.sha256(data).hexdigest()
    require(expected is None or actual == expected, 'Evidence input changed: ' + str(source))
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as output:
        output.write(data)
    require(digest(target) == actual, 'Evidence copy differs from pinned bytes')
    return {
        'file': target.relative_to(DESTINATION).as_posix(),
        'description': description,
        'sha256': actual,
        'bytes': len(data),
        'original_local_path': str(source.relative_to(ROOT)) if source.is_relative_to(ROOT) else str(source),
    }


def compressed(source, target, description, expected=None):
    require(source.is_file(), 'Missing evidence input: ' + str(source))
    data = source.read_bytes()
    actual = hashlib.sha256(data).hexdigest()
    require(expected is None or actual == expected, 'Evidence input changed: ' + str(source))
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as output:
        output.write(gzip.compress(data, mtime=0))
    require(gzip.decompress(target.read_bytes()) == data, 'Compressed evidence does not round trip')
    return {
        'file': target.relative_to(DESTINATION).as_posix(),
        'description': description,
        'sha256': digest(target),
        'bytes': target.stat().st_size,
        'decompressed_sha256': actual,
    }


def architecture_from_check(output):
    reports = []
    for match in re.finditer(r'(?m)^\{\s*$', output):
        try:
            value, _ = json.JSONDecoder().raw_decode(output[match.start():])
        except ValueError:
            continue
        if isinstance(value, dict) and 'sizeSummary' in value:
            reports.append(value)
    require(len(reports) == 1, 'Ambiguous architecture report in check output')
    result = reports[0]
    require(not result['errors'] and result['sizeSummary']['blocking'] == 0, 'Architecture gate has blocking findings')
    return result


def write_readme(report):
    checkpoint = report['source_checkpoint']
    units = report['portfolio_units']
    browser = report['final_browser']
    architecture = report['architecture']
    lines = [
        '# Portfolio continuation verification',
        '',
        f"Source checkpoint: `{checkpoint}`. Recorded {report['recorded_at_utc']}.",
        '',
        'The four combined local gates passed against identical non-documentation',
        'source. The manifest pins committed application, package, test and build inputs.',
        'Later documentation commits do not change this source qualification.',
        '',
        '| Gate | Result | Duration | Exact receipt |',
        '| --- | --- | --- | --- |',
    ]
    results = {
        'check': f"Passed; {units['cases_passed']} Portfolio unit cases in {units['files_passed']} files, plus package/type/foundation/transport/lint/format/architecture gates",
        'build': 'Passed; canonical Next standalone build',
        'production': 'Passed; actual standalone HTTP/navigation/theme/wordmark smoke',
        'browser': f"{browser['expected']} passed; zero failed, skipped or flaky",
    }
    for name, receipt in report['gates'].items():
        lines.append(f"| `{name}` | {results[name]} | {receipt['duration_seconds']:.2f} s | [{name}.json](./gates/{name}.json) |")
    lines.extend([
        '',
        '## Source and organization',
        '',
        f"The architecture guard scanned {architecture['modules']} modules and {architecture['routes']} route entries. It reports {architecture['total']} size signals: {architecture['reviewed']} exact reviewed findings, {architecture['inheritedUnreviewed']} unchanged inherited findings and zero blocking findings. Inherited findings remain unreviewed; they are not blanket approvals.",
        '',
        'Portfolio uses the existing `capirov2` contracts recorded in the continuation',
        'reports. The canonical application is `apps/web`; feature operations,',
        'read models and presentation retain focused domain owners. The public',
        'Meri interfaces and the unrelated Meri draft PR are outside this feature work.',
        '',
        '- [Source manifest](./source-manifest.json) pins every committed non-documentation input.',
        '- [Verification record](./verification.json) contains exact gate receipts and environment details.',
        '- [Architecture report](./gates/architecture.json) preserves every boundary and size finding.',
        '- [Artifact manifest](./artifact-manifest.json) records copied evidence hashes and provenance.',
        '- The `gates` directory contains complete compressed logs, browser discovery/inventory and the complete browser result tree.',
        '- `helpers` preserves the exact runner, assembler, reconciler and pinned artifact selection. Prior attempts cannot be overwritten and the latest incomplete/failed attempt cannot be selected.',
        '- The `integrations` directory retains frozen-source/cohort records; focused totals overlap.',
        '- The `captures` directory contains selected inspected synthetic and actual-server captures, labelled by their scope in the manifest.',
        '',
        '## Historical failures and corrections',
        '',
        'The earlier full browser run at `0beb51c` had 603 passes and three failures.',
        'Its receipt and exact failure facts remain under `historical`. One setup',
        'timeout occurred before the test body during build contention. A Calendar',
        'case depended on a timed fixture response, and a 12-route visual case',
        'shared one timeout budget. The correction uses an explicit response gate',
        'and separate route tests while preserving existing assertions. Its 33-case',
        'pass remains separate from the final source qualification.',
        '',
        '## Acceptance and shipment',
        '',
        'All 345 canonical audit IDs and historical authority are retained. There',
        'are 337 in-scope open rows, seven pending packet exclusions, the owner',
        'exclusion CORE-018 and zero finally accepted rows. Synthetic qualification',
        'does not establish signed-in service permissions, persistence, concurrency,',
        'provider behavior, payment or full responsive Figma acceptance.',
        '',
        'The local Chromium build is 149.0.7827.0; Playwright 1.61.1 expects',
        '149.0.7827.55. The remote pinned-browser gate is a separate requirement.',
        'Publication, preview inventory, shipment and signed-in acceptance must be',
        'read from actual execution records in the current handover. This directory',
        'records source verification and does not imply a deployment.',
        '',
        '[Current continuation](../CONTINUATION-2026-10-11.md) contains the per-slice',
        'Figma references, native limits and restart steps.',
        '',
    ])
    (DESTINATION / 'README.md').write_text('\n'.join(lines))


def admitted_attempt(run, name, checkpoint, expected_source):
    attempt = gate_helpers.latest_attempt(run, name)
    receipt = read_json(attempt / 'receipt.json')
    start = read_json(attempt / 'attempt-start.json')
    for value in (start, receipt):
        require(value['schema_version'] == gate_helpers.SCHEMA_VERSION, 'Wrong gate receipt schema')
        require(value['gate'] == name and value['attempt_id'] == attempt.name, 'Wrong gate/attempt identity')
        require(value['source_head'] == checkpoint, 'Wrong gate source checkpoint')
        require(value['command'] == gate_helpers.COMMANDS[name], 'Gate command was not admitted')
        require(value['runner_sha256'] == digest(RUNNER), 'Runner changed since final gate')
    require(start['started_utc'] == receipt['started_utc'], 'Attempt start/receipt mismatch')
    require(receipt['command_exit_code'] == receipt['exit_code'] == 0, 'Latest gate attempt failed: ' + name)
    require(receipt['admission_errors'] == [] and receipt['source_changed_during_check'] == [], 'Gate evidence was not admitted')
    files = receipt['evidence_sha256']
    require({'attempt-start.json', 'source-before.json', 'source-after.json', 'gate.log'} <= set(files), 'Incomplete gate evidence hash inventory')
    for filename, expected in files.items():
        require(Path(filename).name == filename, 'Escaping attempt evidence path')
        require(digest(attempt / filename) == expected, 'Attempt evidence changed: ' + str(attempt / filename))
    for filename in ('source-before.json', 'source-after.json'):
        require(read_json(attempt / filename) == expected_source, 'Gate bytes do not match the committed checkpoint: ' + name)
    if name == 'browser':
        require({'browser-discovery.json', 'browser-inventory.json', 'browser-results.json', 'discovery.log'} <= set(files), 'Missing browser evidence inputs')
        stats, inventory = gate_helpers.validate_browser(attempt, receipt, ROOT)
        require(receipt['browser_stats'] == stats and receipt['browser_test_count'] == len(inventory), 'Browser raw report/receipt disagreement')
        for field, filename in [('browser_report_sha256', 'browser-results.json'), ('browser_discovery_sha256', 'browser-discovery.json'), ('browser_inventory_sha256', 'browser-inventory.json')]:
            require(receipt[field] == digest(attempt / filename), 'Browser raw evidence hash disagrees with receipt')
    return attempt, receipt


def verified_ledger(checkpoint):
    receipt = read_json(EVIDENCE / 'ledger-reconciliation.json')
    require(receipt['source_checkpoint'] == checkpoint, 'Ledger belongs to another checkpoint')
    require(receipt['all_ids'] == 345 and receipt['accepted_complete'] == 0, 'Unexpected ledger counts/acceptance')
    require(receipt['canonical_id_order_preserved'] is True and receipt['group_paths_present_in_source_commit'] is True, 'Ledger path/order checks are incomplete')
    relative = 'docs/portfolio-31/handover-2026-10-11/Portfolio-345-Row-Reconciliation-2026-10-11.json'
    require(receipt['canonical_ledger_path'] == relative, 'Wrong canonical ledger path')
    require(digest(ROOT / relative) == receipt['canonical_ledger_sha256'], 'Canonical ledger changed after reconciliation')
    require(digest(EVIDENCE / 'reconcile-current-ledger.py') == receipt['reconciler_sha256'], 'Reconciler changed after reconciliation')
    require(digest(EVIDENCE / 'portable-evidence-selection.json') == receipt['artifact_selection_sha256'], 'Evidence selection changed after reconciliation')
    baseline_bytes = subprocess.check_output(['git', 'show', BASE + ':' + relative])
    require(hashlib.sha256(baseline_bytes).hexdigest() == receipt['baseline_ledger_sha256'], 'Wrong historical ledger baseline')
    baseline, current = json.loads(baseline_bytes), read_json(ROOT / relative)
    require(current['authority'] == baseline['authority'] and current['counts'] == baseline['counts'], 'Historical ledger authority/counts changed')
    require([row['audit_id'] for row in current['rows']] == [row['audit_id'] for row in baseline['rows']], 'Historical audit-ID order changed')
    for old, row in zip(baseline['rows'], current['rows']):
        require(all(row.get(key) == value for key, value in old.items()), 'Historical ledger row changed: ' + old['audit_id'])
    require(current['current_continuation']['source_checkpoint'] == checkpoint and current['current_continuation']['accepted_complete'] == 0, 'Current ledger checkpoint/acceptance differs from receipt')
    return receipt


def selected_inputs():
    items = read_json(EVIDENCE / 'portable-evidence-selection.json')
    destinations = set()
    selected = []
    for item in items:
        relative = Path(item['destination'])
        require(not relative.is_absolute() and '..' not in relative.parts and relative.parts and relative.parts[0] in ('captures', 'integrations', 'history', 'deployment'), 'Invalid selection destination')
        require(relative.as_posix() not in destinations, 'Duplicate selected artifact destination')
        destinations.add(relative.as_posix())
        require(re.fullmatch(r'[0-9a-f]{64}', item.get('sha256', '')) is not None, 'Selection input is not frozen: ' + item['source'])
        source = Path(item['source'])
        source = source if source.is_absolute() else ROOT / source
        require(source.is_file() and digest(source) == item['sha256'], 'Selected frozen input changed/missing: ' + str(source))
        selected.append((source, relative, item))
    return selected


def main():
    global DESTINATION
    if sys.argv[1:] == ['--help']:
        print(__doc__)
        return 0
    if len(sys.argv) != 2 or sys.argv[1].startswith('-'):
        print(__doc__, file=sys.stderr)
        return 2
    helper_names = ('run-final-checkpoint.py', 'assemble-portable-verification.py', 'reconcile-current-ledger.py', 'portable-evidence-selection.json')
    helper_hashes = {filename: digest(EVIDENCE / filename) for filename in helper_names}
    checkpoint = subprocess.check_output(['git', 'rev-parse', sys.argv[1] + '^{commit}'], text=True).strip()
    run = EVIDENCE / ('final-' + checkpoint[:7])
    committed = gate_helpers.committed_source(ROOT, checkpoint, require_head=False)
    admitted = {name: admitted_attempt(run, name, checkpoint, committed) for name in gate_helpers.COMMANDS}
    receipts = {name: value[1] for name, value in admitted.items()}
    stats = receipts['browser']['browser_stats']
    ledger = verified_ledger(checkpoint)
    selection = selected_inputs()
    check_output = (admitted['check'][0] / 'gate.log').read_text()
    unit_files = re.findall(r'Test Files\s+(\d+) passed', check_output)
    unit_cases = re.findall(r'\bTests\s+(\d+) passed', check_output)
    require(len(unit_files) == len(unit_cases) == 1, 'Ambiguous Portfolio unit totals')
    architecture = architecture_from_check(check_output)
    final_destination = DESTINATION
    require(not final_destination.exists(), 'Portable destination already exists; preserve/review it explicitly before a new publication')
    DESTINATION = Path(tempfile.mkdtemp(prefix='portable-staging-' + checkpoint[:7] + '-', dir=EVIDENCE))
    artifacts = []
    for name, (attempt, receipt) in admitted.items():
        artifacts.append(copied(attempt / 'receipt.json', DESTINATION / 'gates' / (name + '.json'), 'Exact admitted final ' + name + ' attempt receipt.'))
        artifacts.append(compressed(attempt / 'gate.log', DESTINATION / 'gates' / (name + '.log.gz'), 'Complete final ' + name + ' output.', receipt['evidence_sha256']['gate.log']))
        for filename in ('source-before.json', 'source-after.json', 'attempt-start.json'):
            artifacts.append(copied(attempt / filename, DESTINATION / 'gates' / (name + '-' + filename), 'Exact final attempt source/lifetime input.', receipt['evidence_sha256'][filename]))
    artifacts.append(copied(admitted['check'][0] / 'source-before.json', DESTINATION / 'source-manifest.json', 'Committed Git blob/mode and SHA-256 inventory, identical across all four gates.', receipts['check']['evidence_sha256']['source-before.json']))
    for filename in ('browser-results.json', 'browser-discovery.json', 'browser-inventory.json', 'discovery.log'):
        artifacts.append(compressed(admitted['browser'][0] / filename, DESTINATION / 'gates' / (filename + '.gz'), 'Complete raw browser execution/discovery evidence.', receipts['browser']['evidence_sha256'][filename]))
    artifacts.append(copied(EVIDENCE / 'ledger-reconciliation.json', DESTINATION / 'ledger-verification.json', 'Exact canonical-ledger hash and preservation checks.'))
    for filename in helper_names:
        artifacts.append(copied(EVIDENCE / filename, DESTINATION / 'helpers' / filename, 'Exact helper/selection used to produce this portable packet.', helper_hashes[filename]))

    historical = [
        ('final-0beb51c/check-receipt.json', 'check-0beb51c.json'),
        ('final-0beb51c/build-receipt.json', 'build-0beb51c.json'),
        ('final-0beb51c/browser-receipt.json', 'browser-0beb51c.json'),
        ('historical-browser-failures.json', 'browser-failures-0beb51c.json'),
        ('root-corrections-browser/receipt.json', 'root-browser-corrections.json'),
    ]
    for original, filename in historical:
        artifacts.append(copied(EVIDENCE / original, DESTINATION / 'historical' / filename, 'Historical checkpoint; not final-source qualification.'))
    selected_attempts = {value[0] for value in admitted.values()}
    for attempt in sorted((run / 'attempts').iterdir()):
        if not attempt.is_dir() or attempt in selected_attempts:
            continue
        for source in sorted(attempt.iterdir()):
            if source.is_file():
                artifacts.append(compressed(source, DESTINATION / 'historical/current-checkpoint-attempts' / attempt.name / (source.name + '.gz'), 'Earlier checkpoint attempt, including failed/incomplete evidence; not selected as the final gate.'))
    for source, relative, item in selection:
        artifacts.append(copied(source, DESTINATION / relative, item['description'], item['sha256']))
    save_json(DESTINATION / 'gates/architecture.json', architecture)
    report = {
        'recorded_at_utc': datetime.now(timezone.utc).isoformat(),
        'frontend_repository': 'neo-capiro/capiro-frontend',
        'frontend_branch': 'codex/portfolio-continuation-20261011',
        'source_base': BASE,
        'source_checkpoint': checkpoint,
        'native_reference': 'neo-capiro/capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace',
        'scope': 'Portfolio frontend using existing capirov2 services; no Modules or Meri feature implementation.',
        'all_final_gates_passed': True,
        'same_non_documentation_source_for_all_gates': True,
        'source_file_count': committed['file_count'],
        'portfolio_units': {'files_passed': int(unit_files[0]), 'cases_passed': int(unit_cases[0])},
        'architecture': {**architecture['sizeSummary'], 'modules': len(architecture['graph']), 'routes': len(architecture['routes'])},
        'final_browser': stats,
        'gates': receipts,
        'ledger': ledger,
        'acceptance': {'in_scope_open': 337, 'packet_exclusions': 7, 'owner_exclusions': 1, 'accepted_complete': 0},
        'environment': {'node': '24.19.0', 'npm': '11.9.0', 'playwright': '1.61.1', 'local_chromium': '149.0.7827.0', 'playwright_expected_chromium': '149.0.7827.55', 'pinned_browser_build_gate': 'separate; requires remote execution'},
        'limitations': [
            'Focused cohorts overlap and must not be summed with the final suite.',
            'Local synthetic qualification does not establish live native authorization, persistence, concurrency, provider behavior or signed-in acceptance.',
            'Publication and preview shipment are separate from source verification.',
            'Failed/prior attempt logs and raw report facts are retained; large raw traces remain in immutable local attempt artifact directories.',
        ],
    }
    save_json(DESTINATION / 'verification.json', report)
    write_readme(report)
    for filename in ('gates/architecture.json', 'verification.json', 'README.md'):
        target = DESTINATION / filename
        artifacts.append({'file': filename, 'description': 'Generated from the admitted pinned inputs in this packet.', 'sha256': digest(target), 'bytes': target.stat().st_size})
    save_json(DESTINATION / 'artifact-manifest.json', {'source_checkpoint': checkpoint, 'artifacts': artifacts})
    require(gate_helpers.committed_source(ROOT, checkpoint, require_head=False) == committed, 'Committed source changed during assembly')
    require(verified_ledger(checkpoint) == ledger, 'Ledger receipt changed during assembly')
    require(all(digest(EVIDENCE / filename) == expected for filename, expected in helper_hashes.items()), 'Helper/selection changed during assembly')
    for name, (attempt, receipt) in admitted.items():
        require(gate_helpers.latest_attempt(run, name) == attempt and read_json(attempt / 'receipt.json') == receipt, 'A newer or changed gate attempt appeared during assembly')
    require(not final_destination.exists(), 'Portable destination appeared during assembly')
    DESTINATION.rename(final_destination)
    print(json.dumps({'source_checkpoint': checkpoint, 'artifacts': len(artifacts), 'destination': str(final_destination), 'portfolio_units': report['portfolio_units'], 'browser': stats}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
