"""Read-only Portfolio result/Git receipt verification; never starts app/test commands."""
from pathlib import Path
import collections,datetime,hashlib,json,subprocess
R=Path('/tmp/capiro-unified-final-93b3617f-20261013');O=Path(__file__).parent;ROOT=Path('/workspace/capiro-onboard-port-20261013');reads=[]
source={'head':'93b3617f5d0599f34da373525a96dfc70eaa85d6','tree':'871dfd1bf868527c605b0c2e78c83179db3baba2','applicationTree':'46fb1aae65c1cdc640c965254b947a149e982c17','sourceDiff':''}
def b(p):
 v=p.read_bytes();reads.append({'path':str(p),'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest()});return v
def j(p):return json.loads(b(p))
def write(name,v):(O/name).write_text(json.dumps(v,indent=2)+'\n')
def rows(d):
 out=[]
 def walk(s):
  for x in s.get('specs',[]):
   for t in x['tests']:out.append({'id':x['id'],'file':x['file'],'line':x['line'],'title':x['title'],'status':t['status'],'expectedStatus':t['expectedStatus'],'timeout':t['timeout'],'results':[{'status':r['status'],'retry':r['retry'],'errors':r.get('errors',[])} for r in t.get('results',[])]})
  for s in s.get('suites',[]):walk(s)
 walk(d);return out
prior=[]
for folder in ['/tmp/capiro-unified-final-evidence-independent-review-20261013','/tmp/capiro-unified-final-evidence-independent-review-20261013-shards12-addendum']:
 p=Path(folder);m=j(p/'MANIFEST.json');checks=[]
 for x in m['files']:
  v=(p/x['path']).read_bytes();checks.append(len(v)==x['bytes'] and hashlib.sha256(v).hexdigest()==x['sha256'])
 assert all(checks);prior.append({'packet':str(p),'manifestSha256':hashlib.sha256((p/'MANIFEST.json').read_bytes()).hexdigest(),'verifiedFiles':len(checks),'allUnchanged':True})
d=j(R/'portfolio-discovery.json');discovery=rows(d);expected={x['id'] for x in discovery};assert len(discovery)==len(expected)==1122 and d['errors']==[]
aggregate=j(R/'portfolio-aggregate.json');progress=j(R/'portfolio-progress.json');assert next(x for x in progress['reports'] if x['shard']==2)['exitCode']==120
# Previously sealed raw shard1/2 bytes remain immutable; no discarded or rewritten attempt.
old_reads=j(Path('/tmp/capiro-unified-final-evidence-independent-review-20261013-shards12-addendum/RAW-EVIDENCE-BINDINGS.json'))
retained=[]
for x in old_reads:
 if Path(x['path']).name in ['portfolio-shard-1-results.json','portfolio-shard-2-results.json','portfolio-shard-1-exit.json','portfolio-shard-2-exit.json','portfolio-shard-1.log','portfolio-shard-2.log','portfolio-progress.json','portfolio-discovery.json']:
  v=b(Path(x['path']));ok=len(v)==x['bytes'] and hashlib.sha256(v).hexdigest()==x['sha256'];assert ok;retained.append({'path':x['path'],'unchangedSinceShards12Review':ok})
shards=[];all_rows=[];last_end=None
for i,n in [(1,283),(2,298),(3,270),(4,271)]:
 gate=j(R/f'portfolio-shard-{i}-exit.json');d=j(R/f'portfolio-shard-{i}-results.json');rs=rows(d);ids=[x['id'] for x in rs]
 assert gate['exitCode']==0 and gate['sourceBefore']==gate['sourceAfter']==source and gate['sourceChanged'] is False
 assert f'--shard={i}/4' in gate['command'] and '--workers=3' in gate['command']
 assert len(ids)==len(set(ids))==n and d['errors']==[] and d['stats']['expected']==n
 assert all(d['stats'][k]==0 for k in ['unexpected','skipped','flaky'])
 assert all(x['expectedStatus']=='passed' and x['status']=='expected' and x['results']==[{'status':'passed','retry':0,'errors':[]}] for x in rs)
 assert d['config']['workers']==d['config']['metadata']['actualWorkers']==3 and all(x['timeout']==30000 and x['retries']==0 for x in d['config']['projects'])
 assert f'{n} passed (' in b(R/f'portfolio-shard-{i}.log').decode()
 claim=next(x for x in aggregate['reports'] if x['shard']==i);assert claim['exitCode']==0 and set(claim['ids'])==set(ids) and claim['stats']==d['stats'] and claim['reusedCompletedReceipt']==(i<=2)
 start=datetime.datetime.fromisoformat(gate['startedUTC']);end=datetime.datetime.fromisoformat(gate['endedUTC']);assert not last_end or start>=last_end;last_end=end
 shards.append({'shard':i,'count':n,'gate':gate,'stats':d['stats'],'workers':3,'retries':0,'actualResults':dict(collections.Counter(x['results'][0]['status'] for x in rs)),'timeouts':dict(collections.Counter(x['timeout'] for x in rs)),'errors':d['errors'],'retainedPriorReceipt':i<=2})
 all_rows+=rs
ids=[x['id'] for x in all_rows];assert len(ids)==len(set(ids))==1122 and set(ids)==expected
assert aggregate['source']==source['head'] and aggregate['passed']==aggregate['discovered']==1122 and aggregate['allSourceUnchanged'] is True
assert all(aggregate[k]==0 for k in ['duplicateIds','missingIds','unexpected','skipped','flaky'])
assert '120' in aggregate['orchestrationInterruption'] and 'cause not proven' in aggregate['orchestrationInterruption']
# Frozen Git object verification remains valid even when root proceeds to a successor afterward.
g=lambda *a:subprocess.check_output(['git',*a],cwd=ROOT,text=True).strip()
assert g('rev-parse',source['head']+'^{tree}')==source['tree'] and g('rev-parse',source['head']+':apps/web')==source['applicationTree']
summary={'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS_FROZEN93_PORTFOLIO1122_WITH_PRESERVED_OUTER_INFRASTRUCTURE_FAILURE','source':source,'sourceObjectsVerified':True,'observedCheckout':{'head':g('rev-parse','HEAD'),'status':g('status','--porcelain=v1')},'discovered':1122,'actualPassed':1122,'uniqueIds':1122,'duplicateIds':0,'missingIds':0,'unexpectedIds':0,'retries':0,'skips':0,'flaky':0,'resultErrors':0,'runnerErrors':0,'timeoutCounts':dict(collections.Counter(x['timeout'] for x in all_rows)),'sequentialShards':True,'shards':shards,'priorPackets':prior,'retainedOriginalEvidence':retained,'outerFailure':{'originalWrapperExit':120,'cause':'NOT_ESTABLISHED','originalProgressPreserved':True,'productFailure':False,'qualificationResumedOnlyShards':[3,4]},'reviewerRuntimeExecution':False}
write('VERIFICATION.json',summary);write('ALL-1122-RESULT-BINDINGS.json',all_rows);write('PRODUCER-AGGREGATE-SNAPSHOT.json',aggregate);write('ORIGINAL-OUTER-PROGRESS-SNAPSHOT.json',progress);write('RAW-EVIDENCE-BINDINGS.json',reads)
print(json.dumps({k:v for k,v in summary.items() if k not in ['shards','retainedOriginalEvidence']},indent=2))
