import pathlib,subprocess,sys,json,datetime
out=pathlib.Path(__file__).parent;root=pathlib.Path('/workspace/capiro-onboard-port-20261013');work='/workspace/capiro-unified-runtime-tmp-20261013'
assert not (out/'portfolio-shard-3-results.json').exists()
assert json.loads((out/'portfolio-shard-2-exit.json').read_text())['exitCode']==1
assert json.loads((out/'owned-runtime-archive.json').read_text())['verified']
def gate(name,extra):
 result=out/(name+'-results.json')
 cmd=[sys.executable,str(out/'run-gate.py'),name,'env','PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium',f'PLAYWRIGHT_JSON_OUTPUT_FILE={result}',f'TMPDIR={work}','npm','run','test:browser','--','--workers=2',*extra,f'--output={work}/83f54f5a-{name}-artifacts']
 return subprocess.run(cmd,cwd=root).returncode
for shard in (3,4):
 rc=gate(f'portfolio-shard-{shard}',[f'--shard={shard}/4'])
 if rc:raise SystemExit(rc)
rc=gate('portfolio-enospc-case-rerun',['mail-rich-compose.spec.ts','--grep','^keyboard formatting and mobile toolbar remain reachable$'])
if rc:raise SystemExit(rc)
(out/'CONTINUATION-COMPLETE.json').write_text(json.dumps({'source':'83f54f5ac0107822833adbbfef2b453e0240bc56','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Unrun shards3/4 and separate original ENOSPC case rerun complete. Original shard2 remains failed; unique discovery coverage requires independent aggregate audit.'},indent=2)+'\n')
