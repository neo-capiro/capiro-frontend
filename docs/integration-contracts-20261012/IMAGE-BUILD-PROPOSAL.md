# Bounded image-build proposal — exact source 2d50edd

Prepared for the designated shipping session. This is a reviewable proposal, not an executed AWS action or deployment approval. The accepted f4e9e1f checkpoint stays intact. Candidate 2d50edd has completed its exact combined offline qualification and has a coordinator-relayed independent bounded source-review pass. The designated shipping owner must review the concrete inputs and remaining release gates before approving any image operation. Native/visual row gaps remain visible in the active ledger; an image build does not accept those rows or authorize rollout.

## Exact material to review

- Source: `2d50edd8f3c5ea232db8e1338566f0667db4b4bd`; tree `d7986d01b5f5aca3a8e4c824556315a82b692e92`; application tree `faf8af48ba71d9152cbd2e2010ddb950fd8e2bfb`.
- Local repository-root archive: `/tmp/capiro-image-proposal-2d50edd/source-2d50edd.zip`; SHA-256 `260808301545f7b7abf6bbd648b70657226b6de49e8edfc8b688bfe329d94c59`; 431,566,703 bytes. All 3,766 tracked files are present, with the exact `source-commit.txt` added. ZIP CRCs pass. Historical evidence remains in the archive; `.dockerignore` excludes it from image context. No upload occurred.
- Exact recipe inputs and hashes: [BUILD-INPUTS.json](evidence/image-proposal-2d50edd/BUILD-INPUTS.json). Root lockfile and runtime image recipe are unchanged from the reviewed integration. Base `node:24.21.0-alpine3.23@sha256:9ec4a2e289874ed0d722e1772ec2de45d2801541db8612f3638b26f128c69ac2`; required `zlib=1.3.2-r1`.
- Existing account/region: `967807252336` / `us-east-1`; source bucket `capiro-portfolio-preview-source-967807252336-us-east-1`, existing versioned key `inputs/portfolio-source.zip`; project `capiro-portfolio-preview-build`; repository `967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview`.

## Proposed bounded effects

After the shipping owner confirms the current identity, source versioning/key, project/role, official package-source access and existing ECR configuration with read-only calls, request approval for one upload to that existing versioned key and one build of that exact uploaded version. Preserve the prior S3 version. No project, role, credential, network, DNS, Clerk, database or ECS change is part of this proposal.

The prepared [start-build.request.template.json](evidence/image-proposal-2d50edd/start-build.request.template.json) sets the corrected buildspec override, exact source SHA and zero automatic retries. Its two S3-version placeholders must be filled from the successful upload/readback, with the same actual version. Amazon S3 CodeBuild sources use the object's version ID; per-run build overrides leave the project definition unchanged. The request's idempotency token lasts five minutes, so a delayed or uncertain response requires a readback before considering another start. [AWS source versions](https://docs.aws.amazon.com/codebuild/latest/userguide/sample-source-version.html), [StartBuild API options](https://docs.aws.amazon.com/cli/latest/reference/codebuild/start-build.html).

The existing buildspec reruns clean source checks, fresh Elements provenance/SSR, all Portfolio and Modules browsers, the unified Next build and actual standalone smoke. It then builds one Linux/amd64 image, exercises the container smoke, pushes only the reviewed SHA tag to the existing preview repository, and reads back its immutable digest. The reviewed recipe runs Portfolio with three workers; this local candidate qualification uses two. The previously read project timeout is 60 minutes; re-read it and retain the bound. A timeout or failed gate is a failed attempt: no automatic repeat, test omission or unreviewed timeout/compute increase.

## Stop conditions and required outputs

The last local official Alpine index probe returned proxy HTTP403 at 08:48 UTC. This proposal does not assume that access has recovered or that a shipping runner has the same restriction. Establish a permitted official source path; do not alter the pinned package/base, bypass TLS/proxy controls, or introduce an alternate mirror. Local Node 24.19 results do not attest the container's Node 24.21 runtime.

Return the archive hash, immutable S3 version, StartBuild request/build ID, all terminal gate results, container UID 1000 / port 5188/health/route-security evidence, exact ECR digest and completed fresh image scan. If the existing repository's configured scan does not complete automatically, stop for the designated shipping owner's bounded scan step. No new digest is admitted on an old image's scan.

The expected output is one reviewed preview image only. Preserve the recorded rollback digest `sha256:81e4e6e3662481fed23c3868b15dc6402802297ba18b603104607ae005b0a00c` as historical context, then re-read the running digest before any later deployment proposal. ECS/service/DNS/Clerk updates, live provider effects and native acceptance are separate actions. None were performed here.

## Coordinated backend release source

The frontend image is paired for future native qualification with capirov2 PR2406 at `243248e726243c44bd4b9d24fd1ed220da18c56a`, tree `d8f01afa7eca0e6571e7ed3669905fea3491bbdd`. See the exact backend RELEASE-MANIFEST and source compatibility review in the integration evidence. The nine unapplied migration sources, prefixed service bases, unchanged flags and shared physical-catalog prerequisites must be coordinated by the designated release owner. No backend deployment or migration is included in this image-build request. Native qualification, full Cleanup acceptance and separately unpublished Engagement reporting remain open.

The local ZIP can be reproduced with [prepare-image-source.py](evidence/image-proposal-2d50edd/prepare-image-source.py). Its exact file count, checksum and source identity are recorded in [ARCHIVE.json](evidence/image-proposal-2d50edd/ARCHIVE.json). The 412 MiB archive itself is not duplicated in Git.
