# Shipping watchdog receipt, version 1

The same reviewed runner, request preparation and supervisor remain canonical. `EXPECTED_SHA`, `EXPECTED_S3_VERSION`, `REPOSITORY_URI` and nonsecret `CAPIRO_EXECUTION_ID` retain their existing names. No second build protocol or source archive is introduced. CodeBuild supplies `CODEBUILD_BUILD_ID` and, for S3 input, `CODEBUILD_SOURCE_VERSION`; the runner validates these before executing gates. [CodeBuild environment variables](https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-env-vars.html)

After every qualification command, Docker build, smoke test and valid image-size check, and before ECR authentication or push, stdout contains exactly one line starting `CAPIRO_CONTROL_GATE ` followed by compact JSON and a newline. The complete line is at most 4096 bytes and must fit the remaining shared output budget. The runner refuses publication if it cannot emit the complete receipt. No passing receipt is emitted after a failed qualification, invalid size or exhausted output budget.

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Integer 1. |
| `stage` | Exact string `pre_push`. |
| `buildId` | Current validated `CODEBUILD_BUILD_ID`. |
| `executionId` | Exact nonsecret `CAPIRO_EXECUTION_ID` from the reviewed request. |
| `sourceSHA` | Frozen `4a1614886fd98bb42d529f1ef59b3d01d7ff9173`. |
| `s3Version` | `EXPECTED_S3_VERSION`, already compared with the actual source version. |
| `imageBoundBytes` | Positive integer local image `.Size` returned by Docker inspect. |
| `imageMeasure` | Exact string `docker.image.Size`; this is local uncompressed size. |
| `stdoutBytes` | Counted stdout bytes through and **including this complete receipt and newline**. |
| `stderrBytes` | Counted stderr bytes emitted up to the receipt. |
| `imageLimitBytes` | Required accepted `CAPIRO_MAX_IMAGE_BYTES`. |
| `outputLimitBytes` | Required accepted shared `CAPIRO_MAX_LOG_BYTES`. |
| `guardPass` | JSON boolean `true`, emitted only when the preceding checks passed. |

Both child streams are drained incrementally and retain separate counters against one combined budget. Gate headers and the receipt count toward stdout. The receipt's own serialized length is resolved before writing, including changes in the counter's decimal width. The two counters sum to no more than the output limit. Login/push output continues consuming the same budget after the receipt; this pre-push snapshot is not a final build-log total.

The bounded secret credential capture is never logged or included in emitted-byte counters. The separately bounded 1025-byte failure footer, CodeBuild command/bootstrap echo, platform output and independent daemon logs are outside these counters. The record proves the local gate's observation; it is neither proof of completed push/scan nor an AWS-enforced cost cap. Shipping must compare build/execution/source/S3 identities and accepted limits with its own submission receipt, require the expected measure and `guardPass=true`, and independently retain the terminal build result and exact image digest.

The external shipping watchdog may consume this record. `supervise.py` continues to own the same one-attempt deadline, cancellation and terminal observation; it does not download logs or infer terminal state from this record. Neither missing logs nor an accepted stop request establishes remote termination.
