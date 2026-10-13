"""Read-only failure and inactive-cache inventory; creates no archive and removes nothing."""
from pathlib import Path
import collections,datetime,hashlib,json,os,stat,subprocess,tarfile,zipfile
R=Path('/workspace/capiro-onboard-port-20261013');P=Path('/tmp/capiro-unified-final-83f54f5a-20261013');O=Path(__file__).parent;bindings=[]
def read(p):
 b=p.read_bytes();bindings.append({'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()});return b
def j(p):return json.loads(read(p))
def save(n,v):(O/n).write_text(json.dumps(v,indent=2)+'\n')
def rows(d):
 out=[]
 def visit(s):
  for q in s.get('specs',[]):
   for t in q['tests']:out.append({'id':q['id'],'file':q['file'],'title':q['title'],'line':q['line'],'test':t})
  for v in s.get('suites',[]):visit(v)
 visit(d);return out
source={'head':'83f54f5ac0107822833adbbfef2b453e0240bc56','tree':'760b05a7a7feacee16815da2767cb83dbb600d95','applicationTree':'67f821a13c8470ceeb5222eb89d43cea58b1a8c8','sourceDiff':''}
discovery=j(P/'portfolio-discovery.json');expected={x['id'] for x in rows(discovery)};assert len(expected)==1139 and discovery['errors']==[]
progress=j(P/'portfolio-progress.json');save('ORIGINAL-FAILED-PROGRESS.json',progress)
shards=[];cases=[]
for i,count,passed,exitcode in [(1,285,285,0),(2,298,297,1)]:
 g=j(P/f'portfolio-shard-{i}-exit.json');d=j(P/f'portfolio-shard-{i}-results.json');rs=rows(d)
 assert g['exitCode']==exitcode and g['sourceBefore']==g['sourceAfter']==source and not g['sourceChanged']
 assert len(rs)==count and d['stats']['expected']==passed and d['stats']['unexpected']==count-passed and d['stats']['skipped']==d['stats']['flaky']==0 and d['errors']==[]
 assert all(len(x['test']['results'])==1 and x['test']['results'][0]['retry']==0 and x['test']['expectedStatus']=='passed' for x in rs)
 assert d['config']['workers']==2 and all(x['retries']==0 and x['timeout']==30000 for x in d['config']['projects'])
 log=read(P/f'portfolio-shard-{i}.log').decode();assert f'{passed} passed (' in log
 shards.append({'shard':i,'gate':g,'stats':d['stats'],'actualStatuses':dict(collections.Counter(x['test']['results'][0]['status'] for x in rs)),'timeouts':dict(collections.Counter(x['test']['timeout'] for x in rs)),'workers':2,'retries':0,'runnerErrors':d['errors']});cases+=rs
ids=[x['id'] for x in cases];assert len(ids)==len(set(ids))==583 and not set(ids)-expected
failed=[x for x in cases if x['test']['status']!='expected'];assert len(failed)==1
failure=failed[0];assert failure['id']=='23d8565415e63e119d0c-89fa0e1fae3f9fed8d24'
res=failure['test']['results'][0];assert res['status']=='failed' and res['error']['location']['line']==290 and 'ENOSPC' in res['error']['message'] and 'mkdir' in res['error']['message']
trace=Path(next(x for x in res['attachments'] if x['name']=='trace')['path']);b=read(trace)
with zipfile.ZipFile(trace) as z:
 assert z.testzip() is None
 entries=[{'name':x.filename,'uncompressedBytes':x.file_size,'compressedBytes':x.compress_size,'crc':x.CRC} for x in z.infolist()]
 testevents=[json.loads(x) for x in z.read('test.trace').decode().splitlines()]
 browserevents=[json.loads(x) for x in z.read('0-trace.trace').decode().splitlines()]
 source_entry=next(x for x in z.namelist() if x.startswith('resources/src@'))
 tracesource=z.read(source_entry)
 starts={x['callId']:x for x in testevents if x['type']=='before'}
 completed=[{'title':starts[x['callId']].get('title'),'method':starts[x['callId']].get('method'),'stack':starts[x['callId']].get('stack'),'error':x.get('error')} for x in testevents if x['type']=='after' and x['callId'] in starts]
 screenshot_calls=[x for x in browserevents if x.get('method')=='screenshot']
sourcefile=R/'apps/web/tests/browser/mail-rich-compose.spec.ts';testbytes=read(sourcefile)
assert tracesource==testbytes
save('FAILED-CASE.json',failure);save('TRACE-EVIDENCE.json',{'path':str(trace),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'zipIntegrity':'PASS','entries':entries,'traceSourceMatchesFrozenTest':True,'completedSteps':completed,'browserScreenshotCalls':screenshot_calls,'requestedScreenshotExists':(trace.parent/'mobile-rich.png').exists(),'errorContextExists':(trace.parent/'error-context.md').exists()})
# Owner-generated historical Vite caches are candidates only, never deleted here.
cachepaths=[Path('/workspace/capiro-preserved-evidence-storage/profile/vite-cache'),Path('/tmp/capiro-p1-files/vite-cache')]+[Path('/tmp/capiro-next-delete-evidence')/('vite-cache-'+x) for x in ['baseline','candidate','baseline-final','candidate-final','baseline-dispatch','candidate-dispatch']]
inventories=[]
for base in cachepaths:
 files=[];links=[];special=[]
 for folder,dirs,names in os.walk(base,followlinks=False):
  for name in list(dirs)+names:
   p=Path(folder)/name;s=p.lstat();relative=str(p.relative_to(base))
   if stat.S_ISLNK(s.st_mode):links.append({'path':relative,'target':os.readlink(p),'mode':stat.S_IMODE(s.st_mode)});continue
   if stat.S_ISREG(s.st_mode):
    v=p.read_bytes();files.append({'path':relative,'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest(),'allocatedBytes':s.st_blocks*512,'mode':stat.S_IMODE(s.st_mode),'links':s.st_nlink})
   elif not stat.S_ISDIR(s.st_mode):special.append(relative)
 assert not special
 inventories.append({'root':str(base),'mountFamily':'workspace' if str(base).startswith('/workspace') else 'tmp','regularFiles':len(files),'fileBytes':sum(x['bytes'] for x in files),'allocatedFileBytes':sum(x['allocatedBytes'] for x in files),'symlinks':links,'files':files,'archiveVerified':False,'deletionPerformed':False,'scope':'Historical owner-generated Vite deps only; browser/raw evidence directories excluded. Root must archive and independently reopen/verify exact bytes/modes/link targets before any retirement.'})
save('OWNED-CACHE-INVENTORY.json',inventories)
archive=j(P/'owned-runtime-archive.json');save('ROOT-ARCHIVE-RECEIPT-SNAPSHOT.json',archive)
# Preserve archive identity; do not claim an independent per-entry check of retired originals.
archpath=Path(archive['archive']);digest=hashlib.sha256()
with archpath.open('rb') as f:
 for part in iter(lambda:f.read(1024*1024),b''):digest.update(part)
assert archpath.stat().st_size==archive['archiveBytes'] and digest.hexdigest()==archive['archiveSha256']
rootarchive={'archive':str(archpath),'archiveBytes':archpath.stat().st_size,'sha256':digest.hexdigest(),'matchesRootReceipt':True,'rootReportedRegularFiles':len(archive['files']),'rootReportedSymlinks':len(archive['links']),'independentArchiveHashCheck':True,'independentRetiredOriginalByteCheck':False}
summary={'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':source,'status':'FAILED_INITIAL_PORTFOLIO_INFRASTRUCTURE_ENOSPC_RECOVERY_PENDING','discovered':1139,'attemptedUniqueIds':583,'actualPassedCases':582,'infrastructureFailedCases':1,'remainingUnrunIds':sorted(expected-set(ids)),'remainingUnrunCount':556,'duplicates':0,'unknownIds':0,'shards':shards,'failedCaseId':failure['id'],'failureClassification':'ENOSPC while creating screenshot output directory at test.info().outputPath before screenshot call and final request-ledger assertion; no product assertion failure shown, but case incomplete/failed.','rootRuntimeArchiveHashVerification':rootarchive,'cacheCandidates':[{k:v for k,v in x.items() if k not in ['files','symlinks']}|{'symlinkCount':len(x['symlinks'])} for x in inventories],'sourceChangedByReviewer':False,'runtimeExecutedByReviewer':False,'deletionPerformed':False,'archiveCreatedByReviewer':False}
save('VERIFICATION.json',summary);save('RAW-EVIDENCE-BINDINGS.json',bindings)
print(json.dumps({k:v for k,v in summary.items() if k not in ['remainingUnrunIds','shards','cacheCandidates']},indent=2))
