"""Package completed raw evidence without following aliases. Exit0 verified,1 refused."""
from pathlib import Path
import os,stat,json,tarfile,hashlib,subprocess,datetime,io
if not __debug__:raise RuntimeError('Assertions must be enabled')
root=Path('/workspace/capiro-meri-conversation-20261013');out=Path(__file__).parent
selection=json.loads((out/'EVIDENCE-ROOTS-DRAFT.json').read_text());head=selection['source']
def git(*args):return subprocess.check_output(['git',*args],cwd=root,text=True).strip()
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  while data:=f.read(1048576):h.update(data)
 return h.hexdigest()
def refuse_walk(error):
 raise error

def inventory():
 rows=[];links=[];dirs=[]
 for name in selection['roots']:
  assert Path(name).name==name and name not in ['.','..']
  source=Path('/workspace')/name;assert source.is_dir() and not source.is_symlink()
  for parent,subdirs,files in os.walk(source,followlinks=False,onerror=refuse_walk):
   assert not any(n.startswith('.playwright-artifacts-') for n in subdirs),'Active/transient trace resources remain'
   for name2 in [*subdirs,*files]:
    p=Path(parent)/name2;s=p.lstat();relative=str(p.relative_to(Path('/workspace')))
    row={'path':relative,'original':str(p),'mode':stat.S_IMODE(s.st_mode),'mtime':s.st_mtime,'uid':s.st_uid,'gid':s.st_gid}
    if stat.S_ISLNK(s.st_mode):row['target']=os.readlink(p);links.append(row)
    elif stat.S_ISDIR(s.st_mode):dirs.append(row)
    else:
     assert stat.S_ISREG(s.st_mode),str(p)
     row.update(bytes=s.st_size,sha256=sha(p));rows.append(row)
 return sorted(rows,key=lambda r:r['path']),sorted(links,key=lambda r:r['path']),sorted(dirs,key=lambda r:r['path'])
assert git('rev-parse','HEAD')==head and not git('status','--porcelain')
gate=Path('/workspace/capiro-unified-calendar-final-gate-20261013')
for cohort,expected in [('shared',399),('portfolio',1278)]:
 r=json.loads((gate/(cohort+'-aggregate.json')).read_text());assert r['source']==head and r['passed']==r['discovered']==expected
 assert r['duplicateIds']==r['missingIds']==r['unexpected']==r['skipped']==r['flaky']==0
 assert r['singleSuccessfulAttemptPerCase'] and r['projectConfigEqualsDiscovery']
archive=out/'evidence.tar.gz';manifest_path=out/'EVIDENCE-MANIFEST.json';assert not archive.exists() and not manifest_path.exists()
rows,links,dirs=inventory();assert len({r['path'] for r in rows})==len(rows)
manifest={'source':head,'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'regularFiles':rows,'recordedSymlinks':links,'directoryMetadata':dirs,'policy':'Every selected regular evidence file is archived byte-for-byte. Borrowed/dangling symlinks are recorded only, never followed or created by extraction. Original evidence/links remain untouched. Complete generated dependency/Elements/build archives stay separately preserved and are identified by producer/reviewer hashes and restoration manifests.'}
manifest_bytes=(json.dumps(manifest,indent=2)+'\n').encode();manifest_path.write_bytes(manifest_bytes)
with tarfile.open(archive,'w:gz',compresslevel=6,dereference=False) as tar:
 for r in rows:tar.add(r['original'],arcname=r['path'],recursive=False)
 member=tarfile.TarInfo('EVIDENCE-MANIFEST.json');member.size=len(manifest_bytes);member.mode=0o644;tar.addfile(member,io.BytesIO(manifest_bytes))
expected={r['path']:r for r in rows}
with tarfile.open(archive) as tar:
 members=tar.getmembers();assert len(members)==len(rows)+1 and {m.name for m in members}==set(expected)|{'EVIDENCE-MANIFEST.json'}
 for m in members:
  assert m.isfile() or m.islnk()
  with tar.extractfile(m) as f:
   h=hashlib.sha256()
   while data:=f.read(1048576):h.update(data)
  if m.name=='EVIDENCE-MANIFEST.json':assert h.hexdigest()==hashlib.sha256(manifest_bytes).hexdigest()
  else:
   r=expected[m.name];assert h.hexdigest()==r['sha256'];assert (m.mode,m.uid,m.gid,m.mtime)==(r['mode'],r['uid'],r['gid'],r['mtime'])
assert inventory()==(rows,links,dirs),'Evidence changed while packaging'
assert git('rev-parse','HEAD')==head and not git('status','--porcelain')
receipt={'source':head,'archive':str(archive),'archiveBytes':archive.stat().st_size,'archiveSHA256':sha(archive),'regularEvidenceFiles':len(rows),'rawRegularBytes':sum(r['bytes'] for r in rows),'manifestSHA256':sha(manifest_path),'recordedSymlinks':len(links),'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'readback':'Every archived file hash and recorded metadata verified; exact member-set equality; fresh original inventory unchanged. Original evidence not removed.'}
(out/'PACKAGE-RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt),flush=True)
