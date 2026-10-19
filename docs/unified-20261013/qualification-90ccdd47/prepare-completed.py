from pathlib import Path
import os,stat,json,hashlib,zipfile,subprocess,datetime,re
O=Path(__file__).parent;R=Path('/workspace/capiro-unified-files-corrected-20261013');OLD=Path('/workspace/capiro-unified-files-final-20261013');ART=Path('/workspace/capiro-unified-runtime-tmp-20261013/files-corrected-modules-browser-artifacts');P=Path('/workspace/capiro-onboard-port-20261013')
H='90ccdd47de7a989e822590d616d69baa15a37d5d';T='2bd75625dfa0b1a8aa894a48a68f34550a6f5037';A='002c31576d9038d4d7f6438db9db3ae9cf00171c'
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(Path(p).read_text())
def save(n,x):(O/n).write_text(json.dumps(x,indent=2)+'\n')
expected={'head':H,'tree':T,'applicationTree':A,'sourceDiff':''}
gates=['clean-install','check','elements','public-newsletter-browser','build','production','served-newsletter-assets','served-newsletter-assets-restored-input','actual-additions','modules-browser','portfolio-discovery'];selected=[];receipts=[]
for name in gates:
 e=load(R/(name+'-exit.json'));assert e['sourceBefore']==e['sourceAfter']==expected and e['sourceChanged'] is False
 assert e['exitCode']==(1 if name=='served-newsletter-assets' else 0)
 receipts.append(e)
 for suffix in ['-exit.json','-running.json','.log']:
  p=R/(name+suffix)
  if p.exists():selected.append(('qualification-completed',R,p))
for n in ['FROZEN-SOURCE.json','SPARSE-INPUT-RESTORATION.json','ROOT-ACTUAL-RENDER-REVIEW.json','HARNESS-ADAPTATION.json','continue-after-sparse-input.py','qualify-successor.py','run-gate.py','run-portfolio-shards.py','verify-additions-v2.mjs','verify-assets.mjs','build-cache-retirement.json','download-cache-retirement.json','modules-browser-results.json','portfolio-discovery.json']:
 p=R/n;assert p.is_file();selected.append(('qualification-completed',R,p))
def walk(lane,root):
 for parent,ds,fs in os.walk(root,followlinks=False):
  for n in ds[:]:
   q=Path(parent)/n
   if q.is_symlink():fs.append(n);ds.remove(n)
  for n in sorted(fs):selected.append((lane,root,Path(parent)/n))
for sub in ['production','actual-additions-v2','public-newsletter-browser','actual-served-assets']:walk('qualification-completed',R/sub)
walk('first-attempt-6150e49',OLD);walk('modules-artifacts',ART)
# Enforce deliberate exclusion of active Portfolio results, logs, progress and live receipts.
assert all(not (str(p).startswith(str(R)) and p.name.startswith('portfolio-') and not p.name.startswith('portfolio-discovery')) for _,_,p in selected)
records=[];objects={};direct=[]
for lane,root,p in selected:
 # Completed subdirectories keep their path relative to the qualification root.
 if lane=='qualification-completed':root=R
 s=p.lstat();kind='symlink' if stat.S_ISLNK(s.st_mode) else 'file';assert kind=='symlink' or stat.S_ISREG(s.st_mode),p
 data=os.fsencode(os.readlink(p)) if kind=='symlink' else p.read_bytes();h=sha(data)
 r={'lane':lane,'path':str(p.relative_to(root)),'originalPath':str(p),'kind':kind,'mode':stat.S_IMODE(s.st_mode),'mtimeNs':s.st_mtime_ns,'bytes':len(data),'sha256':h,'storage':{'archive':'completed-objects.zip','member':'sha256/'+h}}
 if kind=='symlink':r['target']=os.readlink(p)
 records.append(r);objects.setdefault(h,(str(p),kind))
 if kind=='file' and (p.suffix.lower()=='.md' or p.suffix.lower()=='.json' and len(data)<=160000 or p.suffix.lower()=='.txt' and len(data)<=16000):
  q=O/'readable'/lane/r['path'];q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data);direct.append({'path':str(q.relative_to(O)),'originalPath':str(p),'bytes':len(data),'sha256':h})
assert len(records)==len({r['originalPath'] for r in records})
with zipfile.ZipFile(O/'completed-objects.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for h,(p,kind) in sorted(objects.items()):
  b=os.fsencode(os.readlink(p)) if kind=='symlink' else Path(p).read_bytes();assert sha(b)==h
  zi=zipfile.ZipInfo('sha256/'+h,date_time=(1980,1,1,0,0,0));zi.compress_type=zipfile.ZIP_DEFLATED;zi.external_attr=(stat.S_IFREG|0o644)<<16;z.writestr(zi,b)
verified=[]
with zipfile.ZipFile(O/'completed-objects.zip') as z:
 assert len(z.infolist())==len(objects) and z.testzip() is None
 for r in records:
  b=z.read(r['storage']['member']);p=Path(r['originalPath']);origin=os.fsencode(os.readlink(p)) if r['kind']=='symlink' else p.read_bytes()
  assert b==origin and len(b)==r['bytes'] and sha(b)==r['sha256'] and stat.S_IMODE(p.lstat().st_mode)==r['mode'],p
  verified.append({'originalPath':str(p),'sha256':r['sha256'],'bytesEqualAfterReopen':True})
for e in direct:assert sha((O/e['path']).read_bytes())==e['sha256']
# Inventory final shared-suite results without launching or importing test/application code.
def cases(x):
 out=[]
 def visit(ss):
  for s in ss:
   for spec in s.get('specs',[]):
    for t in spec['tests']:out.append({'id':spec['id'],'file':spec['file'],'title':spec['title'],'timeout':t['timeout'],'status':t['status'],'expectedStatus':t['expectedStatus'],'results':[{'status':r['status'],'retry':r['retry'],'errors':r.get('errors',[])} for r in t['results']]})
   visit(s.get('suites',[]))
 visit(x['suites']);return out
mb=load(R/'modules-browser-results.json');mc=cases(mb);assert len(mc)==len({r['id'] for r in mc})==324
assert mb['errors']==[] and mb['stats']['expected']==324 and mb['stats']['unexpected']==mb['stats']['skipped']==mb['stats']['flaky']==0
assert all(r['status']=='expected' and r['expectedStatus']=='passed' and len(r['results'])==1 and r['results'][0]=={'status':'passed','retry':0,'errors':[]} for r in mc)
assert all(p['retries']==0 for p in mb['config']['projects']) and mb['config']['workers']==2
# Discovery is completed, but provides no case execution or current Portfolio acceptance.
dc=cases(load(R/'portfolio-discovery.json'));assert len(dc)==len({c['id'] for c in dc})==1139 and all(not c['results'] for c in dc)
sparse=load(R/'SPARSE-INPUT-RESTORATION.json');assert sparse['source']==H
blob=subprocess.check_output(['git','-C',str(P),'show',H+':'+sparse['file']]);assert len(blob)==sparse['bytes'] and sha(blob)==sparse['sha256'];assert hashlib.sha1(b'blob '+str(len(blob)).encode()+b'\0'+blob).hexdigest()==sparse['gitBlob']
assets=load(R/'actual-served-assets/asset-results.json');assert assets['success'] and assets['error'] is None and len(assets['entries'])==assets['count']==179 and assets['bytes']==486014 and all(e['status']==200 for e in assets['entries'])
oldcheck=load(OLD/'check-exit.json');assert oldcheck['exitCode']==2 and oldcheck['sourceBefore']['head']=='6150e49ce69e8d73609ed974d6f3be796b152bdd';assert 'TS2345' in (OLD/'check.log').read_text();assert not (OLD/'build-exit.json').exists()
render=load(R/'ROOT-ACTUAL-RENDER-REVIEW.json');assert render['source']==H
for e in render['captures']:assert sha((R/e['path']).read_bytes())==e['sha256']
current={'head':subprocess.check_output(['git','-C',str(P),'rev-parse','HEAD'],text=True).strip(),'tree':subprocess.check_output(['git','-C',str(P),'rev-parse','HEAD^{tree}'],text=True).strip(),'applicationTree':subprocess.check_output(['git','-C',str(P),'rev-parse','HEAD:apps/web'],text=True).strip()};assert current=={k:v for k,v in expected.items() if k!='sourceDiff'}
save('ORIGINAL-PATH-MAP.json',{'schema':'capiro-completed-evidence-content-addressed/1','source':H,'status':'PREPARATION_ONLY_PORTFOLIO_ACTIVE','records':records})
save('READABLE-INDEX.json',direct);save('COMPLETED-GATE-RECEIPTS.json',receipts);save('MODULES-CASE-BINDINGS.json',mc)
archive={'path':'completed-objects.zip','bytes':(O/'completed-objects.zip').stat().st_size,'sha256':sha((O/'completed-objects.zip').read_bytes()),'members':len(objects)}
save('REOPEN-VERIFICATION.json',{'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive':archive,'allOriginalBytesEqual':True,'symlinks':sum(r['kind']=='symlink' for r in records),'records':verified})
summary={'preparedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PREPARED_COMPLETED_EVIDENCE_ONLY_NOT_FINAL_SEAL_OR_ACCEPTANCE','source':current,'originalRecords':len(records),'originalBytes':sum(r['bytes'] for r in records),'archive':archive,'directFiles':len(direct),'directBytes':sum(r['bytes'] for r in direct),'completedSourceBoundReceipts':len(receipts),'modulesPassed':324,'modulesRetries':0,'modulesSkipped':0,'modulesFlaky':0,'portfolioDiscoveryOnly':1139,'portfolioExecution':'PENDING; no active shard/progress/log/result file read or hashed','assetInitialPreflight':'FAILED exit1 before HTTP; retained','assetRestoredInput':'179PASS using exact already-committed metadata; separate exit0 retained','prior6150Check':'FAILED TS2345/exit2 before build; whole immutable21-file attempt retained','pendingInputs':['Root release of completed Portfolio shards/progress/results/artifacts','Final independent gate review','Static and emitted-boundary review packets'],'existingDevelopmentPacket':'Not copied; already published separately','reviewerRuntimeExecution':False}
save('PREPARATION.json',summary);print(json.dumps(summary,indent=2))
