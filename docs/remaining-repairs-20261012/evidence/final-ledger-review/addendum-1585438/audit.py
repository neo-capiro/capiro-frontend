from pathlib import Path
import json,subprocess,hashlib,datetime
root=Path('/workspace/capiro-remaining');out=Path('/tmp/capiro-remaining-final-ledger-review/addendum-1585438');prior=out.parent/'addendum-d68c2dc';ev=Path('/tmp/capiro-remaining-root-evidence');source='1585438295776604f23a5cb5ab592729f7c468ca';old='d68c2dc6b80c400b8ce9b07837f7a14cabb5d616'
def git(*a,data=None):return subprocess.check_output(['git',*a],cwd=root,input=data)
def blob(c,p):return git('show',c+':'+p)
def obj(p):return json.loads(Path(p).read_text())
def digest(b):return hashlib.sha256(b).hexdigest()
def paths(*a):return [x.decode() for x in git(*a).split(b'\0') if x]
def verify_manifest(folder,name,key):
 m=obj(folder/name);checks=[]
 for row in m[key]:
  p=Path(row['path']);p=p if p.is_absolute() else folder/p;b=p.read_bytes();assert len(b)==row['bytes'] and digest(b)==row['sha256'];checks.append(str(p))
 return {'manifest':str(folder/name),'manifestSha256':digest((folder/name).read_bytes()),'verifiedPayloadCount':len(checks)}
assert git('rev-parse','HEAD').decode().strip()==source
identity={k:git('rev-parse',r).decode().strip() for k,r in [('source',source),('rootTree',source+'^{tree}'),('applicationTree',source+':apps/web'),('srcTree',source+':apps/web/src')]}
receipt=obj(ev/'FROZEN-SOURCE-RECEIPT-1585438.json');assert all(receipt[k]==v for k,v in identity.items())
assert identity['srcTree']==git('rev-parse',old+':apps/web/src').decode().strip()=='fa4ca7b5ca126f7bcdc1cf816584fa0303d61704'
checks=[]
for r in receipt['records']:
 b=blob(source,r['path']);assert digest(b)==r['sha256'] and len(b)==r['bytes'] and git('rev-parse',source+':'+r['path']).decode().strip()==r['gitBlob'];assert (root/r['path']).read_bytes()==b;checks.append({**r,'verified':True})
assert len(checks)==140
oldreceipt=obj(ev/'FROZEN-SOURCE-RECEIPT-d68c2dc.json');oldrows={r['path']:r for r in oldreceipt['records']};assert set(oldrows)=={r['path'] for r in checks}
changed_records=[r['path'] for r in receipt['records'] if r!=oldrows[r['path']]];assert changed_records==['apps/web/test/browser/remaining-modules.spec.ts']
delta=paths('diff','--name-only','-z',old,source);assert set(delta)=={'apps/web/test/browser/remaining-modules.spec.ts','docs/remaining-repairs-20261012/STRUCTURE-REVIEW.md'}
mapping=obj(ev/'integration-map-final-1585438.json');oldmapping=obj(ev/'integration-map-final-d68c2dc.json');assert mapping['mapping'][:19]==oldmapping['mapping'];assert len(mapping['mapping'])==21
for key in ['excludedHistoricalCommit','sourcePins']:assert mapping[key]==oldmapping[key]
mapchecks=[];latest={}
for row in mapping['mapping']:
 assert subprocess.run(['git','merge-base','--is-ancestor',row['integration'],source],cwd=root).returncode==0
 ids=[git('patch-id','--stable',data=git('show','--pretty=format:','--binary',c)).decode().split()[0] for c in [row['source'],row['integration']]];assert ids[0]==ids[1]
 ps=paths('diff-tree','--no-commit-id','--name-only','-r','-z',row['integration']);mapchecks.append({**row,'patchIdentical':True,'stablePatchId':ids[0],'ancestor':True})
 for p in ps:latest[p]=row
latestchecks=[]
for p,row in sorted(latest.items()):
 b=blob(source,p);assert b==blob(row['source'],p);latestchecks.append({'path':p,'owner':row['owner'],'ownerSource':row['source'],'sha256':digest(b),'identical':True})
supplemental=mapping['supplementalRootReviewBinding'];assert supplemental['path']=='docs/architecture-size-reviews.json' and supplemental['commit']=='334bbbf14a5d9e8ae476f519bbae6561acd96fbf';assert blob(source,supplemental['path'])==blob(old,supplemental['path'])==blob(supplemental['commit'],supplemental['path'])
assert set(r['path'] for r in checks)-set(latest)=={supplemental['path']}
assert subprocess.run(['git','merge-base','--is-ancestor',mapping['excludedHistoricalCommit'],source],cwd=root).returncode==1
packets=[verify_manifest(out.parent,'MANIFEST.json','outputs'),verify_manifest(out.parent/'addendum-adbc84b','MANIFEST.json','files'),verify_manifest(prior,'MANIFEST.json','files')]
previous=obj(prior/'SOURCE-LEDGER-VERIFICATION.json')
for row in previous['originalBindingsUnchanged']:assert digest(blob(source,row['path']))==row['sha256']
assert not git('diff','--name-only',old,source,'--','docs/remaining-assessment-20261012','docs/followup-20261012','docs/successor-p1-20261012','scripts','docs/architecture-size-reviews.json','package.json','package-lock.json','apps/web/src','.dockerignore')
assert git('rev-parse','d5dd0be9bf5ad7800e648ff1421ce047523288b3^{tree}').decode().strip()=='7448658084841f7773144ce5d8714a19103e4ddd'
checkpoint=Path('/tmp/capiro-remaining-qualification/final-d68c2dc');suite=obj(checkpoint/'modules-browser-results.json');ex=obj(checkpoint/'modules-browser-exit.json');failures=[];results=[]
def walk(s):
 for sub in s.get('suites',[]):walk(sub)
 for spec in s.get('specs',[]):
  for t in spec['tests']:
   results.extend(t['results'])
   if t['status']!='expected':failures.append({'file':spec['file'],'title':spec['title'],'status':t['status']})
walk(suite);assert suite['stats']['expected']==207 and suite['stats']['unexpected']==1 and suite['stats']['skipped']==0 and suite['stats']['flaky']==0 and all(r.get('retry',0)==0 for r in results)
assert ex['exitCode']==1 and ex['sourceChanged']==False and ex['sourceBefore']['head']==old
assert not list(checkpoint.glob('portfolio-browser*'))
owner=Path('/tmp/capiro-remaining-modules-evidence/keyboard-d68-correction');green=obj(owner/'browser-focus-corrected.json');assert green['stats']['expected']==1 and green['stats']['unexpected']==0 and green['stats']['skipped']==0 and green['stats']['flaky']==0;assert all(p['retries']==0 for p in green['config']['projects']);assert (owner/'remaining-modules.final.spec.ts').read_bytes()==blob(source,'apps/web/test/browser/remaining-modules.spec.ts')
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'verdict':'PASS_BOUNDED_SOURCE_LEDGER_ADDENDUM','identity':identity,'checkpoint':old,'runtimeTreeUnchanged':True,'delta':[{'path':p,'beforeSha256':digest(blob(old,p)),'afterSha256':digest(blob(source,p))} for p in delta],'sourceRecordCount':140,'sourceRecords':checks,'changedSourceReceiptPaths':changed_records,'mappingCount':21,'mappingChecks':mapchecks,'latestMappedFiles':latestchecks,'supplementalRootReviewBinding':supplemental,'excludedHistoricalCallbackStillExcluded':True,'sourcePinsUnchanged':True,'priorPacketsVerified':packets,'ledgerInvariants':previous['originalStatuses'],'allRuntimePolicyDependencyAndHistoricalLedgerBytesUnchangedFromD68':True,'frozenD5Unchanged':True,'d68ModulesCheckpoint':{'statistics':suite['stats'],'exitCode':ex['exitCode'],'sourceChanged':ex['sourceChanged'],'retryResults':0,'failures':failures},'d68FullPortfolio':'NOT_RUN; no full Portfolio producer or result files exist in that checkpoint','ownerFocusedReplay':{'stats':green['stats'],'retries':0,'specMatchesFinalCommit':True,'scope':'Unchanged d68 application with final committed spec, not full successor qualification'},'currentCombinedQualification':'NOT_CLAIMED_RUNNING_ROOT_OWNED','repositoryStatus':git('status','--porcelain=v1').decode()}
(out/'SOURCE-LEDGER-VERIFICATION.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['verdict','identity','sourceRecordCount','changedSourceReceiptPaths','mappingCount','ledgerInvariants','d68ModulesCheckpoint','d68FullPortfolio','currentCombinedQualification']},indent=2))
