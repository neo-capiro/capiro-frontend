"""Run one exact final gate; retain immutable attempts and refuse unbound evidence.

Usage: python run-final-checkpoint.py NAME npm run SCRIPT
The four admitted commands are listed in COMMANDS. No caller-supplied filters or
output overrides are admitted. Documentation below docs/ may change during gates;
HEAD and every other committed input must remain identical.
Exit 0: the gate passed admission; exit 1: command/admission failure;
exit 2: invalid arguments.
"""

from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import uuid

COMMANDS = {
    'check': ['npm', 'run', 'check'],
    'build': ['npm', 'run', 'build'],
    'production': ['npm', 'run', 'test:production'],
    'browser': ['npm', 'run', 'test:browser'],
}
EVIDENCE_PATH = Path('outputs/evidence/portfolio-shared-integration-20261011')
SCHEMA_VERSION = 2
DISCOVERY_TIMEOUT_SECONDS = 60


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new_json(path, value):
    with path.open('x') as output:
        output.write(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root)


def committed_source(root, checkpoint, require_head=True):
    """Hash working bytes only after matching each Git blob, mode and file set."""
    current = git(root, 'rev-parse', 'HEAD').decode().strip()
    if require_head:
        require(current == checkpoint, 'HEAD changed during the final checkpoint')
    else:
        subprocess.run(['git', 'merge-base', '--is-ancestor', checkpoint, current], cwd=root, check=True)
    staged = git(root, 'diff', '--cached', '--name-only', '-z', checkpoint).decode().split('\0')
    extras = git(root, 'ls-files', '--others', '--exclude-standard', '-z').decode().split('\0')
    dirty = [name for name in staged + extras if name and not name.startswith('docs/')]
    require(not dirty, 'Non-documentation index changes/untracked inputs: ' + repr(sorted(set(dirty))))
    algorithm = git(root, 'rev-parse', '--show-object-format').decode().strip()
    hashes, blobs, modes = {}, {}, {}
    for entry in git(root, 'ls-tree', '-r', '-z', checkpoint).split(b'\0'):
        if not entry:
            continue
        metadata, raw_name = entry.split(b'\t', 1)
        mode, kind, object_id = metadata.decode().split()
        name = os.fsdecode(raw_name)
        if name.startswith('docs/'):
            continue
        require(kind == 'blob', 'Unsupported non-file committed input: ' + name)
        path = root / name
        info = path.lstat()
        if mode == '120000':
            require(stat.S_ISLNK(info.st_mode), 'Expected committed symlink: ' + name)
            data = os.fsencode(os.readlink(path))
        else:
            require(mode in ('100644', '100755') and stat.S_ISREG(info.st_mode), 'Wrong committed file type: ' + name)
            require(bool(info.st_mode & stat.S_IXUSR) == (mode == '100755'), 'Executable mode differs from commit: ' + name)
            data = path.read_bytes()
        actual_blob = hashlib.new(algorithm, b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        require(actual_blob == object_id, 'Working bytes differ from committed source: ' + name)
        hashes[name] = hashlib.sha256(data).hexdigest()
        blobs[name], modes[name] = object_id, mode
    require(hashes, 'Empty committed source inventory')
    if require_head:
        require(git(root, 'rev-parse', 'HEAD').decode().strip() == checkpoint, 'HEAD changed while verifying committed bytes')
    return {'schema_version': SCHEMA_VERSION, 'source_head': checkpoint, 'file_count': len(hashes),
            'sha256': hashes, 'git_blobs': blobs, 'modes': modes, 'git_object_format': algorithm}


def browser_inventory(report, completed=False):
    require(isinstance(report.get('suites'), list) and not report.get('errors'), 'Missing browser suites or report-level errors')
    inventory = []

    def visit(suite, parents):
        titles = parents + [suite['title']]
        for spec in suite.get('specs', []):
            for test in spec.get('tests', []):
                item = {'id': spec['id'], 'project_id': test['projectId'], 'project_name': test['projectName'],
                        'file': spec['file'], 'line': spec['line'], 'column': spec['column'], 'titles': titles + [spec['title']]}
                require(test['expectedStatus'] == 'passed', 'Skipped/expected-failure test is not a passed final gate: ' + spec['title'])
                if completed:
                    results = test.get('results', [])
                    require(spec.get('ok') is True and test.get('status') == 'expected', 'Non-passing browser case: ' + spec['title'])
                    require(len(results) == 1, 'Missing, retried or partial browser result: ' + spec['title'])
                    result = results[0]
                    require(result.get('status') == 'passed' and result.get('retry') == 0 and not result.get('errors') and not result.get('error'), 'Unsuccessful browser result: ' + spec['title'])
                inventory.append(item)
        for child in suite.get('suites', []):
            visit(child, titles)

    for suite in report['suites']:
        visit(suite, [])
    keys = [(item['id'], item['project_id']) for item in inventory]
    require(inventory and len(set(keys)) == len(keys), 'Empty or duplicate browser inventory')
    return sorted(inventory, key=lambda item: (item['id'], item['project_id']))


def browser_configuration(report, root, discovery=False):
    config = report['config']
    expected_version = read_json(root / 'apps/web/package.json')['devDependencies']['@playwright/test']
    require(config.get('version') == expected_version, 'Browser runtime differs from the committed Playwright version')
    expected = ['test'] + (['--list', '--reporter=json', '--forbid-only'] if discovery else [])
    require(config.get('argv', [])[2:] == expected, 'Browser command contained a filter/override or is not the admitted command')
    require(Path(config['configFile']).resolve() == root / 'apps/web/playwright.config.ts', 'Wrong browser configuration')
    require(Path(config['rootDir']).resolve() == root / 'apps/web/tests/browser', 'Wrong browser test directory')
    require(config.get('shard') is None, 'Sharded browser gate is incomplete')
    require(all(project.get('repeatEach') == 1 for project in config['projects']), 'Repeated browser inventory is not admitted')
    if discovery:
        require(config.get('forbidOnly') is True, 'Discovery did not prohibit focused tests')


def validate_browser(attempt, receipt, root):
    """Independently recompute admission from the two complete raw reports."""
    discovery = read_json(attempt / 'browser-discovery.json')
    report = read_json(attempt / 'browser-results.json')
    browser_configuration(discovery, root, discovery=True)
    browser_configuration(report, root)
    expected = browser_inventory(discovery)
    require(read_json(attempt / 'browser-inventory.json') == expected, 'Discovery inventory file disagrees with raw discovery')
    require(browser_inventory(report, completed=True) == expected, 'Browser results do not cover the complete discovered inventory')
    stats = report['stats']
    require(type(stats.get('expected')) is int and stats['expected'] == len(expected), 'Browser passed count does not match discovered inventory')
    require(all(type(stats.get(key)) is int and stats[key] == 0 for key in ('unexpected', 'skipped', 'flaky')), 'Browser run has failures/skips/flakes')
    start = datetime.fromisoformat(receipt['command_started_utc'])
    finish = datetime.fromisoformat(receipt['command_finished_utc'])
    report_start = datetime.fromisoformat(stats['startTime'].replace('Z', '+00:00'))
    require(start - timedelta(seconds=1) <= report_start <= finish, 'Browser report is stale or outside this command lifetime')
    require(isinstance(stats.get('duration'), (int, float)) and 0 <= stats['duration'] <= (finish - start).total_seconds() * 1000 + 1000, 'Invalid/partial browser duration')
    require(report_start + timedelta(milliseconds=stats['duration']) <= finish + timedelta(seconds=1), 'Browser completion exceeds its command lifetime')
    return stats, expected


def latest_attempt(run, name):
    candidates = sorted((run / 'attempts').glob(name + '-*'))
    require(candidates, 'No schema-2 final attempt for ' + name + '; legacy receipts remain historical only')
    attempt = candidates[-1]
    require((attempt / 'attempt-start.json').is_file() and (attempt / 'receipt.json').is_file(), 'Latest gate attempt is incomplete: ' + str(attempt))
    return attempt


def preserve_tree(source, target, receipt, root):
    if source.exists():
        require(not target.exists(), 'Attempt artifact destination already exists')
        shutil.move(str(source), str(target))
        receipt.setdefault('artifact_path_map', []).append({'original': str(source.relative_to(root)), 'preserved': str(target.relative_to(root))})


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if argv == ['--help']:
        print(__doc__)
        return 0
    if not argv or argv[0] not in COMMANDS or argv[1:] != COMMANDS[argv[0]]:
        print('Expected NAME followed by its exact admitted npm command: ' + repr(COMMANDS), file=sys.stderr)
        return 2
    root = Path.cwd().resolve()
    require(Path(git(root, 'rev-parse', '--show-toplevel').decode().strip()).resolve() == root, 'Run this helper from the repository root')
    head = git(root, 'rev-parse', 'HEAD').decode().strip()
    name, command = argv[0], argv[1:]
    started = datetime.now(timezone.utc)
    attempt_id = name + '-' + started.strftime('%Y%m%dT%H%M%S%fZ') + '-' + uuid.uuid4().hex[:8]
    attempt = root / EVIDENCE_PATH / ('final-' + head[:7]) / 'attempts' / attempt_id
    attempt.mkdir(parents=True, exist_ok=False)
    receipt = {'schema_version': SCHEMA_VERSION, 'source_head': head, 'gate': name, 'attempt_id': attempt_id,
               'command': command, 'started_utc': started.isoformat(), 'runner_sha256': digest(Path(__file__)),
               'command_exit_code': None, 'exit_code': 1, 'source_changed_during_check': [], 'admission_errors': [],
               'log': str((attempt / 'gate.log').relative_to(root))}
    write_new_json(attempt / 'attempt-start.json', receipt)
    environment = os.environ.copy()
    working_results = root / 'apps/web/test-results'
    outputs_prepared = False
    try:
        before = committed_source(root, head)
        write_new_json(attempt / 'source-before.json', before)
        if name == 'browser':
            preserve_tree(working_results, attempt / 'preexisting-test-results', receipt, root)
            outputs_prepared = True
            discovery = COMMANDS[name] + ['--', '--list', '--reporter=json', '--forbid-only']
            environment['PLAYWRIGHT_JSON_OUTPUT_FILE'] = str(attempt / 'browser-discovery.json')
            receipt['discovery_command'] = discovery
            with (attempt / 'discovery.log').open('x') as log:
                result = subprocess.run(discovery, cwd=root, stdout=log, stderr=subprocess.STDOUT, env=environment, timeout=DISCOVERY_TIMEOUT_SECONDS)
            require(result.returncode == 0, 'Browser inventory discovery failed')
            raw_discovery = read_json(attempt / 'browser-discovery.json')
            browser_configuration(raw_discovery, root, discovery=True)
            write_new_json(attempt / 'browser-inventory.json', browser_inventory(raw_discovery))
            require(committed_source(root, head) == before, 'Committed source changed during discovery')
            environment['PLAYWRIGHT_JSON_OUTPUT_FILE'] = str(attempt / 'browser-results.json')
            require(not (attempt / 'browser-results.json').exists(), 'Browser report existed before this command')
        elif name == 'production':
            preserve_tree(working_results / 'production-standalone', attempt / 'preexisting-production', receipt, root)
            outputs_prepared = True
        receipt['command_started_utc'] = datetime.now(timezone.utc).isoformat()
        with (attempt / 'gate.log').open('x') as log:
            result = subprocess.run(command, cwd=root, stdout=log, stderr=subprocess.STDOUT, env=environment)
        receipt['command_finished_utc'] = datetime.now(timezone.utc).isoformat()
        receipt['command_exit_code'] = result.returncode
        require(result.returncode == 0, 'Gate command failed: ' + str(result.returncode))
        if name == 'browser':
            stats, inventory = validate_browser(attempt, receipt, root)
            receipt.update({'browser_stats': stats, 'browser_test_count': len(inventory),
                            'browser_report_sha256': digest(attempt / 'browser-results.json'),
                            'browser_discovery_sha256': digest(attempt / 'browser-discovery.json'),
                            'browser_inventory_sha256': digest(attempt / 'browser-inventory.json')})
    except (Exception, KeyboardInterrupt) as error:
        receipt['admission_errors'].append(type(error).__name__ + ': ' + str(error))
    finally:
        try:
            after = committed_source(root, head)
            write_new_json(attempt / 'source-after.json', after)
            if 'before' in locals():
                require(before == after, 'Non-documentation source changed during gate')
        except Exception as error:
            message = type(error).__name__ + ': ' + str(error)
            receipt['source_changed_during_check'].append(message)
            receipt['admission_errors'].append(message)
        try:
            if outputs_prepared and name == 'browser':
                preserve_tree(working_results, attempt / 'browser-artifacts', receipt, root)
            elif outputs_prepared and name == 'production':
                preserve_tree(working_results / 'production-standalone', attempt / 'production-artifacts', receipt, root)
        except Exception as error:
            receipt['admission_errors'].append('Artifact preservation failed: ' + str(error))
        finished = datetime.now(timezone.utc)
        receipt.update({'finished_utc': finished.isoformat(), 'duration_seconds': (finished - started).total_seconds(),
                        'exit_code': 0 if receipt['command_exit_code'] == 0 and not receipt['admission_errors'] else 1})
        receipt['evidence_sha256'] = {path.name: digest(path) for path in attempt.iterdir() if path.is_file()}
        write_new_json(attempt / 'receipt.json', receipt)
    print(json.dumps(receipt))
    return receipt['exit_code']


if __name__ == '__main__':
    sys.exit(main())
