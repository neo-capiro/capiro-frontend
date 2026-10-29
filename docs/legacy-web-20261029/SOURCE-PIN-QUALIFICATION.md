# Legacy 8080 Web consumer: exact source pin record for `ee470d7d`

This record exists so the backend artifact gate
(`scripts/lib/frontend-standalone-artifact-contract.mjs` in
`neo-capiro/capiro-backend`) can pin a source entry for the frontend revision the
legacy `capiro-dev-web` / `capiro-dev-web-vnext` containers are being rebuilt
from. It is a **source pin record**. It is not product, runtime, serving or UI
acceptance.

## Pinned source

| Field | Value |
| --- | --- |
| Repository | `neo-capiro/capiro-frontend` |
| Commit | `ee470d7d44b811dc84d147c62a3eab7c9b5be09f` |
| Tree | `cc7168bd5277517e2a0bf9e89ff61b9f459299c4` |
| Parent | `2bcf4948436f27a078d1e4ea8769871a5258f9b9` |

## Accepted producer for this commit

The legacy 8080 artifact is **extracted from the already-qualified primary
frontend image**; it is not rebuilt, recompiled or relabelled. The accepted
build of this exact source produced:

| Field | Value |
| --- | --- |
| Producer project | `capiro-portfolio-preview-build` (ARM64, S3 source) |
| Source archive SHA256 | `6634b3abc738b5d0c50e1d808fb10f4e7ea67981c83127dbdff7823f0143288c` |
| S3 source version | `2yHi6FRdT1VBthvkKA9fpJG_SW3fHoHl` |
| Build ID | `capiro-portfolio-preview-build:8fdba557-e859-49ec-a8f4-fcfd137fb090` |
| Build status | `SUCCEEDED` |
| Image | `capiro/portfolio-preview@sha256:983eb6d99feb25e664a0a2f14244d60e906f12f88a3a262b27519ffbed53f930` |
| Image tag | `ee470d7d44b811dc84d147c62a3eab7c9b5be09f` |
| ECR scan | `COMPLETE`, `findingSeverityCounts` empty |
| Container smoke | passed (producer smoke on the 5188 image) |

That image's `/app` is the standalone root
(`apps/web/server.js`, `apps/web/.next/**`, `node_modules`, `apps/web/public/**`),
so the 8080 consumer's artifact rootfs is that same `/app` tree. The 8080
consumer image is still built, smoked and scanned separately from the 5188
image; the only shared input is the qualified frontend bytes.

## Facts verified against this commit (read only, no build)

1. Tree identity: `git rev-parse ee470d7d^{tree}` returned the tree above in a
   clean clone of the canonical GitHub repository on 2026-10-29.
2. Newsletter public assets: `apps/web/public/newsletter` contains 179 regular
   files whose SHA256 and lengths are byte-identical to every entry of
   `canonicalNewsletterManifest()` in the backend
   (`scripts/lib/newsletter-static-release-contract.mjs`), 179/179, total
   `486014` bytes, no extra or missing path. That check was executed against the
   checked-out commit, not against a summary.
3. `apps/web/next.config.ts` sets `output: "standalone"`, `distDir` defaults to
   `.next`, and `outputFileTracingRoot` is the repository root, so the produced
   `required-server-files.json` has `config.output === "standalone"`,
   `relativeAppDir === "apps/web"` and `serverEntrypoint === "apps/web/server.js"`
   as the artifact manifest requires.
4. `apps/web/Dockerfile` assembles that layout at `apps/web/.next/standalone`
   (+ `public`, `.next/static`) inside the image, and its runtime stage sets
   `PORT=5188`, `HOSTNAME=0.0.0.0`, `USER node`. The backend consumer recipe
   re-declares the port as 8080 and copies the same extracted bytes; no other
   frontend change is required and none is made.
5. The published primary frontend image for this revision is
   `capiro/portfolio-preview:ee470d7d44b811dc84d147c62a3eab7c9b5be09f`, digest
   `sha256:983eb6d99feb25e664a0a2f14244d60e906f12f88a3a262b27519ffbed53f930`
   (read-only ECR tag listing on 2026-10-29), and that tag is the one recorded by
   the accepted build above.

## Withdrawn proposal

An earlier revision of this change added an export-only
`standalone-artifact` Dockerfile stage to `apps/web/Dockerfile`. It was
withdrawn: using it would have required a **new frontend compilation** whose
bytes are not the accepted producer, and it would have needed a source commit
that is not the pinned revision. The extraction path above uses the qualified
image instead, so the Dockerfile is unchanged from `ee470d7d`.

## Not established by this record

- No standalone artifact or manifest has been produced or admitted yet for this
  consumer; the backend gate still verifies the assembled bytes.
- Native musl / ARM64 runtime compatibility of the extracted tree is declared
  (`linux/arm64`, `musl`, Node 24) and is checked in the build job, not proven
  here.
- Local container serving, `capiro-dev-web` (ALB default, 8080) and
  `capiro-dev-web-vnext` (os.capiro.ai, 8080) route/auth/proxy/MCP behaviour,
  authenticated browser behaviour and visual/UI acceptance are all unverified.
  Runtime configuration is resolved per request (`apps/web/src/app/layout.tsx`
  awaits `connection()` and passes `readCapiroConfig(process.env).publishableKey`
  down), so the deployed image needs the app's own variable names at runtime: the
  Clerk publishable/secret pair and `CORE_API_BASE_URL` are required;
  `STRATEGY_API_BASE_URL`, `WORKSPACE_API_BASE_URL` and
  `INTELLIGENCE_API_BASE_URL` enable those features; Onboarding stays excluded,
  so `ONBOARD_API_BASE_URL` is neither required nor enabled. The legacy task
  definitions supply different names (`API_BASE_URL`, `WEB_SURFACE`,
  `CLERK_PUBLISHABLE_KEY`), so a cutover needs that explicit mapping — it is not
  implied by a healthy `/healthz`.
