import subprocess,sys,time,datetime,json,pathlib
name,*command=sys.argv[1:]
out=pathlib.Path(__file__).parent
root=pathlib.Path('/workspace/capiro-onboard-port-20261013')
frozen='83f54f5ac0107822833adbbfef2b453e0240bc56'
def git(*args):
    return subprocess.check_output(['git',*args],cwd=root,text=True).strip()
def source():
    return {'head':git('rev-parse','HEAD'),'tree':git('rev-parse','HEAD^{tree}'),'applicationTree':git('rev-parse','HEAD:apps/web'),'sourceDiff':git('diff','HEAD','--','apps','packages','scripts','vendor','package.json','package-lock.json','.dockerignore','docs/architecture-size-reviews.json')}
start=source()
assert start['head']==frozen
assert not start['sourceDiff']
assert not git('ls-files','--others','--exclude-standard','--','apps','packages','scripts','vendor')
t=time.monotonic()
utc=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
begin=utc()
with open(out/(name+'.log'),'xb') as log:
    p=subprocess.Popen(command,cwd=root,stdout=log,stderr=subprocess.STDOUT)
    (out/(name+'-running.json')).write_text(json.dumps({'pid':p.pid,'command':command,'startedUTC':begin,'source':start},indent=2)+'\n')
    code=p.wait()
end=source()
result={'name':name,'command':command,'startedUTC':begin,'endedUTC':utc(),'durationSeconds':time.monotonic()-t,'exitCode':code,'sourceBefore':start,'sourceAfter':end,'sourceChanged':start!=end}
(out/(name+'-exit.json')).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
sys.exit(code or (2 if start!=end else 0))
