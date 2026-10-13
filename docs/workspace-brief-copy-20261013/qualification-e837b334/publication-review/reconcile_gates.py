"""Read raw existing gate reports; do not invoke test drivers or runtime."""
from pathlib import Path
import collections, hashlib, json, re, subprocess

ROOT = Path('/workspace/capiro-unified-calendar-final-gate-20261013')
OUT = Path(__file__).parent
REPO = Path('/workspace/capiro-meri-conversation-20261013')
SOURCE = 'e837b3341e7c31dd8b349438c7d9c5086fa4eb0e'

def read(p): return json.loads(p.read_bytes())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name, value): (OUT / name).write_text(json.dumps(value, indent=2) + '\n')

def specs(suites, titles=()):
    for suite in suites:
        path = (*titles, suite.get('title',''))
        for spec in suite.get('specs',[]): yield spec, (*path, spec['title'])
        yield from specs(suite.get('suites',[]), path)

frozen = read(ROOT / 'FROZEN-SOURCE.json')
assert frozen['head'] == SOURCE
receipts = []
def receipt(name):
    p = ROOT / (name + '-exit.json')
    r = read(p)
    assert r['exitCode'] == 0 and not r['sourceChanged']
    assert r['sourceBefore'] == r['sourceAfter']
    for k in ['head','tree','applicationTree']:
        assert r['sourceBefore'][k] == frozen[k]
    assert r['sourceBefore']['sourceDiff'] == r['sourceBefore']['untrackedAuthored'] == ''
    receipts.append({'name':name,'sha256':sha(p),'exitCode':r['exitCode'],'startedUTC':r['startedUTC'],'endedUTC':r['endedUTC'],'source':r['sourceBefore']['head']})
    return r

cohorts = []
for cohort, count in [('shared',399),('portfolio',1278)]:
    aggregate = read(ROOT / (cohort + '-aggregate.json'))
    discovery = read(ROOT / (cohort + '-discovery.json'))
    receipt(cohort + '-discovery')
    assert not discovery['errors']
    discovered = {s['id'] for s, _ in specs(discovery['suites'])}
    assert len(discovered) == count
    assert aggregate['source'] == SOURCE and aggregate['passed'] == aggregate['discovered'] == count
    assert all(aggregate[k] == 0 for k in ['duplicateIds','missingIds','unexpected','skipped','flaky'])
    assert aggregate['singleSuccessfulAttemptPerCase'] and aggregate['projectConfigEqualsDiscovery']
    seen, identities, timeout_counts, shard_counts = set(), set(), collections.Counter(), []
    for shard in range(1,5):
        raw = read(ROOT / f'{cohort}-shard-{shard}-results.json')
        bound = receipt(f'{cohort}-shard-{shard}')
        assert not raw['errors'] and raw['config']['workers'] == 2
        assert raw['config']['shard'] == {'current':shard,'total':4}
        assert len(raw['config']['projects']) == len(discovery['config']['projects'])
        for current, original in zip(raw['config']['projects'], discovery['config']['projects']):
            assert current['retries'] == 0 and current['repeatEach'] == 1 and current['timeout'] == 30000
            assert {k:v for k,v in current.items() if k not in ['outputDir','metadata']} == {k:v for k,v in original.items() if k not in ['outputDir','metadata']}
        items = list(specs(raw['suites']))
        ids = {s['id'] for s,_ in items}
        assert len(ids) == len(items) and not seen & ids
        for spec, titles in items:
            assert spec['ok'] and len(spec['tests']) == 1
            test = spec['tests'][0]
            identity = (spec['file'], titles, test['projectId'])
            assert identity not in identities
            identities.add(identity)
            assert test['status'] == 'expected' and test['expectedStatus'] == 'passed'
            assert len(test['results']) == 1
            attempt = test['results'][0]
            assert attempt['status'] == 'passed' and attempt['retry'] == 0 and not attempt['errors']
            timeout_counts[test['timeout']] += 1
        stats = raw['stats']
        assert stats['expected'] == len(items) and all(stats[k] == 0 for k in ['skipped','unexpected','flaky'])
        report = aggregate['reports'][shard-1]
        assert report['shard'] == shard and report['exitCode'] == 0 and report['stats'] == stats
        assert report['ids'] == sorted(ids) and report['singleSuccessfulAttemptPerCase'] and report['projectConfigEqualsDiscovery']
        seen |= ids
        shard_counts.append(len(items))
    assert seen == discovered and len(identities) == count
    assert timeout_counts == ({30000:399} if cohort=='shared' else {30000:1274,90000:4})
    cohorts.append({'cohort':cohort,'passedUnique':len(seen),'discovered':len(discovered),'shards':shard_counts,'timeoutCounts':dict(timeout_counts),'allSinglePassedAttempts':True,'retrySkipFlakyUnexpectedErrors':0,'aggregateMatchesRaw':True,'projectConfigMatchesDiscovery':True})

runtime = read(ROOT / 'runtime-review/RUNTIME-RECONCILIATION.json')
for entry in runtime['receipts']:
    r = receipt(entry['name'])
    assert entry['receiptSHA256'] == sha(ROOT / (entry['name'] + '-exit.json'))
    assert r['durationSeconds'] == entry['durationSeconds']
assert len(runtime['receipts']) == 12
assert runtime['counts'] == {'productionObservations':30,'servedNewsletterAssets':179,'servedNewsletterBytes':486014,'additionalHTTP':23,'onboardAssets':6,'onboardBytes':458104,'additionalViewports':[1440,375],'publicCharacterizations':116,'publicReceivingCases':130,'workspaceFocused':12}
check = (ROOT / 'check.log').read_text()
assert [int(x) for x in re.findall(r'^ℹ tests (\d+)',check,re.M)] == [100,84,385]
assert re.findall(r'^ℹ fail (\d+)',check,re.M) == ['0','0','0']
assert [int(x) for x in re.findall(r'^\s*Tests\s+(\d+) passed',check,re.M)] == [2129,442]
assert '82 problems (0 errors, 82 warnings)' in check
assert re.search(r'\{"directory":"/tmp/capiro-newsletter-types-[^"]+","passed":8\}', check)
summary = read(ROOT / 'runtime-review/CHECK-SUMMARY.json')
assert summary['architecture']['sizeSummary'] == {'total':488,'reviewed':466,'inheritedUnreviewed':22,'blocking':0}
assert not summary['architecture']['errors']
assert summary['sourceLogSHA256'] == sha(ROOT / 'check.log')
assert 'added 854 packages' in (ROOT / 'clean-install.log').read_text()
public = read(ROOT / 'public-newsletter-browser.log')
assert public['passedCharacterizations'] == 116 and public['passedReceivingCases'] == 130
assert public['requests'] == public['pageErrors'] == []
assert read(ROOT / 'actual-additions.log') == {'http':23,'assets':6,'browser':2,'success':True}
served = read(ROOT / 'served-newsletter-assets.log')
assert served['passed'] == 179 and served['bytes'] == 486014 and not served['nativeMuslQualification']
smoke = read(ROOT / 'production/production-smoke.json')
assert len(smoke['results']) == 30 and not smoke['pageErrors']
for axe in runtime['axe']:
    assert axe['violations'] == [] and axe['passes'] == 43
    assert [(x['id'],x['nodes']) for x in axe['incomplete']] == [('color-contrast',2),('label-content-name-mismatch',5)]

old = Path('/workspace/capiro-unified-final-gate-20261013')
old_counts = collections.Counter()
for cohort in ['shared','portfolio']:
    for shard in range(1,5):
        d=read(old / f'{cohort}-shard-{shard}-results.json')
        assert not d['errors']
        for spec,_ in specs(d['suites']):
            for test in spec['tests']:
                assert len(test['results']) == 1 and test['results'][0]['retry'] == 0
                old_counts[(cohort,test['results'][0]['status'])] += 1
assert old_counts == {('shared','passed'):399,('portfolio','passed'):1277,('portfolio','failed'):1}

refresh = read(ROOT / 'FINAL-INPUT-REFRESH.json')
assert refresh['currentQualifiedSource'] == SOURCE and refresh['allInputsAncestors']
for head in refresh['heads'].values():
    assert subprocess.run(['git','merge-base','--is-ancestor',head,SOURCE],cwd=REPO,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode == 0
save('GATE-RECONCILIATION.json',{'status':'PASS_EXISTING_RAW_EVIDENCE','source':SOURCE,'cohorts':cohorts,'boundReceipts':receipts,'runtimeCounts':runtime['counts'],'canonicalCounts':{'root':100,'transport':84,'web':2129,'capiro':442,'newsletter':385,'declarations':8},'lint':{'errors':0,'warnings':82},'architecture':summary['architecture']['sizeSummary'],'prior6034':{'sharedPassed':399,'portfolioPassed':1277,'portfolioFailed':1},'ancestry':refresh,'limits':'No tests rerun, no new visual/manual/native qualification; separate runtime audit retains its own scope.'})
print(json.dumps({'status':'PASS_EXISTING_RAW_EVIDENCE','source':SOURCE,'cohorts':cohorts,'sourceBoundReceipts':len(receipts)}),flush=True)
