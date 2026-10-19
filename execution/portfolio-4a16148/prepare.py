#!/usr/bin/env python3
"""Prepare an offline, hash-bound per-run override. Never calls AWS."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import uuid

SOURCE = "4a1614886fd98bb42d529f1ef59b3d01d7ff9173"
ARCHIVE_SHA = "252ccdf0d91d94a6b53e4a9d905534f2b4e325ef231481774154daa96bfacbf5"
ARCHIVE_BYTES = 451977924
PROJECT = "capiro-portfolio-preview-build"
REPOSITORY = "967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview"


def positive(value):
    if not value.isascii() or not value.isdecimal() or int(value) <= 0:
        raise argparse.ArgumentTypeError("Expected a positive byte count")
    return int(value)


def buildspec(runner):
    digest = hashlib.sha256(runner).hexdigest()
    encoded = base64.b64encode(runner).decode()
    bootstrap = "\n".join([
        "python3 - <<'CAPIRO_EXECUTION_BOOTSTRAP'",
        "import base64,hashlib,pathlib",
        f"data=base64.b64decode('{encoded}',validate=True)",
        f"assert hashlib.sha256(data).hexdigest()=='{digest}'",
        "with pathlib.Path('/tmp/capiro-4a16148-runner.py').open('xb') as output: output.write(data)",
        "CAPIRO_EXECUTION_BOOTSTRAP",
    ])
    return {"version": 0.2, "env": {"shell": "bash"}, "phases": {
        "install": {"runtime-versions": {"nodejs": 24}, "commands": [bootstrap]},
        "build": {"commands": ["python3 /tmp/capiro-4a16148-runner.py"]},
    }}


def request(version, maximum_image, maximum_log, runner, execution_id):
    if not version or version == "null" or version.startswith("REPLACE_") or len(version) > 1024:
        raise ValueError("Supply the verified version ID of the unchanged source archive")
    if type(maximum_image) is not int or type(maximum_log) is not int or min(maximum_image, maximum_log) <= 0:
        raise ValueError("Approved image and log byte limits are required")
    spec = json.dumps(buildspec(runner), separators=(",", ":"))
    values = {"EXPECTED_SHA": SOURCE, "EXPECTED_S3_VERSION": version, "REPOSITORY_URI": REPOSITORY,
              "CAPIRO_MAX_IMAGE_BYTES": str(maximum_image), "CAPIRO_MAX_LOG_BYTES": str(maximum_log),
              "CAPIRO_EXECUTION_ID": execution_id}
    return {"projectName": PROJECT, "sourceVersion": version, "buildspecOverride": spec,
            "timeoutInMinutesOverride": 60, "queuedTimeoutInMinutesOverride": 5,
            "autoRetryLimitOverride": 0, "idempotencyToken": execution_id,
            "environmentVariablesOverride": [{"name": k, "value": v, "type": "PLAINTEXT"} for k, v in values.items()]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True)
    parser.add_argument("--s3-version", required=True)
    parser.add_argument("--max-image-bytes", type=positive, required=True)
    parser.add_argument("--max-log-bytes", type=positive, required=True)
    parser.add_argument("--output", type=Path, required=True, help="New directory; existing paths refused")
    args = parser.parse_args()
    with args.archive.open('rb') as archive:
        digest = hashlib.file_digest(archive, 'sha256').hexdigest()
    if args.archive.stat().st_size != ARCHIVE_BYTES or digest != ARCHIVE_SHA:
        parser.error("Archive does not match the unchanged qualified4a source")
    runner = Path(__file__).with_name("runner.py").read_bytes()
    execution_id = "capiro-4a-" + str(uuid.uuid4())
    value = request(args.s3_version, args.max_image_bytes, args.max_log_bytes, runner, execution_id)
    args.output.mkdir(parents=False, exist_ok=False)
    encoded = (json.dumps(value, indent=2) + '\n').encode()
    (args.output/'request.template.json').write_bytes(encoded)
    spec = value['buildspecOverride'].encode()
    (args.output/'buildspec.override.json').write_bytes(spec)
    binding = {"applicationSource": SOURCE, "archiveSHA256": ARCHIVE_SHA, "archiveBytes": ARCHIVE_BYTES,
               "s3Version": args.s3_version, "executionId": execution_id,
               "runnerSHA256": hashlib.sha256(runner).hexdigest(),
               "buildspecOverrideSHA256": hashlib.sha256(spec).hexdigest(),
               "templateSHA256": hashlib.sha256(encoded).hexdigest(),
               "maximumImageBytes": args.max_image_bytes, "maximumCommandLogBytes": args.max_log_bytes,
               "wholeLifecycleSeconds": 4200, "cancelAfterSeconds": 3900,
               "cloudExecution": "NOT_RUN", "sourceArchiveModified": False}
    (args.output/'binding.json').write_text(json.dumps(binding, indent=2)+'\n')
    print(json.dumps(binding))


if __name__ == '__main__':
    main()
