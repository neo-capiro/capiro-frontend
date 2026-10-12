# Existing Capiro service boundary

The 11 October 2026 Modules and Settings request authorizes connection to the existing `capirov2` services. It supersedes the earlier disconnected-foundation restriction for these features only. Meri and Portfolio implementation remains separately owned.

Implementation outline:

- `operations/` owns reviewed HTTP operation descriptors and runtime response validators, bound to the backend controller/DTO evidence recorded in each descriptor. Registered methods, paths and request shapes are the only exposed service operations.
- `config.ts` owns pure, server-side service URL and Clerk configuration validation. Importing it does not read secrets or contact a service. Service URLs and secret keys stay on the server.
- `gateway.ts` owns request validation, fixed endpoint selection, Clerk bearer forwarding, same-origin mutation checks, deadlines and bounded JSON responses. Backend guards continue to own tenant, actor, role and client authorization. Browser selections never establish authority.
- `http.ts` owns typed browser requests and external-response validation. It does not store credentials, retry writes or manufacture success.
- `multipart.ts`, `binary.ts` and `uploads.ts` own the three reviewed transfer protocols. Multipart metadata/file names/counts/MIME/byte policies are operation-specific and validated before obtaining a bearer or dispatching. Binary downloads retain registered MIME, size and safe-filename policies. Presigned logo POSTs accept the verified S3 ticket only and omit Capiro credentials.
- `CapiroBoundary.tsx` owns the designated Clerk session boundary and resets local data state when user, session or organization changes. `queries.ts` owns abortable local read state. Feature components own their presentation and interactions.
- `app/api/capiro/[operation]/route.ts` only composes the registry, validated configuration and trusted Clerk token callback.

Dependency direction is feature → public boundary → reviewed operation registry. The route imports the server gateway; browser code cannot import server configuration, gateway or secrets. No private Portfolio imports, capirov2 source imports, broad unrestricted proxy, second authorization service or Meri runtime are added.

Reuse: the installed Next 16.4 route/layout documentation, designated Clerk 7.9 API, Zod 4.6.5, and the transferred Portfolio boundary's established failure, scope-reset, fixed service URL and `capiro` token-template semantics. This boundary is new canonical shared application code because no reusable application-level transport currently exists in `apps/web`.

Verification covers exact registered endpoint mapping, rejected unknown operations/methods/inputs, URL/path injection, same-origin writes, no session or incomplete configuration, cancellation/deadlines, bounded bodies, upstream failures, response validation and browser HTTP behavior. Live Clerk/API behavior requires the designated environment and is a separate gate; local tests and builds do not establish live connectivity.

Service configuration includes the existing deployment prefix: `CORE_API_BASE_URL=https://<origin>/api`, `STRATEGY_API_BASE_URL=https://<origin>/strategy-api`, `WORKSPACE_API_BASE_URL=https://<origin>/workspace-api`, `INTELLIGENCE_API_BASE_URL=https://<origin>/intel-api`, `ONBOARD_API_BASE_URL=https://<origin>/onboard-api`. Use the approved environment's actual origins; no origin is guessed or hardcoded. Controller paths in descriptors omit these service prefixes.

Required sign-in variables are `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, using the designated Capiro Clerk application. The existing `capiro` token template supplies backend claims. Do not add tenant/role claims in browser requests. Missing configuration renders an unavailable state and dispatches no requests.

Browser API: `api.request(key, input, {signal})` for JSON; `api.upload(key, input, [{field, file}], {signal})` for registered multipart; `api.download(key, input, {signal})` for registered exports returning `{blob, filename}`. `useCapiroQuery(key,input,{enabled})` admits current read results only. `useCapiroMutation(key).run(input,files?)` runs one action at a time and rejects after recording an error; callers catch errors. No write is automatically retried or replayed after scope changes.

The single reviewed WebSocket handoff validates the Intel hearing ticket response, derives the `wss:` path from the configured Intelligence service and validated hearing ID, and returns its existing one-use ticket URL. It is not a general socket proxy or browser-controlled service-origin selector.

Public Planner forms deliberately use a separate three-operation capability allowlist (`operations/planner-public-forms.ts`). Only reading a public form, submitting its answers and uploading its bounded attachments can run without Clerk. The existing Strategy controller validates the revocable share token and owns tenant binding. The gateway does not forward incoming authorization/cookie/tenant headers, expose owner/project identities or broaden anonymous access to the protected registry. Public form pages are noindex and use a no-referrer policy. See `docs/modules-settings/IMPLEMENTATION.md` for configuration and qualification limits.
