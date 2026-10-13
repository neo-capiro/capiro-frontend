"""Preserve only an explicitly released, fixed input list. Never discover live siblings."""
from pathlib import Path
import json,hashlib,zipfile,os,stat,sys,datetime
O=Path(__file__).parent;spec=json.loads(Path(sys.argv[1]).read_text());prefix=spec['prefix'];assert '/' not in prefix;archive=prefix.lower()+'-objects.zip'
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(Path(p).read_text())
def save(n,x):(O/n).write_text(json.dumps(x,indent=2)+'\n')
known={};originals=set()
for mp in O.glob('*PATH-MAP.json'):
 for r in load(mp)['records']:known[r['sha256']]=r['storage'];originals.add(r['originalPath'])
records=[];objects={};direct=[];manifests=[];selected=[]
for group in spec['groups']:
 root=Path(group['root'])
 if 'manifestSha256' in group:
  mp=root/'MANIFEST.json';assert sha(mp.read_bytes())==group['manifestSha256'];m=load(mp);es=m.get('records',m.get('files'));assert isinstance(es,list)
  for e in es:
   q=root/e['path'];assert q.stat().st_size==e['bytes'] and sha(q.read_bytes())==e['sha256']
  manifests.append({'path':str(mp),'sha256':group['manifestSha256'],'membersVerified':len(es)})
 if 'paths' in group:
  selected.extend((group['lane'],root,root/n) for n in group['paths'])
 else:
  for parent,ds,fs in os.walk(root,followlinks=False):
   for n in ds[:]:
    q=Path(parent)/n
    if q.is_symlink():fs.append(n);ds.remove(n)
   selected.extend((group['lane'],root,Path(parent)/n) for n in sorted(fs))
for lane,root,p in selected:
 assert str(p) not in originals,p
 st=p.lstat();kind='symlink' if p.is_symlink() else 'file';assert kind=='symlink' or stat.S_ISREG(st.st_mode),p
 b=os.fsencode(os.readlink(p)) if kind=='symlink' else p.read_bytes();h=sha(b)
 if h not in known:known[h]={'archive':archive,'member':'sha256/'+h};objects[h]=(str(p),kind)
 r={'lane':lane,'path':str(p.relative_to(root)),'originalPath':str(p),'kind':kind,'bytes':len(b),'sha256':h,'mode':stat.S_IMODE(st.st_mode),'mtimeNs':st.st_mtime_ns,'storage':known[h]}
 if kind=='symlink':r['target']=os.readlink(p)
 records.append(r);originals.add(str(p))
 if kind=='file' and (p.suffix=='.md' or p.suffix=='.json' and len(b)<=160000 or p.suffix=='.txt' and len(b)<16000):
  q=O/'readable'/lane/r['path'];q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b);direct.append({'path':str(q.relative_to(O)),'originalPath':str(p),'sha256':h,'bytes':len(b)})
assert not (O/archive).exists()
with zipfile.ZipFile(O/archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for h,(p,kind) in sorted(objects.items()):
  b=os.fsencode(os.readlink(p)) if kind=='symlink' else Path(p).read_bytes();assert sha(b)==h
  zi=zipfile.ZipInfo('sha256/'+h,date_time=(1980,1,1,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zi.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(zi,b)
zs={n:zipfile.ZipFile(O/n) for n in {r['storage']['archive'] for r in records}};verified=[]
try:
 for z in zs.values():assert z.testzip() is None
 for r in records:
  b=zs[r['storage']['archive']].read(r['storage']['member']);p=Path(r['originalPath']);old=os.fsencode(os.readlink(p)) if r['kind']=='symlink' else p.read_bytes()
  assert b==old and sha(b)==r['sha256'] and len(b)==r['bytes'] and stat.S_IMODE(p.lstat().st_mode)==r['mode']
  verified.append({'originalPath':str(p),'sha256':r['sha256'],'bytesEqualAfterReopen':True})
finally:
 for z in zs.values():z.close()
for e in direct:assert sha((O/e['path']).read_bytes())==e['sha256']
save(prefix+'-PATH-MAP.json',{'schema':'capiro-completed-evidence-content-addressed/1','records':records});save(prefix+'-READABLE-INDEX.json',direct)
x={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'RELEASED_INPUT_WAVE_VERIFIED_NOT_FINAL_PUBLICATION_SEAL','records':len(records),'originalBytes':sum(r['bytes'] for r in records),'archive':{'path':archive,'bytes':(O/archive).stat().st_size,'sha256':sha((O/archive).read_bytes()),'uniqueMembers':len(objects)},'directFiles':len(direct),'ownerManifests':manifests,'allOriginalBytesReopenedEqual':True,'verification':verified,'scope':spec['scope']};save(prefix+'-VERIFICATION.json',x);print(json.dumps({k:v for k,v in x.items() if k!='verification'},indent=2))
