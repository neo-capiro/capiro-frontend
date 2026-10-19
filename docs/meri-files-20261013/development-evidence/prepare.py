from pathlib import Path
import os,stat,hashlib,json,zipfile,datetime,subprocess
OUT=Path(__file__).parent
ROOTS={
'adapter':'/tmp/capiro-meri-files-adapter-20261013',
'ui':'/tmp/capiro-meri-files-ui-evidence-20261013',
'proxy':'/tmp/capiro-meri-document-proxy-tests-20261013',
'browser':'/workspace/capiro-meri-files-browser-evidence-20261013',
'integration-review':'/tmp/capiro-meri-files-root-integration-review-20261013',
'standalone-review':'/tmp/capiro-meri-files-standalone-review-20261013',
'public-contract':'/tmp/capiro-meri-document-public-contract-20261013',
'pr56-operation-review':'/tmp/capiro-meri-pr56-operation-review-20261013'}
REPO=Path('/workspace/capiro-meri-files-20261013')
VENDOR=REPO/'vendor/capiro-meri-contracts-0.1.2.tgz'
EXPECTED='8a3f6c95935c368da5c01d87c599c5d13b9b62a21bc6924e7ad0b723bd5e91fa'
def sha(b):return hashlib.sha256(b).hexdigest()
def dump(n,x): (OUT/n).write_text(json.dumps(x,indent=2)+'\n')
assert VENDOR.is_file() and sha(VENDOR.read_bytes())==EXPECTED
tracked=subprocess.run(['git','-C',str(REPO),'ls-files','--error-unmatch','vendor/capiro-meri-contracts-0.1.2.tgz'],capture_output=True,text=True).returncode==0
vendor={'kind':'repository-vendor-reference','path':'vendor/capiro-meri-contracts-0.1.2.tgz','observedRepository':str(REPO),'observedHead':subprocess.check_output(['git','-C',str(REPO),'rev-parse','HEAD'],text=True).strip(),'trackedAtPreparation':tracked,'bytes':VENDOR.stat().st_size,'sha256':EXPECTED,'finalCommitBinding':'PENDING_ROOT_SOURCE_PUBLICATION','access':'Resolve path against final publication repository and verify bytes/hash; current observedRepository also contains exact bytes.'}
records=[];objects={};manifests=[];direct=[];inventories=[]
for lane,root in ROOTS.items():
 rp=Path(root);assert rp.is_dir();start=len(records)
 for parent,dirs,files in os.walk(rp,followlinks=False):
  for n in list(dirs):
   p=Path(parent)/n
   if p.is_symlink():files.append(n);dirs.remove(n)
  for n in sorted(files):
   p=Path(parent)/n;st=p.lstat();rel=str(p.relative_to(rp));kind='symlink' if stat.S_ISLNK(st.st_mode) else 'file'
   assert kind=='symlink' or stat.S_ISREG(st.st_mode),p
   data=os.fsencode(os.readlink(p)) if kind=='symlink' else p.read_bytes();h=sha(data)
   rec={'lane':lane,'path':rel,'originalPath':str(p),'kind':kind,'mode':stat.S_IMODE(st.st_mode),'mtimeNs':st.st_mtime_ns,'bytes':len(data),'sha256':h}
   if kind=='symlink':rec['target']=os.readlink(p)
   if h==EXPECTED:rec['storage']={'kind':'vendor','reference':'VENDOR-REFERENCE.json'}
   else:
    rec['storage']={'kind':'archive','archive':'objects.zip','member':'sha256/'+h};objects.setdefault(h,(str(p),kind))
   records.append(rec)
   if kind=='file' and (p.suffix.lower()=='.md' or (p.suffix.lower()=='.json' and len(data)<=160000) or (p.suffix.lower()=='.txt' and len(data)<=16000)):
    target=OUT/'readable'/lane/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    direct.append({'path':str(target.relative_to(OUT)),'originalPath':str(p),'bytes':len(data),'sha256':h})
 for mn in ['MANIFEST.json','SHA256-INDEX.json']:
  mp=rp/mn
  if not mp.exists():continue
  raw=json.loads(mp.read_text());entries=raw if isinstance(raw,list) else raw.get('records',raw.get('files',[]))
  if not isinstance(entries,list):raise RuntimeError(f'Unknown manifest structure {mp}')
  count=0; mismatches=[]
  for e in entries:
   if not isinstance(e,dict) or 'path' not in e:continue
   q=rp/e['path'];ok=q.exists() and sha(q.read_bytes())==e['sha256']
   if 'bytes' in e:ok=ok and q.stat().st_size==e['bytes']
   if not ok:mismatches.append(e['path'])
   count+=1
  manifests.append({'lane':lane,'path':str(mp),'sha256':sha(mp.read_bytes()),'recordsVerified':count,'mismatches':mismatches})
 inventories.append({'lane':lane,'root':root,'records':len(records)-start,'bytes':sum(e['bytes'] for e in records[start:]),'symlinks':sum(e['kind']=='symlink' for e in records[start:])})
assert not any(e['mismatches'] for e in manifests),manifests
with zipfile.ZipFile(OUT/'objects.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for h,(p,kind) in sorted(objects.items()):
  data=os.fsencode(os.readlink(p)) if kind=='symlink' else Path(p).read_bytes();assert sha(data)==h
  zi=zipfile.ZipInfo('sha256/'+h,date_time=(1980,1,1,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zi.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(zi,data)
verified=[]
with zipfile.ZipFile(OUT/'objects.zip') as z:
 assert len(z.infolist())==len(objects) and z.testzip() is None
 for e in records:
  data=VENDOR.read_bytes() if e['storage']['kind']=='vendor' else z.read(e['storage']['member'])
  p=Path(e['originalPath']);current=os.fsencode(os.readlink(p)) if e['kind']=='symlink' else p.read_bytes()
  assert data==current and len(data)==e['bytes'] and sha(data)==e['sha256'],p
  assert stat.S_IMODE(p.lstat().st_mode)==e['mode']
  verified.append({'originalPath':e['originalPath'],'storage':e['storage'],'bytesEqualAfterReopen':True,'sha256':e['sha256']})
for d in direct:assert sha((OUT/d['path']).read_bytes())==d['sha256']
dump('ORIGINAL-PATH-MAP.json',{'schema':'capiro-evidence-content-addressed/1','roots':inventories,'records':records})
dump('VENDOR-REFERENCE.json',vendor);dump('OWNER-MANIFEST-VERIFICATION.json',manifests);dump('READABLE-INDEX.json',direct)
dump('REOPEN-VERIFICATION.json',{'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':{'path':'objects.zip','bytes':(OUT/'objects.zip').stat().st_size,'sha256':sha((OUT/'objects.zip').read_bytes()),'uniqueMembers':len(objects),'zipCRCVerified':True},'records':verified,'allOriginalBytesEqual':True,'symlinks':sum(e['kind']=='symlink' for e in records),'note':'Symlink target bytes and per-original modes are in ORIGINAL-PATH-MAP; do not dereference on extraction.'})
pre={'status':'PREPARED_VERIFIED_AWAITING_LATE_INPUTS_NOT_FINAL_SEAL','preparedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'rootCount':len(ROOTS),'originalRecords':len(records),'originalBytes':sum(e['bytes'] for e in records),'uniqueArchivedObjects':len(objects),'archiveBytes':(OUT/'objects.zip').stat().st_size,'directFiles':len(direct),'directBytes':sum(d['bytes'] for d in direct),'ownerManifests':manifests,'vendorPointer':vendor,'excludedPending':['/tmp/capiro-meri-files-development-20261013 (mutable; root seal required)','final independent browser review (forthcoming)'],'sourceRuntimeExecution':False}
dump('PREPARATION.json',pre)
print(json.dumps({k:v for k,v in pre.items() if k not in ['ownerManifests','vendorPointer']},indent=2))
