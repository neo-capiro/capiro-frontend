"""Independent local protocol probes. No AWS, Docker or application execution."""
import hashlib
import io
import json
import pathlib
import subprocess
import sys
import time
import types
from unittest.mock import patch

ROOT = pathlib.Path('/workspace/capiro-build-execution')
OUTPUT = pathlib.Path('/tmp/capiro-build-control-review')
PATH = 'execution/portfolio-4a16148/runner.py'
EXECUTION = 'capiro-4a-12345678-1234-1234-1234-123456789012'
BUILD = 'capiro-portfolio-preview-build:12345678-1234-1234-1234-123456789012'
FIELDS = {'schemaVersion', 'stage', 'buildId', 'executionId', 'sourceSHA', 's3Version',
          'imageBoundBytes', 'imageMeasure', 'stdoutBytes', 'stderrBytes',
          'imageLimitBytes', 'outputLimitBytes', 'guardPass'}


def load(name, source):
    module = types.ModuleType(name)
    module.__file__ = str(ROOT / PATH)
    exec(compile(source, module.__file__, 'exec'), module.__dict__)
    return module


def environment(module, limit=10000):
    return {'EXPECTED_SHA': module.SOURCE, 'EXPECTED_S3_VERSION': 'version-fixture',
            'CODEBUILD_SOURCE_VERSION': 'version-fixture', 'REPOSITORY_URI': module.REPOSITORY,
            'AWS_DEFAULT_REGION': 'us-east-1', 'CAPIRO_MAX_IMAGE_BYTES': '100',
            'CAPIRO_MAX_LOG_BYTES': str(limit), 'CAPIRO_STOP_EPOCH': str(int(time.time())+300),
            'CAPIRO_EXECUTION_ID': EXECUTION, 'CODEBUILD_BUILD_ID': BUILD}


def execute_fake(module, *, limit=10000, changes=None, size=b'100\n', fail=None):
    stdout, stderr = io.BytesIO(), io.BytesIO()
    budget = module.OutputBudget(limit, stdout)
    if hasattr(budget, 'error_output'):
        budget.error_output = stderr
    calls = []
    env = environment(module, limit)
    env.update(changes or {})
    original = dict(env)

    def command(argv, deadline, current, **kwargs):
        calls.append({'argv': argv, 'stdoutBefore': stdout.getvalue().decode(),
                      'stderrBefore': stderr.getvalue().decode()})
        if fail == len(calls):
            raise RuntimeError('synthetic failed gate')
        return size if argv[:3] == ['docker', 'image', 'inspect'] else b'fake-secret'

    error = None
    with patch.object(module.Path, 'read_text', return_value=module.SOURCE), \
         patch.object(module, 'OutputBudget', return_value=budget):
        try:
            module.execute(env, command)
        except Exception as exc:
            error = type(exc).__name__ + ': ' + str(exc)
    assert env == original, 'identity environment was mutated'
    return stdout.getvalue(), stderr.getvalue(), budget, calls, error


def schema_probe(module):
    output, errors, budget, calls, error = execute_fake(module)
    assert error is None, error
    records = [line for line in output.splitlines() if line.startswith(b'CAPIRO_CONTROL_GATE ')]
    assert len(records) == 1, 'expected exactly one compatible control receipt'
    line = records[0] + b'\n'
    receipt = json.loads(records[0].split(b' ', 1)[1])
    assert set(receipt) == FIELDS
    assert receipt['schemaVersion'] == 1 and type(receipt['schemaVersion']) is int
    assert receipt['stage'] == 'pre_push' and receipt['guardPass'] is True
    assert receipt['buildId'] == BUILD and receipt['executionId'] == EXECUTION
    assert receipt['sourceSHA'] == module.SOURCE and receipt['s3Version'] == 'version-fixture'
    assert receipt['imageBoundBytes'] == receipt['imageLimitBytes'] == 100
    assert receipt['imageMeasure'] == 'docker.image.Size'
    assert receipt['stdoutBytes'] == len(output) == budget.stdout_bytes
    assert receipt['stderrBytes'] == len(errors) == budget.stderr_bytes == 0
    assert receipt['outputLimitBytes'] == 10000 and len(line) <= 4096
    for item in calls:
        argv = item['argv']
        if argv[0] == 'aws' or argv[:2] == ['docker', 'login'] or argv[:2] == ['docker', 'push']:
            assert item['stdoutBefore'].encode().endswith(line)
        if argv[:2] == ['bash', 'apps/web/deployment/portfolio/smoke.sh']:
            assert 'CAPIRO_CONTROL_GATE ' not in item['stdoutBefore']
    return receipt


def identity_probe(module):
    _, _, _, calls, error = execute_fake(module, changes={'CODEBUILD_BUILD_ID': 'foreign'})
    assert error is not None and not calls, 'invalid build identity reached gates'


def stream_probe(module, extra=0, secret=False):
    stdout, stderr = io.BytesIO(), io.BytesIO()
    header = ('GATE ' + sys.executable + '\n').encode()
    budget = module.OutputBudget(len(header)+8, stdout)
    if hasattr(budget, 'error_output'):
        budget.error_output = stderr
    code = 'import os;os.write(1,b"out");os.write(2,b"error"'+ ('+b"!"' if extra else '') + ')'
    error = None
    try:
        module.run([sys.executable, '-c', code], time.monotonic()+3, budget)
    except Exception as exc:
        error = type(exc).__name__
    if extra:
        assert error == 'BoundExceeded'
    else:
        assert error is None
        assert budget.stdout_bytes == len(header)+3 and budget.stderr_bytes == 5
        assert stdout.getvalue() == header+b'out' and stderr.getvalue() == b'error'
    assert budget.stdout_bytes+budget.stderr_bytes == budget.limit
    return {'stdoutBytes': budget.stdout_bytes, 'stderrBytes': budget.stderr_bytes, 'error': error}


def guarded_failure(module, **kwargs):
    output, _, _, calls, error = execute_fake(module, **kwargs)
    assert error is not None
    assert b'CAPIRO_CONTROL_GATE ' not in output
    assert not any(c['argv'][0] == 'aws' or c['argv'][:2] == ['docker', 'push'] for c in calls)


def secret_probe(module, limit):
    output = io.BytesIO()
    budget = module.OutputBudget(100, output)
    error, captured = None, None
    try:
        captured = module.run([sys.executable, '-c', 'import os;os.write(1,b"token");os.write(2,b"warn")'],
                              time.monotonic()+3, budget, secret=True, capture_limit=limit)
    except Exception as exc:
        error = type(exc).__name__
    assert output.getvalue() == b'' and budget.stdout_bytes == budget.stderr_bytes == 0
    assert (captured == b'token' and error is None) if limit == 9 else error == 'BoundExceeded'


def receipt_boundary(module):
    minimum = 4096
    for _ in range(5):
        out = io.BytesIO(); budget = module.OutputBudget(minimum, out)
        module.emit_control_gate(environment(module), budget, 100, 100)
        actual = len(out.getvalue())
        if actual == minimum:
            break
        minimum = actual
    else:
        raise AssertionError('receipt size did not converge')
    assert budget.remaining == 0 and budget.stdout_bytes == minimum
    tiny = io.BytesIO(); budget = module.OutputBudget(minimum-1, tiny)
    try:
        module.emit_control_gate(environment(module), budget, 100, 100)
    except module.BoundExceeded:
        pass
    else:
        raise AssertionError('one byte under receipt capacity was accepted')
    assert tiny.getvalue() == b'' and budget.stdout_bytes == 0
    return {'exactReceiptLimit': minimum, 'oneByteLessRejectedAtomically': True}


def escaped_identity_probe(module):
    out = io.BytesIO(); budget = module.OutputBudget(10000, out)
    env = environment(module); env['EXPECTED_S3_VERSION'] = 'version\n"\\\u00e9'
    module.emit_control_gate(env, budget, 100, 100)
    assert len(out.getvalue().splitlines()) == 1
    receipt = json.loads(out.getvalue().split(b' ', 1)[1])
    assert receipt['s3Version'] == env['EXPECTED_S3_VERSION'] and receipt['stdoutBytes'] == len(out.getvalue())
    out = io.BytesIO(); budget = module.OutputBudget(20000, out)
    env['EXPECTED_S3_VERSION'] = '\U0001f600'*1000
    try:
        module.emit_control_gate(env, budget, 100, 100)
    except module.BoundExceeded:
        pass
    else:
        raise AssertionError('over4096-byte record accepted')
    assert not out.getvalue()


def main():
    current_bytes = (ROOT/PATH).read_bytes()
    old_bytes = subprocess.check_output(['git', '-C', str(ROOT), 'show', 'a15d214:'+PATH])
    (OUTPUT/'baseline-runner.py').write_bytes(old_bytes)
    results = []
    for variant, source in [('baseline', old_bytes), ('candidate', current_bytes)]:
        module = load('review_'+variant, source)
        probes = [('schema/order', lambda: schema_probe(module)),
                  ('invalid identity', lambda: identity_probe(module)),
                  ('separate stream counters', lambda: stream_probe(module))]
        if variant == 'candidate':
            probes += [('shared cap extra byte', lambda: stream_probe(module, 1)),
                       ('secret combined capture exact', lambda: secret_probe(module, 9)),
                       ('secret combined capture+1', lambda: secret_probe(module, 8)),
                       ('receipt exact capacity and+1', lambda: receipt_boundary(module)),
                       ('escaped identity and4096record bound', lambda: escaped_identity_probe(module))]
            probes += [(f'qualification failure{i}', lambda i=i: guarded_failure(module, fail=i))
                       for i in range(1, len(module.gates())+2)]
            probes += [(name, lambda raw=raw: guarded_failure(module, size=raw))
                       for name, raw in [('image+1', b'101'), ('image malformed', b'null')]]
            probes += [(f'bad {field}', lambda field=field: guarded_failure(module, changes={field:''}))
                       for field in ['EXPECTED_SHA','EXPECTED_S3_VERSION','REPOSITORY_URI',
                                     'CAPIRO_EXECUTION_ID','CODEBUILD_BUILD_ID']]
            probes += [('insufficient receipt budget', lambda: guarded_failure(module, limit=50))]
        for name, fn in probes:
            try:
                detail = fn(); passed = True; error = None
            except Exception as exc:
                passed = False; detail = None; error = type(exc).__name__+': '+str(exc)
            results.append({'variant':variant,'probe':name,'passed':passed,'detail':detail,'error':error})
    assert (ROOT/PATH).read_bytes() == current_bytes, 'candidate changed during review'
    report = {'candidateRunnerSHA256':hashlib.sha256(current_bytes).hexdigest(),
              'baselineRunnerSHA256':hashlib.sha256(old_bytes).hexdigest(),
              'awsCalls':0,'dockerCalls':0,'sourceEdits':0,'results':results,
              'candidatePassed':sum(r['passed'] for r in results if r['variant']=='candidate'),
              'candidateTotal':sum(r['variant']=='candidate' for r in results),
              'baselineRed':sum(not r['passed'] for r in results if r['variant']=='baseline'),
              'baselineTotal':sum(r['variant']=='baseline' for r in results)}
    (OUTPUT/'protocol-review-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='results'},indent=2))
    assert report['candidatePassed']==report['candidateTotal']
    assert report['baselineRed']==report['baselineTotal']


if __name__ == '__main__':
    main()
