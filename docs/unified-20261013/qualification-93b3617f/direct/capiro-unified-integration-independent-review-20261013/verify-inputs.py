from pathlib import Path
import subprocess,json,hashlib,datetime,re,collections
root=Path('/workspace/capiro-onboard-port-20261013'); out=Path('/tmp/capiro-unified-integration-independent-review-20261013'); commit='e22cd4c29d3d112486622051a4c1ea2424527221'
def git(*args): return subprocess.check_output(['git',*args],cwd=root)
def obj(h,p):return git('show',h+':'+p)
def listing(h):
 d={}
 for s in git('ls-tree','-r','-z',h).split(b'\0'):
  if s:
   left,p=s.decode().split('\t',1);mode,kind,blob=left.split();d[p]={'blob':blob,'mode':mode,'kind':kind}
 return d
receipt=json.loads(obj(commit,'docs/unified-20261013/INPUTS-AND-PRESERVATION.json'));heads=receipt['heads']; trees={k:listing(h) for k,h in heads.items() if k in ['newsletter','shipping','onboard','meri_actions']}; present=listing(commit)
ancestry={k:subprocess.run(['git','merge-base','--is-ancestor',h,commit],cwd=root).returncode==0 for k,h in heads.items()}
checks=[dict(r,sourceMatches=trees[r['lane']][r['path']]['blob']==r['blob'],currentMatches=present[r['path']]['blob']==r['blob']) for r in receipt['originalTestBindings']]
feature=[]
for r in receipt['featureTrees']:
 prior=git('rev-parse',heads[r['lane']]+':'+r['path']).decode().strip();current=git('rev-parse',commit+':'+r['path']).decode().strip();feature.append(dict(r,observedSource=prior,observedCurrent=current,verified=prior==current==r['tree']))
alltests=[]
for lane,files in trees.items():
 for p,v in files.items():
  if p.startswith(('apps/','packages/','scripts/')) and re.search(r'\.(?:spec|test)\.[cm]?[jt]sx?$',p):alltests.append({'lane':lane,'path':p,'sourceBlob':v['blob'],'currentBlob':present.get(p,{}).get('blob'),'same':v==present.get(p)})
lock=json.loads(obj(commit,'package-lock.json')); lockSummary={}
for lane,h in heads.items():
 if lane not in trees:continue
 before=json.loads(obj(h,'package-lock.json'))['packages'];now=lock['packages'];same=[];changed=[];removed=[]
 for p,v in before.items():
  if p not in now:removed.append(p)
  elif v==now[p]:same.append(p)
  else:changed.append({'path':p,'before':v,'after':now[p]})
 lockSummary[lane]={'beforeCount':len(before),'afterCount':len(now),'unchanged':len(same),'removed':removed,'changed':changed,'added':[p for p in now if p not in before]}
result={'atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':commit,'rootTree':git('rev-parse',commit+'^{tree}').decode().strip(),'appTree':git('rev-parse',commit+':apps/web').decode().strip(),'srcTree':git('rev-parse',commit+':apps/web/src').decode().strip(),'method':'Read-only Git objects and JSON comparison; no application execution/install/test/build/browser/native calls','ancestry':ancestry,'declaredTestBindings':len(checks),'allDeclaredTestBindingsMatch':all(r['sourceMatches'] and r['currentMatches'] for r in checks),'featureTrees':feature,'independentActiveTestFileBindings':len(alltests),'nonidenticalTests':[r for r in alltests if not r['same']],'testCountsByLane':dict(collections.Counter(r['lane'] for r in alltests)),'lock':lockSummary}
(out/'INPUTS-VERIFICATION.json').write_text(json.dumps(result,indent=2)+'\n');(out/'TEST-BINDINGS.json').write_text(json.dumps({'declared':checks,'independent':alltests},indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['source','rootTree','appTree','srcTree','ancestry','declaredTestBindings','allDeclaredTestBindingsMatch','independentActiveTestFileBindings','nonidenticalTests','testCountsByLane']},indent=2));print(json.dumps({k:{kk:v[kk] for kk in ['beforeCount','afterCount','unchanged','removed','added']}|{'changed':[r['path'] for r in v['changed']]} for k,v in lockSummary.items()},indent=2))
