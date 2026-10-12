"""Verify downloaded package and source metadata without executing package code."""
from pathlib import Path, PurePosixPath
import base64
import collections
import hashlib
import json
import posixpath
import tarfile
import datetime

ROOT = Path(__file__).parent
PIN = '62d057b4a17b2c038920f10b93e83e51e46239bc'
EXPECTED = '697d826647e88e7f8559da386be7de1ae6408dc61c73877b86c2e17275fd63ab'
packet = ROOT / 'backend/docs/shared-newsletter-packed-distribution-20261012'
manifest = json.loads((packet / 'PACKED-MANIFEST.json').read_text())
canonical = json.loads((packet / 'evidence/canonical-source-binding.json').read_text())
consumer = json.loads((packet / 'CONSUMER-QUALIFICATION.json').read_text())
tarpath = ROOT / 'artifact/capiro-shared-0.0.0.tgz'
tarbytes = tarpath.read_bytes()
sha256 = lambda value: hashlib.sha256(value).hexdigest()
blob = lambda value: hashlib.sha1(f'blob {len(value)}\0'.encode() + value).hexdigest()
integrity = 'sha512-' + base64.b64encode(hashlib.sha512(tarbytes).digest()).decode()
origin = json.loads((ROOT / 'ARTIFACT-ORIGIN.json').read_text())
assert len(tarbytes) == 510772 and sha256(tarbytes) == EXPECTED == consumer['tarballSha256']
assert blob(tarbytes) == origin['gitBlob']
assert integrity == consumer['integrity']
for pack in manifest['packs']:
    assert pack['sha256'] == EXPECTED and pack['integrity'] == integrity and pack['bytes'] == len(tarbytes)

entries = {}
tar_rows = []
expected_entries = {row['path']: row for row in manifest['packedEntries']}
with tarfile.open(tarpath, 'r:gz') as tar:
    for member in tar.getmembers():
        path = PurePosixPath(member.name)
        assert member.isfile() and not path.is_absolute() and '..' not in path.parts and path.parts[0] == 'package'
        assert member.name not in entries and '\\' not in member.name
        raw = tar.extractfile(member).read()
        expected = expected_entries[member.name]
        assert member.size == len(raw) == expected['bytes'] and oct(member.mode) == expected['mode']
        assert sha256(raw) == expected['sha256']
        entries[member.name] = raw
        tar_rows.append({'path': member.name, 'bytes': len(raw), 'mode': oct(member.mode), 'sha256': sha256(raw)})
assert len(entries) == 182 and set(entries) == set(expected_entries)

shared_tree = json.loads((ROOT / 'GIT-SHARED-TREE.json').read_text())
root_tree = json.loads((ROOT / 'GIT-ROOT-TREE.json').read_text())
assert shared_tree['truncated'] is False
git_rows = {'packages/shared/' + row['path']: row for row in shared_tree['tree'] if row['type'] == 'blob'}
root_config = next(row for row in root_tree['tree'] if row['path'] == 'tsconfig.base.json')
git_rows['tsconfig.base.json'] = root_config
assert set(git_rows) == {row['path'] for row in canonical['canonicalFiles']} and len(git_rows) == 39
source_rows = []
for row in canonical['canonicalFiles']:
    current = git_rows[row['path']]
    raw = (ROOT / 'backend/tsconfig.base.json').read_bytes() if row['path'] == 'tsconfig.base.json' else entries['package/' + row['path'].removeprefix('packages/shared/')]
    assert current['sha'] == row['gitBlob'] == blob(raw)
    assert current['mode'] == row['mode'] and current['size'] == row['bytes'] == len(raw)
    assert sha256(raw) == row['sha256']
    source_rows.append({'path': row['path'], 'gitBlob': blob(raw), 'bytes': len(raw), 'sha256': sha256(raw), 'matchesPinnedBackendTree': True})

origins = []
for name in ['BACKEND-FILE-ORIGINS.json', 'BACKEND-FILE-ORIGINS-ADDITIONAL.json']:
    for row in json.loads((ROOT / name).read_text()):
        raw = (ROOT / 'backend' / row['path']).read_bytes()
        assert blob(raw) == row['gitBlob']
        origins.append({**row, 'bytes': len(raw), 'sha256': sha256(raw), 'verifiedGitBlob': True})

package = json.loads(entries['package/package.json'])
assert package == canonical['package'] and entries['package/package.json'] == (ROOT / 'backend/packages/shared/package.json').read_bytes()
assert package['name'] == '@capiro/shared' and package['version'] == '0.0.0' and package['private'] is True
assert not package.get('dependencies') and not package.get('peerDependencies')
assert not set(package.get('scripts', {})) & {'preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack'}
targets = []
for key, conditions in package['exports'].items():
    for condition, target in conditions.items():
        assert 'package/' + target.removeprefix('./') in entries
        targets.append({'export': key, 'condition': condition, 'target': target})
assert all(not key.startswith(('./src/', './dist/')) and '*' not in key for key in package['exports'])

maps = []
for name, raw in entries.items():
    if not name.endswith('.map'):
        continue
    data = json.loads(raw)
    assert not data.get('sourceRoot') or not PurePosixPath(data['sourceRoot']).is_absolute()
    sources = []
    for source in data['sources']:
        assert not PurePosixPath(source).is_absolute() and '://' not in source and '\\' not in source
        resolved = posixpath.normpath(posixpath.join(posixpath.dirname(name), data.get('sourceRoot', ''), source))
        assert resolved.startswith('package/src/') and resolved in entries
        sources.append(resolved)
    maps.append({'path': name, 'sources': sources})
assert len(maps) == 72
declarations = [name for name in entries if name.endswith('.d.ts')]
dist = [name for name in entries if name.startswith('package/dist/')]
assert len(declarations) == 36 and len(dist) == 144

review = {
    'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'status': 'PASS_STATIC_PROVENANCE_AND_CONTENT_ONLY',
    'backendCommit': PIN,
    'backendTree': root_tree['sha'],
    'artifactSourceCommit': canonical['source'],
    'artifactSHA256': EXPECTED,
    'artifactBytes': len(tarbytes),
    'artifactGitBlob': origin['gitBlob'],
    'integrity': integrity,
    'tarEntries': len(entries),
    'unpackedBytes': sum(len(raw) for raw in entries.values()),
    'allRegular': True,
    'duplicateOrUnsafePaths': [],
    'entryModes': dict(collections.Counter(row['mode'] for row in tar_rows)),
    'packageName': package['name'],
    'packageVersion': package['version'],
    'packagePrivate': package['private'],
    'packageMetadataMatchesPinnedBackend': True,
    'declarations': len(declarations),
    'mapsResolveInsidePackedSources': len(maps),
    'distFiles': len(dist),
    'canonicalSourceAndCompilerFilesMatchPinnedTree': len(source_rows),
    'downloadedBackendFilesGitVerified': len(origins),
    'publicExportTargets': targets,
    'installPackageExecutionCompilerBuildBrowserProviderRun': False,
    'frontendAndPriorEvidenceEdits': False,
    'limits': ['Static evidence inspection only; backend import/compiler/bundle/VM/116 characterization results are reported producer/reviewer evidence, not rerun here.', 'Only newsletter/newsletter-render browser closure is scoped for adoption; full root export is not browser-qualified.', 'Runtime source maps being present is not frontend installation, visual, asset-serving or native authority acceptance.'],
}
(ROOT / 'STATIC-VERIFICATION.json').write_text(json.dumps(review, indent=2) + '\n')
(ROOT / 'ENTRY-VERIFICATION.json').write_text(json.dumps(tar_rows, indent=2) + '\n')
(ROOT / 'SOURCE-CONTINUITY.json').write_text(json.dumps(source_rows, indent=2) + '\n')
(ROOT / 'BACKEND-CONTENT-VERIFICATION.json').write_text(json.dumps(origins, indent=2) + '\n')
(ROOT / 'MAP-VERIFICATION.json').write_text(json.dumps(maps, indent=2) + '\n')
print(json.dumps({key: review[key] for key in ['status', 'artifactBytes', 'artifactSHA256', 'tarEntries', 'declarations', 'mapsResolveInsidePackedSources', 'canonicalSourceAndCompilerFilesMatchPinnedTree']}))
