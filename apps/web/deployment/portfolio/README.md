# Unified Capiro preview image

This directory owns the one shared Capiro frontend preview image. Read the current
[reviewed build contract](../../../../docs/integration-20261012/SHIPPING-CONTRACT.md)
and exact-source qualification receipt before shipping. Its templates do
not alter the existing `capiro-dev` cluster, shared Capiro ALB/listener,
`os.capiro.ai`, or backend services. The source continuation requires an
owner-visible AWS step before shipping an image or creating resources.

## Isolated configuration successor

The source-only preview profile now follows backend
[PR2483 at 0f1e663d](https://github.com/neo-capiro/capirov2/pull/2483).
Core `/api`, Workspace `/workspace-api` and Intelligence `/intel-api` target
`https://portfolio-preview.app.capiro.ai`. Their backend services remain held
at zero capacity. Strategy, Onboard and Meri are explicitly unconfigured, with
Meri workflow flags false. These targets are not evidence of live availability.

`preview-config.mjs` reads one explicit local JSON file containing exactly
`clerkIssuer`, `clerkApplicationId`, `clerkPublishableKeyArn`, `clerkSecretArn`
and `clerkKeyArn`. Supply only owner-verified public metadata from the designated
preview Test Clerk application. No live bindings are supplied by this repository.
Do not put credential values in this file.

```sh
node apps/web/deployment/portfolio/preview-config.mjs --help
node apps/web/deployment/portfolio/preview-config.mjs --bindings /absolute/path/to/verified-public-metadata.json
```

The command prints a local configuration proposal with all nine configuration
parameters explicit. `--parameters FILE` additionally validates a candidate
JSON parameter array against those exact values. It rejects missing values,
duplicates, overrides and `UsePreviousValue`; it never merges ambient environment
values or reads AWS/secret contents. Output is not a complete apply request.
Image, certificate and ingress review remain with the shipping owner.

The service template constrains the same preview parameters and disables the
unavailable services. Existing IAM, network and secret-reference wiring remains
unchanged. A namespace-valid reference cannot prove its secret payload contains
the matching `pk_test`/`sk_test` keys or belongs to the declared application and
issuer. Those checks, backend/auth/data isolation and all activation remain held.
Do not retain a previous production-bound parameter or restore a production URL
to make the preview work. Authentication implementation is unchanged.

The [11 October handover](../../../../docs/portfolio-31/handover-2026-10-11/HANDOVER.md)
records `Capiro-Portfolio-Preview-Service` as deployed, with one healthy task at
revision 2. The admitted image was
`sha256:81e4e6e3662481fed23c3868b15dc6402802297ba18b603104607ae005b0a00c`
and its recorded scan had zero findings. This supersedes the older pre-deployment
running log. **These are historical observations; re-read current state before
any AWS mutation.** The handover records no preview DNS alias and no signed-in
acceptance.

## Source and runtime ownership

The build context is the **repository root**, with a single active workspace
lock. Run local preparation from that root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm exec --workspace @capiro/web -- playwright install --with-deps chromium
node apps/web/deployment/portfolio/qualify-elements.mjs "$(mktemp -d)/elements"
npm run test:browser -- --workers=3
npm run test:browser:modules
npm run build
npm run test:production
docker build --pull --platform linux/amd64 -f apps/web/Dockerfile -t portfolio-preview:review .
bash apps/web/deployment/portfolio/smoke.sh portfolio-preview:review
```

The pinned Node 24 Alpine image and zlib package retain the previously reviewed
runtime choice. Run a fresh image scan; previous findings do not establish a new
digest's status. Standalone output includes `apps/web/server.js`, public assets
and static chunks. The container starts as UID 1000 on port 5188 and serves Portfolio directly at `/`. `/healthz` is process health. The smoke check
covers the canonical root and all mode/Settings/calendar/sign-in routes, headers and both fail-closed API boundaries; it
does not establish signed-in service access.
Each HTTP probe has a two-second connection deadline and a five-second overall
deadline, including each attempt in the bounded readiness loop. A stalled
container response therefore cannot leave the smoke waiting indefinitely.

`npm run test:production` first assembles public assets and static chunks beside
the built Next standalone server, then checks that server on loopback port 5188.
It verifies route status and security headers, fail-closed unconfigured routing,
the canonical Portfolio root, and real Next navigation from the existing
Meri entry to Portfolio and back in desktop/phone and light/dark modes. The
navigation checks retain the same document, verify that Portfolio styling is
removed on return, and capture the setup wordmark after its image loads. They
also click the actual Portfolio link in the shared product header. The command
explicitly clears application credentials and service origins for its
local child server; it does not test a signed-in deployment. Results and four
screenshots go to `apps/web/test-results/production-standalone`, or to the output
directory supplied after `npm run test:production --`.
Use `npm run test:production -- --help` for invocation details. Exit 0 means the
checks passed, exit 1 means qualification failed, and exit 2 means invalid
arguments or missing build output. Individual browser waits and navigation have
finite deadlines; the browser probe also has a 120-second limit. The runner
terminates its probe and server on failure before exiting.

## Existing resource inventory from the handover

| Resource | Recorded identity |
| --- | --- |
| Account / region | `967807252336` / `us-east-1` |
| Registry stack | `Capiro-Portfolio-Preview-Registry` |
| ECR repository | `967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview` |
| Build project | `capiro-portfolio-preview-build` |
| Source bucket/key | `capiro-portfolio-preview-source-967807252336-us-east-1` / `inputs/portfolio-source.zip` |
| Service stack | `Capiro-Portfolio-Preview-Service` |
| ECS cluster / service | `capiro-portfolio-preview` / `capiro-portfolio-preview` |
| Certificate stack | `Capiro-Portfolio-Preview-Certificate` |
| Preview hostname | `portfolio-preview.app.capiro.ai` |
| ACM certificate | `arn:aws:acm:us-east-1:967807252336:certificate/edcc6113-12f5-4154-bfdf-64c7da1037cd` |

Do not assume a previous machine's CLI profile, source archive, credentials,
ingress address or cached AWS reads are available or current.

## Exact-source update sequence

1. Record the clean source commit, integrated check results and reviewed UI
   evidence. Check current remote branches and separate authors' work before
   publishing the frontend change. No backend service change is required by the
   source consolidation.
2. With the owner's authenticated CLI, read identity and the exact named preview
   stack, ECS service/task, ECR image/scan, build project, source versioning,
   certificate, ingress and DNS state. Review the existing Clerk hostname state
   separately. Retrieve metadata only; do not print secret values.
3. Prepare an archive of the committed **repository root** with a
   `source-commit.txt` containing that commit SHA. Upload it only to the existing
   versioned source key after the shipment step is authorized. Record its S3
   version and pass that exact version and SHA to CodeBuild.
4. The buildspec is now
   `apps/web/deployment/portfolio/buildspec.yml`. Use this as an explicit build
   override for the existing project, or review a project-template update. The
   build verifies source SHA and S3 version, runs the root checks, both browser suites, fresh UI provenance/SSR, build
   and standalone production navigation check,
   builds and smokes the Linux image, then pushes the SHA tag and reads back its
   digest. The bounded build role can read its source, write logs and push/read
   this ECR repository; it does not update ECS or DNS.
5. Read back the exact ECR digest and a completed scan. Review the preview-only
   service change set with that immutable digest and the explicit configuration
   proposal above. Independently verify the dedicated Test Clerk references and
   preview backend bindings; preserve narrow ingress and unrelated parameters.
   `TrackerBackend=intelligence` is the owner's confirmed preview choice. Do not
   deploy by mutable tag or silently change existing service configuration.
6. Execute only the reviewed preview update. Verify stack completion, ECS steady
   state, task digest, healthy `/healthz`, logs and existing backend routing.
   Record both the new digest and the previously running digest for rollback.
7. If still missing, the exact preview Clerk hostname and Route 53 alias require
   the owner-visible auth/DNS step before signed-in acceptance. Preserve a narrow
   owner browser `/32` ingress; do not broaden it to make a test work. Do not
   allocate a paid Clerk satellite or redirect the shared Capiro hostname.
8. Verify HTTPS, sign-in, tenant selection, read-only Portfolio flows and the
   audit's actual acceptance conditions. Provider sends, billing changes and
   customer-record mutations require their own existing authorization.

## Restart and rollback

The preview has already been created according to the handover; do not blindly
recreate stacks on a new machine. The first AWS operation is a fresh read of the
named resources and caller identity. Any missing authentication should be
resolved with the owner's CLI login flow, without copying credentials into Git,
images, shell history or documentation.

For an image regression, prepare a preview-only change set restoring the last
verified digest and prior configuration, then verify health and task identity.
If this shipment introduced a preview DNS alias, preserve its prior state for
rollback. Deleting resources or changing shared routing is not an automatic
rollback action. Keep diagnostics and exact source/image references.
