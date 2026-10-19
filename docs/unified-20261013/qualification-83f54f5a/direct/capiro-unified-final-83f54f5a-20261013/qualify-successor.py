import subprocess,sys,json,pathlib,hashlib,shutil,datetime
out=pathlib.Path(__file__).parent
root=pathlib.Path('/workspace/capiro-onboard-port-20261013')
work='/workspace/capiro-unified-runtime-tmp-20261013'
source='83f54f5ac0107822833adbbfef2b453e0240bc56'
assert json.loads((out/'clean-install-exit.json').read_text())['exitCode']==0

def retire_cache(path,label):
    p=pathlib.Path(path)
    assert str(p) in ['/tmp/capiro-unified-successor-npm-cache','/tmp/capiro-onboard-execution-20261013/apps/web/.next/cache']
    files=[]
    for f in sorted(p.rglob('*')):
        if f.is_file():files.append({'path':str(f.relative_to(p)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
    receipt={'path':str(p),'scope':'Only owned reproducible download/compile cache; source, runtime and original evidence preserved.','files':files,'bytes':sum(f['bytes'] for f in files),'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    (out/(label+'.json')).write_text(json.dumps(receipt,indent=2)+'\n')
    shutil.rmtree(p)

def gate(name,*command):
    rc=subprocess.run([sys.executable,str(out/'run-gate.py'),name,*command],cwd=root).returncode
    if rc: raise SystemExit(rc)

retire_cache('/tmp/capiro-unified-successor-npm-cache','download-cache-retirement')
gate('check','npm','run','check')
gate('elements','node','apps/web/deployment/portfolio/qualify-elements.mjs','/workspace/capiro-unified-elements-83f54f5a-20261013')
gate('public-newsletter-browser','env','PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium','node','packages/qualification-newsletter/browser-check.mjs',str(out/'public-newsletter-browser'))
env=['NEXT_TELEMETRY_DISABLED=1']+[k+'=' for k in ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY','CLERK_SECRET_KEY','TRACKER_BACKEND','CORE_API_BASE_URL','STRATEGY_API_BASE_URL','WORKSPACE_API_BASE_URL','INTELLIGENCE_API_BASE_URL','ONBOARD_API_BASE_URL','MERI_API_BASE_URL','MERI_ACTION_WORKFLOW_ENABLED']]
gate('build','env',*env,'npm','run','build')
retire_cache('/tmp/capiro-onboard-execution-20261013/apps/web/.next/cache','build-cache-retirement')
gate('production','env','PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium',f'TMPDIR={work}','ONBOARD_API_BASE_URL=','MERI_ACTION_WORKFLOW_ENABLED=','npm','run','test:production','--',str(out/'production'))
gate('served-newsletter-assets','node',str(out/'verify-assets.mjs'))
gate('actual-additions','env',f'TMPDIR={work}','node',str(out/'verify-additions-v2.mjs'))
gate('modules-browser','env','CAPIRO_QA_CHROMIUM_EXECUTABLE=/usr/bin/chromium',f'PLAYWRIGHT_JSON_OUTPUT_FILE={out}/modules-browser-results.json',f'TMPDIR={work}','npm','run','test:browser:modules','--workspace','@capiro/web','--','--workers=2',f'--output={work}/83f54f5a-modules-browser-artifacts')
gate('portfolio-discovery','env',f'PLAYWRIGHT_JSON_OUTPUT_FILE={out}/portfolio-discovery.json','npm','run','test:browser','--','--list')
rc=subprocess.run([sys.executable,str(out/'run-portfolio-shards.py')],cwd=root).returncode
if rc:raise SystemExit(rc)
(out/'ALL-GATES-COMPLETE.json').write_text(json.dumps({'source':source,'completedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Offline combined gates; not native, full design, AT, musl image or deployment acceptance.'},indent=2)+'\n')
