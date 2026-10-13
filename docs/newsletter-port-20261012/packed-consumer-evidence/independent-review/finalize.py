from pathlib import Path
import datetime,hashlib,json,subprocess
OUT=Path(__file__).parent
REPO=Path('/workspace/capiro-newsletter-port')
RAW=Path('/tmp/capiro-newsletter-package-consumer-evidence/final-4910400')
COMMIT='4910400220140a0ff957b3336943a7438a52f7c0'
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(*args): return subprocess.check_output(['git','-C',str(REPO),*args])
assert git('rev-parse','HEAD').decode().strip()==COMMIT
old=json.loads((OUT/'SOURCE-BINDINGS.json').read_text())
oldfiles={x['path']:x for x in old['files']}
files=[]; changed=[]
paths=git('diff','--name-only',COMMIT+'^',COMMIT).decode().splitlines()
assert len(paths)==25 and not any('node_modules' in p.split('/') for p in paths)
for path in paths:
    data=git('show',COMMIT+':'+path)
    assert (REPO/path).read_bytes()==data,path
    record={'path':path,'bytes':len(data),'sha256':sha(data),'gitBlob':git('rev-parse',COMMIT+':'+path).decode().strip()}
    files.append(record)
    if path in oldfiles:
        if sha(data)!=oldfiles[path]['sha256']:
            changed.append(path)
            assert path=='vendor/newsletter-public-packages.json',path
    else:
        assert path=='docs/newsletter-port-20261012/PACKED-CONSUMER.md',path
    if path in changed or path not in oldfiles:
        target=OUT/'final-source-supplement'/path
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
receipt={'source':COMMIT,'rootTree':git('rev-parse',COMMIT+'^{tree}').decode().strip(),
         'applicationTree':git('rev-parse',COMMIT+':apps/web').decode().strip(),
         'applicationSourceTree':git('rev-parse',COMMIT+':apps/web/src').decode().strip(),
         'boundAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,
         'previouslyReviewedSourceContentUnchanged':True,
         'changedInformationalFilesAfterInitialSnapshot':changed,
         'addedDocumentationAfterInitialSnapshot':['docs/newsletter-port-20261012/PACKED-CONSUMER.md'],
         'borrowedNodeModulesCommitted':False}
(OUT/'FINAL-SOURCE-BINDINGS.json').write_text(json.dumps(receipt,indent=2)+'\n')
evidence=[];exits=[]
for path in sorted(RAW.rglob('*')):
    if not path.is_file():continue
    data=path.read_bytes();relative=str(path.relative_to(RAW))
    evidence.append({'path':relative,'bytes':len(data),'sha256':sha(data)})
    if path.parent==RAW and path.name.endswith('-exit.json'):
        result=json.loads(data)
        assert result['source']==COMMIT and result['exitCode']==0,path
        exits.append(result)
    if 'bundle' not in path.parts:
        target=OUT/'inspected-final-owner-evidence'/relative
        target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
node=(RAW/'node-consumer.log').read_text()
assert 'pass 120' in node and 'fail 0' in node
guards=(RAW/'architecture-package-cli-tests.log').read_text()
assert 'pass 35' in guards and 'fail 0' in guards
golden=json.loads((REPO/'packages/qualification-newsletter/fixtures/original-C-renderer-golden.json').read_text())
assert json.loads((RAW/'browser/browser-renderer-results.json').read_text())==golden
browser=json.loads((RAW/'browser/browser-results.json').read_text())
assert browser['passedCharacterizations']==116 and browser['requests']==[] and browser['pageErrors']==[]
declarations=json.loads((RAW/'declarations/declaration-results.json').read_text())['records']
assert len(declarations)==4 and all(x['pass'] and x['exitCode']==x['expectedExit'] for x in declarations)
for kind in ['node','browser']:
    log=(RAW/f'declarations/{kind}-negative.log').read_text()
    assert log.count('error TS2345')==2 and log.count('error TS2322')==1 and log.count('error TS')==3
(OUT/'INSPECTED-FINAL-OWNER-EVIDENCE.json').write_text(json.dumps({'source':COMMIT,'origin':str(RAW),'files':evidence,'topLevelSuccessfulReceipts':exits,'reviewerExecutedTheseGates':False},indent=2)+'\n')
disposition={'source':COMMIT,'status':'ACCEPT_BOUNDED_PACKED_CONSUMER','blockingFindings':[],
 'independentChecks':{'artifactAndInstalledFiles':182,'producerFixturesByteExact':4,'goldenCases':116,'priorLockEntriesUnchanged':930,'lockAdditions':3,'cliSmoke':{'passed':2,'failed':0,'log':'cli-final-source.log'},'sourceAndStructureReview':'PASS'},
 'ownerFinalEvidenceInspected':{'nodeTests':120,'architecturePackageCliTests':35,'declarationControls':4,'browserCharacterizations':116,'publicPackages':True,'workspaceTypes':True,'architecture':True,'authoredLint':True,'format':True,'diff':True},
 'limits':['No independent compiler/browser/package-consumer/install execution; CLI smoke independently executed only.','Full clean root install, combined application/build/native/UI/Figma/accessibility qualification not transferred or inferred.','Acceptance applies only to the recorded source commit and package-consumption scope.'],
 'writesConfinedTo':str(OUT),'priorEvidenceModified':False}
(OUT/'DISPOSITION.json').write_text(json.dumps(disposition,indent=2)+'\n')
print(json.dumps({'source':COMMIT,'status':disposition['status'],'sourceFiles':len(files),'ownerEvidenceFiles':len(evidence),'ownerSuccessfulReceipts':len(exits),'informationalChanges':changed},indent=2))
