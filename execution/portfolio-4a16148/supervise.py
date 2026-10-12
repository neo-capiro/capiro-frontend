#!/usr/bin/env python3
"""One-attempt CodeBuild supervision; only the designated shipping operator executes."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import time

import prepare

TERMINAL = {"SUCCEEDED", "FAILED", "FAULT", "STOPPED", "TIMED_OUT"}
LIFETIME = 4200
CANCEL_AFTER = 3900


class AwsCli:
    def call(self, operation, arguments, seconds):
        if seconds <= 0:
            raise TimeoutError("No time left for AWS call")
        env = dict(os.environ, AWS_MAX_ATTEMPTS="1", AWS_RETRY_MODE="standard",
                   AWS_PAGER="", AWS_CLI_AUTO_PROMPT="off")
        # No CLI retry, shell interpolation, log download or credential printing.
        result = subprocess.run(["aws", "codebuild", operation, *arguments,
                                 "--region", "us-east-1", "--output", "json",
                                 "--cli-connect-timeout", "5", "--cli-read-timeout", "10"],
                                capture_output=True, timeout=min(15, seconds), env=env)
        if result.returncode:
            raise RuntimeError(f"AWS {operation} failed with exit {result.returncode}")
        if len(result.stdout) > 1048576 or len(result.stderr) > 65536:
            raise RuntimeError("AWS response exceeds local capture allowance")
        return json.loads(result.stdout)


def validate_template(value):
    env = {item['name']: item['value'] for item in value.get('environmentVariablesOverride', [])}
    execution_id = env.get('CAPIRO_EXECUTION_ID', '')
    if not re.fullmatch(r'capiro-4a-[a-f0-9-]{36}', execution_id):
        raise ValueError("Unexpected execution identity")
    expected = prepare.request(env.get('EXPECTED_S3_VERSION'), int(env.get('CAPIRO_MAX_IMAGE_BYTES', 0)),
                               int(env.get('CAPIRO_MAX_LOG_BYTES', 0)),
                               Path(__file__).with_name('runner.py').read_bytes(), execution_id)
    if value != expected:
        raise ValueError("Request differs from this reviewed execution recipe")
    return env


def new_state(template, submitted_epoch):
    env = validate_template(template)
    return {'executionId': env['CAPIRO_EXECUTION_ID'], 'sourceVersion': template['sourceVersion'],
            'submittedEpoch': submitted_epoch, 'cancelEpoch': submitted_epoch+CANCEL_AFTER,
            'deadlineEpoch': submitted_epoch+LIFETIME, 'status': 'SUBMITTING',
            'buildId': None, 'cancelRequired': False, 'stopAttempts': 0,
            'startCalls': 0, 'events': []}


def bound_request(template, state):
    env = validate_template(template)
    if state['executionId'] != env['CAPIRO_EXECUTION_ID'] or state['sourceVersion'] != template['sourceVersion']:
        raise ValueError("State identity differs from the reviewed request")
    value = json.loads(json.dumps(template))
    value['environmentVariablesOverride'].append({'name': 'CAPIRO_STOP_EPOCH',
        'value': str(state['cancelEpoch']), 'type': 'PLAINTEXT'})
    return value


def matches(build, state):
    values = {v.get('name'): v.get('value') for v in build.get('environment', {}).get('environmentVariables', [])}
    return (build.get('projectName') == prepare.PROJECT
            and build.get('sourceVersion') == state['sourceVersion']
            and values.get('CAPIRO_EXECUTION_ID') == state['executionId']
            and values.get('EXPECTED_SHA') == prepare.SOURCE)


def validate_state(state):
    start = state['submittedEpoch']
    if type(start) is not int or state['cancelEpoch'] != start+CANCEL_AFTER or state['deadlineEpoch'] != start+LIFETIME:
        raise ValueError("State does not retain the original70-minute deadline")
    if state.get('startCalls') not in (0, 1) or state.get('stopAttempts', 0) not in range(4):
        raise ValueError("Invalid attempt counters")


def confirmed_terminal(state):
    return (state.get('terminalConfirmed') is True and state.get('status') in TERMINAL
            and valid_id(state.get('buildId'))
            and type(state.get('terminalObservedEpoch')) is int
            and state['submittedEpoch'] <= state['terminalObservedEpoch'])


def successful(state):
    return (confirmed_terminal(state) and state['status'] == 'SUCCEEDED'
            and state.get('withinLifecycleTarget') is True
            and state['terminalObservedEpoch'] <= state['deadlineEpoch']
            and not state['cancelRequired'])


def supervise(state, api, save, request_path, *, submit=False, now=time.time, sleep=time.sleep, canceled=lambda: False):
    """Injectable clocks/API enable offline whole-lifecycle failure controls."""
    validate_state(state)
    def record(kind, **fields):
        state['events'] = (state['events'] + [{'epoch': int(now()), 'kind': kind, **fields}])[-256:]
        save(state)

    def call(operation, args):
        remaining = min(15, state['deadlineEpoch']-now())
        if remaining <= 0:
            raise TimeoutError("Original lifecycle deadline has elapsed")
        return api.call(operation, args, remaining)

    if now() < state['submittedEpoch']:
        raise ValueError("Clock precedes original submission; manual reconciliation required")
    if confirmed_terminal(state):
        return state
    if now() >= state['deadlineEpoch']:
        state['status'] = 'UNKNOWN_REMOTE_STATE'
        state['withinLifecycleTarget'] = False
        record('DEADLINE_WITHOUT_TERMINAL_CONFIRMATION')
        return state
    if submit:
        if state['startCalls'] != 0 or state['status'] != 'SUBMITTING':
            raise ValueError("A second StartBuild call is forbidden")
        if canceled() or now() >= state['cancelEpoch']:
            state['status'] = 'NOT_SUBMITTED'
            state['cancelRequired'] = True
            record('CANCELED_BEFORE_SUBMISSION')
            return state
        state['startCalls'] = 1
        record('START_ATTEMPT_RECORDED')  # Persist before the only StartBuild call.
        try:
            result = call('start-build', ['--cli-input-json', 'file://'+str(request_path)])
            build = result['build']
            if not matches(build, state) or not valid_id(build.get('id')):
                raise ValueError("Start response does not bind the requested build")
            state['buildId'] = build['id']
            record('START_CONFIRMED', buildId=state['buildId'])
        except Exception as error:
            # An absent response is not proof the service rejected the request.
            state['cancelRequired'] = True
            record('SUBMISSION_UNCERTAIN', error=type(error).__name__)
    elif not state['buildId']:
        state['cancelRequired'] = True  # Resume never resubmits, even if no ID was retained.
    failures = 0
    next_stop = 0
    while now() < state['deadlineEpoch']:
        if canceled() or now() >= state['cancelEpoch']:
            state['cancelRequired'] = True
        try:
            if state['buildId']:
                response = call('batch-get-builds', ['--ids', state['buildId']])
                candidates = response.get('builds', [])
            else:
                listed = call('list-builds-for-project', ['--project-name', prepare.PROJECT, '--sort-order', 'DESCENDING', '--no-paginate'])
                ids = listed.get('ids', [])[:20]
                candidates = call('batch-get-builds', ['--ids', *ids]).get('builds', []) if ids else []
            found = [b for b in candidates if matches(b, state) and valid_id(b.get('id'))]
            if len(found) > 1:
                raise ValueError("Multiple builds match one execution; manual reconciliation required")
            if found:
                build = found[0]
                if state['buildId'] and build['id'] != state['buildId']:
                    raise ValueError("Read response has a different build ID")
                state['buildId'] = build['id']
                state['status'] = build.get('buildStatus', 'UNKNOWN')
                failures = 0
                record('OBSERVED', buildId=build['id'], status=state['status'], phase=build.get('currentPhase'))
                if state['status'] in TERMINAL and build.get('buildComplete') is True:
                    state['terminalObservedEpoch'] = int(now())
                    state['withinLifecycleTarget'] = now() <= state['deadlineEpoch']
                    state['terminalConfirmed'] = True
                    record('TERMINAL_CONFIRMED')
                    return state
                if state['status'] != 'IN_PROGRESS':
                    state['cancelRequired'] = True
            else:
                failures += 1
                record('BUILD_NOT_YET_BOUND')
        except Exception as error:
            failures += 1
            record('OBSERVATION_FAILED', error=type(error).__name__)
        if failures >= 3:
            state['cancelRequired'] = True
        if state['cancelRequired'] and state['buildId'] and state['stopAttempts'] < 3 and now() >= next_stop:
            state['stopAttempts'] += 1
            record('STOP_ATTEMPT_RECORDED')
            try:
                call('stop-build', ['--id', state['buildId']])
                record('STOP_REQUEST_ACCEPTED')  # Never substitute for terminal observation.
            except Exception as error:
                record('STOP_REQUEST_UNCONFIRMED', error=type(error).__name__)
            next_stop = now()+30
        sleep(max(0, min(15, state['deadlineEpoch']-now(), state['cancelEpoch']-now() if not state['cancelRequired'] else 15)))
    state['status'] = 'UNKNOWN_REMOTE_STATE'
    state['withinLifecycleTarget'] = False
    record('DEADLINE_WITHOUT_TERMINAL_CONFIRMATION')
    return state


def valid_id(value):
    return isinstance(value, str) and bool(re.fullmatch(re.escape(prepare.PROJECT)+r':[a-f0-9-]{36}', value))


def persist(path, value):
    temporary = path.with_suffix('.tmp')
    with temporary.open('w') as output:
        json.dump(value, output, indent=2)
        output.write('\n')
        output.flush()
        os.fsync(output.fileno())
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['validate', 'submit', 'resume'])
    parser.add_argument('--request', required=True, type=Path)
    parser.add_argument('--state-dir', type=Path)
    parser.add_argument('--execute', action='store_true', help='Shipping operator only; enables AWS StartBuild/StopBuild')
    args = parser.parse_args()
    template_bytes = args.request.read_bytes()
    template = json.loads(template_bytes)
    validate_template(template)
    if args.mode == 'validate':
        print('PASS offline request/recipe validation; no AWS call')
        return
    if not args.execute or args.state_dir is None:
        parser.error('submit/resume require --execute and --state-dir; only designated shipping owner may use them')
    canceled = {'value': False}
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: canceled.update(value=True))
    state_file = args.state_dir/'state.json'
    request_file = (args.state_dir/'submitted-request.json').resolve()
    if args.mode == 'submit':
        args.state_dir.mkdir(parents=False, exist_ok=False)
        state = new_state(template, int(time.time()))
        state['templateSHA256'] = hashlib.sha256(template_bytes).hexdigest()
        request_file.write_text(json.dumps(bound_request(template, state), indent=2)+'\n')
        state['submittedRequestSHA256'] = hashlib.sha256(request_file.read_bytes()).hexdigest()
        persist(state_file, state)
    else:
        state = json.loads(state_file.read_text())
        validate_state(state)
        if state['templateSHA256'] != hashlib.sha256(template_bytes).hexdigest() or state['submittedRequestSHA256'] != hashlib.sha256(request_file.read_bytes()).hexdigest():
            raise ValueError('Resume request bytes differ from the recorded attempt')
        if json.loads(request_file.read_text()) != bound_request(template, state):
            raise ValueError('Resume lost original submission/deadline binding')
    # Monotonic time after process start; restart retains original absolute deadline.
    epoch, mono = time.time(), time.monotonic()
    value = supervise(state, AwsCli(), lambda s: persist(state_file, s), request_file,
                      submit=args.mode == 'submit', now=lambda: epoch+time.monotonic()-mono,
                      canceled=lambda: canceled['value'])
    print(json.dumps({k: value.get(k) for k in ['status', 'buildId', 'cancelRequired', 'stopAttempts', 'withinLifecycleTarget']}))
    if not successful(value):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
