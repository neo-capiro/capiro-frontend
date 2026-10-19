"""Seal prepared qualification evidence after all producer inputs are released."""
from pathlib import Path
import json,hashlib,zipfile,os,stat,datetime,subprocess,sys
O=Path(__file__).parent;P=Path('/workspace/capiro-onboard-port-20261013');H='90ccdd47de7a989e822590d616d69baa15a37d5d'
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(Path(p).read_text())
def save(n,x):(O/n).write_text(json.dumps(x,indent=2)+'\n')
assert not (O/'MANIFEST.json').exists(),'Already sealed; do not overwrite'
audit=load(O/'FINAL-AUDIT-INPUTS.json');auditroot=Path(audit['groups'][0]['root']);audithash=audit['groups'][0]['manifestSha256'];assert sha((auditroot/'MANIFEST.json').read_bytes())==audithash
records=[r for p in sorted(O.glob('*PATH-MAP.json')) for r in load(p)['records']];assert len(records)==len({r['originalPath'] for r in records})
archives={n:zipfile.ZipFile(O/n) for n in {r['storage']['archive'] for r in records}};proof=[];archiveproof=[]
try:
 for n,z in sorted(archives.items()):
  assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()))
  archiveproof.append({'path':n,'bytes':(O/n).stat().st_size,'sha256':sha((O/n).read_bytes()),'members':len(z.namelist())})
 for r in records:
  b=archives[r['storage']['archive']].read(r['storage']['member']);p=Path(r['originalPath']);src=os.fsencode(os.readlink(p)) if r['kind']=='symlink' else p.read_bytes()
  assert b==src and sha(b)==r['sha256'] and len(b)==r['bytes'] and stat.S_IMODE(p.lstat().st_mode)==r['mode'],p
  proof.append({'originalPath':str(p),'sha256':r['sha256'],'bytesEqualAfterReopen':True})
finally:
 for z in archives.values():z.close()
# Every readable copy is an exact original; archives may be shared across waves.
direct=[]
for p in sorted(O.glob('*READABLE-INDEX.json')):
 for e in load(p):
  q=O/e['path'];assert q.stat().st_size==e['bytes'] and sha(q.read_bytes())==e['sha256'];direct.append(e)
assert len({e['path'] for e in direct})==len(direct)
owners=[]
for r in records:
 if Path(r['originalPath']).name!='MANIFEST.json':continue
 p=Path(r['originalPath']);m=load(p);es=m.get('records',m.get('files'))
 if not isinstance(es,list):continue
 for e in es:
  if not isinstance(e,dict) or 'path' not in e:continue
  q=p.parent/e['path'];assert sha(q.read_bytes())==e['sha256']
  if 'bytes' in e:assert q.stat().st_size==e['bytes']
 owners.append({'path':str(p),'sha256':sha(p.read_bytes()),'memberRecords':len(es),'reverified':True})
# Current source is frozen; documentation publication may begin only after this seal.
def git(*args):return subprocess.check_output(['git','-C',str(P),*args],text=True).strip()
source={'head':git('rev-parse','HEAD'),'tree':git('rev-parse','HEAD^{tree}'),'applicationTree':git('rev-parse','HEAD:apps/web'),'status':git('status','--porcelain=v1')}
assert source['head']==H and source['tree']=='2bd75625dfa0b1a8aa894a48a68f34550a6f5037' and source['applicationTree']=='002c31576d9038d4d7f6438db9db3ae9cf00171c' and source['status']=='',source
roots=['/workspace/capiro-unified-files-corrected-20261013','/workspace/capiro-unified-files-final-20261013','/workspace/capiro-unified-runtime-tmp-20261013/files-corrected-modules-browser-artifacts']+[f'/workspace/capiro-unified-runtime-tmp-20261013/files-corrected-portfolio-shard-{n}-artifacts' for n in [1,2,3,4]]
known={r['originalPath'] for r in records};coverage=[]
for root in roots:
 ps=[p for p in Path(root).rglob('*') if p.is_file() or p.is_symlink()];missing=[str(p) for p in ps if str(p) not in known];assert not missing,missing;coverage.append({'root':root,'regularFilesAndSymlinks':len(ps),'missing':[]})
save('FINAL-ALL-ORIGINALS.json',{'schema':'capiro-completed-evidence-content-addressed/1','records':records})
save('FINAL-PRESERVATION-VERIFICATION.json',{'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceAtSeal':source,'originalRecords':len(records),'originalBytes':sum(r['bytes'] for r in records),'symlinks':sum(r['kind']=='symlink' for r in records),'allOriginalBytesReopenedEqual':True,'allReadableCopiesExact':True,'directFiles':len(direct),'archives':archiveproof,'ownerManifests':owners,'runtimeRoots':coverage,'verification':proof})
save('FINAL-READABLE-INDEX.json',direct)
(O/'preparation/README.before-final-seal.md').write_bytes((O/'README.md').read_bytes())
t=(O/'README.md').read_text();t=t.replace('**All released runtime gates are complete on unchanged90cc source. Final publication seal is pending the independent gate-audit packet.**','**Sealed: completed offline qualification on unchanged90cc source, with independently reviewed evidence and preserved harness recovery.**');t=t.replace('This staging README becomes final only after inclusion of the final independent gate audit and a verified top-level publication manifest.','The final independent gate audit is included under `readable/final-independent-audit/`; its original manifest remains unchanged. `MANIFEST.json` seals the publication. `FINAL-ALL-ORIGINALS.json` and `FINAL-PRESERVATION-VERIFICATION.json` reconcile every original record, readable copy and archive member.')
t+='\nFinal independent audit: [report](readable/final-independent-audit/REPORT.md), manifest SHA256 `'+audithash+'`. Audit scope and all limitations remain those stated in that sealed report; this publication does not widen acceptance.\n';(O/'README.md').write_text(t)
old=(O/'CURRENT-STAGING.json').read_bytes();(O/'preparation/CURRENT-STAGING.before-final-seal.json').write_bytes(old);state=load(O/'CURRENT-STAGING.json');state.update({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'SEALED_PUBLICATION_OFFLINE_GATES_WITH_PRESERVED_HARNESS_RECOVERY','includedOriginalRecords':len(records),'includedOriginalBytes':sum(r['bytes'] for r in records),'pending':[],'finalIndependentAudit':{'root':str(auditroot),'manifestSha256':audithash},'remainingAcceptanceLimits':['open inherited console reconciliation issue','76 lint warnings and23 inherited architecture signals','native337/default-disabled authority','Office rendering/recalculation','fullFigma/theme/AT/WCAG','musl/image/deployment']});save('CURRENT-STAGING.json',state)
files=[{'path':str(p.relative_to(O)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(O.rglob('*')) if p.is_file() and p!=O/'MANIFEST.json']
manifest={'sealedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':H,'rootTree':source['tree'],'applicationTree':source['applicationTree'],'status':'SEALED_VERIFIED_OFFLINE_QUALIFICATION_EVIDENCE_WITH_LIMITS','fileCount':len(files),'bytes':sum(e['bytes'] for e in files),'files':files}
save('MANIFEST.json',manifest)
for e in load(O/'MANIFEST.json')['files']:
 p=O/e['path'];assert p.stat().st_size==e['bytes'] and sha(p.read_bytes())==e['sha256']
print(json.dumps({'directory':str(O),'files':len(files),'bytes':manifest['bytes'],'manifestSha256':sha((O/'MANIFEST.json').read_bytes()),'originalRecords':len(records),'originalBytes':sum(r['bytes'] for r in records),'archiveBytes':sum(a['bytes'] for a in archiveproof),'directFiles':len(direct),'source':source},indent=2))
