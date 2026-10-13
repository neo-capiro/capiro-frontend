from pathlib import Path
import base64, datetime, hashlib, json, subprocess, tarfile

OUT=Path(__file__).parent
REPO=Path('/workspace/capiro-newsletter-port')
SEALED=Path('/tmp/capiro-newsletter-package-verification')
RAW=Path('/tmp/capiro-newsletter-package-consumer-evidence')
sha=lambda data:hashlib.sha256(data).hexdigest()
def git(*args):
    return subprocess.check_output(['git','-C',str(REPO),*args])
def load(path): return json.loads(path.read_text())
def save(name,value): (OUT/name).write_text(json.dumps(value,indent=2)+'\n')

seal=load(SEALED/'EVIDENCE-MANIFEST.json')
assert sha((SEALED/'EVIDENCE-MANIFEST.json').read_bytes())=='871fdf273c65172b2f11e0b139d5e427cb52300abc526ffc94db4d016b11bf1a'
for item in seal['files']:
    data=(SEALED/item['path']).read_bytes()
    assert len(data)==item['bytes'] and sha(data)==item['sha256'],item['path']
artifact=REPO/'vendor/capiro-shared-0.0.0.tgz'
raw=artifact.read_bytes()
assert raw==(SEALED/'artifact/capiro-shared-0.0.0.tgz').read_bytes()
integrity='sha512-'+base64.b64encode(hashlib.sha512(raw).digest()).decode()
vendor=load(REPO/'vendor/newsletter-public-packages.json')['artifacts'][0]
assert vendor['sha256']==sha(raw) and vendor['integrity']==integrity and vendor['bytes']==len(raw)
assert vendor['browserExports']==['@capiro/shared/newsletter','@capiro/shared/newsletter-render']
members=[]
installed=Path('/tmp/capiro-newsletter-consumer-install/node_modules/@capiro/shared')
with tarfile.open(artifact) as tar:
    for member in tar.getmembers():
        assert member.isfile()
        data=tar.extractfile(member).read()
        path=Path(member.name)
        assert path.parts[0]=='package' and '..' not in path.parts and not path.is_absolute()
        assert data==(installed/Path(*path.parts[1:])).read_bytes(),member.name
        members.append({'path':member.name,'bytes':len(data),'sha256':sha(data)})
assert len(members)==182
bindings=load(REPO/'packages/qualification-newsletter/fixtures/PUBLIC-ENTRY-BINDINGS.json')
entrymap={item['path']:item for item in members}
for item in bindings['entries']:
    assert item['bytes']==entrymap[item['path']]['bytes'] and item['sha256']==entrymap[item['path']]['sha256']
assert len(bindings['entries'])==10

fixtures=[]
for name in ['renderer-characterizations.cjs','original-C-renderer-golden.json','consumer-positive.ts','consumer-negative.ts']:
    original=(SEALED/'consumer-corpus'/name).read_bytes()
    data=(REPO/'packages/qualification-newsletter/fixtures'/name).read_bytes()
    assert data==original,name
    fixtures.append({'name':name,'bytes':len(data),'sha256':sha(data)})
golden=load(SEALED/'consumer-corpus/original-C-renderer-golden.json')
assert len(golden)==116 and len({x['name'] for x in golden})==116
assert load(RAW/'browser-initial/browser-renderer-results.json')==golden

old=json.loads(git('show','HEAD:package-lock.json'))
new=load(REPO/'package-lock.json')
oldpackages=old.pop('packages'); newpackages=new.pop('packages')
assert old==new
assert all(newpackages.get(key)==value for key,value in oldpackages.items())
added={key:value for key,value in newpackages.items() if key not in oldpackages}
assert set(added)=={'node_modules/@capiro/qualification-newsletter','node_modules/@capiro/shared','packages/qualification-newsletter'}
assert added['node_modules/@capiro/shared']=={'version':'0.0.0','resolved':'file:vendor/capiro-shared-0.0.0.tgz','integrity':integrity}
package=load(REPO/'packages/qualification-newsletter/package.json')
assert added['packages/qualification-newsletter']['dependencies']==package['dependencies']
assert added['packages/qualification-newsletter']['devDependencies']==package['devDependencies']

graph=load(RAW/'browser-initial/browser-module-graph.json')
expected={str(installed/'dist'/f'{name}.js') for name in vendor['runtimeClosure']}
expected.update(str(REPO/'packages/qualification-newsletter'/name) for name in ['browser-entry.mjs','fixed-clock.mjs','fixtures/renderer-characterizations.cjs'])
assert len(graph)==8 and {x['id'] for x in graph}==expected
assert all(not x.get('external') for x in graph)
assert all(set(x['imports'])<=expected for x in graph)
for kind in ['node','browser']:
    text=(RAW/f'declarations-initial/{kind}-negative.log').read_text()
    assert text.count('error TS')==3 and text.count('error TS2345')==2 and text.count('error TS2322')==1
    assert 'invented-kind' in text and 'invented-platform' in text
    assert "number' is not assignable to type 'string'" in text

sourcePaths=git('diff','--name-only','HEAD').decode().splitlines()+git('ls-files','--others','--exclude-standard').decode().splitlines()
sources=[]
for name in sorted(set(sourcePaths)):
    p=REPO/name
    assert p.is_file() and not p.is_symlink(),name
    data=p.read_bytes()
    sources.append({'path':name,'bytes':len(data),'sha256':sha(data)})
    if name!='vendor/capiro-shared-0.0.0.tgz':
        target=OUT/'source-snapshot'/name
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(data)
assert not any(x['path'].startswith('apps/') for x in sources)
save('SOURCE-BINDINGS.json',{'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseHead':git('rev-parse','HEAD').decode().strip(),'uncommitted':True,'files':sources})
(OUT/'source.diff').write_bytes(git('diff','HEAD'))
save('CONTENT-VERIFICATION.json',{'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS',
    'sealedEvidenceFilesUnchanged':len(seal['files']),'sealedManifestSHA256':sha((SEALED/'EVIDENCE-MANIFEST.json').read_bytes()),
    'artifactBytes':len(raw),'artifactSHA256':sha(raw),'artifactIntegrity':integrity,
    'installedTarEntriesByteIdentical':len(members),'publicRuntimeDeclarationBindings':len(bindings['entries']),
    'producerFixtures':fixtures,'goldenCaseCount':len(golden),'browserSavedResultsEqualGolden':True,
    'existingLockRecordsUnchanged':len(oldpackages),'addedLockRecords':added,'otherLockFieldsUnchanged':True,
    'browserGraph':graph,'newApplicationFilesOrEdits':False,'sourceSnapshotFiles':len(sources),
    'reviewerExecuted':'Hash/content verification and CLI smoke only; no package consumer/browser/compiler/install rerun'})
print(json.dumps({'status':'PASS','tarEntries':len(members),'fixtures':len(fixtures),'cases':len(golden),
                  'unchangedLockRecords':len(oldpackages),'addedLockRecords':len(added),'snapshotFiles':len(sources)},indent=2))
