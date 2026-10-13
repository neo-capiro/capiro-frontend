"""Independent read-only artifact verification; writes results only beside this script."""
from pathlib import Path, PurePosixPath
import collections, datetime, hashlib, json, os, stat, subprocess, tarfile

OUT = Path(__file__).parent
DRAFT = Path('/workspace/capiro-final-publication-draft-20261013')
GATE = Path('/workspace/capiro-unified-calendar-final-gate-20261013')
REPO = Path('/workspace/capiro-meri-conversation-20261013')
STAGED = REPO / 'docs/workspace-brief-copy-20261013/qualification-e837b334'
SOURCE = 'e837b3341e7c31dd8b349438c7d9c5086fa4eb0e'
ARCHIVE_SHA = '3a44a2dc684ae5ec496fde85839b4f3dde5da5a2098edddf8e414d49242d0ea9'

def digest(stream):
    h = hashlib.sha256()
    size = 0
    while data := stream.read(1024 * 1024):
        h.update(data)
        size += len(data)
    return h.hexdigest(), size

def sha(path):
    with path.open('rb') as stream:
        return digest(stream)[0]

def read(path):
    return json.loads(path.read_bytes())

def write(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')

def safe(name):
    p = PurePosixPath(name)
    return bool(name) and not p.is_absolute() and '..' not in p.parts and '.' not in p.parts and '\\' not in name and str(p) == name

def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO, text=True).strip()

manifest_bytes = (DRAFT / 'EVIDENCE-MANIFEST.json').read_bytes()
manifest = json.loads(manifest_bytes)
selection = read(DRAFT / 'EVIDENCE-ROOTS-DRAFT.json')
receipt = read(DRAFT / 'PACKAGE-RECEIPT.json')
assert manifest['source'] == selection['source'] == receipt['source'] == SOURCE
assert len(selection['roots']) == len(set(selection['roots'])) == 55
assert all(safe(n) and '/' not in n for n in selection['roots'])
assert sha(DRAFT / 'evidence.tar.gz') == receipt['archiveSHA256'] == ARCHIVE_SHA
assert (DRAFT / 'evidence.tar.gz').stat().st_size == receipt['archiveBytes'] == 151131241
assert hashlib.sha256(manifest_bytes).hexdigest() == receipt['manifestSHA256'] == 'e0d9156bbc46d99a8bc19559402498b14be29603330486cb0338ddacf6babab4'
expected = {r['path']: r for r in manifest['regularFiles']}
assert len(expected) == len(manifest['regularFiles']) == receipt['regularEvidenceFiles'] == 2887
assert sum(r['bytes'] for r in expected.values()) == receipt['rawRegularBytes'] == 315812354
assert len(manifest['recordedSymlinks']) == receipt['recordedSymlinks'] == 5
assert {PurePosixPath(r).parts[0] for r in expected} == set(selection['roots'])
for row in [*manifest['regularFiles'], *manifest['directoryMetadata'], *manifest['recordedSymlinks']]:
    assert safe(row['path']) and PurePosixPath(row['path']).parts[0] in selection['roots']
    assert row['original'] == str(Path('/workspace') / row['path'])

members = []
with tarfile.open(DRAFT / 'evidence.tar.gz', 'r:gz') as tar:
    all_members = tar.getmembers()
    names = [m.name for m in all_members]
    assert len(names) == len(set(names)) == 2888
    assert set(names) == set(expected) | {'EVIDENCE-MANIFEST.json'}
    for m in all_members:
        assert safe(m.name) and (m.isfile() or m.islnk()), (m.name, m.type)
        if m.islnk():
            assert safe(m.linkname) and m.linkname in expected
        with tar.extractfile(m) as stream:
            actual_hash, actual_bytes = digest(stream)
        if m.name == 'EVIDENCE-MANIFEST.json':
            assert actual_hash == hashlib.sha256(manifest_bytes).hexdigest() and actual_bytes == len(manifest_bytes)
            assert (m.mode, m.uid, m.gid, m.mtime) == (0o644, 0, 0, 0)
        else:
            row = expected[m.name]
            assert (actual_hash, actual_bytes) == (row['sha256'], row['bytes']), m.name
            assert (m.mode, m.uid, m.gid, m.mtime) == (row['mode'], row['uid'], row['gid'], row['mtime']), m.name
        members.append({'name': m.name, 'type': 'hardlink' if m.islnk() else 'regular', 'bytes': actual_bytes, 'sha256': actual_hash})
write('ARCHIVE-VERIFICATION.json', {'status': 'PASS', 'archiveSHA256': ARCHIVE_SHA, 'archiveBytes': 151131241, 'regularEvidenceFiles': 2887, 'rawRegularBytes': 315812354, 'memberCount': len(members), 'memberTypes': dict(collections.Counter(r['type'] for r in members)), 'safeNames': True, 'exactMemberSet': True, 'allMemberContentAndMetadataVerified': True, 'embeddedManifestExact': True, 'metadataOnlySymlinks': 5})

def walk_error(error):
    raise error

current = {'regularFiles': [], 'recordedSymlinks': [], 'directoryMetadata': []}
for name in selection['roots']:
    root = Path('/workspace') / name
    assert root.is_dir() and not root.is_symlink()
    for parent, dirs, files in os.walk(root, followlinks=False, onerror=walk_error):
        for name2 in [*dirs, *files]:
            p = Path(parent) / name2
            s = p.lstat()
            row = {'path': str(p.relative_to('/workspace')), 'original': str(p), 'mode': stat.S_IMODE(s.st_mode), 'mtime': s.st_mtime, 'uid': s.st_uid, 'gid': s.st_gid}
            if stat.S_ISLNK(s.st_mode):
                row['target'] = os.readlink(p)
                kind = 'recordedSymlinks'
            elif stat.S_ISDIR(s.st_mode):
                kind = 'directoryMetadata'
            else:
                assert stat.S_ISREG(s.st_mode), str(p)
                row.update(bytes=s.st_size, sha256=sha(p))
                kind = 'regularFiles'
            current[kind].append(row)
changes = {}
for kind in current:
    before = {r['path']: r for r in manifest[kind]}
    after = {r['path']: r for r in current[kind]}
    changes[kind] = {'missing': sorted(before.keys() - after.keys()), 'added': [after[k] for k in sorted(after.keys() - before.keys())], 'changed': [{'before': before[k], 'after': after[k]} for k in sorted(before.keys() & after.keys()) if before[k] != after[k]]}
write('ORIGINAL-INVENTORY-COMPARISON.json', changes)
assert not any(changes[k]['missing'] or changes[k]['changed'] for k in changes), 'Existing archived evidence changed'
assert not changes['recordedSymlinks']['added']
assert {r['path'] for r in changes['regularFiles']['added']} == {f'{GATE.name}/publication-archive-relocation/{name}' for name in ['BEFORE.json', 'COPY-VERIFIED.json', 'COMPLETED.json']}
assert {r['path'] for r in changes['directoryMetadata']['added']} == {f'{GATE.name}/publication-archive-relocation'}

parts = read(STAGED / 'PARTS.json')
assert parts['archiveSHA256'] == ARCHIVE_SHA and parts['archiveBytes'] == 151131241 and len(parts['parts']) == 7
assert sorted(p.name for p in STAGED.glob('evidence.tar.gz.part-*')) == [r['file'] for r in parts['parts']]
joined = hashlib.sha256()
for i, row in enumerate(parts['parts']):
    assert row['file'] == f'evidence.tar.gz.part-{i:02d}' and 0 < row['bytes'] <= 24 * 1024 * 1024
    p = STAGED / row['file']
    assert p.stat().st_size == row['bytes'] and sha(p) == row['sha256']
    with p.open('rb') as stream:
        while data := stream.read(1024 * 1024): joined.update(data)
assert joined.hexdigest() == ARCHIVE_SHA and sum(r['bytes'] for r in parts['parts']) == 151131241
assert (STAGED / 'PARTS.sha256').read_text() == ''.join(r['sha256'] + '  ' + r['file'] + '\n' for r in parts['parts'])
copy_pairs = [(DRAFT / 'EVIDENCE-MANIFEST.json','EVIDENCE-MANIFEST.json'), (DRAFT / 'PACKAGE-RECEIPT.json','PACKAGE-RECEIPT.json'), (DRAFT / 'EVIDENCE-ROOTS-DRAFT.json','EVIDENCE-ROOTS.json'), (DRAFT / 'package-evidence.py','package-evidence.py'), (GATE / 'FROZEN-SOURCE.json','QUALIFIED-SOURCE.json'), (GATE / 'shared-aggregate.json','shared-aggregate.json'), (GATE / 'portfolio-aggregate.json','portfolio-aggregate.json'), (GATE / 'FINAL-INPUT-REFRESH.json','FINAL-INPUT-REFRESH.json'), (GATE / 'REMOTE-PR-REFRESH.json','REMOTE-PR-REFRESH.json'), (GATE / 'runtime-review/REPORT.md','RUNTIME-REVIEW.md'), (GATE / 'final-browser-review/REPORT.md','BROWSER-REVIEW.md'), *[(GATE / 'publication-archive-relocation' / n, 'post-package-relocation/' + n) for n in ['BEFORE.json','COPY-VERIFIED.json','COMPLETED.json']], (DRAFT / 'publication-archive-relocation.log','post-package-relocation/execution.log')]
copies = []
for original, relative in copy_pairs:
    assert original.read_bytes() == (STAGED / relative).read_bytes(), relative
    copies.append({'path':relative,'original':str(original),'sha256':sha(original),'bytes':original.stat().st_size})
write('STAGED-COPY-VERIFICATION.json', {'status':'PASS','parts':parts,'joinedHash':joined.hexdigest(),'copies':copies})

before = read(GATE / 'publication-archive-relocation/BEFORE.json')
copied = read(GATE / 'publication-archive-relocation/COPY-VERIFIED.json')
completed = read(GATE / 'publication-archive-relocation/COMPLETED.json')
destination = Path(before['destination'])
source = Path(before['source'])
s = destination.lstat()
actual = {'device':s.st_dev,'inode':s.st_ino,'bytes':s.st_size,'mode':stat.S_IMODE(s.st_mode),'mtimeNs':s.st_mtime_ns,'uid':s.st_uid,'gid':s.st_gid}
assert stat.S_ISREG(s.st_mode) and actual == copied['destination']
assert all(actual[k] == before['before'][k] for k in ['bytes','mode','mtimeNs','uid','gid'])
assert sha(destination) == before['compressedSHA256'] == copied['compressedSHA256'] == completed['archiveSHA256'] == '49e6dc2049818a8d5933183f90eefd960dd8f79b6ae7314d73454f9a915bdab4'
assert actual['bytes'] == completed['archiveBytes'] == 270372695
assert source.is_symlink() and os.readlink(source) == str(destination) and source.resolve(strict=True) == destination
for name,target in before['aliasLinks'].items():
    p = Path(name)
    assert p.is_symlink() and os.readlink(p) == target and p.resolve(strict=True) == destination
assert receipt['verifiedUTC'] < before['activityBefore']['UTC'] < copied['activityAfterCopy']['UTC'] < completed['completedUTC']
assert not before['activityBefore']['matchingArchiveDescriptors'] and not copied['activityAfterCopy']['matchingArchiveDescriptors']
assert copied['sourceUnchanged'] and completed['aliasesRetained'] and completed['sourceIsVerifiedDestinationAlias']
assert read(DRAFT / 'publication-archive-relocation.log') == completed
assert sha(GATE / 'relocate-publication-archive.py') == 'f8e12d548a5cf518f307b94f0956feb05472ed6dc2f008ea074824329f3d253a'
write('RELOCATION-VERIFICATION.json', {'status':'PASS','currentDestination':actual,'compressedSHA256':completed['archiveSHA256'],'originalNowAlias':str(source),'oldAliasTargetsUnchanged':before['aliasLinks'],'packageVerifiedUTC':receipt['verifiedUTC'],'relocationCompletedUTC':completed['completedUTC'],'separatelyPublishedReceipts':True,'priorMemberReadback':'Not repeated; original archive compressed bytes independently rehashed','producerAdmissionLimits':before['activityBefore']['denied']})

assert git('rev-parse','HEAD') == SOURCE
diff_names = git('diff','--name-only','HEAD').splitlines()
assert diff_names == ['docs/workspace-brief-copy-20261013/IMPLEMENTATION.md']
untracked = git('ls-files','--others','--exclude-standard').splitlines()
assert all(p.startswith('docs/workspace-brief-copy-20261013/qualification-e837b334/') for p in untracked)
assert not git('diff','HEAD','--','apps','packages','scripts','vendor','package.json','package-lock.json','.dockerignore')
assert not git('diff','--cached','--name-only')
write('SOURCE-PUBLICATION-BOUNDARY.json', {'source':SOURCE,'rootTree':git('rev-parse','HEAD^{tree}'),'appsWebTree':git('rev-parse','HEAD:apps/web'),'productionSourceTree':git('rev-parse','HEAD:apps/web/src'),'status':git('status','--porcelain'),'changedTracked':diff_names,'untrackedPublicationFiles':untracked,'gitIndex':'No staged changes at inspection; publication files prepared in worktree','applicationManifestVendorDiff':'empty'})
write('VERIFICATION-SUMMARY.json', {'status':'PASS_ARTIFACT_CHECKS','completedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archiveSHA256':ARCHIVE_SHA,'members':2888,'roots':55,'parts':7,'existingEvidenceChanged':False,'postPackageRegularAdditions':3,'source':SOURCE,'scope':'No tests rerun; raw gate/summary reconciliation follows separately.'})
print(json.dumps(read(OUT / 'VERIFICATION-SUMMARY.json')), flush=True)
