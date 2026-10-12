"""Read-only source/evidence binding; does not import or run application code."""
import datetime, hashlib, json, pathlib, subprocess

OUT = pathlib.Path(__file__).parent
REPO = pathlib.Path('/workspace/capiro-remaining')
FROZEN = 'adbc84b2251fe6b06cb7f75030026fba5b4ff498'
COMMIT = '4ed4b56aaa1660e7f7abdccd94208c17aa38f21b'
SOURCE = 'apps/web/src/features/portfolio/client-profile/ActivityTimeline.tsx'
TEST = 'apps/web/tests/browser/current-projection.spec.ts'
GATES = pathlib.Path('/tmp/capiro-remaining-qualification/final-adbc84b')
DIAG = pathlib.Path('/tmp/capiro-profile-adbc-copy-diagnosis')

def git(*args):
    return subprocess.check_output(['git', '-C', str(REPO), *args])
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
def pin(path):
    raw = path.read_bytes()
    return dict(path=str(path), bytes=len(raw), sha256=sha(raw))
def function_info(raw):
    text = raw.decode()
    function = text[text.index('export function ActivityTimeline'):].replace('\r\n', '\n').strip()
    # This file ends at the single exported function. The exact inspected signature
    # closes with ') {'; body counting and normalization follow scan.mjs.
    body = function[function.index(') {') + 2:]
    return dict(fingerprint=sha(function.encode()), bodyNonblankLines=sum(bool(x.strip()) for x in body.splitlines()),
                fileSha256=sha(raw), fileBytes=len(raw))

before = git('show', FROZEN + ':' + SOURCE)
parent = git('show', COMMIT + '^:' + SOURCE)
after = git('show', COMMIT + ':' + SOURCE)
changes = [dict(characterOffset=i, before=a, after=b) for i,(a,b) in enumerate(zip(before.decode(), after.decode())) if a != b]
changed_paths = git('diff-tree', '--no-commit-id', '--name-only', '-r', COMMIT).decode().splitlines()
assert parent == before
assert len(before) == len(after)
assert len(changes) == 1 and changes[0]['before'] == 'L' and changes[0]['after'] == 'l'
assert after.decode() == before.decode().replace(' · Latest 500 items', ' · latest 500 items')
assert changed_paths == [SOURCE]
before_info, after_info = function_info(before), function_info(after)
assert before_info['fingerprint'] == '626e4b4fbd75bf396ce2b4a9a86d457a90d6d0b0981555d3b50af86b970fb1c8'
assert after_info['fingerprint'] == 'e38624c07720d44683be7da80f6f5608be5ae6f5c2cf5d1b04b707614167bd43'
assert before_info['bodyNonblankLines'] == after_info['bodyNonblankLines'] == 124
tests = {ref:dict(sha256=sha(git('show', ref+':'+TEST)), gitBlob=git('rev-parse', ref+':'+TEST).decode().strip()) for ref in [FROZEN, COMMIT+'^', COMMIT]}
assert len({x['sha256'] for x in tests.values()}) == 1
test_source = git('show', COMMIT+':'+TEST).decode()
assert test_source.index('getByText(/latest 500 items/)).toBeVisible()') < test_source.index('failing = true;', test_source.index('failed activity refresh'))
failure_ref = json.loads((DIAG/'FAILURE-REFERENCE.json').read_text())
failure = pathlib.Path(failure_ref['path'])
assert sha(failure.read_bytes()) == failure_ref['sha256']
failure_text = failure.read_text()
footer_line = [(i+1,x.strip()) for i,x in enumerate(failure_text.splitlines()) if 'Latest 500 items' in x]
assert footer_line
owner_manifest = json.loads((DIAG/'MANIFEST.json').read_text())
for entry in owner_manifest['files']:
    actual = pin(DIAG/entry['path'])
    assert actual['bytes'] == entry['bytes'] and actual['sha256'] == entry['sha256']

docker=[]
for name in ['docker-build','docker-build-existing-host-network','docker-build-inherited-proxy']:
    receipt_path=GATES/(name+'-exit.json')
    receipt=json.loads(receipt_path.read_text())
    log_path=GATES/(name+'.log')
    log=log_path.read_text()
    assert receipt['exitCode']==1 and not receipt['sourceChanged'] and 'DNS: transient error' in log
    docker.append(dict(name=name,exitCode=receipt['exitCode'],receipt=pin(receipt_path),log=pin(log_path),
                       failedStep='base 2/3 apk add; Alpine APKINDEX DNS resolution before application compile',sourceChanged=False))
archive = pathlib.Path('/tmp/capiro-source-adbc84b')
archive_target = archive.resolve()
assert archive_target == pathlib.Path('/workspace/capiro-source-archives/source-adbc84b')
archive_receipt = json.loads((archive_target/'SOURCE-ARCHIVE-RECEIPT.json').read_text())
assert archive_receipt['archiveSHA256']=='5a631ef2f6d7500c947fafa85ed22731214b37bc2f587da29db6f1b272f0784a'

report=dict(
    reviewedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    disposition='Accept exact bounded copy correction for integration; corrected-source runtime/full qualification remains pending.',
    sourceCommit=COMMIT,sourceParent=git('rev-parse',COMMIT+'^').decode().strip(),frozenQualificationSource=FROZEN,
    sourcePath=SOURCE,sourceLine=74,changedPaths=changed_paths,characterChanges=changes,
    candidateParentSourceEqualsFrozenSource=True,before=before_info,after=after_info,
    testPath=TEST,testBindings=tests,testsAndFixturesChangedByCommit=False,
    diagnosis='The 503 control stops at its case-sensitive positive footer assertion at line152, before failing=true and refresh dispatch. Uppercase Latest does not match /latest 500 items/. No refresh-authority defect is established by this failure.',
    preservedMeaningfulAssertions={'positiveLimit':152,'negativeLimitAfterRefresh':160,'otherControls':'Retained-row/kind/count concealment, preserved search, successful Retry recovery and 403/mobile controls remain unedited.'},
    structureReview={'symbol':'ActivityTimeline','kind':'function','nonblank':124,'fingerprint':after_info['fingerprint'],
      'accepted':True,'reason':'One current history-view controller owns query admission, local filters/expansion and canonical QuickLog URL handoff. ActivityFeed owns rows; existing mutation/QuickLog owners retain writes and recovery. One letter in existing footer copy adds no responsibility, dependency or branch. No split is justified by this literal-only change.',
      'registryOwner':'Root; this audit does not update shared architecture records.'},
    evidence={'diagnosisFiles':[pin(DIAG/e['path']) for e in owner_manifest['files']], 'failure':pin(failure),'failedSnapshotFooter':footer_line,
      'scanner':pin(REPO/'scripts/architecture/scan.mjs')},
    pending={'portfolioExitReceiptExists':(GATES/'portfolio-browser-exit.json').exists(),
      'completionReviewWritten':False,'correctedSourceBrowserRunByReviewer':False,'fullCombinedSuccessorRerunRequired':True},
    gateContextAddendum={'dockerBuildFailures':docker,'dockerImageOrSmokePassClaimed':False,
      'boundedNetworkAndProxyProbes':'Parent-reported additional unsuccessful diagnostics; not rerun in this review.',
      'archiveOldPath':str(archive),'archiveResolvedPath':str(archive_target),'archiveRelocationReceipt':pin(archive_target/'SOURCE-ARCHIVE-RECEIPT.json'),
      'archiveSHA256FromReceipt':archive_receipt['archiveSHA256'],'archiveContentsRehashedHere':False,
      'priorIndependentArchiveVerification':'/tmp/capiro-remaining-final-gate-review/final-adbc84b/archive-verification.json'},
    mutationScope='Only new review artifacts under this additive directory; no source/shared registry edits, runtime gates or native calls.',
)
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
(OUT/'exact.patch').write_bytes(git('show','--format=fuller','--no-ext-diff',COMMIT,'--',SOURCE))
print(json.dumps({'acceptedSourceCorrection':COMMIT,'oneCharacterChanges':changes,'function':after_info,'portfolioExitReceiptExists':report['pending']['portfolioExitReceiptExists'],'dockerBuildFailures':len(docker)},indent=2))
