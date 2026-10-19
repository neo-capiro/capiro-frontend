"""Inspect immutable fixture bytes and prepare unexecuted consumer inputs only."""
from pathlib import Path
import datetime
import hashlib
import json
import re

ROOT = Path(__file__).parent
SOURCE = ROOT / 'consumer-corpus'
DEST = ROOT / 'prepared-consumer'
DEST.mkdir(exist_ok=True)
REF = '62d057b4a17b2c038920f10b93e83e51e46239bc'
PREFIX = 'docs/shared-newsletter-packed-distribution-20261012/evidence/'
sha = lambda data: hashlib.sha256(data).hexdigest()
blob = lambda data: hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
origins = json.loads((ROOT / 'CORPUS-ORIGINS.json').read_text())
tree = json.loads((ROOT / 'GIT-CONSUMER-EVIDENCE-TREE.json').read_text())
assert tree['sha'] == '5be29b56305184fcfa72117c7c2bde0b96b7e2fe' and not tree['truncated']
entries = {item['path']: item for item in tree['tree']}
records = []
for origin in origins:
    assert origin['ref'] == REF and origin['path'].startswith(PREFIX)
    relative = origin['path'][len(PREFIX):]
    item = entries[relative]
    data = (ROOT / origin['localPath']).read_bytes()
    assert item['type'] == 'blob'
    assert origin['gitBlob'] == item['sha'] == blob(data), relative
    assert len(data) == item['size'], relative
    records.append({**origin, 'bytes': len(data), 'sha256': sha(data), 'gitMode': item['mode']})

golden_names = ['original-C-renderer-golden.json', 'packed-renderer-results.json', 'browser-renderer-results.json']
golden_bytes = [(SOURCE / name).read_bytes() for name in golden_names]
assert len(set(golden_bytes)) == 1
golden = json.loads(golden_bytes[0])
assert len(golden) == 116 and len({item['name'] for item in golden}) == 116
assert all(set(item) == {'name', 'value'} for item in golden)
named = {item['name']: item['value'] for item in golden}
assert named['safe link/javascript:alert(1)'] == ''
assert named['safe link/https://u:p@example.test/'] == ''
assert named['visibility without recipient denies'] == ''
assert 'aria-disabled="true"' in named['saved survey no callback disabled']
assert len([item for item in golden if item['name'].startswith('block kind/')]) == 16

runner = (SOURCE / 'qualify-packed-consumer.mjs').read_text()
runner_binding = next(item for item in records if item['path'].endswith('/qualify-packed-consumer.mjs'))
derivations = []
def save(name, data, kind, basis):
    if isinstance(data, str):
        data = data.encode()
    (DEST / name).write_bytes(data)
    derivations.append({'localPath': 'prepared-consumer/' + name, 'bytes': len(data),
                        'sha256': sha(data), 'kind': kind, 'basis': basis})

for name in ['renderer-characterizations.cjs', 'original-C-renderer-golden.json', 'consumer-positive.ts', 'consumer-negative.ts']:
    origin = next(item for item in records if item['path'].endswith('/' + name))
    save(name, (SOURCE / name).read_bytes(), 'exact Git-bound original copy', origin)

common = dict(target='ES2022', strict=True, noUncheckedIndexedAccess=True, noEmit=True,
              skipLibCheck=False, types=[], lib=['ES2022', 'DOM'])
for kind, module, resolution in [('node', 'NodeNext', 'NodeNext'), ('browser', 'ESNext', 'Bundler')]:
    for negative in [False, True]:
        suffix = '-negative' if negative else ''
        config = {'compilerOptions': {**common, 'module': module, 'moduleResolution': resolution},
                  'files': ['consumer-negative.ts' if negative else 'consumer-positive.ts']}
        save(f'tsconfig-{kind}{suffix}.json', json.dumps(config, indent=2),
             'mechanical generated-value reconstruction; no standalone original Git blob',
             {'source': runner_binding, 'lines': '92-105', 'recipe': 'JSON.stringify(config, null, 2), no trailing newline'})

def decode_literal(match):
    # These two immutable JS literals contain only escaped newlines and no interpolation.
    assert '${' not in match
    assert not re.search(r'\\(?!n)', match)
    return match.replace('\\n', '\n')

esm = re.search(r'const esmSource = `([^`]*)`;', runner).group(1)
save('consumer.mjs', decode_literal(esm), 'exact generated string literal value; no standalone original Git blob',
     {'source': runner_binding, 'lines': '80-88'})
browser = re.search(r"path.join\(consumer, 'browser-entry.mjs'\), `([^`]*)`", runner).group(1)
save('browser-entry.mjs', decode_literal(browser), 'exact generated string literal value; no standalone original Git blob',
     {'source': runner_binding, 'lines': '174'})
sandbox = '\n'.join(runner.splitlines()[125:132]) + '\n'
save('fixed-sandbox-excerpt.txt', sandbox, 'verbatim source excerpt; documentation only',
     {'source': runner_binding, 'lines': '126-132', 'requires': 'node:vm context from original runner; not a standalone runner'})
bundle = '\n'.join(runner.splitlines()[174:177]) + '\n'
save('browser-build-options-excerpt.txt', bundle, 'verbatim source excerpt; documentation only',
     {'source': runner_binding, 'lines': '175-177'})

negative_logs = [(SOURCE / f'packed-types-{kind}-negative.log').read_text() for kind in ['node', 'browser']]
assert negative_logs[0] == negative_logs[1]
for content in negative_logs:
    assert content.count('error TS') == 3
    assert content.count('error TS2345') == 2 and content.count('error TS2322') == 1

receipt = {
    'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'status': 'PASS_IMMUTABLE_FIXTURE_CONTENT_AND_PREPARATION_ONLY',
    'repository': 'neo-capiro/capirov2', 'commit': REF,
    'repositoryEvidencePrefix': PREFIX, 'evidenceTree': tree['sha'],
    'files': records, 'characterizationCases': 116,
    'caseNamesUnique': True, 'originalPackedBrowserExpectedFilesByteEqual': True,
    'goldenGitBlob': blob(golden_bytes[0]), 'goldenSHA256': sha(golden_bytes[0]),
    'goldenBytes': len(golden_bytes[0]), 'caseNames': [item['name'] for item in golden],
    'fixedDate': '2026-10-12T12:00:00.000Z', 'fixedMathRandom': 0.125,
    'compilerNegativeExpected': {'perMode': 3, 'TS2345': 2, 'TS2322': 1},
    'prepared': derivations, 'packageOrCorpusExecuted': False,
    'compilerBundlerBrowserInstallExecuted': False,
    'limits': ['Saved historical results are immutable expected evidence, not new frontend execution.',
               'Original producer runner is retained for reference, never executed or adapted in place.',
               'Generated configs and entries are explicitly derived; only four fixture copies have standalone source Git blobs.',
               'Consumer workspace/dependency manifest/lockfile integration and qualification remain root-owned.']
}
(ROOT / 'CORPUS-VERIFICATION.json').write_text(json.dumps(receipt, indent=2) + '\n')
(DEST / 'DERIVATION.json').write_text(json.dumps({'source': runner_binding, 'files': derivations,
    'execution': 'NOT_RUN', 'standaloneWorkspace': False}, indent=2) + '\n')
print(json.dumps({'status': receipt['status'], 'originalFiles': len(records), 'cases': len(golden),
                  'goldenSHA256': sha(golden_bytes[0]), 'preparedFiles': len(derivations),
                  'candidateExecution': 'NOT_RUN'}, indent=2))
