"""The shipping watchdog consumes one bounded, identity-bound pre-push receipt."""
import io
import json
from pathlib import Path
import sys
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import runner

EXECUTION = 'capiro-4a-00000000-0000-4000-8000-000000000001'
BUILD = 'capiro-portfolio-preview-build:00000000-0000-4000-8000-000000000002'


class ControlGateTests(unittest.TestCase):
    def fake_execution(self, changes=None, limit=10000):
        output = io.BytesIO()
        budget = runner.OutputBudget(limit, output)
        calls = []
        env = {'EXPECTED_SHA': runner.SOURCE, 'EXPECTED_S3_VERSION': 'verified-version',
               'CODEBUILD_SOURCE_VERSION': 'verified-version', 'REPOSITORY_URI': runner.REPOSITORY,
               'AWS_DEFAULT_REGION': 'us-east-1', 'CAPIRO_MAX_IMAGE_BYTES': '100',
               'CAPIRO_MAX_LOG_BYTES': str(limit), 'CAPIRO_STOP_EPOCH': str(int(time.time())+300),
               'CAPIRO_EXECUTION_ID': EXECUTION, 'CODEBUILD_BUILD_ID': BUILD}
        env.update(changes or {})
        def command(argv, deadline, budget, **kwargs):
            if argv[:3] == ['aws', 'ecr', 'get-login-password']:
                # A complete parseable guard must already exist before authentication.
                self.assertIn(b'CAPIRO_CONTROL_GATE ', output.getvalue())
            calls.append((argv, output.getvalue()))
            return b'100\n' if argv[:3] == ['docker', 'image', 'inspect'] else b'fake-secret'
        with patch.object(runner.Path, 'read_text', return_value=runner.SOURCE), \
             patch.object(runner, 'OutputBudget', return_value=budget):
            try:
                runner.execute(env, command)
            except Exception as error:
                return output.getvalue(), budget, calls, error
        return output.getvalue(), budget, calls, None

    def test_control_receipt_binds_identity_limits_and_completed_output(self):
        output, budget, calls, error = self.fake_execution()
        self.assertIsNone(error)
        records = [line for line in output.splitlines() if line.startswith(b'CAPIRO_CONTROL_GATE ')]
        self.assertEqual(len(records), 1)
        self.assertLessEqual(len(records[0])+1, 4096)
        value = json.loads(records[0].removeprefix(b'CAPIRO_CONTROL_GATE '))
        self.assertEqual(value, {'schemaVersion': 1, 'stage': 'pre_push', 'buildId': BUILD,
                                'executionId': EXECUTION, 'sourceSHA': runner.SOURCE,
                                's3Version': 'verified-version', 'imageBoundBytes': 100,
                                'imageMeasure': 'docker.image.Size', 'stdoutBytes': len(output),
                                'stderrBytes': 0, 'imageLimitBytes': 100, 'outputLimitBytes': 10000,
                                'guardPass': True})
        smoke = next(c for c in calls if c[0][:2] == ['bash', 'apps/web/deployment/portfolio/smoke.sh'])
        self.assertNotIn(b'CAPIRO_CONTROL_GATE ', smoke[1])
        self.assertEqual(budget.stdout_bytes, len(output))

    def test_missing_or_foreign_execution_identity_stops_before_gates(self):
        for changes in [{'CAPIRO_EXECUTION_ID': ''}, {'CAPIRO_EXECUTION_ID': 'foreign'},
                        {'CODEBUILD_BUILD_ID': ''}, {'CODEBUILD_BUILD_ID': 'other-project:fake'}]:
            with self.subTest(changes=changes):
                _, _, calls, error = self.fake_execution(changes)
                self.assertIsInstance(error, ValueError)
                self.assertEqual(calls, [])

    def test_guard_cannot_exceed_remaining_output_allowance(self):
        output, _, calls, error = self.fake_execution(limit=50)
        self.assertIsInstance(error, runner.BoundExceeded)
        self.assertNotIn(b'CAPIRO_CONTROL_GATE ', output)
        self.assertFalse(any(c[0][0] == 'aws' or c[0][:2] == ['docker', 'push'] for c in calls))

    def test_child_stderr_has_separate_counter_and_shared_limit(self):
        output = io.BytesIO()
        budget = runner.OutputBudget(1000, output)
        argv = [sys.executable, '-c', 'import os; os.write(1,b"out"); os.write(2,b"error")']
        runner.run(argv, time.monotonic()+5, budget)
        self.assertEqual(budget.stderr_bytes, 5)
        self.assertEqual(budget.stdout_bytes, len(('GATE '+sys.executable+'\n').encode())+3)
        self.assertEqual(budget.stdout_bytes+budget.stderr_bytes+budget.remaining, 1000)


if __name__ == '__main__':
    unittest.main()
