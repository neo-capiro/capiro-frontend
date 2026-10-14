# Preview API receiving source — native activation held

Frontend receiving branch: `integration/capiro-preview-receiving-20261013`, stacked on PR23 at `6780c114a1d216fa857182a62f9b3610b9d76121`. Original PR23 worktree and publication packet remain unchanged. Backend contract: [draft PR2](https://github.com/neo-capiro/capiro-backend/pull/2), source `111f269d749cae0249c2141779bd6d7deb93f45c`, tree `719c8292fc0c9cf4e8242b8d58efb2d004ad0a1f`.

This is source preparation. There is no configured preview target, native service activation, application image, deployment, auth change, database change or resource creation in this work. Backend native Postgres/RLS/role permissions, actual Clerk session binding and isolated runtime remain unqualified. Do not send these requests to ordinary production Core, including its seemingly read-only routes. Existing preview deployment templates remain unchanged and do not set the new bindings.

## Received contract

Only GET `/api/me`, GET `/api/clients`, and GET `/api/clients/:uuid` exist. HEAD is denied, no health route is defined, and the client ID is a lowercase canonical UUID of version 1–5 and RFC variant. List query accepts `profileStatus`, `sectorTag` and `includeArchived`; the receiver conservatively restricts the last to true/false, rejects duplicate/unknown fields, and accepts no query on me/detail. Client `logoUrl` is null; there is no provider signing call.

The backend owns existing-user/session/organization/tenant membership checks, rejects impersonation, performs all reads in one verified read-only transaction with RLS context and explicit tenant filters, and rechecks authority before releasing a buffered response. Browser client choice and the fixed tenant hint are not authorization. Source tests cannot prove native role grants or atomic revocation after the final ReadCommitted authority query. Read the exact backend handoff and runtime-permissions document before any shipping decision.

Pinned backend document blobs:

- `HANDOFF.md`: `cd806b7fdafd9c216e4f9f792a66a90914c57e33`.
- `INDEPENDENT-REVIEW.md`: `7e9e58228f54b1f1630c46649af11dca4ec90cc4`.
- `RUNTIME-PERMISSIONS.md`: `fcf692c42edb3b8d2f21895caa5d7eb6e1ef5875`.

## Responsibilities and receiving design

`shared/preview/read-config.server.ts` owns explicit server-only target/source binding. `read-route.server.ts` owns the narrow browser-to-backend mapping and reuses the canonical Modules settings operation schemas. `read-proxy.server.ts` owns bounded dispatch/receipt using the existing abort/deadline and bounded JSON receivers. No backend implementation or DTO is copied into runtime code. The existing preview policy remains the first statement in every API handler and in the matched Next API proxy. Only the Core and Capiro entries have a terminal receiving branch; all other service/operation routes remain held. Architecture guards allocate the entire preview namespace exclusively to reviewed server entries and its internal modules.

The Core mappings are `/api/backend/core/me`, `/api/backend/core/clients`, and `/api/backend/core/clients/:uuid`. The existing fixed operations `/api/capiro/me.read` and `/api/capiro/clients.list` map to the same two backend GETs and keep their existing request/response schemas. All existing Portfolio/Meri/Modules/Settings feature code and session/client reset behavior are unchanged. Portfolio keeps its canonical projection receivers. Meri interfaces and public package pins are unchanged.

The server uses existing `auth()` and `getToken({template: "capiro"})`; only that token, `Accept: application/json`, and `X-Capiro-Tenant: capiro-internal` reach the dedicated service. Browser authorization, cookies, forwarded headers, impersonation and scope hints never reach it. Method overrides and browser scope headers are rejected even when empty. Redirects are forbidden, responses are bounded to 8 MB with a 30-second overall deadline, errors are sanitized, and cancellation discards late tokens/responses. Responses are private/no-store.

The candidate requires all three server bindings:

```text
CAPIRO_PREVIEW_READ_ONLY=true
CAPIRO_PREVIEW_READ_BACKEND_SOURCE=111f269d749cae0249c2141779bd6d7deb93f45c
CAPIRO_PREVIEW_READ_API_BASE_URL=<separately qualified dedicated HTTPS preview service ending exactly /api>
```

The URL must have no credentials, query or fragment. Known ordinary production hosts, the frontend origin, and origins from ordinary service variables are rejected. There is no fallback to `CORE_API_BASE_URL`. Missing/invalid bindings preserve PR23's 503 denial before authentication or dispatch; absent/literal-false preview mode preserves the ordinary application. A source pin is deployment intent, not cryptographic proof of the running endpoint: native service identification and qualification are mandatory outside this adapter. No supplied binding has been enabled.

## Verification and release status

The initial receiver regression baseline on unchanged PR23 failed 21 tests and passed 52. The exact baseline test, raw failures and later attempts are preserved in the local evidence packet; this is not a native backend qualification. A test-isolation error discovered in the first implementation pass (a mocked null token persisted across cases) was corrected and retained as evidence.

Qualification results, exact final source and image-build inputs will be recorded in `QUALIFICATION.md` after checks finish. No source-only or synthetic test accepts the 337 Portfolio native rows. Cross-mode signed-in/expiry/client replacement/native interrupted writes, live Figma/accessibility acceptance and backend native runtime remain release gates.
