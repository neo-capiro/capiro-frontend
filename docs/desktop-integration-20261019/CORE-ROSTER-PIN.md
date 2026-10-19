# Core roster pin successor

The frontend roster source contract advances from `b97a3286487abcda6a7424cf1dc2812d93b65b3d` to settled Core candidate `50475125275853299798fc40f8cb119f0b865464` (tree `c01138fed2e0e89e50f0f54f35c0ff4d4415c9b4`). The Core owner confirmed on 2026-10-19 that no successor is pending. [Public binding metadata](CORE-ROSTER-PIN.json) records deployment intent only; its runtime source and digest remain null.

## Source comparison

The previous pin is an ancestor, three commits behind the candidate. Core-owner review and an independent frontend review compared Git blobs and the shared middleware diff. These critical files are byte-identical between pins:

| Core path under `apps/api/src/` | Identical Git blob |
| --- | --- |
| `clients/clients.controller.ts` (including list DTO) | `1cc091440f3ef42f60a639c04885cfa8a1799575` |
| `clients/clients.service.ts` | `3ac426cfbe61d84fd0ce01cf23d85e28bb90a756` |
| `auth/preview-native-read-mode.ts` | `97af7e528045ee2fd3d65178c750758e0d5f67f0` |
| `auth/core-roster-preview-http-gate.ts` | `cc495960735e76c4336db801ffc012e9fb33afdb` |
| `auth/preview-native-read.service.ts` | `39cd537a385b4795353efd75ebf6b52cfcf0ebd7` |

Clerk verification, current membership, request authority, client-wall helpers, configuration schema and Prisma schema also have identical blobs. The unchanged roster gate requires both Core flags and exact origin-form `GET /api/clients` on `core-roster-preview.capiro.ai`. Query grammar remains bounded and restricted; archived-inclusive access is refused. The same response construction, tenant/client visibility predicates, native session verification and before/after membership checks remain in place.

`tenant/tenant-context.middleware.ts` changes from blob `5fd5ccc806ff70131141835e5bf36596beba0696` to `af6202689dee19ffad26450a9368133e571e5026`. Its roster first branch, `usePreviewNativeRead()` and `readApplicationAuthority()` are unchanged. The delta adds unmounted history-release support and an optional transaction parameter to local identity reads; existing roster callers omit it and retain the same `withSystem` behavior. This comparison establishes source compatibility, not runtime acceptance. Core tests were not rerun for this frontend pin change.

## Held activation and preserved scope

The runtime constant, proposal generator, template description and test fixtures use the new pin. The template still allows only an empty roster source, with empty defaults and the existing paired-target rules. Supplying the retired pin is rejected before identity or fetch. Historical `RELEASE-MANIFEST.json` remains unchanged.

Before separately approved activation, qualify the immutable Core image digest and effective serving `RELEASE_SHA` against the exact candidate; prove both `PREVIEW_NATIVE_GETS_ENABLED=true` and `CORE_ROSTER_PREVIEW_ENABLED=true`, exact Host routing/guard/DNS/TLS, and native-session membership/schema checks. A source marker alone is not proof. Then review the explicit template admission and paired frontend environment values in the metadata.

Keep `CAPIRO_PREVIEW_READ_ONLY=true`, legacy read source `6542f5b089656b6d255465edd464d06c2a0b408f` at `https://first-chat-preview.app-dev.capiro.ai/api`, first-chat bootstrap and Meri bindings unchanged. Only the existing `clients.list` operation uses the roster pair; native client/detail and `me` reads retain their legacy target. Other registered operations, nested Portfolio/meeting routes, Modules and Settings APIs remain held. Their admission needs a separate route/schema/auth/dispatch review.

The [initial preview checklist and exact route plan](PREVIEW-FEATURE-CHECKLIST.md) records the Core-confirmed meeting visibility and unchanged-client reassignment blockers. Roster/native reads and truthful UI states are the initial goal; the earlier broader cohorts are not ready for activation.

No build, deployment, migration, route activation or paid action is part of this change. The held archive and recipe prepared for frontend main `5cd5f20d` do not attest to this successor; any later build must seal its own exact frontend commit and inputs.

## Frontend verification

- Node 24.19.0: `node --test scripts/preview-config.test.mjs` passes all 12 tests.
- Vitest with one worker: `preview-read-receiving`, `meri-first-chat-preview-policy` and `preview-backend-containment` pass all 156 tests. These cover retired/drifted pins, parameter drift, native-token and first-chat preservation, and rejection of other registered operations with the candidate roster pair present.
- Changed TypeScript files pass ESLint and Prettier; `git diff --check` passes.
- Strict scoped TypeScript checking of `src/shared/preview/read-config.server.ts` passes (`--noEmit --strict --skipLibCheck --target ES2022 --module esnext --moduleResolution bundler --types node`, 1 GiB heap).
- Full web `tsc --noEmit --incremental false` exceeded the deliberately bounded 2 GiB heap. It was not repeated with a higher limit. Runtime qualification, browser checks and builds were not run for this constant-only change.
