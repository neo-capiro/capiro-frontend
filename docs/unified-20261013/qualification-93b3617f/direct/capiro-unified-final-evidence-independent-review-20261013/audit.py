"""Read-only Git, receipt, and byte-preservation audit. Never executes app/test code."""
import collections, datetime, hashlib, json, pathlib, re, subprocess
ROOT=pathlib.Path('/workspace/capiro-onboard-port-20261013')
RAW=pathlib.Path('/tmp/capiro-unified-final-93b3617f-20261013')
OUT=pathlib.Path(__file__).parent
BASE='6a2e4aceaaa354a8edd9bf54e4148380ccbb1e32'
FINAL='93b3617f5d0599f34da373525a96dfc70eaa85d6'
APP='46fb1aae65c1cdc640c965254b947a149e982c17'
TREE='871dfd1bf868527c605b0c2e78c83179db3baba2'
observed=datetime.datetime.now(datetime.timezone.utc).isoformat()
reads={}
def raw(p):
 p=pathlib.Path(p);b=p.read_bytes();reads[str(p)]={'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()};return b
def js(p): return json.loads(raw(p))
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode().strip()
def save(name,data): (OUT/name).write_text(json.dumps(data,indent=2)+'\n')
def listing(ref):
 return {line.split('\t',1)[1]:line.split('\t',1)[0].split()[2] for line in git('ls-tree','-r',ref).splitlines()}
source={'observedUTC':observed,'head':git('rev-parse','HEAD'),'rootTree':git('rev-parse','HEAD^{tree}'),'applicationTree':git('rev-parse','HEAD:apps/web'),'srcTree':git('rev-parse','HEAD:apps/web/src'),'status':git('status','--porcelain=v1'),'reviewerRuntimeExecution':False}
assert (source['head'],source['rootTree'],source['applicationTree'],source['status'])==(FINAL,TREE,APP,'')
source['deltaFromAccepted6a']=git('diff','--name-status',BASE,FINAL).splitlines()
inputs=js(ROOT/'docs/unified-20261013/INPUTS-AND-PRESERVATION.json')
current=listing(FINAL);old=listing(BASE);lane_maps={n:listing(c) for n,c in inputs['heads'].items()}
source['ancestry']={n:subprocess.call(['git','merge-base','--is-ancestor',c,FINAL],cwd=ROOT)==0 for n,c in inputs['heads'].items()}
bindings=[]
for r in inputs['originalTestBindings']:
 p=r['path'];b=r['blob'];n=r['lane'];bindings.append({**r,'originalMatches':lane_maps[n].get(p)==b,'finalMatches':current.get(p)==b})
assert len(bindings)==807 and all(x['originalMatches'] and x['finalMatches'] for x in bindings)
source['preservedTestFileBindings']={'laneBoundRecords':len(bindings),'uniquePaths':len({r['path'] for r in bindings}),'allExact':True,'notTestCaseCounts':True}
source['preservedTrees']=[]
for r in inputs['featureTrees']:
 p=r['path'];a=git('rev-parse',inputs['heads'][r['lane']]+':'+p);b=git('rev-parse',FINAL+':'+p);source['preservedTrees'].append({**r,'originalTree':a,'finalTree':b,'allExact':a==b==r['tree']})
assert all(x['allExact'] for x in source['preservedTrees'])
critical=[p for p in current if p.startswith(('vendor/','packages/qualification-newsletter/','packages/meri-client/','apps/web/src/shared/meri-actions/','apps/web/src/shared/capiro/','scripts/architecture')) or p in ['package.json','package-lock.json','apps/web/package.json','scripts/public-packages.mjs']]
source['publicBoundaryPreservation']={'comparedPaths':len(critical),'changedFromAccepted6a':[p for p in critical if current[p]!=old.get(p)],'lockSha256':hashlib.sha256(raw(ROOT/'package-lock.json')).hexdigest(),'lockEntries':len(js(ROOT/'package-lock.json')['packages'])}
assert source['publicBoundaryPreservation']['changedFromAccepted6a']==[]
mobile=pathlib.Path('/tmp/capiro-meri-mobile-navigation-independent-review-20261013')
mobile_binding=js(mobile/'SOURCE-BINDING.json')
source['mobileReviewByteBindings']=[{'path':x['path'],'sha256':hashlib.sha256(raw(ROOT/x['path'])).hexdigest(),'matchesReviewed':hashlib.sha256(raw(ROOT/x['path'])).hexdigest()==x['sha256']} for x in mobile_binding['files']]
assert all(x['matchesReviewed'] for x in source['mobileReviewByteBindings'])
raw_pres=js(RAW/'final-source-preservation.json')
source['rootPreservationReceiptMatches']=(raw_pres['source']==FINAL and raw_pres['applicationTree']==APP and raw_pres['originalTestBindings']==len(bindings) and raw_pres['originalTestChanges']==[] and raw_pres['lockSha256']==source['publicBoundaryPreservation']['lockSha256'])
assert source['rootPreservationReceiptMatches']
source['referencedReviewManifests']=[]
for rec in raw_pres['independentReviews']:
 p=pathlib.Path(rec['manifestPath']);b=raw(p);d=json.loads(b);records=next(d[k] for k in ['files','entries','records'] if isinstance(d.get(k),list))
 checks=[]
 for x in records:
  q=p.parent/x['path'];v=raw(q);checks.append({'path':x['path'],'matches':len(v)==x['bytes'] and hashlib.sha256(v).hexdigest()==x['sha256']})
 source['referencedReviewManifests'].append({'path':str(p),'matchesRootReceipt':hashlib.sha256(b).hexdigest()==rec['manifestSha256'],'verifiedEntries':len(checks),'allEntriesMatch':all(x['matches'] for x in checks)})
assert all(x['matchesRootReceipt'] and x['allEntriesMatch'] for x in source['referencedReviewManifests'])
save('SOURCE-VERIFICATION.json',source);save('PRESERVED-TEST-FILE-BINDINGS.json',bindings)
gates=[]
for p in sorted(RAW.glob('*-exit.json')):
 d=js(p);exact=lambda x:x=={'head':FINAL,'tree':TREE,'applicationTree':APP,'sourceDiff':''}
 gates.append({**d,'verifiedExactSource':exact(d['sourceBefore']) and exact(d['sourceAfter']) and d['sourceChanged'] is False})
assert all(x['verifiedExactSource'] for x in gates)
save('GATE-RECEIPTS.json',gates)
check=raw(RAW/'check.log').decode();arch_text=check.split('> node scripts/architecture.mjs',1)[1].lstrip();arch=json.JSONDecoder().raw_decode(arch_text)[0]
counts={'checkNodeCounts':[int(x) for x in re.findall(r'^ℹ tests (\d+)$',check,re.M)],'checkNodePass':[int(x) for x in re.findall(r'^ℹ pass (\d+)$',check,re.M)],'checkNodeFail':[int(x) for x in re.findall(r'^ℹ fail (\d+)$',check,re.M)],'vitestCounts':[int(x) for x in re.findall(r'^\s+Tests\s+(\d+) passed',check,re.M)],'declarations':json.loads(re.findall(r'^\{"directory":"/tmp/capiro-newsletter-types-.*$',check,re.M)[0])['passed'],'architecture':{'sizeSummary':arch['sizeSummary'],'errors':arch.get('errors')},'lintSummary':re.findall(r'^.*problems \(.*$',check,re.M),'installSummary':re.findall(r'^added .*$',raw(RAW/'clean-install.log').decode(),re.M),'elementsNodeTests':[int(x) for x in re.findall(r'^ℹ tests (\d+)$',raw(RAW/'elements.log').decode(),re.M)]}
assert counts['checkNodeCounts']==counts['checkNodePass']==[94,21,385] and counts['checkNodeFail']==[0,0,0] and counts['vitestCounts']==[1631,288] and counts['declarations']==8
save('CHECK-COUNTS.json',counts)
def browser(p):
 d=js(p);rows=[]
 def visit(s):
  for q in s.get('specs',[]):
   for t in q.get('tests',[]):rows.append({'id':q['id'],'file':q['file'],'title':q['title'],'status':t['status'],'timeout':t['timeout'],'results':[{'status':r['status'],'retry':r['retry']} for r in t.get('results',[])]})
  for v in s.get('suites',[]):visit(v)
 visit(d);c=d['config'];return {'path':str(p),'stats':d['stats'],'errors':d['errors'],'workers':c['workers'],'actualWorkers':c.get('metadata',{}).get('actualWorkers'),'projects':[{'name':x['name'],'timeout':x['timeout'],'retries':x['retries'],'testDir':x['testDir']} for x in c['projects']],'count':len(rows),'uniqueIds':len({x['id'] for x in rows}),'timeoutCounts':dict(collections.Counter(x['timeout'] for x in rows)),'statusCounts':dict(collections.Counter(x['status'] for x in rows)),'resultStatusCounts':dict(collections.Counter(y['status'] for x in rows for y in x['results'])),'retryCounts':dict(collections.Counter(y['retry'] for x in rows for y in x['results'])),'rows':rows}
modules=browser(RAW/'modules-browser-results.json');assert modules['count']==286 and modules['stats']['expected']==286 and modules['resultStatusCounts']=={'passed':286} and modules['errors']==[]
save('MODULES-VERIFICATION.json',modules)
discovery=browser(RAW/'portfolio-discovery.json');completed=[]
for i in range(1,5):
 p=RAW/f'portfolio-shard-{i}-exit.json'
 if p.exists():
  d=browser(RAW/f'portfolio-shard-{i}-results.json');d['shard']=i;d['exitCode']=js(p)['exitCode'];completed.append(d)
seen=[r['id'] for d in completed for r in d['rows']];expected={r['id'] for r in discovery['rows']}
portfolio={'observedUTC':observed,'status':'PASS' if len(completed)==4 and len(seen)==len(expected) and len(seen)==len(set(seen)) and all(d['exitCode']==0 and d['stats']['unexpected']==d['stats']['skipped']==d['stats']['flaky']==0 for d in completed) else 'PENDING','discoveryCount':len(expected),'discoveryIsListOnly':True,'completedShards':completed,'completedCases':len(seen),'unknownIds':sorted(set(seen)-expected),'duplicateIds':len(seen)-len(set(seen)),'remainingCount':len(expected-set(seen)),'pendingShards':[i for i in range(1,5) if not (RAW/f'portfolio-shard-{i}-exit.json').exists()]}
assert not portfolio['unknownIds'] and not portfolio['duplicateIds']
save('PORTFOLIO-CHECKPOINT.json',portfolio)
# Read and bind completed detailed outputs; these are author execution, not a reviewer rerun.
public=js(RAW/'public-newsletter-browser/browser-results.json');receiving=js(RAW/'public-newsletter-browser/browser-receiving-results.json');render=js(RAW/'public-newsletter-browser/browser-renderer-results.json')
assert public['passedCharacterizations']==len(render)==116 and public['passedReceivingCases']==receiving['passed']==receiving['total']==len(receiving['cases'])==130 and receiving['failed']==[]
production=js(RAW/'production/production-smoke.json');preview=js(RAW/'production/preview-root-smoke.json');additional=js(RAW/'actual-additions-v2/results.json');assets=js(RAW/'actual-served-assets/asset-results.json')
asset_checks=[]
for a in assets['entries']:
 b=raw(ROOT/('apps/web/public'+a['path']));asset_checks.append({'path':a['path'],'matches':a['status']==200 and a['bytes']==len(b) and a['sha256']==hashlib.sha256(b).hexdigest()})
assert len(asset_checks)==179 and sum(a['bytes'] for a in assets['entries'])==486014 and all(a['matches'] for a in asset_checks)
onboard_checks=[]
for a in additional['assets']:
 b=raw(ROOT/('apps/web/public'+a['path']));onboard_checks.append({'path':a['path'],'matches':a['bytes']==len(b) and a['sha256']==hashlib.sha256(b).hexdigest()})
assert len(onboard_checks)==6 and sum(a['bytes'] for a in additional['assets'])==458104 and all(a['matches'] for a in onboard_checks)
chunks=js(RAW/'client-chunk-boundary.json');elements=js(RAW/'elements-work/qualification.json');element_receipt=js(pathlib.Path(elements['receiptPath']))
initial=js(RAW/'actual-additions/results.json');diagnostic=js(RAW/'origin-diagnostic/results.json');diagnostic2=js(RAW/'origin-diagnostic-v2/results.json')
for p in ['verify-additions.mjs','verify-additions-v2.mjs','origin-diagnostic.mjs','origin-diagnostic-v2.mjs','request-origin-probe.mjs','request-origin-probe-v2.mjs','origin-diagnostic/standalone.log','origin-diagnostic-v2/standalone.log','actual-additions-v2/standalone.log','run-gate.py','backend-source-compatibility-closeout.json','figma-audit-inputs/CAPTURES-CHECKPOINT.json','figma-audit-inputs/FIGMA-INVENTORY.json']:
 raw(RAW/p)
save('BOUNDED-RESULTS.json',{'publicBrowser':public,'receiving':{'total':receiving['total'],'passed':receiving['passed'],'failed':receiving['failed']},'production':production,'previewRoot':preview,'additionalV2':additional,'servedNewsletterAssets':{'count':len(asset_checks),'bytes':assets['bytes'],'allMatchTrackedFiles':True,'platform':assets['platform'],'architecture':assets['architecture'],'glibc':assets['glibc'],'runtime':assets['runtime']},'onboardAssets':{'count':len(onboard_checks),'bytes':458104,'allMatchTrackedFiles':True},'elements':{**elements,'scope':element_receipt['scope'],'node':element_receipt['node']},'clientChunkBoundary':{k:v for k,v in chunks.items() if k!='clientChunks'}|{'chunkCount':len(chunks['clientChunks'])},'initialActualAdditions':initial,'diagnosticV1':diagnostic,'diagnosticV2':diagnostic2})
for p in ['check.log','clean-install.log','elements.log','build.log','production.log','served-newsletter-assets.log','actual-additions.log','actual-additions-v2.log','modules-browser.log','public-newsletter-browser.log']:
 if (RAW/p).exists():raw(RAW/p)
save('READ-EVIDENCE-HASHES.json',{'observedUTC':observed,'records':list(reads.values())})
print(json.dumps({'source':source['head'],'preserved':len(bindings),'trees':len(source['preservedTrees']),'gates':len(gates),'moduleCases':modules['count'],'portfolio':{k:v for k,v in portfolio.items() if k!='completedShards'},'sourceBoundaryChanges':source['publicBoundaryPreservation']['changedFromAccepted6a'],'readFiles':len(reads)},indent=2))
