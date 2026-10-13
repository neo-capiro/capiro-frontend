"""Read and hash source/evidence only; no application or tests are invoked."""
from pathlib import Path
import hashlib, json, datetime, difflib, subprocess

out = Path(__file__).parent
repo = Path('/workspace/capiro-newsletter-port')
raw = Path('/tmp/capiro-newsletter-lifecycle-browser-20261013')
name = 'apps/web/src/features/modules/workspace/rich-newsletter/RichPreview.tsx'
before_path = Path('/tmp/capiro-newsletter-preview-history-fix-20261013/RichPreview.before.tsx')
before, after = before_path.read_text(), (repo / name).read_text()
added = {
    'key={document}',
    '// Replace the inert browsing context instead of adding srcdoc history',
    '// entries that consume Back before the parent route can dispose a view.',
}
assert ''.join(line for line in after.splitlines(True) if line.strip() not in added) == before
assert after.count('key={document}') == 2
(out / 'RichPreview.before.tsx').write_text(before)
(out / 'RichPreview.reviewed.tsx').write_text(after)
(out / 'RichPreview.diff').write_text(''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True), fromfile='preserved-before/RichPreview.tsx', tofile='reviewed/RichPreview.tsx')))
refs = []
def ref(p):
    p = Path(p)
    b = p.read_bytes()
    record = {'path': str(p), 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()}
    refs.append(record)
    return record

for path in [repo/name, before_path,
    repo/'apps/web/src/shared/capiro/rich-newsletter.ts',
    repo/'apps/web/src/shared/capiro/rich-newsletter.test.ts',
    repo/'scripts/architecture/reviewed-size-findings.json',
    repo/'scripts/architecture/scan.mjs', repo/'scripts/architecture/reviews.mjs',
    repo/'docs/newsletter-receiving-20261013/reviews/APPLIED-SIZE-REVIEWS.json',
    repo/'apps/web/test/browser/newsletter-document-navigation.spec.ts',
    repo/'apps/web/test/browser/newsletter-document-lifecycle.spec.ts',
    repo/'apps/web/test/browser/newsletter-document-fixtures.ts',
    raw/'history-inspection.json', raw/'history-diagnostic.spec.ts',
    raw/'first-results.json', raw/'first-browser.log',
    raw/'history-regression-red-results.json', raw/'history-regression-red.log',
    Path('/tmp/capiro-newsletter-receiving-38fec5c8-20261013/development-architecture-after.json')]:
    ref(path)

for path in ['apps/web/src/shared/capiro/rich-newsletter.ts', 'apps/web/src/shared/capiro/rich-newsletter.test.ts']:
    assert (repo/path).read_bytes() == (Path('/tmp/capiro-newsletter-boundary-review-20261013/reviewed')/path).read_bytes()
history = json.loads((raw/'history-inspection.json').read_text())
assert [r['history']['currentIndex'] for r in history['records']] == [1,2,2,3,3,2]
assert history['records'][-1]['url'] == history['records'][1]['url']
scan = json.loads(Path('/tmp/capiro-newsletter-receiving-38fec5c8-20261013/development-architecture-after.json').read_text())
assert scan['errors'] == [] and scan['sizeSummary']['blocking'] == 0
receipt = {
    'schemaVersion': 1, 'reviewedUTC': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'verdict': 'PASS_BOUNDED_STATIC_REVIEW_AND_AUTHOR_BROWSER_EVIDENCE',
    'head': subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip(),
    'binding': 'Current uncommitted file hashes, not merge HEAD runtime qualification',
    'scope': ['RichPreview exact history correction', 'two root adapter size reviews', 'all eleven applied size fingerprint consistency only'],
    'minimalDelta': {'addedKeys': 2, 'addedCommentLines': 2, 'allOtherBytesIdenticalToPreservedBefore': True},
    'historyEvidence': {
        'firstSuite': {'passed': 10, 'failed': 2, 'skipped': 0, 'flaky': 0},
        'cdpIndexSequence': [1,2,2,3,3,2], 'nativeBackRetainedEditorUrl': True,
        'classification': 'Real iframe srcdoc joint-session-history defect, not a flaky test',
        'newHistoryLengthBaseline': {'passed': 0, 'failed': 1, 'expected': 2, 'actual': 3}},
    'sizeBindings': {
        'independentParser': 'Pure scanModule source parse; no application import/test/build',
        'allElevenAppliedFingerprintsMatchRegistryAndSource': True,
        'adapter': {'symbol': 'createRichNewsletterAdapter', 'nonblank': 94, 'fingerprint': '9535f5a145d16624ec813b181b1896757ae04b7b4a15a87ae2576cb72589db14'},
        'test': {'symbol': '<anonymous> #2', 'nonblank': 227, 'fingerprint': '886665df815ae5a4d34dac5f871cd8f29c9e742bd5f1f9523808acbb7a1af8fd'},
        'adapterAndTestsUnchangedSinceIndependentBoundaryReview': True,
        'authorWholeScanSummary': scan['sizeSummary'], 'authorWholeScanErrors': scan['errors']},
    'sanitization': 'Sanitizer, CSP, sandbox, no-referrer, allowed image policy and plain-text rendering byte-unchanged by correction',
    'lifetime': 'Only iframe child identity keyed to final sanitized document string; parent editor/controller/QueryClient write journal unchanged',
    'accessibility': 'Descriptive iframe titles and plain-text alternatives retained. Replacing an inert display may reset its own focus/scroll; does not reset parent draft or input focus. No new accessibility/Figma certification.',
    'limits': ['No reviewer browsers/tests/install/build/native calls',
        'No backend/native/provider/deployment acceptance', 'Size review does not waive boundaries or globally accept inherited unreviewed findings'],
    'references': refs,
}
def specs(suites):
    for suite in suites:
        yield from suite.get('specs', [])
        yield from specs(suite.get('suites', []))

green = json.loads((raw/'green-results.json').read_text())
cases = list(specs(green['suites']))
assert len(cases) == 12 and green['stats']['expected'] == 12
assert not green['errors'] and all(green['stats'][k] == 0 for k in ['unexpected', 'skipped', 'flaky'])
assert green['config']['workers'] == 1 and green['config']['projects'][0]['retries'] == 0
assert all(s['ok'] and len(s['tests']) == 1 for s in cases)
assert all(t['status'] == 'expected' and len(t['results']) == 1 and t['results'][0]['status'] == 'passed' and t['results'][0]['retry'] == 0 and not t['results'][0]['errors'] for s in cases for t in s['tests'])
assert hashlib.sha256((repo/name).read_bytes()).hexdigest() == '617d3c8ca4f9194cae14312192cfa4252405670a61782a3aaff3428a17c7a60f'
test_review = json.loads((raw/'TEST-SOURCE-REVIEW.json').read_text())
for entry in test_review['files']:
    actual = (repo/entry['file']).read_bytes()
    assert len(actual) == entry['bytes'] and hashlib.sha256(actual).hexdigest() == entry['sha256']
for filename in ['green-results.json', 'green-browser.log', 'TEST-SOURCE-REVIEW.json']:
    ref(raw/filename)
receipt['authorReplay'] = {'stats': green['stats'], 'workers': 1, 'retries': 0,
    'allCasesOnePassedResult': True, 'testSourceHashesMatchAuthorReceipt': True,
    'reviewerExecutedBrowser': False, 'cases': [s['title'] for s in cases]}
receipt['additionalScopeNote'] = 'The new browser documentFixture has a separate 88-line signal fa9917a8ab1044cdfedb876d9a0bacb5223ba3c52e7e62a3bd2c4f40009e561c. Independently accepted in BROWSER-TEST-STRUCTURE.json alongside semantic review of both suites. Canonical discovery remains apps/web/src plus packages/meri-client/src; the earlier 439-signal whole scan excludes these browser tests. Manual review meets the size policy without a scanner exemption or broader gate claim.'
(out/'RECEIPT.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps({'sourceSHA': refs[0]['sha256'], 'references': len(refs), 'verdict': receipt['verdict']}))
