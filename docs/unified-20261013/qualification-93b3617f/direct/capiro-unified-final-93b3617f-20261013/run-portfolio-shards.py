import pathlib,subprocess,sys,json,datetime
out=pathlib.Path(__file__).parent
root=pathlib.Path('/workspace/capiro-onboard-port-20261013')
def specs(suites):
    return [p for s in suites for p in s.get('specs',[])] + [p for s in suites for p in specs(s.get('suites',[]))]
discovery=json.loads((out/'portfolio-discovery.json').read_text());expected={s['id'] for s in specs(discovery['suites'])}
assert len(expected)==1122 and not discovery.get('errors')
seen=set();reports=[]
for shard in range(1,5):
    name=f'portfolio-shard-{shard}'
    result=out/(name+'-results.json')
    artifacts=f'/workspace/capiro-unified-runtime-tmp-20261013/{name}-artifacts'
    command=[sys.executable,str(out/'run-gate.py'),name,'env','PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium',f'PLAYWRIGHT_JSON_OUTPUT_FILE={result}','TMPDIR=/workspace/capiro-unified-runtime-tmp-20261013','npm','run','test:browser','--','--workers=3',f'--shard={shard}/4',f'--output={artifacts}']
    code=subprocess.run(command,cwd=root).returncode
    data=json.loads(result.read_text()) if result.exists() else {}
    rows=specs(data.get('suites',[]));ids={s['id'] for s in rows};stats=data.get('stats',{})
    reports.append({'shard':shard,'exitCode':code,'stats':stats,'ids':sorted(ids),'artifacts':artifacts})
    complete=(code==0 and not data.get('errors') and ids and not ids&seen and stats.get('expected')==len(ids) and not stats.get('unexpected') and not stats.get('skipped') and not stats.get('flaky'))
    (out/'portfolio-progress.json').write_text(json.dumps({'updatedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'expected':len(expected),'completed':len(seen|ids),'reports':reports},indent=2)+'\n')
    if not complete:sys.exit(code or 2)
    seen|=ids
assert seen==expected, {'missing':sorted(expected-seen),'extra':sorted(seen-expected)}
(out/'portfolio-aggregate.json').write_text(json.dumps({'source':'93b3617f5d0599f34da373525a96dfc70eaa85d6','passed':len(seen),'discovered':len(expected),'duplicateIds':0,'missingIds':0,'unexpected':0,'skipped':0,'flaky':0,'allSourceUnchanged':all(not json.loads((out/(f"portfolio-shard-{i}-exit.json")).read_text())['sourceChanged'] for i in range(1,5)),'reports':reports},indent=2)+'\n')
print('Full Portfolio gate:',len(seen),'unique discovered cases passed across four sequential shards',flush=True)
