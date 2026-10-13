import subprocess,sys,time,datetime,json,os,pathlib
name,outdir,*command=sys.argv[1:]; out=pathlib.Path(outdir); root=pathlib.Path('/workspace/capiro-remaining')
def git(*args):return subprocess.check_output(['git',*args],cwd=root).decode().strip()
def source():return {'head':git('rev-parse','HEAD'),'tree':git('rev-parse','HEAD^{tree}'),'applicationTree':git('rev-parse','HEAD:apps/web'),'sourceDiff':git('diff','HEAD','--','apps','packages','scripts','package.json','package-lock.json','.dockerignore','docs/architecture-size-reviews.json')}
start=source(); t=time.monotonic(); utc=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat(); begin=utc()
with open(out/(name+'.log'),'xb') as log:
 p=subprocess.Popen(command,cwd=root,stdout=log,stderr=subprocess.STDOUT)
 (out/(name+'-running.json')).write_text(json.dumps({'pid':p.pid,'command':command,'startedUTC':begin,'source':start},indent=2)+'\n')
 code=p.wait()
end=source(); result={'name':name,'command':command,'startedUTC':begin,'endedUTC':utc(),'durationSeconds':time.monotonic()-t,'exitCode':code,'sourceBefore':start,'sourceAfter':end,'sourceChanged':start!=end}
(out/(name+'-exit.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));sys.exit(code or (2 if start!=end else 0))
