#!/usr/bin/env python3
"""Reviewed CodeBuild gate runner, embedded by prepare.py; no work on import."""
import json
import os
import re
import selectors
import signal
import subprocess
import sys
import time
from pathlib import Path

SOURCE = "4a1614886fd98bb42d529f1ef59b3d01d7ff9173"
REPOSITORY = "967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview"


class BoundExceeded(RuntimeError):
    pass


class OutputBudget:
    def __init__(self, limit, output=None):
        self.remaining = limit
        self.output = output if output is not None else sys.stdout.buffer

    def emit(self, data):
        allowed = min(len(data), self.remaining)
        self.output.write(data[:allowed])
        self.output.flush()
        self.remaining -= allowed
        if allowed < len(data):
            raise BoundExceeded("Build command output exceeded the reviewed byte limit")


def terminate_group(process):
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        pass
    # A departed group leader does not imply its descendants exited.
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    process.wait(timeout=2)


def run(argv, deadline, budget, *, capture_limit=0, secret=False, input_data=None):
    """Drain merged bytes incrementally; fail rather than hide excess output."""
    if time.monotonic() >= deadline:
        raise BoundExceeded("Execution deadline reached before command")
    if not secret:
        budget.emit(("GATE " + argv[0] + "\n").encode())
    process = subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               stdin=subprocess.PIPE if input_data is not None else subprocess.DEVNULL,
                               start_new_session=True)
    captured = bytearray()
    try:
        if input_data is not None:
            if len(input_data) > 16384:
                raise BoundExceeded("Credential input exceeds bounded pipe allowance")
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ)
            pending_input = memoryview(input_data or b"")
            if process.stdin is not None:
                os.set_blocking(process.stdin.fileno(), False)
                selector.register(process.stdin, selectors.EVENT_WRITE)
            while selector.get_map():
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise BoundExceeded("Execution deadline reached during command")
                for key, _ in selector.select(min(0.25, remaining)):
                    if key.fileobj is process.stdin:
                        if pending_input:
                            written = os.write(key.fileobj.fileno(), pending_input[:4096])
                            pending_input = pending_input[written:]
                        if not pending_input:
                            selector.unregister(key.fileobj)
                            key.fileobj.close()
                        continue
                    chunk = os.read(key.fileobj.fileno(), 16384)
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    if capture_limit:
                        if len(captured) + len(chunk) > capture_limit:
                            raise BoundExceeded("Command response exceeds capture limit")
                        captured.extend(chunk)
                    if not secret:
                        budget.emit(chunk)
                if process.poll() is not None and not selector.get_map():
                    break
        status = process.wait(timeout=max(0.01, deadline - time.monotonic()))
        if status:
            raise RuntimeError(f"Gate {argv[0]} failed with exit {status}")
        return bytes(captured)
    except BaseException:
        terminate_group(process)
        raise
    finally:
        process.stdout.close()
        if process.stdin is not None:
            process.stdin.close()


def positive_integer(value, label):
    if not isinstance(value, str) or not re.fullmatch(r"[1-9][0-9]*", value):
        raise ValueError(f"{label} must be a positive decimal integer")
    return int(value)


def assert_image_size(raw, maximum):
    try:
        value = raw.decode("ascii").strip()
    except UnicodeError as error:
        raise ValueError("Docker image size is not ASCII") from error
    size = positive_integer(value, "Docker image .Size")
    if size > maximum:
        raise BoundExceeded(f"Image .Size {size} exceeds reviewed maximum {maximum}; push refused")
    return size


def gates():
    return [
        ["node", "--version"], ["npm", "--version"],
        ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"],
        ["npm", "exec", "--workspace", "@capiro/web", "--", "playwright", "install", "--with-deps", "chromium"],
        ["npm", "run", "check"],
        ["bash", "-euc", 'node apps/web/deployment/portfolio/qualify-elements.mjs "$(mktemp -d)/elements"'],
        ["npm", "run", "test:browser", "--", "--workers=3"],
        ["npm", "run", "test:browser:modules"],
        ["npm", "run", "build"], ["npm", "run", "test:production"],
        ["docker", "build", "--pull", "--platform", "linux/amd64", "-f", "apps/web/Dockerfile", "-t", f"{REPOSITORY}:{SOURCE}", "."],
        ["bash", "apps/web/deployment/portfolio/smoke.sh", f"{REPOSITORY}:{SOURCE}"],
    ]


def execute(environment=None, command=run):
    env = os.environ if environment is None else environment
    if env.get("EXPECTED_SHA") != SOURCE or Path("source-commit.txt").read_text().strip() != SOURCE:
        raise ValueError("Source commit does not match frozen reviewed source")
    if not env.get("EXPECTED_S3_VERSION") or env.get("CODEBUILD_SOURCE_VERSION") != env["EXPECTED_S3_VERSION"]:
        raise ValueError("Source S3 version does not match reviewed custody")
    if env.get("REPOSITORY_URI") != REPOSITORY or env.get("AWS_DEFAULT_REGION") != "us-east-1":
        raise ValueError("Unexpected repository or region")
    maximum = positive_integer(env.get("CAPIRO_MAX_IMAGE_BYTES"), "Maximum image bytes")
    budget = OutputBudget(positive_integer(env.get("CAPIRO_MAX_LOG_BYTES"), "Maximum log bytes"))
    stop_epoch = positive_integer(env.get("CAPIRO_STOP_EPOCH"), "Supervised stop epoch")
    remaining = stop_epoch - time.time()
    if remaining <= 0 or remaining > 3900:
        raise ValueError("Missing, expired or overlong original supervision deadline")
    deadline = time.monotonic() + min(3600, remaining)
    os.environ.update(AWS_MAX_ATTEMPTS="1", AWS_RETRY_MODE="standard", AWS_PAGER="", AWS_CLI_AUTO_PROMPT="off")
    for argv in gates():
        command(argv, deadline, budget)
    image = f"{REPOSITORY}:{SOURCE}"
    raw = command(["docker", "image", "inspect", "--format", "{{.Size}}", image], deadline, budget, capture_limit=64)
    size = assert_image_size(raw, maximum)
    budget.emit((json.dumps({"imageSizeBytes": size, "maximumBytes": maximum, "metric": "docker.image.Size", "prePushGate": "PASS"}) + "\n").encode())
    password = command(["aws", "ecr", "get-login-password", "--region", "us-east-1", "--cli-connect-timeout", "5", "--cli-read-timeout", "10"], min(deadline, time.monotonic()+20), budget, capture_limit=16384, secret=True)
    command(["docker", "login", "--username", "AWS", "--password-stdin", REPOSITORY.split('/')[0]], min(deadline, time.monotonic()+20), budget, input_data=password)
    command(["docker", "push", image], deadline, budget)
    command(["aws", "ecr", "describe-images", "--region", "us-east-1", "--repository-name", "capiro/portfolio-preview", "--image-ids", f"imageTag={SOURCE}", "--query", "imageDetails[0].{imageDigest:imageDigest,imageTags:imageTags,imageScanStatus:imageScanStatus}", "--output", "json", "--cli-connect-timeout", "5", "--cli-read-timeout", "10"], min(deadline, time.monotonic()+20), budget)


if __name__ == "__main__":
    if len(sys.argv) != 1:
        print("Usage: runner.py (CodeBuild-only; reviewed environment required)", file=sys.stderr)
        sys.exit(2)
    try:
        execute()
    except (Exception, KeyboardInterrupt) as error:
        # Separate fixed terminal allowance; never print captured credentials.
        sys.stderr.buffer.write(("EXECUTION_FAILED: " + str(error)).encode()[:1024] + b"\n")
        sys.exit(1)
