from pathlib import Path
import json,hashlib,os,stat,zipfile,datetime,subprocess,shutil
O=Path(__file__).parent
P=Path('/workspace/capiro-meri-files-20261013')
roots={
'root-development':('/tmp/capiro-meri-files-development-20261013','d4f89ee7be69a1b12a5a5d94bfb2d9b0017b956da46c7da91673298530e3c6fc'),
'storage-preservation':('/workspace/capiro-final-storage-20261013','8b204f762256b1529f78951f46e7e154495b4cbbe21a0fdfb235452b104a1a99'),
'browser-independent-review':('/tmp/capiro-meri-files-browser-independent-review-20261013','00dfb7c6a6d0c5b06a1797a9fb600fa3adf7fc5dc49aff775e7e85c1b2a3860e')}
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(Path(p).read_text())
def save(n,d): (O/n).write_text(json.dumps(d,indent=2)+'\n')
primary=load(O/'ORIGINAL-PATH-MAP.json');assert len(primary['records'])==367
(O/'preparation').mkdir(exist_ok=True)
for n in ['README.md','PREPARATION.json','ORIGINAL-PATH-MAP.json','READABLE-INDEX.json','OWNER-MANIFEST-VERIFICATION.json','VENDOR-REFERENCE.json']:
 shutil.copyfile(O/n,O/'preparation'/n)
existing={r['sha256']:r['storage'] for r in primary['records']};allpaths={r['originalPath'] for r in primary['records']};new=[];objects={};manifests=[];readable=load(O/'READABLE-INDEX.json');rootinventory=[]
def add(lane,rp,p):
 st=p.lstat();kind='symlink' if stat.S_ISLNK(st.st_mode) else 'file';assert kind=='symlink' or stat.S_ISREG(st.st_mode),p
 data=os.fsencode(os.readlink(p)) if kind=='symlink' else p.read_bytes();h=sha(data)
 if str(p) in allpaths:
  old=next(r for r in primary['records'] if r['originalPath']==str(p));assert old['sha256']==h and old['bytes']==len(data);return
 rec={'lane':lane,'path':str(p.relative_to(rp)),'originalPath':str(p),'kind':kind,'mode':stat.S_IMODE(st.st_mode),'mtimeNs':st.st_mtime_ns,'bytes':len(data),'sha256':h}
 if kind=='symlink':rec['target']=os.readlink(p)
 rec['storage']=existing.get(h,{'kind':'archive','archive':'late-objects.zip','member':'sha256/'+h})
 if h not in existing:objects[h]=(str(p),kind);existing[h]=rec['storage']
 new.append(rec);allpaths.add(str(p))
 if kind=='file' and (p.suffix.lower()=='.md' or (p.suffix.lower()=='.json' and len(data)<=160000) or (p.suffix.lower()=='.txt' and len(data)<=16000)):
  q=O/'readable'/lane/rec['path'];q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data)
  readable.append({'path':str(q.relative_to(O)),'originalPath':str(p),'bytes':len(data),'sha256':h})
for lane,(root,mhash) in roots.items():
 rp=Path(root);mp=rp/'MANIFEST.json';assert sha(mp.read_bytes())==mhash
 m=load(mp);entries=m.get('records',m.get('files'));assert isinstance(entries,list)
 for e in entries:
  q=rp/e['path'];assert q.stat().st_size==e['bytes'] and sha(q.read_bytes())==e['sha256'],q
 manifests.append({'lane':lane,'path':str(mp),'sha256':mhash,'recordsVerified':len(entries),'mismatches':[]})
 before=len(new)
 for parent,dirs,files in os.walk(rp,followlinks=False):
  for n in list(dirs):
   q=Path(parent)/n
   if q.is_symlink():files.append(n);dirs.remove(n)
  for n in sorted(files):add(lane,rp,Path(parent)/n)
 rootinventory.append({'lane':lane,'root':root,'records':len(new)-before,'bytes':sum(e['bytes'] for e in new[before:]),'symlinks':sum(e['kind']=='symlink' for e in new[before:])})
render=P/'docs/meri-files-20261013/RENDER-REVIEW.md';assert sha(render.read_bytes())=='33717cf318b09f294844c687b3af8ee868e6d87187ade512c7b3c7a1c0772ea5';add('root-render-review',render.parent,render)
rootinventory.append({'lane':'root-render-review','root':str(render.parent),'includedPaths':['RENDER-REVIEW.md'],'records':1,'bytes':render.stat().st_size,'symlinks':0})
addendum=Path('/workspace/capiro-meri-files-browser-evidence-20261013/ADDENDUM.md');assert sha(addendum.read_bytes())=='fd147f79087274ce3ed82401e2f8f0c25869ed2ca30f83bfb91406fa5563af5e'
assert next(r for r in primary['records'] if r['originalPath']==str(addendum))['sha256']==sha(addendum.read_bytes())
with zipfile.ZipFile(O/'late-objects.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for h,(p,kind) in sorted(objects.items()):
  data=os.fsencode(os.readlink(p)) if kind=='symlink' else Path(p).read_bytes();assert sha(data)==h
  zi=zipfile.ZipInfo('sha256/'+h,date_time=(1980,1,1,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zi.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(zi,data)
records=primary['records']+new;verified=[];archives={}
for n in ['objects.zip','late-objects.zip']:
 z=zipfile.ZipFile(O/n);assert z.testzip() is None;archives[n]=z
try:
 vendor=P/'vendor/capiro-meri-contracts-0.1.2.tgz'
 for r in records:
  data=vendor.read_bytes() if r['storage']['kind']=='vendor' else archives[r['storage']['archive']].read(r['storage']['member'])
  p=Path(r['originalPath']);original=os.fsencode(os.readlink(p)) if r['kind']=='symlink' else p.read_bytes()
  assert data==original and len(data)==r['bytes'] and sha(data)==r['sha256'],p
  assert stat.S_IMODE(p.lstat().st_mode)==r['mode']
  verified.append({'originalPath':str(p),'sha256':r['sha256'],'bytesEqualAfterReopen':True,'storage':r['storage']})
 for r in readable:assert sha((O/r['path']).read_bytes())==r['sha256']
finally:
 for z in archives.values():z.close()
vr=load(O/'VENDOR-REFERENCE.json');vr['gitBlob']=subprocess.check_output(['git','-C',str(P),'hash-object',str(vendor)],text=True).strip();assert vr['gitBlob']=='3b1b1e6345539632b8a4be80de44b0ab548369af'
vr['publicationRequirement']='Exact vendor file must be included in the same source publication commit; this content binding does not claim an existing final commit.'
vr['finalCommitBinding']='SAME_PUBLICATION_COMMIT_TO_BE_CREATED_BY_ROOT';save('VENDOR-REFERENCE.json',vr)
save('ORIGINAL-PATH-MAP.json',{'schema':'capiro-evidence-content-addressed/1','roots':primary['roots']+rootinventory,'records':records})
save('OWNER-MANIFEST-VERIFICATION.json',load(O/'OWNER-MANIFEST-VERIFICATION.json')+manifests);save('READABLE-INDEX.json',readable)
a=[{'path':n,'bytes':(O/n).stat().st_size,'sha256':sha((O/n).read_bytes()),'uniqueMembers':len(zipfile.ZipFile(O/n).infolist())} for n in ['objects.zip','late-objects.zip']]
save('ALL-REOPEN-VERIFICATION.json',{'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archives':a,'originalRecords':len(records),'originalBytes':sum(r['bytes'] for r in records),'uniqueSha256Objects':len({r['sha256'] for r in records}),'allOriginalBytesEqual':True,'symlinks':sum(r['kind']=='symlink' for r in records),'directFiles':len(readable),'directFilesAllExact':True,'records':verified})
print(json.dumps({'originalRecords':len(records),'originalBytes':sum(r['bytes'] for r in records),'archives':a,'newRecords':len(new),'directFiles':len(readable),'pendingSourceCommitBindingOnly':True},indent=2))
