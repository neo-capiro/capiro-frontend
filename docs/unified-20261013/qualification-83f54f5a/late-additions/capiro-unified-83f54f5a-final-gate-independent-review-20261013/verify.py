import pathlib,json,hashlib,subprocess,datetime,collections,re,struct
R=pathlib.Path('/tmp/capiro-unified-final-83f54f5a-20261013')
O=pathlib.Path(__file__).parent
P=pathlib.Path('/workspace/capiro-onboard-port-20261013')
HEAD='83f54f5ac0107822833adbbfef2b453e0240bc56'; TREE='760b05a7a7feacee16815da2767cb83dbb600d95'; APP='67f821a13c8470ceeb5222eb89d43cea58b1a8c8'
bindings={}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def bound(p):
 p=pathlib.Path(p); bindings[str(p)]={'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)};return p

def read(p): return json.loads(bound(p).read_text())
def save(n,x): (O/n).write_text(json.dumps(x,indent=2)+'\n')
def git(*args): return subprocess.check_output(['git','-C',str(P),*args],text=True).strip()
def pin():
 x={'head':git('rev-parse','HEAD'),'tree':git('rev-parse','HEAD^{tree}'),'applicationTree':git('rev-parse','HEAD:apps/web'),'sourceDiff':git('status','--porcelain=v1')}
 assert x=={'head':HEAD,'tree':TREE,'applicationTree':APP,'sourceDiff':''},x
 return x
start=pin()
def compact_case(c):
 return {**{k:v for k,v in c.items() if k!='results'},'results':[{k:v for k,v in a.items() if k in ['status','duration','retry','startTime','error','errors','annotations']} for a in c['results']]}
def cases(data):
 out=[]
 def walk(suites):
  for s in suites:
   for spec in s.get('specs',[]):
    for t in spec['tests']:
     out.append({'id':spec['id'],'file':spec['file'],'title':spec['title'],'line':spec['line'],'project':t['projectId'],'timeout':t['timeout'],'expectedStatus':t['expectedStatus'],'status':t['status'],'results':t['results']})
   walk(s.get('suites',[]))
 walk(data['suites']);return out

disc=read(R/'portfolio-discovery.json');dc=cases(disc);di={c['id']:c for c in dc};assert len(dc)==len(di)==1139;assert not disc['errors'];assert all(not c['results'] for c in dc)
receipts=[]
for p in sorted(R.glob('*-exit.json')):
 x=read(p);assert x['sourceBefore']==start and x['sourceAfter']==start and x['sourceChanged'] is False
 expected=1 if x['name'] in ['portfolio-shard-2','portfolio-enospc-case-rerun'] else 0
 assert x['exitCode']==expected,(p,x)
 receipts.append({'path':p.name,**x})
assert len(receipts)==16
save('GATE-RECEIPTS.json',receipts)

def validate_run(name,count,passed,failed,workers,discovered=True):
 d=read(R/f'{name}-results.json');cc=cases(d);assert len(cc)==count
 assert d['errors']==[]; assert d['stats']['expected']==passed and d['stats']['unexpected']==failed
 assert d['stats']['skipped']==d['stats']['flaky']==0
 assert d['config']['workers']==workers and d['config']['metadata']['actualWorkers']==workers
 assert all(p['retries']==0 and p['repeatEach']==1 and p['timeout']==30000 for p in d['config']['projects'])
 pc=fc=0
 for c in cc:
  assert c['expectedStatus']=='passed' and len(c['results'])==1,c
  a=c['results'][0];assert a['retry']==0
  if a['status']=='passed':
   pc+=1;assert c['status']=='expected' and a.get('errors',[])==[] and not a.get('error')
  else:fc+=1;assert a['status']=='failed' and c['status']=='unexpected'
  if discovered:
   assert c['id'] in di
   for key in ['file','title','line','project','expectedStatus']:assert c[key]==di[c['id']][key],(key,c)
 if discovered and c['timeout']!=di[c['id']]['timeout']:
   assert c['timeout']==3*di[c['id']]['timeout']==90000
   slow=[x for x in a.get('annotations',[]) if x['type']=='slow'];assert len(slow)==1
   source=P/'apps/web/tests/browser'/c['file']
   assert 'test.slow()' in source.read_text().splitlines()[slow[0]['location']['line']-1]
 assert (pc,fc)==(passed,failed)
 return d,cc
original=[];shards=[]
for n,count,passed,failed in [(1,285,285,0),(2,298,297,1),(3,273,273,0),(4,283,283,0)]:
 name=f'portfolio-shard-{n}';d,cc=validate_run(name,count,passed,failed,2)
 assert d['config']['shard']=={'current':n,'total':4}
 original.extend([{**c,'shard':n} for c in cc]);shards.append({'name':name,'count':count,'passed':passed,'failed':failed,'stats':d['stats']})
assert len(original)==1139 and len(set(c['id'] for c in original))==1139 and set(c['id'] for c in original)==set(di)
failed=[c for c in original if c['status']=='unexpected'];assert len(failed)==1
f=failed[0];assert f['id']=='23d8565415e63e119d0c-89fa0e1fae3f9fed8d24'
assert 'ENOSPC' in f['results'][0]['error']['message'] and f['results'][0]['error']['location']['line']==290
rr,rc=validate_run('portfolio-enospc-case-rerun-v2',1,1,0,1);assert rc[0]['id']==f['id']
assert rc[0]['timeout']==f['timeout']==30000
z=read(R/'portfolio-enospc-case-rerun-results.json');assert cases(z)==[] and z['stats']['expected']==z['stats']['unexpected']==z['stats']['skipped']==z['stats']['flaky']==0
assert len(z['errors'])==1 and 'No tests found' in z['errors'][0]['message']
success={c['id'] for c in original if c['status']=='expected'}|{rc[0]['id']};assert success==set(di)
timeouts=dict(collections.Counter(c['timeout'] for c in original))
save('PORTFOLIO-CASE-BINDINGS.json',{'discoveryCount':len(di),'originalCases':[compact_case(c) for c in original],'targetedSuccessfulRerun':[compact_case(c) for c in rc],'zeroCaseSelectorErrors':z['errors']})
_,mc=validate_run('modules-browser',297,297,0,2,False);assert len(set(c['id'] for c in mc))==297
save('MODULES-CASE-BINDINGS.json',[compact_case(c) for c in mc])

rootagg=read(R/'portfolio-recovered-aggregate.json'); allg=read(R/'ALL-GATES-COMPLETE.json')
for k,v in {'source':HEAD,'discovered':1139,'uniqueSuccessfulCoverage':1139,'firstAttemptPassed':1138,'successfulInfrastructureCaseReruns':1,'selectorHarnessAttemptsWithNoTests':1,'missingIds':0,'duplicateOriginalShardIds':0,'skipped':0,'flaky':0,'automaticRetries':0,'allSourceUnchanged':True}.items():assert rootagg[k]==v,(k,rootagg[k])
assert rootagg['originalInfrastructureFailures'][0]['id']==f['id'] and len(rootagg['originalInfrastructureFailures'])==1
assert allg['source']==HEAD and allg['applicationTree']==APP and allg['otherBrowserPassed']==297
assert {(r['path'],r['exitCode']) for r in receipts}=={(r['file'],r['exitCode']) for r in allg['receipts']}
assert allg['portfolio']=={'uniqueSuccessfulCoverage':1139,'firstAttemptPassed':1138,'originalEnospcFailures':1,'successfulCaseReruns':1,'zeroTestSelectorAttempts':1}

prior=[('/tmp/capiro-unified-83f54f5a-source-preservation-independent-review-20261013','79a4f9f0c88b9f4a3fb0a086743150fe7cf407ed82436d167500f8a26b0c3f2b'),('/tmp/capiro-unified-83f54f5a-enospc-independent-review-20261013','3de28c6a17d462d79e91e59546c4c9d01e45738f766d13bed046316c28c33da8')]
pr=[]
for folder,h in prior:
 p=pathlib.Path(folder);m=read(p/'MANIFEST.json');assert sha(p/'MANIFEST.json')==h
 for e in m['files']:
  q=p/e['path'];assert q.stat().st_size==e['bytes'] and sha(q)==e['sha256'],q
 pr.append({'path':folder,'manifestSha256':h,'allManifestFilesUnchanged':True,'fileCount':len(m['files'])})
old=pathlib.Path(prior[1][0]);oldraw=read(old/'RAW-EVIDENCE-BINDINGS.json')
for e in oldraw:
 p=bound(e['path']);assert p.stat().st_size==e['bytes'] and sha(p)==e['sha256'],p
sourceold=pathlib.Path(prior[0][0]);sv=read(sourceold/'SOURCE-VERIFICATION.json')
for e in sv['finalSourceReceiptBindings']:assert sha(P/e['path'])==e['sha256']
orig=read(sourceold/'ALL-807-ORIGINAL-BINDINGS.json')
tracked={l.split('\t',1)[1]:l.split()[2] for l in git('ls-tree','-r',HEAD).splitlines()}
assert len(orig)==807 and len(set(e['path'] for e in orig))==291
assert all(tracked[e['path']]==e['blob'] for e in orig)

check=bound(R/'check.log').read_text();plain=re.sub(r'\x1b\[[0-9;]*m','',check)
nt=[int(x) for x in re.findall(r'^ℹ tests (\d+)$',plain,re.M)];np=[int(x) for x in re.findall(r'^ℹ pass (\d+)$',plain,re.M)];nf=[int(x) for x in re.findall(r'^ℹ fail (\d+)$',plain,re.M)]
vt=[int(x) for x in re.findall(r'^\s*Tests\s+(\d+) passed',plain,re.M)]
assert nt==np==[94,21,385] and nf==[0,0,0] and vt==[1631,288]
assert '76 problems (0 errors, 76 warnings)' in plain
archstarts=[m.start() for m in re.finditer(r'^\{',plain,re.M)];arch=None
for i in archstarts:
 try:x,end=json.JSONDecoder().raw_decode(plain[i:])
 except ValueError:continue
 if isinstance(x,dict) and isinstance(x.get('signals'),list) and 'sizeSummary' in x:arch=x;break
assert arch and not arch['errors'] and len(arch['signals'])==475
assert arch['sizeSummary']['reviewed']==452 and arch['sizeSummary']['inheritedUnreviewed']==23 and arch['sizeSummary']['blocking']==0
assert '"passed":8' in plain
el=bound(R/'elements.log').read_text();assert re.findall(r'^ℹ tests (\d+)$',el,re.M)==['15'] and re.findall(r'^ℹ fail (\d+)$',el,re.M)==['0']
elmeta=json.loads([l for l in el.splitlines() if l.startswith('{"qualified"')][0]);assert elmeta['qualified']
assert 'added 852 packages' in bound(R/'clean-install.log').read_text()
assert 'Compiled successfully' in bound(R/'build.log').read_text()

pb=read(R/'public-newsletter-browser/browser-results.json');recv=read(R/'public-newsletter-browser/browser-receiving-results.json');render=read(R/'public-newsletter-browser/browser-renderer-results.json');gold=read(P/'packages/qualification-newsletter/fixtures/original-C-renderer-golden.json')
assert len(render)==116 and render==gold
assert pb['passedCharacterizations']==116 and pb['passedReceivingCases']==130 and pb['requests']==[] and pb['pageErrors']==[]
assert recv['total']==recv['passed']==len(recv['cases'])==130 and recv['failed']==[] and all(c['passed'] for c in recv['cases'])
assert len(pb['publicNames'])==49 and pb['packedModuleCount']==6
prod=read(R/'production/production-smoke.json');preview=read(R/'production/preview-root-smoke.json');add=read(R/'actual-additions-v2/results.json');assets=read(R/'actual-served-assets/asset-results.json')
assert not prod['pageErrors'];assert len(prod['results'])==17
http=[x for x in prod['results'] if 'path' in x];modes=[x for x in prod['results'] if 'colorScheme' in x];hist=[x for x in prod['results'] if 'crossMode' in x]
assert len(http)==11 and all(x['headers']=='passed' for x in http)
assert len(modes)==4 and all(x['portfolio']['fits'] and x['portfolio']['sameDocument'] and x['stylesRestoredOnReturn'] and x['clientNavigation'] and x['headerNavigation'] for x in modes)
assert len(hist)==2 and all(x['sameDocument'] for x in hist)
assert preview=={'defaultProduct':'portfolio','rootStatus':200,'location':'/','followedSetup':True}
assert add['source']==HEAD and add['success'] and add['error'] is None and not add['remoteRequests'] and not add['pageErrors']
assert len(add['http'])==23 and len(add['assets'])==6 and len(add['browser'])==2
assert all(x['meriNavigationAndHistory'] and x['onboardPublicSetup'] for x in add['browser'])
assert assets['success'] and assets['error'] is None and assets['count']==len(assets['entries'])==179 and assets['bytes']==486014
assert sum(e['bytes'] for e in assets['entries'])==486014 and all(e['status']==200 for e in assets['entries'])
for e in assets['entries']+add['assets']:
 p=P/'apps/web/public'/e['path'].lstrip('/');assert p.stat().st_size==e['bytes'] and sha(p)==e['sha256']
assert sum(e['bytes'] for e in add['assets'])==458104
for x in [pb,prod,add]:assert x['browserVersion']=='154.0.8037.57'
screens=list(pathlib.Path(rr['config']['projects'][0]['outputDir']).rglob('mobile-rich.png'));assert len(screens)==1
png=bound(screens[0]); b=png.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n'; dimensions=struct.unpack('>II',b[16:24]);assert dimensions==(390,844),dimensions
for n in ['aggregate-recovered.py','continue-after-storage.py','qualify-successor.py','run-gate.py','run-portfolio-shards.py','portfolio-progress.json','ALL-GATES-COMPLETE.json','portfolio-recovered-aggregate.json']:
 bound(R/n)
for p in R.glob('*.log'):bound(p)
end=pin();assert start==end
result={'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS_BOUNDED_OFFLINE_GATES_WITH_DOCUMENTED_INFRASTRUCTURE_RECOVERY','sourceBefore':start,'sourceAfter':end,'portfolio':{'discovered':1139,'originalShardPartitionExact':True,'shards':shards,'firstAttemptPassed':1138,'firstAttemptFailed':1,'successfulExplicitReruns':1,'uniqueSuccessfulCoverage':1139,'actualTestExecutions':1140,'zeroTestSelectorAttempts':1,'automaticRetries':0,'skipped':0,'flaky':0,'timeoutDistributionOriginal':timeouts,'rerunTimeout':rc[0]['timeout'],'originalFailureAndRerunId':f['id'],'originalShard2ExitStill1':True,'originalFailureRawBindingsUnchanged':True,'targetedScreenshot':{**bindings[str(png)],'dimensions':dimensions}},'modules':{'uniqueCases':297,'passed':297,'automaticRetries':0,'skipped':0,'flaky':0,'timeoutDistribution':dict(collections.Counter(c['timeout'] for c in mc))},'gates':{'receipts':16,'exitZero':14,'preservedExitOne':['portfolio-shard-2','portfolio-enospc-case-rerun'],'allExactSourceUnchanged':True,'cleanInstallPackages':852,'nodeTestCounts':nt,'vitestTestCounts':vt,'declarationControls':8,'lintErrors':0,'lintWarnings':76,'architecture':arch['sizeSummary'],'elementsTests':15,'elementsScope':'offline SSR fixture only','elementsReceipt':elmeta,'publicRendererGoldenExact':116,'publicReceivingCases':130,'publicRuntimeNames':49,'publicPackedModules':6,'productionHttpHeaderControls':11,'productionLightDarkRenders':4,'productionHistoryControls':2,'previewDefaultRoot':True,'additionalHttpControls':23,'additionalViewports':[x['width'] for x in add['browser']],'servedNewsletterAssets':179,'servedNewsletterBytes':486014,'servedOnboardAssets':6,'servedOnboardBytes':458104,'actualSupplementalBrowserVersion':'154.0.8037.57'},'priorSealedPackets':pr,'sourcePreservationRevalidated':{'originalBindings':807,'uniquePaths':291,'finalSourcePins':len(sv['finalSourceReceiptBindings']),'lockSha256':sha(P/'package-lock.json')},'rootAggregatesAgree':True,'reviewerRuntimeExecution':False,'limits':['337 native rows remain held','No native credentials/providers/paid models/AWS/deployment exercised','No musl or container-image qualification','No full Figma parity or assistive-technology acceptance','No whole-program provenance proof from negative client scans','Earlier source passes are not transferred to this source','Original shard2 remains FAILED; successful coverage includes one explicit same-source recovery']}
save('VERIFICATION.json',result);save('RAW-EVIDENCE-BINDINGS.json',list(bindings.values()));print(json.dumps({'status':result['status'],'portfolio':{k:v for k,v in result['portfolio'].items() if k!='shards'},'modules':result['modules'],'receiptCount':len(receipts),'rawEvidenceBindings':len(bindings)},indent=2))
