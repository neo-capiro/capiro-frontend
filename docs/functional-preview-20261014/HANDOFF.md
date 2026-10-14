# Functional preview using existing services

Neo now authorizes a functional preview for normal existing API reads and writes in his own existing account and tenant, including ordinary login metadata updates. Reuse the existing login and tenant permissions unchanged. Do not add preview-specific authorization or tenant-isolation layers, and do not disable existing protections. This instruction supersedes the earlier zero-write receiving gate **for this selected profile**. PR23/24 and the separate read-only backend work remain preserved.

The latest delegation is `01a12dcb-b1f2-71f1-a0b3-4ae23e65c037`. Backend coordination reportedly could not receive the broader steering twice; this durable handoff records it. The three-GET allowlist, separate preview API, new database login/role, cross-VPC connectivity and Meri activation are **not prerequisites** for the functional preview. No new application implementation is necessary: literal `CAPIRO_PREVIEW_READ_ONLY=false` already selects the ordinary authenticated adapters.

## Smallest shipping input

Use [PROFILE.json](PROFILE.json) as an explicit **container configuration overlay** for the existing preview frontend. It is not a CloudFormation template or a complete task-definition replacement. Keep unlisted environment, secret references, task roles, network, ingress and service settings unchanged. The old `apps/web/deployment/portfolio/preview-config.mjs` and `service.yml` describe the separate Test-Clerk/isolated-backend proposal; they deliberately reject these production references. Do not run that profile generator or apply that resource-creation template for this shipment. Preserve them for their separate work.

| Input                                  | Exact value                                                        |
| -------------------------------------- | ------------------------------------------------------------------ |
| Qualified source / image source marker | `5ca42049325881782bc9d2ac557450d642eccee8`                         |
| Qualified application tree             | `dbd6aebbae52b5ded5611b21c3ff057b881cf92f`                         |
| Runtime source tree                    | `c48305d3d8fa8153fa1c1390950aa24e5281326b`                         |
| Archive publication                    | PR24, `23df0b04fe643ba7ab64395d7a471ddb20172db6`                   |
| Dockerfile / context / platform        | `apps/web/Dockerfile` / archive root / `linux/amd64`               |
| Archive size / files                   | 6,011,816 bytes / 2,566 files                                      |
| Archive SHA256                         | `a94c27e22552602cb79743c1905c7bb21903c811217456165a19d7107a6a5dae` |
| Manifest SHA256                        | `95939674380c457ce05e9e960ebfc7351f4fc3efc14db83c8379fb054f82078d` |
| Immutable image for this source        | None built or verified by this lane; URI/digest unavailable        |

Download the [existing exact source archive](https://github.com/neo-capiro/capiro-frontend/blob/23df0b04fe643ba7ab64395d7a471ddb20172db6/docs/preview-receiving-20261013/build-inputs/preview-receiving-build-inputs-5ca420493258.tar.gz) and [manifest](https://github.com/neo-capiro/capiro-frontend/blob/23df0b04fe643ba7ab64395d7a471ddb20172db6/docs/preview-receiving-20261013/build-inputs/BUILD-INPUT-MANIFEST.json). Local copies are in `/workspace/capiro-preview-receiving-build-inputs-20261013/`. Verify the hashes before extracting into a new empty build directory. Build from that root using the existing reviewed runner and Dockerfile. Runtime configuration and Clerk secrets are injected at startup; no secret values or authenticated service access are needed to build.

This tarball is a **Docker build context**, not a ready-made S3/CodeBuild ZIP: it omits root documentation as permitted by `.dockerignore`, and does not contain `source-commit.txt`. If the existing runner requires a ZIP/source marker, its packaging step must record the exact source SHA above. The repository's broader `buildspec.yml` also runs source checks that can require documentation fixtures; do not substitute the reduced Docker context for a full qualification checkout or silently omit those checks. Keep this distinct from any runner-specific input wrapper and record the wrapper's own hash/version. No duplicate application build or new image was made for this configuration-only handoff.

## Runtime values and provenance

| Variable                    | Selected value                       |
| --------------------------- | ------------------------------------ |
| `CAPIRO_PREVIEW_READ_ONLY`  | literal string `false`               |
| `CAPIRO_DEFAULT_PRODUCT`    | `portfolio`                          |
| `CORE_API_BASE_URL`         | `https://os.capiro.ai/api`           |
| `STRATEGY_API_BASE_URL`     | `https://os.capiro.ai/strategy-api`  |
| `WORKSPACE_API_BASE_URL`    | `https://os.capiro.ai/workspace-api` |
| `INTELLIGENCE_API_BASE_URL` | `https://os.capiro.ai/intel-api`     |
| `TRACKER_BACKEND`           | `intelligence`                       |
| `CAPIRO_EXISTING_APP_URL`   | `https://os.capiro.ai`               |

These existing backend origins are recorded in [the Portfolio checkpoint](../portfolio-31/IMPLEMENTATION-CHECKPOINT.md) and [original handover](../portfolio-31/handover-2026-10-11/references/HANDOVER.md). Core's deployed origin was verified during that implementation; this session has not established current live service routing or availability. Core, Intelligence, Workspace and Strategy remain distinct configured transports. Meri retains its separate public contract, and Modules retains its fixed-operation gateway. All mode links stay within the one frontend; the existing-app URL supports verified legacy deep links.

The exact production Clerk secret/KMS references appear in [PROFILE.json](PROFILE.json), from the [owner's current preview stack readback](../preview-read-only-20261013/OWNER-READBACK-20261013T231557Z.md). They are references, not secret contents or proof of the running service's key pairing. Inject them through the existing secret-reference mechanism, never as literal environment values. The `/dev/` namespace does not mean Test Clerk. There is no staging environment and no new Clerk application requirement. The KMS reference identifies existing wiring; it is not a request to change IAM or key policy.

Unlisted Onboard/Meri variables and workflow flags are not overridden. Their unfinished native contracts stay visible, with no guessed origins or newly enabled paid/provider workflows. They do not block the ordinary Core/backend preview. Read-only receiving variables, if retained, are inactive with literal `false`; no dedicated receiving target/source pin is required. An empty string, `FALSE`, or other malformed read-only value still triggers the existing hold.

## Qualification and limits

The source at `5ca42049325881782bc9d2ac557450d642eccee8` already passed 2,243 web tests, 442 Capiro/feature tests, 111 root controls and 84 transport cases: **2,880 total**. Workspace types, lint, format, public packages, architecture and production build passed. Lint retains 82 warnings in unchanged files; architecture retains 22 inherited size findings and zero blockers. The actual standalone checks recorded 90 HTTP observations and 30 ordinary-mode browser observations with zero page errors. Original failing baselines and corrected failures remain preserved in [PR24 qualification](../preview-receiving-20261013/QUALIFICATION.md). These do not establish native production API behavior.

This handoff changes only root documentation/configuration data. It preserves every application, test, guard, manifest, lockfile and deployment implementation byte from PR24. The supplementary [verification receipt](VERIFICATION.json) records profile validation, archive/Git member equality and focused existing mode tests; it does not relabel earlier results as new runs. No frontend/backend auth, tenant, database or security implementation changed.

No native signed-in calls, live writes, provider sends, paid model calls, billing, secret reads, infrastructure changes, image push or deployment occurred here. Fresh install/container scan and native session/tenant/read-write acceptance remain shipping/runtime checks. No new Figma or full accessibility acceptance is claimed. All **337 Portfolio native rows remain unaccepted** until their own criteria pass.

## Remaining work

There is no frontend source change required to select this profile. Shipping owns the existing runner's clean image build/qualification, immutable digest and scan receipt, then the reviewed update of **only the existing preview frontend service**. Preserve the existing backend services and permissions; do not create a preview API, database role, VPC or credentials for this path.

Current preview DNS, Clerk hostname admission, ingress, running secret bindings and live backend reachability were not read in this environment. If any user-facing access change is actually needed, report its exact target/change for the user's approval; do not infer approval from this configuration packet. Those checks are not a reason to impose a new auth or isolation design.

After identifying Neo's existing account/tenant, use an explicitly identified normal read/write flow and only new disposable test data in that tenant. Do not overwrite existing business records, visit other tenants, change privileges, send provider messages, bill users or run paid models. Existing login metadata updates are accepted. A failing existing API/contract should be reported with its concrete response; do not invent an endpoint, bypass an authorization check or shrink the product to hide the failure.
