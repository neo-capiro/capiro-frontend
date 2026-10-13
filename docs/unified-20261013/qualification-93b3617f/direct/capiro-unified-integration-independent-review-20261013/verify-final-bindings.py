from pathlib import Path
import subprocess,json,hashlib,datetime
root=Path('/workspace/capiro-onboard-port-20261013');out=Path('/tmp/capiro-unified-integration-independent-review-20261013');final='6a2e4aceaaa354a8edd9bf54e4148380ccbb1e32';n='46ebdd448ef55e88c7a4083fb4586322757a14f8'
def git(*a):return subprocess.check_output(['git',*a],cwd=root)
def listing(h,p=None):
 result={}
 args=['ls-tree','-r','-z',h]
 if p:args+=['--',p]
 for raw in git(*args).split(b'\0'):
  if raw:
   info,name=raw.decode().split('\t',1);mode,kind,sha=info.split();result[name]=(mode,kind,sha)
 return result
files=listing(final);old=listing(n,'apps/web/public/newsletter');new=listing(final,'apps/web/public/newsletter')
raw=json.loads((out/'TEST-BINDINGS.json').read_text());checks=[dict(r,finalMatches=files.get(r['path'],[None,None,None])[2]==r['blob']) for r in raw['declared']]
assert all(r['finalMatches'] for r in checks)
assets={'path':'apps/web/public/newsletter','initialDiscoveryAttempt':'The extra nonexistent newsletter-assets path in UNION-VERIFICATION.json was a read-only path lookup error, not a product/preservation failure; actual tracked path verified here.','source':n,'final':final,'files':len(old),'bytes':sum(int(git('cat-file','-s',v[2])) for v in old.values()),'identical':old==new,'tree':git('rev-parse',final+':apps/web/public/newsletter').decode().strip()}
receipt={'atUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'final':final,'807FinalBindingsMatch':all(r['finalMatches'] for r in checks),'declaredBindingCount':len(checks),'declaredUniquePaths':len(set(r['path'] for r in checks)),'independentActiveBindings':len(raw['independent']),'independentUniqueTestPaths':len(set(r['path'] for r in raw['independent'])),'assets':assets,'workingHead':git('rev-parse','HEAD').decode().strip(),'workingStatus':git('status','--porcelain').decode()}
(out/'FINAL-BINDING-CHECK.json').write_text(json.dumps(receipt,indent=2)+'\n')
commands={
 'newsletter-onboard-remerge.diff':['show','--remerge-diff','--format=short','ae0c1f1','--','apps/web/package.json','scripts/public-packages.mjs'],
 'meri-union-remerge.diff':['show','--remerge-diff','--format=short','022725e','--','apps/web/package.json','package-lock.json','apps/web/test/browser/main.tsx','scripts/architecture/reviewed-size-findings.json'],
 'assertion-union.diff':['diff','6dacdaca3507bf75a472f5860ac72fc483377248',final,'--','scripts/architecture.test.mjs','apps/web/src/shared/capiro/registry.test.ts'],
 'final-registry-retirement.diff':['show',final,'--','scripts/architecture/reviewed-size-findings.json','docs/unified-20261013/SUPERSEDED-REVIEW.json'],
 'rule-union-vs-onboard.diff':['diff','a2ae5919fdb70523e67c49adbcc559cbae2b37e7',final,'--','scripts/architecture/dependencies.mjs','scripts/architecture/scan.mjs','apps/web/test/browser/main.tsx'],
 'rule-union-vs-meri.diff':['diff','fc6f8eef67353d166895146f8d83189a5cf0a05c',final,'--','scripts/architecture/dependencies.mjs','apps/web/test/browser/main.tsx','apps/web/test/browser/clerk.tsx','apps/web/test/browser/navigation.tsx','apps/web/test/browser/server.mjs','apps/web/src/proxy.ts']}
for name,args in commands.items():(out/name).write_bytes(git(*args))
paths=['package.json','package-lock.json','apps/web/package.json','packages/meri-client/package.json','packages/qualification-transport/package.json','packages/qualification-newsletter/package.json','scripts/public-packages.mjs','scripts/architecture/dependencies.mjs','scripts/architecture/scan.mjs','scripts/architecture.test.mjs','scripts/architecture-onboard.test.mjs','scripts/architecture-meri-actions.test.mjs','scripts/architecture/reviewed-size-findings.json','apps/web/test/browser/main.tsx','apps/web/test/browser/server.mjs','apps/web/test/browser/clerk.tsx','apps/web/test/browser/navigation.tsx','apps/web/src/proxy.ts','apps/web/src/shared/session/ApplicationBoundary.tsx','apps/web/src/shared/capiro/registry.test.ts']
bindings=[]
for p in paths:
 b=git('show',final+':'+p);bindings.append({'path':p,'blob':files[p][2],'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
(out/'REVIEWED-SOURCE-BINDINGS.json').write_text(json.dumps({'source':final,'records':bindings},indent=2)+'\n');print(json.dumps(receipt,indent=2))
