# Frontend build and image receipt - 19 October 2026

The single authorized frontend build succeeded. Its exact image scan completed with no findings returned, including zero HIGH and CRITICAL findings. This documentation-only successor records the result for [PR111](https://github.com/neo-capiro/capiro-frontend/pull/111); it does not deploy the image or authorize another build. [Machine-readable receipt](FRONTEND-BUILD-RECEIPT.json) and [the exact reviewed recipe](FRONTEND-BUILD-RECIPE.yml) preserve the source-to-image identity.

## Exact inputs and result

| Item | Verified value |
| --- | --- |
| Frontend source | [`e6180219b589ae8fced7155d1c451840c8663d94`](https://github.com/neo-capiro/capiro-frontend/commit/e6180219b589ae8fced7155d1c451840c8663d94) |
| Git tree | `86307a768b71d951d01e51352f1760d7cd35b55d` |
| Build ID | `capiro-portfolio-preview-build:78d8240f-16ed-42e1-a2f8-e0c388c8991b` |
| Terminal result | `SUCCEEDED`, complete; one attempt, zero automatic retries |
| Start / end UTC | `2026-10-19T20:32:06.047Z` / `2026-10-19T20:41:11.607Z` |
| Elapsed | 545.56 seconds |
| Source object | `capiro-portfolio-preview-source-967807252336-us-east-1/inputs/portfolio-source.zip` |
| Immutable S3 VersionId | `cy1S4IQhPjgTzKdZkDtKXyTaM97qfgPg` |
| ZIP bytes / SHA256 | 2,021,583,585 / `3643738e5726fac497096ccd30ec799b2ce261d4aeef19607861ddf1d6ee1196` |
| Recipe SHA256 | `4563e76507d85b9a929dff1432f479f56de4027656e3187ceb5d3cd38fcaf3d3` |
| Submitted request SHA256 | `ee82654285c542cbd00153e9942a83e4e3a90b72ad8016846735af7f5791bcca` |
| Image digest | `sha256:32941b84d67f5c276aedffee3b8ec3f96a4de8160d130842d91dadc18d334bd4` |
| Image bytes / platform | 98,468,042 / `linux/amd64` |
| ECR scan | `COMPLETE`, `2026-10-19T20:42:17Z`; all pages read, no continuation token, empty findings/counts |

The immutable image is:

```text
967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview@sha256:32941b84d67f5c276aedffee3b8ec3f96a4de8160d130842d91dadc18d334bd4
```

All 23,057 tracked Git blobs matched the archive independently. Its only additional file was `source-commit.txt` with the exact commit and LF; duplicate and unexpected entries were zero. Upload and exact-version readback agreed on checksum, length, source and tree. The actual CodeBuild inline recipe matched the reviewed recipe hash. Source/version/marker checks preceded dependency installation. The earlier S3 version was retained.

## Verification actually completed

**The prior full web TypeScript rerun passed:** `tsc --noEmit --incremental false`, Node 24.19.0, `NODE_OPTIONS=--max-old-space-size=4096`, exit 0 in **38.1 seconds**, at exact source `e6180219`. The first 2 GiB attempt exhausted the V8 heap and remains a failed attempt. The 4 GiB rerun used the unchanged locked dependencies, with 40.8 GiB free memory observed beforehand and no parallel heavy build. This supersedes the original statement in [the pin review](CORE-ROSTER-PIN.md) that the full check had not been rerun.

Local qualification also passed 12 configuration tests, 156 focused receiving/first-chat/containment tests, changed-file ESLint/Prettier, scoped strict TypeScript and whitespace checks.

The exact strict `ABORT`/`set -e` recipe completed all required gates before its image push:

- 12 configuration tests and 401 selected preview/Meri compatibility unit tests; full web typecheck with a 4 GiB heap, lint and architecture checks.
- Client-query and Modules preview-hub unit checks; Portfolio calendar/recovery/receipt/browser cases (11), Settings pending/Team cases (7), focused Planner/Explorer/Workspace cases, Elements qualification, Meri new-conversation and selected compatibility cases, and facility/profile/work-boundary/document cases.
- Next production build, standalone production tests, immutable Dockerfile/resource-transform hash checks, Docker image build and unconfigured container smoke. The smoke required held APIs to return 503; no runtime/private bindings were injected.

Evidence for later gates is terminal success under the exact fail-on-error recipe plus selected console observations. A complete console transcript is not published here; no new broad test suite or cloud build was run to prepare this documentation.

The managed build resolved Node **24.21.0** and npm **11.7.0** on `aws/codebuild/standard:8.0`, `BUILD_GENERAL1_LARGE`. The container base was pinned to `node:24.21.0-alpine3.23@sha256:9ec4a2e289874ed0d722e1772ec2de45d2801541db8612f3638b26f128c69ac2`. Managed image/runtime resolution is mutable, so this is not a bit-reproducibility claim. The resource-only temporary Dockerfile used a 4 GiB heap and the `CIRCLE_NODE_TOTAL=2` build-worker setting, which is not a two-vCPU quota; source/dependency inputs were unchanged.

## Scope and remaining gates

The build used the frontend USD2 allowance within Neo's approved USD6 Core/frontend request at 20:21 UTC. Estimated frontend compute is USD0.20 at the retained USD0.02/minute rate rounded to ten minutes; this is an estimate, excludes storage/logs and Core, and is not an invoice. No further paid build is authorized by this receipt.

The scan result describes this exact digest at the recorded time. It does not qualify live authentication, Core/Meri authority, native sessions, selected-client visibility or meeting writes. No CloudFormation change set, task registration, service update, route activation, deployment or merge was performed by this documentation task. The image-only option and its material fixed-roster availability tradeoff are in [the deployment and rollback proposal](FRONTEND-IMAGE-ONLY-PROPOSAL.md).

Publication includes public source/image/build identifiers and selected public configuration only. It omits private client identifiers, credentials, secret references, raw environment payloads, idempotency tokens and local paths. Core's separately reported candidate scan blockers remain with the Core owner; this frontend receipt does not clear them.
