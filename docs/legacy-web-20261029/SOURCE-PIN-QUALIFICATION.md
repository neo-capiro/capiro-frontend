# Legacy 8080 Web consumer: exact source pin record for `ee470d7d`

This record exists so the backend artifact gate
(`scripts/lib/frontend-standalone-artifact-contract.mjs` in
`neo-capiro/capiro-backend`) can pin a source entry for the frontend revision the
legacy `capiro-dev-web` / `capiro-dev-web-vnext` containers are being rebuilt
from. It is a **source pin record**. It is not a product, image, runtime, serving
or UI acceptance.

## Pinned source

| Field | Value |
| --- | --- |
| Repository | `neo-capiro/capiro-frontend` |
| Commit | `ee470d7d44b811dc84d147c62a3eab7c9b5be09f` |
| Tree | `cc7168bd5277517e2a0bf9e89ff61b9f459299c4` |

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
4. `apps/web/Dockerfile` builds that layout at `apps/web/.next/standalone` plus
   `apps/web/public` and `apps/web/.next/static`. The `standalone-artifact`
   export stage added in this change copies exactly those three trees, which is
   the backend artifact `rootfs` layout
   (`rootfs/apps/web/server.js`, `rootfs/apps/web/.next/**`,
   `rootfs/apps/web/public/**`). The stage is declared before `runtime`, so the
   Dockerfile's default image target (`capiro/portfolio-preview`, port 5188) is
   unchanged.
5. The published primary frontend image for this revision is
   `capiro/portfolio-preview:ee470d7d44b811dc84d147c62a3eab7c9b5be09f`, digest
   `sha256:983eb6d99feb25e664a0a2f14244d60e906f12f88a3a262b27519ffbed53f930`
   (read-only ECR tag listing on 2026-10-29). The tag equals the commit by
   producer convention; the digest is not an attestation and no layer or config
   blob was read for this record.

## Not established by this record

- No standalone artifact or manifest has been produced, assembled or admitted
  for this commit under this record.
- The build that produced the 5188 image is not proven to have used exactly this
  source tree; the tag is a declaration.
- Native musl / ARM64 runtime compatibility of the exported tree is unverified.
- Local container serving, `capiro-dev-web` (ALB default, 8080) and
  `capiro-dev-web-vnext` (os.capiro.ai, 8080) route/auth/proxy/MCP behaviour,
  authenticated browser behaviour and visual/UI acceptance are all unverified.
- Tenant, authentication and API contracts are unchanged by a source pin; they
  are qualified only by the owning consumer's runtime checks.

Acceptance of an assembled artifact remains the byte-level gate in
`capiro-backend`: `scripts/lib/frontend-standalone-artifact-contract.mjs`
(manifest, exhaustive inventory, trace closure, canonical Newsletter asset bytes
and the reviewed source pin) plus the backend operator's recorded inputs. This
record only supplies the reviewed source pin.
