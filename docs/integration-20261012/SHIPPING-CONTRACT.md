# Corrected unified image contract

The source recipe is corrected in the follow-up candidate after failed application
pin `5840b50`. The final qualification receipt identifies the new exact committed
pin; until that receipt and independent review pass, this is not build/deployment
authorization. The previous recipe defects and frozen failure evidence remain in
Git history and `evidence/frozen-qualification-receipt.json`.

## Exact build and output contract

| Item | Contract |
| --- | --- |
| Source/context | Committed repository-root archive; never `apps/web` alone or a dirty worktree |
| Buildspec override | `apps/web/deployment/portfolio/buildspec.yml` |
| Dockerfile | `apps/web/Dockerfile` |
| Docker command | `docker build --pull --platform linux/amd64 -f apps/web/Dockerfile -t "$REPOSITORY_URI:$EXPECTED_SHA" .` |
| Existing repository | `967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview` |
| Image tag | Exact reviewed source commit supplied as `EXPECTED_SHA` |
| Admission identity | Read-back immutable image digest plus completed fresh scan |
| Server | One Next standalone app, `node apps/web/server.js` |
| Runtime | UID 1000, `PORT=5188`, `HOSTNAME=0.0.0.0`, `/healthz` process health |
| Routes | Portfolio `/` (200), compatibility `/portfolio`, Meri `/meri`, Modules `/modules`, Settings `/settings` (307 to `/settings/personal`), retained deep links/calendar/sign-in and narrow APIs |
| Runtime copies | `.next/standalone`, `apps/web/public`, `apps/web/.next/static` at their monorepo paths |
| Build output | ECR SHA tag/digest and logs; existing project uses `NO_ARTIFACTS`, not `imagedefinitions.json` |

Archive `source-commit.txt` must match `EXPECTED_SHA`; `CODEBUILD_SOURCE_VERSION`
must match immutable `EXPECTED_S3_VERSION`. Record the committed archive hash,
S3 version, build ID, tag, digest and scan. An evidence-only commit after a tested
pin remains a distinct archive identity: name it and prove all application,
configuration and build-source bytes match the accepted source.

## Corrected gates and context

The buildspec installs from the root lock with lifecycle scripts disabled, then
runs public package hashes, all workspace types, repository guards, architecture,
transport, lint, formatting and both unit suites through `npm run check`.
`qualify-elements.mjs` downloads only the official esbuild artifacts named by the
unchanged toolchain pins, verifies metadata/archive/executable hashes and archive
integrity before execution, and uses the existing SSR build/receipt verifier.
It creates a fresh external work directory and runs all fifteen provenance/SSR
cases against that receipt. Existing receipts are never silently reused.

Both Portfolio browsers (three workers) and Modules/shared-integration browsers
run before the unified Next build and actual standalone-server smoke. The local
881-case failed run took 36.6 minutes at three workers; the existing CodeBuild
Linux large environment has a 60-minute timeout. Record actual build duration;
a timeout is a failed gate, not authority to drop tests or replay automatically.

The one Linux/amd64 image is built, then the corrected container smoke checks a
canonical 200 root, all product/Settings/calendar/sign-in routes, security headers,
UID 1000 and both unconfigured API refusals. It uses a unique local container and
an ephemeral loopback port, with bounded HTTP probes and cleanup. The obsolete
root redirect and inert `CAPIRO_DEFAULT_PRODUCT` image setting are removed.
Both the buildspec and Dockerfile now use `npm ci --ignore-scripts`.

Docker context excludes generated `.qa` harnesses, dependencies/build outputs,
credentials and archival documentation. Documentation, complete Portfolio context
packs and original history remain in Git and the committed source archive; they
are not runtime dependencies. The pinned Node 24 Alpine base and zlib package are
unchanged. A new container build/runtime result and fresh image scan are required;
local Node 24.19.0 checks do not attest that container's Node 24.21.0 environment.

## Parent-owned shipping boundary

Parent's read-only inventory found the existing CodeBuild project still configured
with `apps/portfolio-web/deployment/buildspec.yml`. The intended shipping action is
one separately approved `start-build`, using an immutable source S3 version and
`--buildspec-override apps/web/deployment/portfolio/buildspec.yml`, leaving project
configuration unchanged. No AWS build is authorized or performed by this source
repair. Parent coordinates independent review of this deployment-source delta.

Parent verified the rollback baseline as one healthy revision-2 task on
`sha256:81e4e6e3662481fed23c3868b15dc6402802297ba18b603104607ae005b0a00c`,
with zero stored scan findings and an issued certificate. Those observations do
not attest the new image. Exact-host A/AAAA/CNAME records are absent; Clerk and
signed-in acceptance remain unverified. DNS/Clerk, service configuration and ECS
updates remain separate explicitly reviewed actions. Preserve existing secret
references, approved service origins, `TRACKER_BACKEND=intelligence`, narrow ingress
and the read-back rollback digest. Never bake credentials into the archive/image.

No push, ECR scan, AWS project mutation, ECS update or deployment occurs here.
All 337 Portfolio native acceptance rows remain open.
