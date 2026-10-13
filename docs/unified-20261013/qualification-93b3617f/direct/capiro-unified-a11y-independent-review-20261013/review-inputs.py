from pathlib import Path
import json, hashlib, collections, subprocess, datetime, shutil
out=Path('/tmp/capiro-unified-a11y-independent-review-20261013')
author=Path('/tmp/capiro-unified-a11y-proposal-20261013')
tests=Path('/tmp/capiro-unified-a11y-tests-proposal-20261013')
repo=Path('/workspace/capiro-onboard-port-20261013')
raw=Path('/tmp/capiro-unified-figma-capture-plan-20261013/a11y')
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(p.read_text())
pins=read(author/'SOURCE-PINS.json')
def evidence(p):
 b=p.read_bytes();return {'path':str(p),'bytes':len(b),'sha256':sha(b)}
checks=[]
for f in pins['files']:
 p=repo/f['file']; b=p.read_bytes(); git=subprocess.check_output(['git','show',pins['head']+':'+f['file']],cwd=repo)
 r={'path':f['file'],'sourceSha256':sha(b),'sourceMatchesPinned':sha(b)==f['sourceSha256'],'sourceMatchesGit':b==git}
 if 'candidateSha256' in f:
  c=author/'candidate'/f['file']; r.update(candidateSha256=sha(c.read_bytes()),candidateMatchesPinned=sha(c.read_bytes())==f['candidateSha256'],candidateNonblank=sum(bool(l.strip()) for l in c.read_text().splitlines()))
 checks.append(r)
manifest=read(author/'MANIFEST.json')
manifestChecks=[{'file':x['file'],'matches':sha((author/x['file']).read_bytes())==x['sha256'],'bytesMatch':(author/x['file']).stat().st_size==x['bytes']} for x in manifest['files']]
dispositions=read(author/'INCOMPLETE-DISPOSITIONS.json')
key=lambda audit,rule,node:(str(audit),rule,json.dumps(node['target'],sort_keys=True),node['html'])
rawIncomplete=[]; auditRows=[]; fg=collections.Counter(); violating=0
for p in sorted(raw.glob('*.json')):
 d=read(p);a=d['audit']['result'];row={'file':evidence(p),'screenshot':evidence(p.with_suffix('.png')),'sourceStable':d['before']==d['after'],'before':d['before'],'axeVersion':a['testEngine']['version'],'emptyIsolationFailures':all(not d[x] for x in ['blocked','unexpected','errors']),'screenshotHashMatches':sha(p.with_suffix('.png').read_bytes())==d['screenshotSha256'],'rules':{}}
 for category in ['violations','incomplete']:
  row['rules'][category]={r['id']:len(r['nodes']) for r in a[category]}
  for r in a[category]:
   for n in r['nodes']:
    if category=='incomplete':rawIncomplete.append(key(p,r['id'],n))
    else:
     violating+=1
     if r['id']=='color-contrast':
      for c in n['any']+n['all']+n['none']:
       if c['id']=='color-contrast':fg[(c['data'].get('fgColor'),c['data'].get('bgColor'))]+=1
 auditRows.append(row)
mapped=[key(Path(x['audit']),x['rule'],x) for x in dispositions]
lock=read(repo/'package-lock.json'); pkg=read(repo/'apps/web/package.json');axe=lock['packages']['node_modules/axe-core']
def luminance(color):
 v=[int(color[i:i+2],16)/255 for i in [1,3,5]]
 v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v]
 return sum(x*w for x,w in zip(v,[.2126,.7152,.0722]))
def contrast(a,b):
 hi,lo=sorted([luminance(a),luminance(b)],reverse=True);return (hi+.05)/(lo+.05)
summary={'reviewUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceHead':pins['head'],'sourceAppTree':pins['appTree'],'sourceChecks':checks,'authorManifestChecks':manifestChecks,'authorManifest':evidence(author/'MANIFEST.json'),'rawAudits':auditRows,'violationNodeInstances':violating,'incompleteNodeInstances':len(rawIncomplete),'mappedIncompleteNodeInstances':len(mapped),'incompleteExactMultisetMatch':collections.Counter(rawIncomplete)==collections.Counter(mapped),'incompleteDispositionCounts':dict(collections.Counter(x['status'] for x in dispositions)),'contrastNodePairs':[{'foreground':a,'background':b,'count':c}for(a,b),c in fg.items()],'contrastRecalculated':{'oldOnMuted':contrast('#78716c','#f5f5f4'),'newOnMuted':contrast('#756e69','#f5f5f4'),'newOnWhite':contrast('#756e69','#ffffff')},'axeDependency':{'currentDirectWebDeclaration':pkg.get('devDependencies',{}).get('axe-core'),'lockedPackage':axe,'installedPackage':evidence(repo/'node_modules/axe-core/package.json'),'installedAxeJS':evidence(repo/'node_modules/axe-core/axe.js')},'testProposalInputs':[evidence(p)for p in sorted(tests.glob('*.ts'))],'runtimeOrTestsRun':False,'applicationOrAuthorPacketWrites':False}
(out/'INPUT-VERIFICATION.json').write_text(json.dumps(summary,indent=2)+'\n')
for name in ['ALL-PROPOSED.patch','REPORT.md','VERIFICATION-PLAN.md','SOURCE-PINS.json']:
 dest=out/'reviewed-proposal'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(author/name,dest)
for p in tests.glob('*.ts'):
 dest=out/'reviewed-tests'/p.name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
print(json.dumps({k:summary[k] for k in ['violationNodeInstances','incompleteNodeInstances','incompleteExactMultisetMatch','incompleteDispositionCounts','contrastNodePairs','contrastRecalculated']},indent=2))
print('source mismatches:',[r for r in checks if not r['sourceMatchesPinned'] or not r['sourceMatchesGit'] or r.get('candidateMatchesPinned')==False])
print('manifest mismatches:',[r for r in manifestChecks if not r['matches'] or not r['bytesMatch']])
print('candidate sizes:',[(r['path'],r['candidateNonblank'])for r in checks if 'candidateNonblank'in r])
