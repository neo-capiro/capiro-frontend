# Unified image contract and shipping hold

This is a source review for the parent/shipping owner, not authorization to run
CodeBuild, publish an image, change its project or deploy. No AWS action was made
in this integration session. The application candidate remains
`5840b50ea3a94e766666254600f1c16d26d3860a` (tree
`256bdbdeac97257e5b14d7ff97e44951b6ca7fc5`). Independent application review and the
full Portfolio browser suite are still in progress at this checkpoint.

## Exact source paths and expected output

| Item | Frozen source contract |
| --- | --- |
| Source/context | Archive of the committed repository root, never `apps/web` alone and never the dirty test worktree |
| Buildspec | `apps/web/deployment/portfolio/buildspec.yml` |
| Dockerfile | `apps/web/Dockerfile` |
| Docker invocation | `docker build --pull --platform linux/amd64 -f apps/web/Dockerfile -t "$REPOSITORY_URI:$EXPECTED_SHA" .` |
| Image repository | Existing `967807252336.dkr.ecr.us-east-1.amazonaws.com/capiro/portfolio-preview` |
| Tag | Exact reviewed source commit, supplied as `EXPECTED_SHA`; not a mutable product tag |
| Admission identity | Read-back `sha256` image digest plus completed scan; task configuration must use the immutable digest |
| Application | One Next standalone server, `node apps/web/server.js` |
| Runtime | UID 1000, `PORT=5188`, `HOSTNAME=0.0.0.0`, `/healthz` process health |
| Routes | Portfolio `/` (200), compatibility `/portfolio`, Meri `/meri`, Modules `/modules`, Settings `/settings` (307 to `/settings/personal`), retained deep links/calendar/sign-in and narrow APIs |
| Layers copied | `.next/standalone` plus `apps/web/public` and `.next/static` at their monorepo runtime paths |
| Output artifact | ECR image/tag/digest and build logs; existing project declares `NO_ARTIFACTS`, not `imagedefinitions.json` |

Source binding currently requires an archive `source-commit.txt` matching
`EXPECTED_SHA`, and `CODEBUILD_SOURCE_VERSION` matching `EXPECTED_S3_VERSION`.
Shipping must record the exact committed archive, its SHA256, S3 version, build
ID, image digest and scan. An evidence-only commit after the application pin is
still a different source/archive identity: name it explicitly and verify its
application/configuration bytes against the accepted pin.

Frozen bytes (SHA256):

```text
a3df0a4917e00fbf55915561375feddd21111d6407cbba55c09771e236ea94ea  apps/web/deployment/portfolio/buildspec.yml
d7237440613690d59cd8df22f114105806dbd1f08b6d1c8270667bed9fd033d4  apps/web/Dockerfile
950288123dac977d377ecc65a3421b8f9084f7591c22d657b165b47fdb8e1100  apps/web/deployment/portfolio/smoke.sh
3fc3655d7910fc8c4a350f5f8b37a38e1994713c126da8c0efd10fd24643448a  .dockerignore
```

## Why these bytes are not yet an admitted shipping recipe

1. Parent's fresh AWS inventory reports the existing project still configured
   with `apps/portfolio-web/deployment/buildspec.yml`. The source template uses
   the unified path above. A reviewed one-build override or separately reviewed
   project update is required; source changes alone do not alter that project.
2. `smoke.sh` still asserts a 307 from `/` to `/portfolio`. That contradicts the
   frozen canonical root and would fail before pushing this image. The actual
   standalone-server gate correctly verifies a 200 root and all mode routes.
   The shipping candidate must reconcile this assertion and explicitly exercise
   the unified routes. Do not bypass the smoke failure or restore the old root
   merely to satisfy a stale assertion.
3. The buildspec runs `check`, Portfolio browsers, build and actual-server smoke;
   it omits the 62-case Modules/shared-integration browser command and the
   separately prepared, hash-bound UI provenance/SSR qualification. Either a
   reviewed buildspec must include those gates, or the shipping action packet
   must explicitly bind their completed external evidence to the exact source.
4. Buildspec and Dockerfile install with lifecycle scripts enabled; this local
   qualification used `npm ci --ignore-scripts` per qualification instructions.
   The container environment and pinned Node 24.21.0 Alpine image also differ
   from local Node 24.19.0. Container installation/build, runtime smoke and a fresh
   vulnerability scan remain unrun; local Next success is not container success.
5. `.dockerignore` does not exclude the generated `.qa` directory. An archive
   from `git archive` of the reviewed commit excludes that ignored local harness;
   building from this running worktree could include it. Use committed source
   only. Any additional ignore change is a reviewed source change.
6. The Dockerfile's historical `CAPIRO_DEFAULT_PRODUCT=portfolio` no longer
   selects the root. The canonical root is now source-defined. Do not infer a
   routing or auth configuration switch from that inert environment value.

The pinned base digest and zlib version are retained source choices, not newly
verified CVE or admission claims. Build duration, CodeBuild timeout/capacity,
existing secret references, approved service origins and Clerk hostname handling
need the shipping owner's review against the actual project and task. Preserve
`TRACKER_BACKEND=intelligence` where already approved. Never bake credentials into
the source archive or image.

## Parent-owned next action packet

After the current source gate and independent review finish, review the minimal
shipping-source correction as a separately named candidate. Its action packet
must specify the final source/archive hash and S3 version, chosen buildspec path
or inline override, exact existing project, permitted environment overrides,
completed qualification receipt, expected SHA tag and ECR repository. Request
only the approved single build/image operation. An ECS update, DNS/Clerk change
or project configuration mutation is a separate explicit action with its own
reviewed scope and rollback identity. Preserve the currently healthy revision 2
and its actual read-back digest until that approval.

No image was built, pushed, scanned or deployed here. No shipping configuration
was modified during the frozen application qualification.

Parent's read-only inventory reports the current rollback baseline as one
healthy revision-2 task on
`sha256:81e4e6e3662481fed23c3868b15dc6402802297ba18b603104607ae005b0a00c`,
with zero stored scan findings and an issued certificate. This is not the new
candidate's image or scan. Exact-host A/AAAA/CNAME DNS records are absent; Clerk
and signed-in acceptance remain unverified. The existing build environment is
Linux large with a 60-minute timeout. Parent's proposed shipping action is one
`start-build` with immutable S3 source version and an explicit
`--buildspec-override`, leaving project configuration unchanged. No build is
authorized yet. A path-only override to the frozen recipe still encounters the
smoke assertion and omitted-gate issues above.
