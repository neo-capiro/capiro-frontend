from pathlib import Path
import json,hashlib,os,subprocess,signal,socket,time,urllib.request
review=Path.cwd();source=Path('/workspace/scratch/853fba62b1f1/capiro-frontend-run-workspace-20261012');out=review/'docs/qualification/candidates/run-workspace-20261012/primary-review-corrected';out.mkdir()
node=Path('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/bin/node');env=dict(os.environ,PATH=str(node.parent)+os.pathsep+os.environ['PATH'],CI='true',NEXT_TELEMETRY_DISABLED='1',NPM_CONFIG_OFFLINE='true',GIT_NO_LAZY_FETCH='1')
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,env=env).decode().strip();assert head=='0068c58613f1e2d5ed13e68f9a9d18c8b9a7ef88'
index=json.loads((source/'docs/qualification/candidates/run-workspace-20261012/evidence-index.json').read_text())
for row in index['files']:
 b=subprocess.check_output(['git','show',head+':'+row['path']],cwd=source,env=env);assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256']
(out/'author-evidence-verification.json').write_text(json.dumps({'sourceCommit':head,'count':len(index['files']),'allBytesHashesMatch':True,'borrowedSourceAndDependenciesReadOnly':str(source)},indent=2)+'\n')
records=[]
def run(label,argv,cwd,seconds):
 p=subprocess.Popen(argv,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True);start=time.time()
 try: raw,err=p.communicate(timeout=seconds)
 except subprocess.TimeoutExpired:
  os.killpg(p.pid,signal.SIGKILL);raw,err=p.communicate(timeout=5);raise
 x={'label':label,'argv':argv,'cwd':str(cwd),'exitCode':p.returncode,'startedAt':start,'endedAt':time.time()}
 for n,b in [('stdout',raw),('stderr',err)]:
  f=out/(label+'.'+n+'.bin');f.write_bytes(b);x[n]={'path':f.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
 try:os.killpg(p.pid,0);x['ownedProcessGroupAbsent']=False
 except ProcessLookupError:x['ownedProcessGroupAbsent']=True
 records.append(x);(out/'checks.json').write_text(json.dumps({'sourceCommit':head,'records':records},indent=2)+'\n');print(label,p.returncode,flush=True);assert p.returncode==0
run('view-and-architecture',[str(node),'--test','scripts/architecture.test.mjs','apps/web/test/run-workspace.test.mjs'],source,90)
port=34902;probe=socket.socket();probe.bind(('127.0.0.1',port));probe.close()
script=(source/'docs/qualification/candidates/run-workspace-20261012/browser-check.mjs').read_text().replace("const origin = 'http://127.0.0.1:34876'","const origin = 'http://127.0.0.1:34902'");(out/'browser-check.mjs').write_text(script)
log=open(out/'server.stdout.bin','wb');error=open(out/'server.stderr.bin','wb');server=subprocess.Popen([str(node),str(source/'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',str(port)],cwd=source/'apps/web',env=env,stdout=log,stderr=error,start_new_session=True);start=time.time()
try:
 end=time.monotonic()+30
 while True:
  if server.poll() is not None:raise RuntimeError('server exited before readiness')
  try:
   with urllib.request.urlopen('http://127.0.0.1:'+str(port)+'/meri/fixture/run-activity',timeout=1) as response:
    if response.status==200:break
  except OSError:pass
  if time.monotonic()>end:raise RuntimeError('server readiness bound')
  time.sleep(.1)
 run('actual-browser-seven-groups',[str(node),str(out/'browser-check.mjs')],review,100)
finally:
 if server.poll() is None:os.killpg(server.pid,signal.SIGTERM)
 try:server.wait(timeout=8)
 except subprocess.TimeoutExpired:os.killpg(server.pid,signal.SIGKILL);server.wait(timeout=5)
 log.close();error.close()
 try:os.killpg(server.pid,0);absent=False
 except ProcessLookupError:absent=True
 probe=socket.socket();probe.settimeout(1);closed=probe.connect_ex(('127.0.0.1',port))!=0;probe.close()
 (out/'server-owner.json').write_text(json.dumps({'pid':server.pid,'exitCode':server.returncode,'startedAt':start,'endedAt':time.time(),'groupAbsent':absent,'listenerClosed':closed,'sourceCommit':head,'borrowedBuildReadOnly':True,'deploymentSandboxQualified':False},indent=2)+'\n')
 assert absent and closed
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,env=env).decode().strip()==head
assert subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=source,env=env)==b''
print('primary UI source/browser review PASS',flush=True)
