"""Offline controls only: fake AWS responses, local child processes, no Docker."""
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import prepare
import runner
import supervise

EXECUTION = 'capiro-4a-00000000-0000-4000-8000-000000000001'
BUILD_ID = prepare.PROJECT + ':00000000-0000-4000-8000-000000000002'


def template():
    return prepare.request('offline-version', 100, 10000, (ROOT/'runner.py').read_bytes(), EXECUTION)


class Clock:
    def __init__(self, value=10000):
        self.value = value

    def now(self):
        return self.value

    def sleep(self, seconds):
        assert 0 <= seconds <= 15
        self.value += seconds


class FakeApi:
    def __init__(self, clock, responses=None):
        self.clock, self.responses, self.calls = clock, responses or {}, []

    def call(self, operation, arguments, seconds):
        assert 0 < seconds <= 15
        self.calls.append((operation, list(arguments), seconds, self.clock.value))
        response = self.responses.get(operation)
        if callable(response):
            return response(self, arguments)
        if isinstance(response, Exception):
            raise response
        return copy.deepcopy(response or {})


def build(state, status='IN_PROGRESS', complete=False):
    return {'id': BUILD_ID, 'projectName': prepare.PROJECT, 'sourceVersion': state['sourceVersion'],
            'environment': {'environmentVariables': [
                {'name': 'EXPECTED_SHA', 'value': prepare.SOURCE},
                {'name': 'CAPIRO_EXECUTION_ID', 'value': state['executionId']}]},
            'buildStatus': status, 'buildComplete': complete, 'currentPhase': 'BUILD'}


class PreparationTests(unittest.TestCase):
    def test_inline_recipe_binds_exact_runner(self):
        value = template()
        self.assertEqual(supervise.validate_template(value)['EXPECTED_SHA'], prepare.SOURCE)
        self.assertEqual(value['timeoutInMinutesOverride'], 60)
        self.assertEqual(value['queuedTimeoutInMinutesOverride'], 5)
        self.assertEqual(value['autoRetryLimitOverride'], 0)
        bootstrap = json.loads(value['buildspecOverride'])['phases']['install']['commands'][0]
        self.assertIn(hashlib.sha256((ROOT/'runner.py').read_bytes()).hexdigest(), bootstrap)
        self.assertNotIn('CAPIRO_STOP_EPOCH', str(value))

    def test_changed_recipe_is_rejected(self):
        for key, replacement in [('sourceVersion', 'other'), ('autoRetryLimitOverride', 1),
                                 ('timeoutInMinutesOverride', 61), ('buildspecOverride', 'other')]:
            with self.subTest(key=key):
                value = template()
                value[key] = replacement
                with self.assertRaises(ValueError):
                    supervise.validate_template(value)

    def test_unknown_limits_and_version_are_rejected(self):
        for version, image, log in [('', 1, 1), ('null', 1, 1), ('REPLACE_VERSION', 1, 1),
                                    ('v', 0, 1), ('v', 1, -1), ('v', True, 1)]:
            with self.subTest(values=(version, image, log)), self.assertRaises(ValueError):
                prepare.request(version, image, log, b'runner', EXECUTION)

    def test_bad_archive_fails_before_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root/'bad.zip').write_bytes(b'bad')
            result = subprocess.run([sys.executable, str(ROOT/'prepare.py'), '--archive', str(root/'bad.zip'),
                                     '--s3-version', 'offline', '--max-image-bytes', '1', '--max-log-bytes', '1',
                                     '--output', str(root/'output')], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((root/'output').exists())

    def test_offline_validate_and_execute_opt_in(self):
        with tempfile.TemporaryDirectory() as temporary:
            request = Path(temporary)/'request.json'
            request.write_text(json.dumps(template()))
            for mode, expected in [('validate', 0), ('submit', 2), ('resume', 2)]:
                with self.subTest(mode=mode):
                    result = subprocess.run([sys.executable, str(ROOT/'supervise.py'), mode,
                                             '--request', str(request)], capture_output=True)
                    self.assertEqual(result.returncode, expected)


class RunnerTests(unittest.TestCase):
    def test_exact_size_bound_is_accepted(self):
        self.assertEqual(runner.assert_image_size(b'100\n', 100), 100)

    def test_oversize_and_malformed_size_are_rejected(self):
        for raw in [b'101', b'0', b'-1', b'', b'null', b'1.0', b'1\n2', b'\xff']:
            with self.subTest(raw=raw), self.assertRaises((ValueError, runner.BoundExceeded)):
                runner.assert_image_size(raw, 100)

    def test_output_budget_fails_at_first_extra_byte(self):
        output = io.BytesIO()
        budget = runner.OutputBudget(4, output)
        budget.emit(b'1234')
        with self.assertRaises(runner.BoundExceeded):
            budget.emit(b'5')
        self.assertEqual(output.getvalue(), b'1234')

    def test_local_command_output_is_incrementally_bounded(self):
        output = io.BytesIO()
        with self.assertRaises(runner.BoundExceeded):
            runner.run([sys.executable, '-c', 'print("x"*1000000)'], time.monotonic()+5,
                       runner.OutputBudget(1024, output))
        self.assertEqual(len(output.getvalue()), 1024)

    def test_secret_response_is_captured_without_logging(self):
        output = io.BytesIO()
        value = runner.run([sys.executable, '-c', 'print("fake-secret")'], time.monotonic()+5,
                           runner.OutputBudget(1024, output), secret=True, capture_limit=64)
        self.assertEqual(value, b'fake-secret\n')
        self.assertEqual(output.getvalue(), b'')

    def test_secret_capture_limit_fails_closed(self):
        output = io.BytesIO()
        with self.assertRaises(runner.BoundExceeded):
            runner.run([sys.executable, '-c', 'print("x"*100)'], time.monotonic()+5,
                       runner.OutputBudget(1024, output), secret=True, capture_limit=64)
        self.assertEqual(output.getvalue(), b'')

    def test_deadline_kills_blocked_child(self):
        started = time.monotonic()
        with self.assertRaises(runner.BoundExceeded):
            runner.run([sys.executable, '-c', 'import time; time.sleep(60)'], started+0.15,
                       runner.OutputBudget(1024, io.BytesIO()), input_data=b'x'*16384)
        self.assertLess(time.monotonic()-started, 3)

    def test_child_exit_failure_propagates(self):
        with self.assertRaises(RuntimeError):
            runner.run([sys.executable, '-c', 'raise SystemExit(3)'], time.monotonic()+5,
                       runner.OutputBudget(1024, io.BytesIO()))

    def execute_fake(self, size=b'100', fail_gate=None, env_changes=None):
        calls = []
        env = {'EXPECTED_SHA': runner.SOURCE, 'EXPECTED_S3_VERSION': 'v', 'CODEBUILD_SOURCE_VERSION': 'v',
               'REPOSITORY_URI': runner.REPOSITORY, 'AWS_DEFAULT_REGION': 'us-east-1',
               'CAPIRO_MAX_IMAGE_BYTES': '100', 'CAPIRO_MAX_LOG_BYTES': '10000',
               'CAPIRO_STOP_EPOCH': str(int(time.time())+300)}
        env.update(env_changes or {})
        def command(argv, deadline, budget, **kwargs):
            calls.append(argv)
            if fail_gate and fail_gate(argv):
                raise RuntimeError('synthetic gate failure')
            if argv[:3] == ['docker', 'image', 'inspect']:
                return size
            return b'fake-credential'
        with patch.object(runner.Path, 'read_text', return_value=runner.SOURCE), \
             patch.object(runner, 'OutputBudget', return_value=runner.OutputBudget(10000, io.BytesIO())):
            try:
                runner.execute(env, command)
            except Exception as error:
                return calls, error
        return calls, None

    def test_size_gate_precedes_login_and_push(self):
        calls, error = self.execute_fake()
        self.assertIsNone(error)
        index = lambda prefix: next(i for i, argv in enumerate(calls) if argv[:len(prefix)] == prefix)
        self.assertLess(index(['docker', 'image', 'inspect']), index(['aws', 'ecr', 'get-login-password']))
        self.assertLess(index(['docker', 'login']), index(['docker', 'push']))
        self.assertEqual(calls[:len(runner.gates())], runner.gates())

    def test_size_failure_never_authenticates_or_pushes(self):
        for raw in [b'101', b'bad', b'0']:
            with self.subTest(raw=raw):
                calls, error = self.execute_fake(raw)
                self.assertIsNotNone(error)
                self.assertFalse(any(argv[0] == 'aws' or argv[:2] == ['docker', 'push'] for argv in calls))

    def test_failed_qualification_never_inspects_or_pushes(self):
        calls, error = self.execute_fake(fail_gate=lambda a: a == ['npm', 'run', 'check'])
        self.assertIsNotNone(error)
        self.assertFalse(any(argv[0] in ('aws', 'docker') for argv in calls))

    def test_source_and_expired_deadline_fail_before_commands(self):
        for changes in [{'EXPECTED_SHA': 'wrong'}, {'CODEBUILD_SOURCE_VERSION': 'wrong'},
                        {'CAPIRO_STOP_EPOCH': '1'}, {'CAPIRO_MAX_LOG_BYTES': '0'}]:
            with self.subTest(changes=changes):
                calls, error = self.execute_fake(env_changes=changes)
                self.assertIsNotNone(error)
                self.assertEqual(calls, [])


class SupervisionTests(unittest.TestCase):
    def setUp(self):
        self.clock = Clock()
        self.state = supervise.new_state(template(), int(self.clock.now()))
        self.snapshots = []

    def monitor(self, responses, submit=False, canceled=lambda: False):
        self.api = FakeApi(self.clock, responses)
        return supervise.supervise(self.state, self.api, lambda s: self.snapshots.append(copy.deepcopy(s)),
                                   Path('/offline/request.json'), submit=submit, now=self.clock.now,
                                   sleep=self.clock.sleep, canceled=canceled)

    def test_success_requires_confirmed_complete_terminal(self):
        value = self.monitor({'start-build': {'build': build(self.state)},
                              'batch-get-builds': {'builds': [build(self.state, 'SUCCEEDED', True)]}}, submit=True)
        self.assertTrue(supervise.successful(value))
        self.assertEqual([c[0] for c in self.api.calls], ['start-build', 'batch-get-builds'])
        self.assertEqual(self.snapshots[0]['startCalls'], 1)

    def test_cancel_at_65_minutes_and_confirm_stop_before_70(self):
        self.state.update(buildId=BUILD_ID, startCalls=1)
        def observe(api, _):
            stopped = any(c[0] == 'stop-build' for c in api.calls)
            return {'builds': [build(self.state, 'STOPPED' if stopped else 'IN_PROGRESS', stopped)]}
        value = self.monitor({'batch-get-builds': observe})
        stops = [c for c in self.api.calls if c[0] == 'stop-build']
        self.assertEqual(len(stops), 1)
        self.assertEqual(stops[0][3], self.state['cancelEpoch'])
        self.assertEqual(value['status'], 'STOPPED')
        self.assertTrue(value['withinLifecycleTarget'])
        self.assertFalse(supervise.successful(value))

    def test_stop_acceptance_is_not_terminal_confirmation(self):
        self.state.update(buildId=BUILD_ID, startCalls=1)
        value = self.monitor({'batch-get-builds': {'builds': [build(self.state)]},
                              'stop-build': {'build': build(self.state)}})
        self.assertEqual(value['status'], 'UNKNOWN_REMOTE_STATE')
        self.assertEqual(value['stopAttempts'], 3)
        self.assertEqual(self.clock.now(), self.state['deadlineEpoch'])
        self.assertFalse(supervise.successful(value))

    def test_uncertain_submission_is_discovered_and_stopped_without_retry(self):
        def observe(api, _):
            stopped = any(c[0] == 'stop-build' for c in api.calls)
            return {'builds': [build(self.state, 'STOPPED' if stopped else 'IN_PROGRESS', stopped)]}
        value = self.monitor({'start-build': TimeoutError('lost response'),
                              'list-builds-for-project': {'ids': [BUILD_ID]},
                              'batch-get-builds': observe}, submit=True)
        self.assertEqual(sum(c[0] == 'start-build' for c in self.api.calls), 1)
        self.assertEqual(value['status'], 'STOPPED')
        self.assertTrue(value['cancelRequired'])

    def test_unknown_submission_never_retries_and_reports_unknown(self):
        value = self.monitor({'start-build': TimeoutError('lost response')}, submit=True)
        self.assertEqual(sum(c[0] == 'start-build' for c in self.api.calls), 1)
        self.assertEqual(value['status'], 'UNKNOWN_REMOTE_STATE')
        self.assertEqual(value['stopAttempts'], 0)

    def test_three_observation_failures_request_cancellation(self):
        self.state.update(buildId=BUILD_ID, startCalls=1)
        value = self.monitor({'batch-get-builds': RuntimeError('offline failure')})
        stops = [c for c in self.api.calls if c[0] == 'stop-build']
        self.assertEqual(stops[0][3], 10030)
        self.assertEqual(value['status'], 'UNKNOWN_REMOTE_STATE')

    def test_wrong_identity_is_never_stopped(self):
        foreign = build(self.state)
        foreign['environment']['environmentVariables'][1]['value'] = 'foreign'
        value = self.monitor({'list-builds-for-project': {'ids': [BUILD_ID]},
                              'batch-get-builds': {'builds': [foreign]}})
        self.assertEqual(value['status'], 'UNKNOWN_REMOTE_STATE')
        self.assertFalse(any(c[0] in ('start-build', 'stop-build') for c in self.api.calls))

    def test_resume_unconfirmed_success_requires_fresh_observation(self):
        self.state.update(status='SUCCEEDED', buildId=BUILD_ID, startCalls=1)
        value = self.monitor({'batch-get-builds': {'builds': [build(self.state, 'SUCCEEDED', True)]}})
        self.assertEqual(self.api.calls[0][0], 'batch-get-builds')
        self.assertTrue(supervise.successful(value))

    def test_incomplete_terminal_cannot_succeed(self):
        self.state.update(buildId=BUILD_ID, startCalls=1)
        value = self.monitor({'batch-get-builds': {'builds': [build(self.state, 'SUCCEEDED', False)]}})
        self.assertEqual(value['status'], 'UNKNOWN_REMOTE_STATE')
        self.assertFalse(supervise.successful(value))

    def test_late_complete_observation_cannot_succeed(self):
        self.state.update(buildId=BUILD_ID, startCalls=1)
        self.clock.value = self.state['deadlineEpoch']-1
        def late(_, __):
            self.clock.value += 2
            return {'builds': [build(self.state, 'SUCCEEDED', True)]}
        value = self.monitor({'batch-get-builds': late})
        self.assertEqual(value['status'], 'SUCCEEDED')
        self.assertFalse(value['withinLifecycleTarget'])
        self.assertFalse(supervise.successful(value))

    def test_expired_resume_never_calls_aws(self):
        self.state.update(buildId=BUILD_ID, startCalls=1)
        self.clock.value = self.state['deadlineEpoch']
        value = self.monitor({})
        self.assertEqual(self.api.calls, [])
        self.assertEqual(value['status'], 'UNKNOWN_REMOTE_STATE')

    def test_expired_initial_attempt_never_calls_aws(self):
        self.clock.value = self.state['deadlineEpoch']
        value = self.monitor({}, submit=True)
        self.assertEqual(self.api.calls, [])
        self.assertEqual(value['startCalls'], 0)

    def test_second_start_is_rejected(self):
        self.state['startCalls'] = 1
        with self.assertRaises(ValueError):
            self.monitor({}, submit=True)

    def test_signal_before_submission_does_not_start(self):
        value = self.monitor({}, submit=True, canceled=lambda: True)
        self.assertEqual(value['status'], 'NOT_SUBMITTED')
        self.assertEqual(self.api.calls, [])

    def test_resume_preserves_original_deadline(self):
        original = self.state['deadlineEpoch']
        self.state.update(buildId=BUILD_ID, startCalls=1)
        self.clock.value += 4100
        value = self.monitor({'batch-get-builds': {'builds': [build(self.state)]}})
        self.assertEqual(value['deadlineEpoch'], original)
        self.assertEqual(self.clock.now(), original)

    def test_bound_request_rejects_changed_state_identity(self):
        self.state['executionId'] = 'foreign'
        with self.assertRaises(ValueError):
            supervise.bound_request(template(), self.state)

    def test_changed_deadline_is_rejected(self):
        self.state['deadlineEpoch'] += 1
        with self.assertRaises(ValueError):
            self.monitor({})

    def test_completed_resume_uses_confirmed_receipt(self):
        self.state.update(status='SUCCEEDED', buildId=BUILD_ID, startCalls=1, terminalConfirmed=True,
                          terminalObservedEpoch=10000, withinLifecycleTarget=True)
        value = self.monitor({})
        self.assertEqual(self.api.calls, [])
        self.assertTrue(supervise.successful(value))


if __name__ == '__main__':
    unittest.main()
