# Local-only request-origin correction

Base PR50 cc73ead8f591b31b2f2cfc8bb008913408d7a5e0, tree ab895121141bd25a47508d91070573699b14728f; preview revision8 image sha256:d9a15fed76a6f480778f0bd353085a2ec33be6e801e1c409aeb6048e0f517575. This proposal does not authorize publication, live configuration, a preview write replay or expanded live access. Core and Meri are unchanged.

## Evidence and limits

Shipping reported exactly one in-page Chrome fetch POST /api/capiro/planner.task.create at2026-10-14T20:48:37.073Z, public page origin asserted, native session cookies, no Origin overrides, only Content-Type set. Response403 {"message":"Request origin is not allowed."}, no created ID; bounded read-only reconciliation found0matching labels. Actual wire Origin/Host/forwarded metadata and derived server origin were not retained. The live cause remains unconfirmed.

PR50's TaskEditor and canonical Capiro browser transport use equivalent relative endpoint/credentials/header categories. Its guard compares Origin to request.url before body/auth/upstream. Docker binds HOSTNAME0.0.0.0, PORT5188. The exact Next16.4.0 installed package's NextNodeServer.attachRequestMeta and NextRequestAdapter.fromNodeNextRequest reconstruct https://0.0.0.0:5188 with those runtime fields and synthetic public Host/X-Forwarded-Host/Proto/Port. The unchanged-config gateway returns the exact403 without auth/upstream calls. The retained regression also passes an actual synthetic loopback HTTP request through those framework methods and gateway. This is framework-path integration with synthetic standalone fields, not a full production build/Clerk/browser/ALB deployment proof. No public-network requests, cookies, tokens or live account bodies are used in tests.

## Minimal ownership and behavior

Pure shared/request-origin.ts owns strict configuration parsing and equality. Existing Capiro and Portfolio server configuration readers supply optional CAPIRO_REQUEST_ORIGIN; their existing three mutation guards reuse the comparator. No new authentication, tenant, route, command or backend policy is added. Request/Host/forwarded headers never select the configured authority.

When unset, the current strict request.url comparison is preserved. When set, require one canonical HTTPS origin (HTTP permitted only for explicit loopback development), optional trailing slash, no credentials/path/query/fragment/whitespace/wildcard/bind-address. Invalid configuration yields null and fails closed, without falling back. Missing/null/foreign/malformed browser Origin remains rejected. Passing Origin still requires existing parsing/auth/session/backend authorization. Public capability surfaces retain their reviewed capability allowlists.

Proposed deployment value for the separately approved preview is CAPIRO_REQUEST_ORIGIN=https://portfolio-preview.app.capiro.ai. Do not use the new Core upstream origin as the frontend Origin. This value is a proposal only: no live environment or image has changed. Other deployments need their own exact admitted frontend origin; no wildcard or origin list is introduced. Do not fix this by spoofing browser Origin, trusting arbitrary forwarded headers, accepting missing Origin, removing guards or globally changing Next hostname/network binding.

## Verification and admission

Task-owned exact PR50 runtime/test dependencies are outside source, linked by an ignored local junction. No repository package or lock changes. Tests cover real framework metadata/adapter reconstruction, loopback HTTP path, canonical origin success with stubbed existing auth/upstream, missing/null/foreign/internal/malformed denial before body/auth/dispatch, hostile Host/forwarded headers, malformed configured origins without fallback, public capability denials, Portfolio shared ownership and loopback/unset semantics. Existing relevant gateway/config/proxy suites are retained.

Return exact source/tests/check evidence and independent review before any publication. Live admission remains separately gated: image/source qualification, approved preview-only origin configuration, then a separately authorized finite product interaction. The unrecorded failed request cannot be retroactively attributed to this mechanism with certainty.
