from pathlib import Path
import os,stat,json,hashlib,zipfile,datetime
O=Path(__file__).parent
roots=[('source-preservation-review','/tmp/capiro-unified-90ccdd47-preservation-review-20261013','19fd6fc8e2cef4dd6c95d952c55c8c9c28999ccedea5b4fb41a527c679b194c0'),('emitted-review','/tmp/capiro-unified-90ccdd47-emitted-review-20261013','4283aa5a6908a8d02961306c8fbabacb7754b675d52a5c7a45f5aed591363620')]
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(Path(p).read_text())
def save(n,x):(O/n).write_text(json.dumps(x,indent=2)+'\n')
known={r['sha256']:r['storage'] for r in load(O/'ORIGINAL-PATH-MAP.json')['records']};records=[];objects={};readable=[];seals=[]
def add(lane,root,p):
 st=p.lstat();kind='symlink' if p.is_symlink() else 'file';assert kind=='symlink' or stat.S_ISREG(st.st_mode)
 b=os.fsencode(os.readlink(p)) if kind=='symlink' else p.read_bytes();h=sha(b)
 r={'lane':lane,'path':str(p.relative_to(root)),'originalPath':str(p),'kind':kind,'bytes':len(b),'sha256':h,'mode':stat.S_IMODE(st.st_mode),'mtimeNs':st.st_mtime_ns}
 if kind=='symlink':r['target']=os.readlink(p)
 if h not in known:known[h]={'archive':'review-objects.zip','member':'sha256/'+h};objects[h]=(str(p),kind)
 r['storage']=known[h];records.append(r)
 if kind=='file' and (p.suffix=='.md' or p.suffix=='.json' and len(b)<=160000):
  q=O/'readable'/lane/r['path'];q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b);readable.append({'path':str(q.relative_to(O)),'originalPath':str(p),'bytes':len(b),'sha256':h})
for lane,root,want in roots:
 rp=Path(root);mp=rp/'MANIFEST.json';assert sha(mp.read_bytes())==want
 m=load(mp);entries=m.get('records',m.get('files'));assert isinstance(entries,list)
 for e in entries:
  q=rp/e['path'];assert q.stat().st_size==e['bytes'] and sha(q.read_bytes())==e['sha256'],q
 seals.append({'path':str(mp),'sha256':want,'membersVerified':len(entries),'unchanged':True})
 for parent,ds,fs in os.walk(rp,followlinks=False):
  for n in ds[:]:
   q=Path(parent)/n
   if q.is_symlink():fs.append(n);ds.remove(n)
  for n in sorted(fs):add(lane,rp,Path(parent)/n)
p=Path('/workspace/capiro-unified-files-corrected-20261013/HISTORICAL-EVIDENCE-MATERIALIZATION.json');add('historical-link-restoration',p.parent,p)
historical=load(p);assert historical['source']=='90ccdd47de7a989e822590d616d69baa15a37d5d' and len(historical['files'])==626 and sum(e['bytes'] for e in historical['files'])==83824863
with zipfile.ZipFile(O/'review-objects.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for h,(p,kind) in sorted(objects.items()):
  b=os.fsencode(os.readlink(p)) if kind=='symlink' else Path(p).read_bytes();assert sha(b)==h
  zi=zipfile.ZipInfo('sha256/'+h,date_time=(1980,1,1,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zi.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(zi,b)
verified=[];archives={n:zipfile.ZipFile(O/n) for n in ['completed-objects.zip','review-objects.zip']}
try:
 for z in archives.values():assert z.testzip() is None
 for r in records:
  b=archives[r['storage']['archive']].read(r['storage']['member']);p=Path(r['originalPath']);original=os.fsencode(os.readlink(p)) if r['kind']=='symlink' else p.read_bytes()
  assert b==original and len(b)==r['bytes'] and sha(b)==r['sha256'] and stat.S_IMODE(p.lstat().st_mode)==r['mode']
  verified.append({'originalPath':str(p),'sha256':r['sha256'],'reopenedBytesEqual':True})
finally:
 for z in archives.values():z.close()
for e in readable:assert sha((O/e['path']).read_bytes())==e['sha256']
save('REVIEW-PATH-MAP.json',{'schema':'capiro-completed-evidence-content-addressed/1','records':records});save('REVIEW-READABLE-INDEX.json',readable)
x={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'SEALED_OWNER_REVIEWS_STAGED_PORTFOLIO_STILL_PENDING_NO_FINAL_PUBLICATION_SEAL','originalRecords':len(records),'originalBytes':sum(r['bytes'] for r in records),'archive':{'path':'review-objects.zip','bytes':(O/'review-objects.zip').stat().st_size,'sha256':sha((O/'review-objects.zip').read_bytes()),'uniqueMembers':len(objects)},'directFiles':len(readable),'ownerSeals':seals,'allArchivedBytesReopenedEqual':True,'verification':verified,'historicalReceiptScope':'Receipt records626 restored committed historical files/83824863bytes. This publication preserves that receipt; it neither duplicates nor reruns materialization of those files.','pending':['Completed Portfolio root release','Final independent gate review','Sealed storage addendum'],'activePortfolioFilesReadOrHashed':False}
save('REVIEW-STAGING.json',x);print(json.dumps({k:v for k,v in x.items() if k!='verification'},indent=2))
