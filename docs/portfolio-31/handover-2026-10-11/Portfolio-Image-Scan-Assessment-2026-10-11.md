# Portfolio preview image scan assessment

Checked 2026-10-11 in AWS account `967807252336`, region `us-east-1`.

## Deployed clean image — 18:51 UTC

Exact merged app source `abb4c72ee5775f64fca78341e067834d604fdc2f` passed CodeBuild `capiro-portfolio-preview-build:79033deb-a47f-42cb-85ad-5b49f36e4913`: SHA/S3 version binding, TypeScript, lint, format, architecture, 728 unit and 459 browser tests, Next production build, Linux Docker build, non-root container smoke, push and ECR digest read-back. Digest `sha256:81e4e6e3662481fed23c3868b15dc6402802297ba18b603104607ae005b0a00c` scanned **COMPLETE** at 18:36 UTC with finding counts `{}` and **zero findings**. The isolated Portfolio ECS task uses that exact digest and is healthy. Clerk allowlist, traffic DNS and signed-in acceptance remain pending.

## Earlier clean branch image — 17:38 UTC

Runtime source `a1a1c09016f4c778b2c39dc4b0cfbb3f139a465d` changed only the isolated preview image base to pinned Node 24.21.0 Alpine 3.23 and installed Alpine zlib `1.3.2-r1`. The full CodeBuild log confirms the upgrade from `1.3.2-r0` and successful exact-source/version checks, static gates, 728 unit and 459 browser tests, production and Linux builds, non-root container smoke, push and digest read-back. Build `capiro-portfolio-preview-build:288c6d1d-30d3-4ff7-8378-7d76c1117b91` **SUCCEEDED**. ECR digest `sha256:7c1b10100a566fb6ce179ec480ea73e833e2c71c8af64db11439b3099f55e4aa` has scan status **COMPLETE**, finding counts `{}`, and **zero findings**. [Alpine's 3.23 zlib package index](https://pkgs.alpinelinux.org/package/v3.23/main/x86_64/zlib) lists `1.3.2-r1`.

**Disposition for this exact digest: image-scan gate PASS.** It does not authorize ECS deployment by itself. Draft PR #4 remains unmerged, and the service/Clerk/DNS and signed-in acceptance gates remain open. The older Debian digests below retain their HIGH finding and are not release candidates.

## Earlier Debian finding and disposition

ECR's completed basic scan of the first Linux image, source
`dacd18446e6585ebdaec7bc186277c63269c5e36`, digest
`sha256:3e513ef137b39e4d5c2650ef853549a79108d6cc5e6818992c83051c42e7ac10`,
reports **one HIGH finding**: `CVE-2026-85091` in Debian trixie zlib
`1.3.dfsg+really1.3.1-1` (CVSS 4.0 base score 8.3). No preview ECS task or
traffic DNS record was created. The corrected exact-source build on `8a41286`
SUCCEEDED. Its new image digest
`sha256:9d9dfee999cb8586cf8e5cc0b74875f1152cfd2f390256b1cb4baab55a4970c3`
also scanned COMPLETE with **one HIGH `CVE-2026-85091`**. No preview service,
traffic DNS or signed-in test was activated.

The published CVE description names upstream versions 1.3.1.2–1.3.2 and a
`gz_vacate()` path introduced after 1.3.1. That is insufficient to dismiss the
finding: the [Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-85091)
currently marks trixie vulnerable, and the [Debian bug discussion](https://bugs.debian.org/1146895)
records a reported reproduction of a related overflow on older versions. On
5 October, Debian security explicitly declined to mark trixie unaffected while
the scope is resolved. [Ubuntu's advisory](https://ubuntu.com/security/CVE-2026-85091)
also calls its zlib releases vulnerable with a deferred fix.

**Historical disposition: BLOCKED for those Debian image digests.** A vendor-fixed package,
reviewed equivalent base/runtime, or a documented security-owner adjudication is
needed before ECS deployment. This note is an evidence record, not a waiver.

## Build-result distinction

The first S3-source CodeBuild job completed the unit, browser, production-build,
Docker-build and push commands, but its overall status is **FAILED** because
the final ECR readback lacked `ecr:DescribeImages`. The build role now has that
repository-scoped read permission. The full job on `4f2a082` passed the static,
unit, browser, Next and Docker stages, then failed its container smoke before
image push because the script requested `/api/core/clients` rather than the
actual `/api/backend/core/clients` route. Diagnostic jobs confirmed the image
starts as UID 1000, `/healthz` returns HTTP 200, and the setup/sign-in pages
render. The smoke URL is corrected in `8a41286`; job
`322ee417-3874-4c38-85a6-948f2c90ff45` SUCCEEDED: 728 unit, 459 browser,
Next production and Linux image builds, corrected container smoke and ECR
digest read-back. The new ECR scan independently confirms the HIGH finding.
The Debian build was green, but those image digests remain **BLOCKED**. The
current Alpine digest above clears this scan gate.
