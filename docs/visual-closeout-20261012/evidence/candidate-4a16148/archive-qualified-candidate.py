#!/usr/bin/env python3
"""Archive completed exact-source qualification without replacing prior evidence.
Usage: archive-qualified-candidate.py CHECKOUT EXTERNAL_EVIDENCE NEW_DESTINATION
Exit 0: copied and hashed; nonzero: failed, running, dirty, changed or existing output.
"""
import datetime, hashlib, json, pathlib, shutil, subprocess, sys
if len(sys.argv)!=4: raise SystemExit(__doc__)
checkout,out,dest=map(pathlib.Path,sys.argv[1:])
read=lambda p:json.loads(p.read_text())
write=lambda p,x:p.write_text(json.dumps(x,indent=2)+'\n')
git=lambda *a:subprocess.check_output(['git','-C',str(checkout),*a],text=True).strip()
source=read(out/'SOURCE.json');head=source['head']
assert head==git('rev-parse','HEAD') and not git('status','--porcelain')
assert not dest.exists(),'Existing archive must be preserved'
required=['clean-install-writable-cache','check','build','elements','production','meri-actual-server','preservation','defect-portfolio','defect-modules','reviewer-positive','reviewer-reopen','objective-baseline-candidate-paths','calendar-nested-escape','portfolio-browser','modules-browser']
for name in required:
 x=read(out/(name+'-execution.json'))
 assert x['state']=='finished' and x['exitCode']==0,(name,x)
 assert x['head']==x['headAtFinish']==head and x['statusAtStart']==x['statusAtFinish']=='',(name,'source changed')

def ignore_links(folder,names):
 return [n for n in names if n=='__pycache__' or (pathlib.Path(folder)/n).is_symlink()]
reports={}
for suite,count,report_path,artifact_path in [
 ('portfolio',934,'apps/web/test-results/browser-results.json','apps/web/test-results/portfolio-browser'),
 ('modules',121,'apps/web/test/browser/test-results/modules-browser-results.json','apps/web/test-results/modules-browser')]:
 target=out/(suite+'-browser-results.json')
 if target.exists():
  assert target.read_bytes()==(checkout/report_path).read_bytes(),'Report changed after capture'
 else:shutil.copy2(checkout/report_path,target)
 stats=read(target)['stats'];assert stats['expected']==count and all(stats[k]==0 for k in ['unexpected','skipped','flaky']),(suite,stats)
 artifact_target=out/(suite+'-browser-artifacts')
 if not artifact_target.exists():shutil.copytree(checkout/artifact_path,artifact_target,ignore=ignore_links)
 reports[suite]=stats
write(out/'TERMINAL.json',{'archivedAt':datetime.datetime.now(datetime.UTC).isoformat(),'head':head,'tree':source['tree'],'srcTree':source['srcTree'],'requiredGates':required,'browserStats':reports,'retainedNonqualifyingAttempts':['clean-install (default cache unavailable)','objective-baseline-green (old absolute imports load a second Playwright instance)'],'acceptance':'Exact-source author offline qualification. Independent review remains separately attributed. All 337 Portfolio rows retain full/native acceptance requirements. No image/cloud/live action.'})
shutil.copytree(out,dest,ignore=ignore_links)
files=sorted(p for p in dest.rglob('*') if p.is_file())
write(dest/'SHA256-MANIFEST.json',{'head':head,'files':[{'path':str(p.relative_to(dest)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]})
print(json.dumps({'head':head,'files':len(files),'browserStats':reports,'destination':str(dest)},indent=2))
