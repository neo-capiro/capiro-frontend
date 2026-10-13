"""Read-only completed-shard evidence audit. Does not execute runtime or tests."""
from pathlib import Path
import collections,datetime,hashlib,json,subprocess
r=Path('/tmp/capiro-unified-final-93b3617f-20261013');o=Path(__file__).parent;root=Path('/workspace/capiro-onboard-port-20261013')
bindings=[]
def read(p):
 b=p.read_bytes();bindings.append({'path':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()});return b
def j(p):return json.loads(read(p))
def git(*args):return subprocess.check_output(['git',*args],cwd=root,text=True).strip()
def rows(d):
 all=[]
 def walk(s):
  for q in s.get('specs',[]):
   for t in q['tests']:all.append({'id':q['id'],'file':q['file'],'title':q['title'],'status':t['status'],'expectedStatus':t['expectedStatus'],'timeout':t['timeout'],'results':[{'status':a['status'],'retry':a['retry'],'errors':a.get('errors',[])} for a in t['results']]})
  for x in s.get('suites',[]):walk(x)
 walk(d);return all
source={'head':git('rev-parse','HEAD'),'rootTree':git('rev-parse','HEAD^{tree}'),'applicationTree':git('rev-parse','HEAD:apps/web'),'status':git('status','--porcelain=v1')}
assert source=={'head':'93b3617f5d0599f34da373525a96dfc70eaa85d6','rootTree':'871dfd1bf868527c605b0c2e78c83179db3baba2','applicationTree':'46fb1aae65c1cdc640c965254b947a149e982c17','status':''}
original=Path('/tmp/capiro-unified-final-evidence-independent-review-20261013');m=j(original/'MANIFEST.json')
prior=[]
for x in m['files']:
 b=(original/x['path']).read_bytes();prior.append(len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256'])
assert all(prior)
discovery=j(r/'portfolio-discovery.json');dr=rows(discovery);expected={x['id'] for x in dr};assert len(expected)==len(dr)==1122 and discovery['errors']==[]
progress=j(r/'portfolio-progress.json');(o/'OUTER-PROGRESS-SNAPSHOT.json').write_text(json.dumps(progress,indent=2)+'\n')
completed=[];all_ids=[]
for i,n in [(1,283),(2,298)]:
 d=j(r/f'portfolio-shard-{i}-results.json');gate=j(r/f'portfolio-shard-{i}-exit.json');rs=rows(d);ids=[x['id'] for x in rs]
 assert len(ids)==len(set(ids))==n and d['stats']=={'startTime':d['stats']['startTime'],'duration':d['stats']['duration'],'expected':n,'skipped':0,'unexpected':0,'flaky':0}
 assert d['errors']==[] and gate['exitCode']==0 and gate['sourceChanged'] is False
 for k in ['sourceBefore','sourceAfter']:assert gate[k]=={'head':source['head'],'tree':source['rootTree'],'applicationTree':source['applicationTree'],'sourceDiff':''}
 assert all(x['status']=='expected' and x['expectedStatus']=='passed' and len(x['results'])==1 and x['results'][0]=={'status':'passed','retry':0,'errors':[]} for x in rs)
 assert d['config']['workers']==3 and all(p['retries']==0 and p['timeout']==30000 for p in d['config']['projects'])
 log=read(r/f'portfolio-shard-{i}.log').decode();assert f'{n} passed (' in log
 outer=next(x for x in progress['reports'] if x['shard']==i);assert set(outer['ids'])==set(ids) and outer['stats']==d['stats']
 all_ids+=ids;completed.append({'shard':i,'gate':gate,'outerReportedExit':outer['exitCode'],'stats':d['stats'],'runnerErrors':d['errors'],'count':n,'workers':3,'retries':0,'timeouts':dict(collections.Counter(x['timeout'] for x in rs)),'rows':rs})
assert len(all_ids)==len(set(all_ids))==581 and not set(all_ids)-expected
assert completed[0]['outerReportedExit']==0 and completed[1]['outerReportedExit']==120
for f in ['run-gate.py','run-portfolio-shards.py']:read(r/f)
result={'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS_COMPLETED_SHARD_EVIDENCE_OUTER_ORCHESTRATION_FAILED_FULL_GATE_PENDING','source':source,'oldSealedPacketIntact':all(prior),'oldPacketFilesVerified':len(prior),'originalPacketManifestSha256':hashlib.sha256((original/'MANIFEST.json').read_bytes()).hexdigest(),'discoveryIds':1122,'completedActualPassedResults':581,'duplicateIds':0,'undiscoveredIds':0,'remainingIds':sorted(expected-set(all_ids)),'remainingCount':541,'completedShards':completed,'causeOfOuter120':'NOT_ESTABLISHED','reviewerRuntimeExecution':False}
(o/'VERIFICATION.json').write_text(json.dumps(result,indent=2)+'\n');(o/'RAW-EVIDENCE-BINDINGS.json').write_text(json.dumps(bindings,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['remainingIds','completedShards']},indent=2))
