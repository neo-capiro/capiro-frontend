from pathlib import Path
import subprocess,json,hashlib
root=Path('/workspace/capiro-remaining-mail');out=Path('/tmp/capiro-remaining-mail-evidence')
files=subprocess.check_output(['git','diff','--name-only','--','apps/web/src'],cwd=root,text=True).splitlines()
candidate={p:(root/p).read_bytes() for p in files}
newfiles=subprocess.check_output(['git','ls-files','--others','--exclude-standard','apps/web/src'],cwd=root,text=True).splitlines()
for p in files+newfiles:
 d=out/'production-final-snapshot'/p;d.parent.mkdir(parents=True,exist_ok=True);d.write_bytes((root/p).read_bytes())
spec=root/'apps/web/tests/browser/mail-rich-compose.spec.ts'
report={'base':'7aca86e7d64cfdb85d09d424a07e6186339fc24c','specSHA256':hashlib.sha256(spec.read_bytes()).hexdigest(),'productionFiles':[],'newFiles':'Untracked new rich-editor helpers remain on disk but are unreachable from restored base production imports.'}
try:
 for p in files:
  base=subprocess.check_output(['git','show','7aca86e:'+p],cwd=root)
  (root/p).write_bytes(base);report['productionFiles'].append({'path':p,'baseSHA256':hashlib.sha256(base).hexdigest(),'candidateSHA256':hashlib.sha256(candidate[p]).hexdigest()})
 report['trackedProductionDiffFromBase']=subprocess.check_output(['git','diff','7aca86e','--','apps/web/src'],cwd=root,text=True)
 cfg=(out/'playwright.config.mjs').read_text().replace('history-green-artifacts','final-base-artifacts').replace('history-green-results','final-base-results')
 (out/'final-base.config.mjs').write_text(cfg)
 with (out/'final-base.log').open('w') as log:
  result=subprocess.run(['node','node_modules/@playwright/test/cli.js','test','--config',str(out/'final-base.config.mjs'),'--timeout','12000','--grep','rich Bold survives|verified rewrite uses text|keyboard formatting and mobile|local Undo restores exactly'],cwd=root,stdout=log,stderr=subprocess.STDOUT)
 report['runnerExitCode']=result.returncode
finally:
 for p,data in candidate.items():(root/p).write_bytes(data)
 report['restoredExactly']=all((root/p).read_bytes()==data for p,data in candidate.items())
 report['specUnchanged']=hashlib.sha256(spec.read_bytes()).hexdigest()==report['specSHA256']
 (out/'final-base-source.json').write_text(json.dumps(report,indent=2)+'\n')
