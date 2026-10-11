# Portfolio AWS CLI preview readiness

> Historical chronological record. For the current deployment state and restart instructions, read [HANDOVER.md](./HANDOVER.md). Earlier sections below describe pre-deployment checkpoints and must not be treated as the live state.

Checked 2026-10-11 in account `967807252336`, region `us-east-1`. Identity before AWS writes: `arn:aws:iam::967807252336:user/hermes-cli`. Shared Capiro policy: `capiro-agent-ops@b32b4803933760dc0a93fffdcd8fba30a89c3aac`, machine map revision `2026-09-30T00:21:48.2698715Z`.

**Current status at 18:51 UTC: preview service healthy; Clerk allowlist and traffic DNS pending.** [PR #4](https://github.com/neo-capiro/meri-greenfield/pull/4) merged at `abb4c72ee5775f64fca78341e067834d604fdc2f`. A one-line ECS template correction merged as [PR #5](https://github.com/neo-capiro/meri-greenfield/pull/5) at `97d0e7ffa8626ac38b3fa88371fc395acfd2975d`. The existing `os.capiro.ai` application, ALB, listener, ECS service and backend remain untouched.

## Current service read-back — 18:51 UTC

- Exact merged app source `abb4c72` passed CodeBuild `79033deb-a47f-42cb-85ad-5b49f36e4913`: static checks, 728 unit, 459 browser, Next and Linux Docker builds, non-root smoke, ECR push and digest read-back. Image `sha256:81e4e6e3662481fed23c3868b15dc6402802297ba18b603104607ae005b0a00c` scanned COMPLETE with zero findings.
- The first reviewed service change set rolled back because `PreviewService` omitted `TaskDefinition`. CloudFormation reported that exact ECS error; it removed its newly created resources. PR #5 added `TaskDefinition: !Ref PreviewTaskDefinition`, and the replacement change set was reviewed with 21 adds and explicit `TrackerBackend=intelligence`.
- `Capiro-Portfolio-Preview-Service` is `CREATE_COMPLETE`. ECS `capiro-portfolio-preview` has desired/running 1/1 and reached steady state. Its target group reports one **healthy** target on port 5188. ALB DNS: `Capiro-Previ-6bbPz0Y2cqPc-1570175071.us-east-1.elb.amazonaws.com`; hosted zone `Z35SXDOTRQ7X7K`. HTTPS `/healthz` returned 200 with certificate verification 0; `/sign-in` returned 200 and an anonymous core proxy read returned 401.
- The production Clerk `portfolio-preview.app.capiro.ai` allowed subdomain has **not** been added, and Route 53 has **no** preview A alias. Signed-in read-only acceptance has **not** run. The Computer Use skill requires action-time confirmation before its UI access change; that confirmation is pending. The approved preview base estimate remains about $37.57 per 720-hour month plus usage.

## Historical foundation — 17:43 UTC

## Verified foundation

| Resource | AWS read-back |
| --- | --- |
| Source | Runtime `a1a1c09016f4c778b2c39dc4b0cfbb3f139a465d`; documentation head `bb6f51e93ba07da892bab5df659858985c4f6d38` on branch `codex/portfolio-continuation-20261011`, pushed to draft PR #4. The later commit records read-backs and Bill Tracker choice only. |
| ECR | `Capiro-Portfolio-Preview-Registry` CREATE_COMPLETE; immutable, scan-on-push `capiro/portfolio-preview`. |
| Build | `Capiro-Portfolio-Preview-Build` UPDATE_COMPLETE; scoped S3 source, logs and ECR actions. Full job `288c6d1d-30d3-4ff7-8378-7d76c1117b91` SUCCEEDED against exact runtime SHA `a1a1c09` and S3 version `gCC4XHjWoNddzB_MOH6SRN1ZCwXODWbv`. |
| TLS | `Capiro-Portfolio-Preview-Certificate` UPDATE_COMPLETE; ACM `arn:aws:acm:us-east-1:967807252336:certificate/edcc6113-12f5-4154-bfdf-64c7da1037cd` ISSUED and DNS validation SUCCESS for `portfolio-preview.app.capiro.ai`, unused by any listener. |
| ECS/traffic | `service.yml` validates but is NOT DEPLOYED. No Portfolio ALB/service/task or preview A/AAAA record. |
| Clerk | Production primary domain `app.capiro.ai`; allowed subdomains enabled. `portfolio-preview.app.capiro.ai` was accepted in the dashboard input but not submitted. No Clerk setting was changed. A sibling-domain satellite would cost $10/month and was not added. |

The current source archive is ZIP SHA-256 `7c5ba58b1160b68206adfe56af50b9324e28032b9f2b1a2f9b6b864b769b605d` (769 entries, integrity check clean). S3 metadata and version were read back. The build independently checks the embedded source SHA and S3 version before running tests. No secrets were included in the archive.

For the approved merge, isolated combined-tree commit `3d5da2f579e0f1c8819801ca4196e7191e848527` was built from versioned S3 source. Its full CodeBuild `abf4474f-cfcc-4db9-b0d4-28d7de6e3a01` **FAILED** at browser test 2 of 459 because the test asserted a delayed request before interception; final tally was 458 pass, one fail. This did not push an image. Source PR head `d0ebe0f622eb3bb4a015ee8b872f4ca1a758e366` and new isolated merge `5489efa05555feceaf8d6925d4fd6fcfb120e2a2` correct the test timing. Focused ten-repeat build `ab0a9084-6612-46b6-9abf-c667bf133ff3` is in progress, followed by a required full rerun. The successful branch image above remains clean, but no combined-tree image is admitted or deployed yet.

## Build and image gate

The first S3 CodeBuild run, source `dacd184`, passed 728 unit cases, 459 browser cases, Next production compilation, and Docker build/push; it **FAILED overall** on final ECR read-back because the role lacked `ecr:DescribeImages`. That permission is now repository scoped in the deployed build stack. Its image digest `sha256:3e513ef137b39e4d5c2650ef853549a79108d6cc5e6818992c83051c42e7ac10` scanned COMPLETE with one HIGH `CVE-2026-85091` zlib finding.

The next run, source `4f2a082`, passed those tests and image build, then **FAILED** before push because the smoke script called the wrong proxy path. Separate diagnostics confirmed UID 1000, `/healthz` HTTP 200, and setup/sign-in pages HTTP 200. Source `8a41286` corrected the path to `/api/backend/core/clients`. Its full run **SUCCEEDED**: TypeScript, lint, format, architecture, 728 unit tests, 459 browser tests, Next production build, Linux Docker build, container smoke and ECR read-back. Immutable image digest: `sha256:9d9dfee999cb8586cf8e5cc0b74875f1152cfd2f390256b1cb4baab55a4970c3`. The completed scan again reports **one HIGH `CVE-2026-85091`**. See [scan assessment](./Portfolio-Image-Scan-Assessment-2026-10-11.md).

Runtime source `a1a1c09` pins Node 24.21.0 Alpine 3.23 and upgrades zlib from `1.3.2-r0` to vendor-fixed `1.3.2-r1`. Diagnostic job `3ac43c17-9161-42e7-ac29-bc4cefb555fa` passed image build and container smoke. The full job `288c6d1d-30d3-4ff7-8378-7d76c1117b91` **SUCCEEDED** with exact source/version checks, static checks, 728 unit tests, 459 browser tests, Next production build, Linux Docker build, non-root container smoke, push and ECR read-back. Immutable digest: `sha256:7c1b10100a566fb6ce179ec480ea73e833e2c71c8af64db11439b3099f55e4aa`. ECR scan status is **COMPLETE with zero findings**. The old Debian images remain ineligible; this new image clears the image-scan gate. See [scan assessment](./Portfolio-Image-Scan-Assessment-2026-10-11.md).

## Original activation checklist — historical

1. Review and merge PR #4 through the shared release process. Capiro policy prohibits deploying unmerged or unverified code. GitHub reports no checks for this draft PR; CodeBuild evidence is separate.
2. Confirm the production Clerk publishable/secret references, backend issuer/JWT trust, `capiro-internal` tenant scope and browser source IPv4 `/32`. Read-only metadata confirms the existing public and secret references use the same KMS key; no value was read. The owner selected Intelligence for Bill Tracker, so pass `TrackerBackend=intelligence` explicitly, with no fallback. Keep key values in Secrets Manager and out of source/logs.
3. Review exact service change set and metered ALB/Fargate cost. Deploy the separate service only after the source/authorization gates, by the clean image digest. Verify ECS health and logs, then allowlist the exact Clerk subdomain and add its Route 53 A alias. Verify HTTPS and signed-in read-only flows before any write acceptance.

The service template requests one continuously running 0.5 vCPU/1 GiB Linux Fargate task, one ALB, and public IPv4 for task egress. At current US East pricing, the base calculation is about **$37.57 per 720-hour month**: $17.77 Fargate compute, $16.20 ALB hours, and $3.60 for one task public IPv4. ALB LCUs, any additional chargeable public addresses, logs, data transfer and taxes are extra; actual usage can vary. Pricing sources: [AWS Fargate](https://aws.amazon.com/fargate/pricing/), [Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/pricing/), [Amazon VPC public IPv4](https://aws.amazon.com/vpc/pricing/).

## Original service change set — historical

After confirming AWS identity `arn:aws:iam::967807252336:user/hermes-cli`, CloudFormation validated `service.yml` and created change set `portfolio-preview-a1a1c09-intelligence-review` for `Capiro-Portfolio-Preview-Service`. It is `CREATE_COMPLETE` and `AVAILABLE`, with 21 proposed `Add` resources, including one isolated VPC, two subnets, ALB/listener/target group, ECS cluster/service/task, scoped IAM roles, log group and health alarm. It references the clean image digest, issued certificate, matching Clerk secret ARNs/KMS key, and explicit `TrackerBackend=intelligence`. The provisional ingress was restricted to that CLI host's observed public IPv4 `/32`; another machine must verify its own authorized browser source. At this *historical checkpoint*, the stack remained `REVIEW_IN_PROGRESS`, there was no `capiro-portfolio-preview` ECS cluster, and Route 53 had no A/AAAA record for the preview hostname. The change set had **not** yet been executed.

The owner offered to sign in when a preview URL exists. None exists yet. CSV import is excluded by direct owner instruction. Portfolio has 337 in-scope rows still open, seven packet exclusions pending reconciliation and zero rows accepted.
