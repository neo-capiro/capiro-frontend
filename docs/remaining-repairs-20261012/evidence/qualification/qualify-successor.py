"""Run sequential exact-source successor gates through host/container-context checks.
Usage: python qualify-successor.py EXACT_SOURCE_COMMIT NEW_OUTPUT_DIRECTORY
Exit 0: all listed gates passed; otherwise first failing gate exit.
Docker image and full browser suites are separate recorded gates.
"""
from pathlib import Path
import subprocess,sys,json,hashlib,datetime

def main():
    if len(sys.argv)!=3:
        print(__doc__);return 2
    root=Path('/workspace/capiro-remaining')
    commit,outarg=sys.argv[1:];out=Path(outarg)
    git=lambda *args:subprocess.check_output(['git',*args],cwd=root).decode().strip()
    assert git('rev-parse','HEAD')==commit and not git('status','--porcelain')
    assert not out.exists();out.mkdir()
    helper=Path('/tmp/capiro-remaining-qualification/run-gate.py')
    def gate(name,*command):
        result=subprocess.run([sys.executable,str(helper),name,str(out),*command],cwd=root)
        if result.returncode:raise SystemExit(result.returncode)
    gate('clean-install','npm','ci','--ignore-scripts','--cache','/tmp/capiro-p1-npm-cache')
    gate('corrected-regressions','env','PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium',
         'npm','run','test:browser','--','current-projection.spec.ts','portfolio.spec.ts','relationships.spec.ts',
         '--workers=1','--timeout=60000','--retries=0','--output='+str(out/'corrected-regression-artifacts'))
    results=root/'apps/web/test-results/browser-results.json'
    (out/'corrected-regression-results.json').write_bytes(results.read_bytes())
    gate('combined-check','env','NODE_OPTIONS=--max-old-space-size=4096','npm','run','check')
    gate('elements-prepare','node','packages/qualification-elements/ssr-build.mjs','/tmp/capiro-elements-tool',str(out/'elements-ssr'))
    receipt=out/'elements-ssr/receipt.json';sha=hashlib.sha256(receipt.read_bytes()).hexdigest()
    gate('elements-check','env','MERI_ELEMENTS_SSR_RECEIPT='+str(receipt),
         'MERI_ELEMENTS_SSR_RECEIPT_SHA256='+sha,'MERI_ELEMENTS_SSR_CAPTURE_ROOT='+str(out/'elements-captures'),
         'npm','run','check:elements')
    gate('production-build','env','NODE_OPTIONS=--max-old-space-size=4096','npm','run','build')
    identity={'source':commit,'rootTree':git('rev-parse','HEAD^{tree}'),'applicationTree':git('rev-parse','HEAD:apps/web'),
              'runtimeSourceTree':git('rev-parse','HEAD:apps/web/src'),
              'buildId':(root/'apps/web/.next/BUILD_ID').read_text().strip(),
              'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'scope':'Standalone host build after clean npm install; existing framework cache permitted.'}
    (out/'BUILD-IDENTITY.json').write_text(json.dumps(identity,indent=2)+'\n')
    gate('production-server','env','PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium',
         'npm','run','test:production','--',str(out/'production-artifacts'))
    gate('docker-context','env','DOCKER_CONFIG=/tmp/capiro-docker-config-20261012','npm','run','test:docker-context','--',
         '--artifacts','/tmp/capiro-remaining-docker-evidence/context-frozen-'+commit[:7])
    print(json.dumps({'phase':'static-host-and-context','source':commit,'status':'PASS','fullBrowsers':'pending','dockerImage':'separate gate'}))
    return 0
if __name__=='__main__':
    raise SystemExit(main())
