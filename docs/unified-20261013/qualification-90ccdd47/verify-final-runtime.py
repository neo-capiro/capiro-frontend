from pathlib import Path
import json,collections,hashlib,datetime,re
R=Path('/workspace/capiro-unified-files-corrected-20261013');O=Path(__file__).parent
SOURCE={'head':'90ccdd47de7a989e822590d616d69baa15a37d5d','tree':'2bd75625dfa0b1a8aa894a48a68f34550a6f5037','applicationTree':'002c31576d9038d4d7f6438db9db3ae9cf00171c','sourceDiff':''}
def load(p):return json.loads(Path(p).read_text())
def save(n,x):(O/n).write_text(json.dumps(x,indent=2)+'\n')
def cases(x):
 out=[]
 def visit(ss):
  for s in ss:
   for sp in s.get('specs',[]):
    for t in sp['tests']:out.append({'id':sp['id'],'file':sp['file'],'title':sp['title'],'timeout':t['timeout'],'status':t['status'],'expectedStatus':t['expectedStatus'],'results':[{'status':r['status'],'retry':r['retry'],'errors':r.get('errors',[])} for r in t['results']]})
   visit(s.get('suites',[]))
 visit(x['suites']);return out
receipts=[]
for p in sorted(R.glob('*-exit.json')):
 e=load(p);assert e['sourceBefore']==e['sourceAfter']==SOURCE and e['sourceChanged'] is False and e['exitCode']==(1 if e['name']=='served-newsletter-assets' else 0);receipts.append(e)
assert len(receipts)==15
allcases=[];shards=[];ids=set();discovery=cases(load(R/'portfolio-discovery.json'));di={c['id'] for c in discovery};assert len(discovery)==len(di)==1139
for n,count in [(1,285),(2,298),(3,273),(4,283)]:
 d=load(R/f'portfolio-shard-{n}-results.json');cs=cases(d);ci={c['id'] for c in cs};assert len(cs)==len(ci)==count and not ids&ci and ci<=di;ids|=ci
 assert all(c['status']=='expected' and c['expectedStatus']=='passed' and c['results']==[{'status':'passed','retry':0,'errors':[]}] for c in cs)
 assert d['stats']['expected']==count and d['stats']['unexpected']==d['stats']['skipped']==d['stats']['flaky']==0 and d['errors']==[]
 assert d['config']['shard']=={'current':n,'total':4} and d['config']['workers']==2 and all(p['retries']==0 for p in d['config']['projects'])
 allcases.extend([{**c,'shard':n} for c in cs]);shards.append({'shard':n,'passed':count,'stats':d['stats'],'timeoutDistribution':dict(collections.Counter(c['timeout'] for c in cs))})
assert ids==di
agg=load(R/'portfolio-aggregate.json');assert agg['source']==SOURCE['head'] and agg['passed']==agg['discovered']==1139 and agg['duplicateIds']==agg['missingIds']==agg['unexpected']==agg['skipped']==agg['flaky']==0 and agg['allSourceUnchanged'] is True
for r in agg['reports']:assert set(r['ids'])=={c['id'] for c in allcases if c['shard']==r['shard']} and r['exitCode']==0
modules=load(R/'modules-browser-results.json');mc=cases(modules);assert len(mc)==len({c['id'] for c in mc})==324 and modules['errors']==[] and all(c['results']==[{'status':'passed','retry':0,'errors':[]}] and c['status']=='expected' for c in mc)
check=re.sub(r'\x1b\[[0-9;]*m','',(R/'check.log').read_text());node=[int(n) for n in re.findall(r'^ℹ tests (\d+)$',check,re.M)];v=[int(n) for n in re.findall(r'^\s*Tests\s+(\d+) passed',check,re.M)]
assert node==[97,21,385] and v==[1826,288] and re.findall(r'^ℹ fail (\d+)$',check,re.M)==['0','0','0'] and '76 problems (0 errors, 76 warnings)' in check
arch=None
for m in re.finditer(r'^\{',check,re.M):
 try:x,_=json.JSONDecoder().raw_decode(check[m.start():])
 except ValueError:continue
 if isinstance(x,dict) and 'sizeSummary' in x:arch=x
assert arch['errors']==[] and arch['sizeSummary']=={'total':479,'reviewed':456,'inheritedUnreviewed':23,'blocking':0}
assert '"passed":8' in check
prod=load(R/'production/production-smoke.json');assert len(prod['results'])==26 and prod['pageErrors']==[]
assert len([x for x in prod['results'] if x.get('headers')=='passed'])==12 and len([x for x in prod['results'] if x.get('configured') is False and x['status']==503])==4 and len([x for x in prod['results'] if x.get('documentFiles')])==4
assert len([x for x in prod['results'] if 'portfolio' in x])==4 and len([x for x in prod['results'] if 'crossMode' in x])==2
pub=load(R/'public-newsletter-browser/browser-results.json');assert pub['passedCharacterizations']==116 and pub['passedReceivingCases']==130 and pub['requests']==pub['pageErrors']==[]
assets=load(R/'actual-served-assets/asset-results.json');assert assets['success'] and assets['error'] is None and assets['count']==len(assets['entries'])==179 and assets['bytes']==486014
add=load(R/'actual-additions-v2/results.json');assert add['success'] and add['error'] is None and add['source']==SOURCE['head'] and add['pageErrors']==add['remoteRequests']==[]
final=load(R/'FINAL-SOURCE-CONFIRMATION.json');assert {k:final[k] for k in ['head','tree','applicationTree']}=={k:SOURCE[k] for k in ['head','tree','applicationTree']} and final['status']=='' and final['lockSha256']=='6acaf74b4fb676b59731245e04a6c2d54865fb71727b6f6d5f99b4cfa5e1fed7'
save('FINAL-CASE-VERIFICATION.json',{'source':SOURCE,'portfolio':allcases,'portfolioCount':1139,'uniqueDiscoveryUnionExact':True,'shards':shards,'automaticRetries':0,'skipped':0,'flaky':0,'portfolioTimeouts':dict(collections.Counter(c['timeout'] for c in allcases)),'sharedSuiteCount':324,'sharedSuiteTimeouts':dict(collections.Counter(c['timeout'] for c in mc))})
x={'verifiedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'ALL_RELEASED_RUNTIME_RECEIPTS_RECONCILED_AWAITING_FINAL_INDEPENDENT_AUDIT_SEAL','source':SOURCE,'receipts':receipts,'receiptCount':15,'preservedNonzeroCurrentSourceReceipt':'served-newsletter-assets exit1 before HTTP','portfolio':{'uniquePassed':1139,'discoveryCount':1139,'shards':shards,'automaticRetries':0,'skipped':0,'flaky':0},'sharedSuitePassed':324,'canonicalCheck':{'nodeGroups':node,'vitestGroups':v,'declarationControls':8,'lintWarnings':76,'lintErrors':0,'architecture':arch['sizeSummary']},'publicBrowser':{'characterizations':116,'receiving':130,'browserVersion':pub['browserVersion']},'actualServer':{'httpHeaderControls':12,'disabledDocumentPosts503':4,'FilesNavigationCases':4,'PortfolioRenders':4,'crossModeHistoryCases':2,'pageErrors':[],'browserVersion':prod['browserVersion']},'assets':{'count':179,'bytes':486014,'scope':'separate restored-input pass; original preflight failure retained'},'additions':{'http':len(add['http']),'assets':len(add['assets']),'viewports':[b['width'] for b in add['browser']]},'finalSourceConfirmation':final,'openConsoleIssue':'Inherited83 pre-Files integration duplicate sibling keys; remains open despite passing assertions','limits':['not native337 acceptance','not Office opening/rendering/recalculation','not full Figma/theme/AT/WCAG','not musl/container image/deployment','no current runtime/test/build/install executed by this publisher']}
save('FINAL-RUNTIME-RECONCILIATION.json',x)
print(json.dumps({'source':SOURCE['head'],'portfolio':1139,'shared':324,'receipts':15,'timeouts':dict(collections.Counter(c['timeout'] for c in allcases)),'packetBytes':sum(p.stat().st_size for p in O.rglob('*') if p.is_file())},indent=2))
