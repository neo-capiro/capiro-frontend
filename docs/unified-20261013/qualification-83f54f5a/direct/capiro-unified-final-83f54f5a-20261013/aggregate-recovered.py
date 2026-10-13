import pathlib,json,datetime,subprocess,hashlib
out=pathlib.Path(__file__).parent
head='83f54f5ac0107822833adbbfef2b453e0240bc56'
def specs(suites):
 return [p for s in suites for p in s.get('specs',[])] + [p for s in suites for p in specs(s.get('suites',[]))]
def read(name):return json.loads((out/name).read_text())
expected={s['id'] for s in specs(read('portfolio-discovery.json')['suites'])};assert len(expected)==1139
seen=set();passed=set();failures=[];attempts=[]
for i in range(1,5):
 name=f'portfolio-shard-{i}';data=read(name+'-results.json');receipt=read(name+'-exit.json');rows=specs(data['suites']);ids={s['id'] for s in rows}
 assert not seen&ids and not data.get('errors');seen|=ids
 assert receipt['sourceBefore']['head']==head and receipt['sourceAfter']['head']==head and not receipt['sourceChanged']
 for s in rows:
  assert len(s['tests'])==1;t=s['tests'][0];assert len(t['results'])==1 and t['results'][0]['retry']==0
  if t['status']=='expected':assert t['results'][0]['status']=='passed';passed.add(s['id'])
  else:failures.append({'id':s['id'],'file':s['file'],'title':s['title'],'status':t['status'],'error':t['results'][0].get('error')})
 attempts.append({'name':name,'exitCode':receipt['exitCode'],'stats':data['stats'],'ids':sorted(ids)})
assert seen==expected and len(passed)==1138 and len(failures)==1 and 'ENOSPC' in failures[0]['error']['message']
rerun=read('portfolio-enospc-case-rerun-v2-results.json');rows=specs(rerun['suites']);assert len(rows)==1 and rows[0]['id']==failures[0]['id'] and rerun['stats']['expected']==1 and not rerun['stats']['unexpected']
assert rows[0]['tests'][0]['results'][0]['retry']==0 and rows[0]['tests'][0]['status']=='expected'
passed.add(rows[0]['id']);assert passed==expected
selector=read('portfolio-enospc-case-rerun-results.json');assert not specs(selector.get('suites',[])) and selector['stats']['expected']==0
receipts=[]
for p in sorted(out.glob('*-exit.json')):
 r=read(p.name);assert r['sourceBefore']['head']==head and r['sourceAfter']['head']==head and not r['sourceChanged'];receipts.append({'file':p.name,'exitCode':r['exitCode']})
failed={r['file'] for r in receipts if r['exitCode']};assert failed=={'portfolio-shard-2-exit.json','portfolio-enospc-case-rerun-exit.json'},failed
root='/workspace/capiro-onboard-port-20261013'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==head
assert subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=root,text=True)==''
aggregate={'source':head,'completedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'discovered':1139,'uniqueSuccessfulCoverage':1139,'firstAttemptPassed':1138,'originalInfrastructureFailures':failures,'successfulInfrastructureCaseReruns':1,'selectorHarnessAttemptsWithNoTests':1,'missingIds':0,'duplicateOriginalShardIds':0,'skipped':0,'flaky':0,'automaticRetries':0,'allSourceUnchanged':True,'originalShard2Status':'FAILED;297 passed and1 ENOSPC failure; not relabeled after recovery','attempts':attempts,'successfulRecovery':'portfolio-enospc-case-rerun-v2-results.json','selectorHarnessAttempt':'portfolio-enospc-case-rerun-results.json'}
(out/'portfolio-recovered-aggregate.json').write_text(json.dumps(aggregate,indent=2)+'\n')
(out/'ALL-GATES-COMPLETE.json').write_text(json.dumps({'source':head,'applicationTree':'67f821a13c8470ceeb5222eb89d43cea58b1a8c8','completedUTC':aggregate['completedUTC'],'status':'offline-gates-completed-with-documented-infrastructure-recovery','portfolio':{'uniqueSuccessfulCoverage':1139,'firstAttemptPassed':1138,'originalEnospcFailures':1,'successfulCaseReruns':1,'zeroTestSelectorAttempts':1},'otherBrowserPassed':297,'receipts':receipts,'scope':'Offline combined gates on unchanged83; not native,337-row acceptance,full Figma/AT,musl image or deployment qualification.'},indent=2)+'\n')
print(json.dumps({k:v for k,v in aggregate.items() if k not in ('attempts','originalInfrastructureFailures')},indent=2))
