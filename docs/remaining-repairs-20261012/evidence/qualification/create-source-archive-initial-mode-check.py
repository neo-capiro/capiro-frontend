import pathlib,subprocess,hashlib,json,zipfile,datetime,sys
r=pathlib.Path('/workspace/capiro-remaining');commit=sys.argv[1];out=pathlib.Path(sys.argv[2]);out.mkdir()
g=lambda *a:subprocess.check_output(['git',*a],cwd=r).decode().strip()
assert g('rev-parse',commit)==commit
archive=out/('source-'+commit[:7]+'.zip')
subprocess.run(['git','archive','--format=zip','--output',str(archive),commit],cwd=r,check=True)
raw=subprocess.check_output(['git','ls-tree','-rz',commit],cwd=r);tracked={}
for line in raw.split(b'\0'):
 if not line:continue
 meta,path=line.split(b'\t',1);mode,kind,blob=meta.decode().split();assert kind=='blob'
 tracked[path.decode()]={'mode':mode,'gitBlob':blob}
records=[]
with zipfile.ZipFile(archive) as z:
 files=[x for x in z.infolist() if not x.is_dir()]
 assert len(files)==len(tracked) and {x.filename for x in files}==set(tracked)
 for item in files:
  expected=tracked[item.filename];data=z.read(item);actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();assert actual==expected['gitBlob'],item.filename
  assert (item.external_attr>>16)&0o777==int(expected['mode'][-3:],8),item.filename
  records.append({'path':item.filename,**expected,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 with archive.open('rb') as f:digest=hashlib.file_digest(f,'sha256').hexdigest()
receipt={'commit':commit,'rootTree':g('rev-parse',commit+'^{tree}'),'applicationTree':g('rev-parse',commit+':apps/web'),'appSourceTree':g('rev-parse',commit+':apps/web/src'),'archiveSHA256':digest,'archiveBytes':archive.stat().st_size,'trackedBlobs':len(records),'createdUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verification':'Every archive file matched its exact Git blob and mode, including tracked historical evidence and the corrected Docker ignore; no generated or untracked files. Qualification status is recorded separately.','files':records}
(out/'SOURCE-ARCHIVE-RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:v for k,v in receipt.items() if k!='files'}))
