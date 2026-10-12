# Execution override for the frozen 4a image attempt

This reviewed wrapper adds a pre-push image-size gate, a shared command-output budget, and a submission-to-terminal watchdog to the existing one-attempt image recipe. It changes no application source, archive bytes, image destination, qualification command, resource, credential, permission, or project configuration. Root owns these scripts; the designated shipping coordinator exclusively owns preparation against verified S3 custody and any AWS execution. No cloud build, Docker build, registry login, push, scan, or deployment was run while producing this packet.

The USD2 approval is an operator allowance, **not an AWS-enforced spending cap**. These controls reduce exposure; service delays, host failure, API denial, background daemon work and platform logs can outlast local controls or incur cost. This packet does not establish that the allowance can never be exceeded.

## Immutable inputs

| Input | Binding |
| --- | --- |
| Qualified application commit | `4a1614886fd98bb42d529f1ef59b3d01d7ff9173` |
| Application root tree | `16c0b62901859aa4ff3f2ea01856aa13e13c65cd` |
| Web source tree | `46cebca97ccfc1facc1c1a939beb6f4d7730685b` |
| Existing evidence/PR10 base | `3562618f73d7a1f9d620d7b7b28c9e8c2c1ac83d` |
| Unchanged source ZIP SHA-256 | `252ccdf0d91d94a6b53e4a9d905534f2b4e325ef231481774154daa96bfacbf5` |
| ZIP length | `451977924` bytes |
| CodeBuild project | `capiro-portfolio-preview-build` |
| Region | `us-east-1` |
| Image | `967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview:4a1614886fd98bb42d529f1ef59b3d01d7ff9173` |

The original frozen recipe and archive reproduction instructions remain in [the existing image packet](../../docs/visual-closeout-20261012/evidence/image-proposal-4a16148/). The replacement is an **inline per-run buildspec override**, outside the source ZIP. `prepare.py` verifies the local archive hash and length, embeds exact `runner.py` bytes with a SHA-256 bootstrap check, and writes request/buildspec/binding files to a new directory. The bootstrap writes only `/tmp/capiro-4a16148-runner.py`, outside the Docker context. It does not fetch code. The standard CodeBuild image must provide `python3`; offline preparation and supervision require Python 3.11+ and AWS CLI only for explicit execution.

The coordinator must supply the verified S3 object version and the accepted image/log byte limits. None is guessed or inferred from the USD2 allowance. A local ZIP check alone does not establish S3 custody; the coordinator must reproduce the same ZIP digest/length from that exact version before submission.

## Changed execution behavior

`runner.py` preserves the existing clean install, Playwright installation, combined check, Elements qualification, Portfolio/Meri and Modules browser commands, one production build, production test, Docker build and smoke test. After smoke and **before ECR authentication or push**, it runs `docker image inspect --format '{{.Size}}'` on the exact tagged image. Missing, zero, negative, malformed or over-limit size aborts publication. Equality with the selected maximum passes. This is Docker's local uncompressed image `.Size`, not an exact prediction of ECR compressed storage, network traffic or cost. [Docker image inspect](https://docs.docker.com/reference/cli/docker/image/inspect/)

All child stdout/stderr from those gates, size receipt, login, push and final image description share one incremental byte budget. The first excess byte fails the build and terminates the local child process group; output is not silently truncated while allowing publication. Credential retrieval is secret, has a separate 16 KiB capture/input bound and 20-second deadline, and is never printed. The failure footer permits at most 1025 additional bytes. CodeBuild runtime/bootstrap command echo, service/platform/daemon logs, and output emitted independently of the wrapped children remain outside this budget. The embedded bootstrap text is finite and recorded in the recipe binding. No claim is made of a hard total CloudWatch ingestion cap. CLI termination does not itself prove Docker daemon work stopped.

`supervise.py` records the attempt and its original deadline before the sole `StartBuild` call. Per-run service overrides set 60 minutes for build duration, 5 minutes for queueing, and zero automatic retries; these are not a 70-minute whole-lifecycle guarantee. The caller starts cancellation at 65 minutes from the saved submission timestamp and continues observing until 70 minutes. Each CLI call has a maximum 15-second process timeout, 5-second connection timeout, 10-second read timeout and no SDK retries. Observation uses 15-second intervals and small API responses; AWS CLI response-size checks happen **after capture**, not as a streaming memory bound. [StartBuild overrides and idempotency](https://docs.aws.amazon.com/codebuild/latest/APIReference/API_StartBuild.html)

SIGINT/SIGTERM requests cancellation. Three consecutive observation failures also request cancellation. At most three `StopBuild` attempts are made for the uniquely bound build, with 30 seconds between attempts during a continuous supervisor session. Resume preserves the three-attempt total but resets that local spacing timer. A stop response is never accepted as proof of termination: a matching `BatchGetBuilds` response must report a terminal status **and** `buildComplete=true`. A persisted confirmed terminal receipt is required for successful resume. Success additionally requires observation inside the original70-minute window and no cancellation requirement. [StopBuild](https://docs.aws.amazon.com/codebuild/latest/APIReference/API_StopBuild.html), [BatchGetBuilds](https://docs.aws.amazon.com/codebuild/latest/APIReference/API_BatchGetBuilds.html)

An ambiguous start is never retried. The watchdog searches at most the 20 most recent project build IDs for the exact execution ID, source SHA and S3 version, then requests cancellation of that build. This bounded search can miss a build on a busy project; failure to establish its identity is reported as `UNKNOWN_REMOTE_STATE`, never as stopped or free of cost. Repeated stop denial, unavailable AWS, or no terminal receipt by 70 minutes also ends nonzero with that state and requires operator reconciliation. A newly observed success outside the window is recorded but exits nonzero.

The coordinator must keep **one** supervisor process alive on a reliable host and retain its state directory. Resume preserves the original deadline and never resubmits. Only one process may use an attempt's state directory at a time; the script is not a distributed/account-wide lock. A lost host/process cannot guarantee remote cancellation. Do not generate another attempt or new state directory to bypass the one-attempt allowance. Do not remove an uncertain attempt's receipt.

## Operator handoff

Preparation and validation are offline. Replace the variables with the verified custody and accepted limits; the placeholders below do not authorize AWS actions:

```bash
python3 prepare.py --archive "$VERIFIED_LOCAL_ZIP" \
  --s3-version "$VERIFIED_S3_VERSION" \
  --max-image-bytes "$ACCEPTED_IMAGE_BYTES" \
  --max-log-bytes "$ACCEPTED_COMMAND_LOG_BYTES" \
  --output "$NEW_REVIEWED_REQUEST_DIRECTORY"
python3 supervise.py validate --request "$NEW_REVIEWED_REQUEST_DIRECTORY/request.template.json"
```

Review generated `binding.json` and the exact request bytes before the coordinator consumes the existing one-attempt allowance. Preserve this execution packet's commit/hash manifest beside that binding. `submit` creates a new state directory and writes `submitted-request.json` containing the original absolute stop epoch. The persisted template and submitted-request hashes protect resume against recipe/deadline changes. The execution ID is also the idempotency token; no reliance is placed on its short service-side idempotency window to justify retries.

Only the designated shipping session, with the user's existing authorization and verified inputs, runs:

```bash
python3 supervise.py submit --execute \
  --request "$NEW_REVIEWED_REQUEST_DIRECTORY/request.template.json" \
  --state-dir "$NEW_ATTEMPT_STATE_DIRECTORY"
# If the sole supervisor stopped, inspect its receipt first, then resume the same attempt:
python3 supervise.py resume --execute \
  --request "$NEW_REVIEWED_REQUEST_DIRECTORY/request.template.json" \
  --state-dir "$EXISTING_ATTEMPT_STATE_DIRECTORY"
```

Retain the local state, submitted request, terminal CodeBuild receipt, image digest/size and scan results. `SUCCEEDED` is not deployment authorization, and the final image description does not wait for scan completion. Any scan/deployment review remains with shipping. No merge, resource change or paid workload is authorized by this packet.

## Validation scope

Run focused offline tests with `python3 -m unittest discover -s tests -v` from this directory. They use fake AWS responses and local child processes only. Author and independent review receipts, exact script hashes and preserved failure controls accompany this packet. Application qualification remains attached to 4a; no application gate was repeated or newly claimed because these files do not change runtime source. All 337 Portfolio native rows remain open. The separate remaining-screen assessment and proposed source repairs are outside this execution override.
