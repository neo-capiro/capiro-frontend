import pathlib,subprocess,zipfile,hashlib,json,time,datetime
root=pathlib.Path('/workspace/capiro-remaining');archive=pathlib.Path('/tmp/capiro-source-adbc84b/source-adbc84b.zip');out=pathlib.Path('/tmp/capiro-remaining-final-gate-review/final-adbc84b');commit='adbc84b2251fe6b06cb7f75030026fba5b4ff498'
started=datetime.datetime.now(datetime.timezone.utc).isoformat();st=archive.stat();tree=subprocess.check_output(['git','ls-tree','-rz','--full-tree',commit],cwd=root);expected={}
for row in tree.split(b'\0'):
 if not row:continue
 meta,p=row.split(b'\t',1);mode,typ,oid=meta.decode().split();assert typ=='blob',(mode,typ,p);expected[p.decode()]={'mode':mode,'blob':oid}
checks=[];mismatch=[]
with zipfile.ZipFile(archive) as z:
 names=[i.filename for i in z.infolist() if not i.is_dir()];missing=sorted(set(expected)-set(names));extra=sorted(set(names)-set(expected));duplicates=sorted({n for n in names if names.count(n)>1});comment=z.comment.decode(errors='replace')
 for info in z.infolist():
  if info.is_dir():continue
  sha1=hashlib.sha1(('blob '+str(info.file_size)+'\0').encode());sha256=hashlib.sha256();size=0
  with z.open(info) as file:
   while data:=file.read(1024*1024):sha1.update(data);sha256.update(data);size+=len(data)
  mode=oct((info.external_attr>>16)&0o177777)[2:]
  check={'path':info.filename,'bytes':size,'gitBlob':sha1.hexdigest(),'sha256':sha256.hexdigest(),'gitMode':expected.get(info.filename,{}).get('mode'),'zipUnixMode':mode}
  checks.append(check)
  if info.filename not in expected or expected[info.filename]['blob']!=sha1.hexdigest():mismatch.append(check)
sha256=hashlib.sha256()
with archive.open('rb') as f:
 while data:=f.read(4*1024*1024):sha256.update(data)
end=archive.stat();unchanged=(st.st_size,st.st_mtime_ns)==(end.st_size,end.st_mtime_ns)
report={'sourceCommit':commit,'rootTree':subprocess.check_output(['git','rev-parse',commit+'^{tree}'],cwd=root,text=True).strip(),'archive':str(archive),'bytes':end.st_size,'sha256':sha256.hexdigest(),'zipCommitComment':comment,'gitInventorySha256':hashlib.sha256(tree).hexdigest(),'gitFileCount':len(expected),'archiveFileCount':len(names),'missing':missing,'extra':extra,'duplicates':duplicates,'contentMismatches':mismatch,'stableDuringVerification':unchanged,'allCrcReadsSucceeded':True,'passed':not(missing or extra or duplicates or mismatch) and unchanged and comment==commit,'startedUTC':started,'endedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Read-only ZIP inventory/content verification against frozen Git blobs; no extraction, runtime, build or native effects.','files':checks}
(out/'archive-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='files'},indent=2));assert report['passed']
