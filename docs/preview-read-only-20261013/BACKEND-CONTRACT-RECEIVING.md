# Receiving the qualified preview read contract

## Governing backend decision

The backend owner has definitively established that **no current authenticated production data route is strictly mutation-free**: tenant middleware writes identity/membership before handlers. A GET method or a handler containing only reads cannot qualify the existing route. Current authenticated production data routes remain inadmissible to this preview.

The owner is implementing a bounded preview-only path for existing identities, initially covering `/me` and client list/detail, with database-enforced read-only access and no impersonation or privilege expansion. Those are owner-reported capabilities under implementation, **not admitted frontend routes or a received wire contract**. Exact paths, methods, schemas, identity bindings and qualification evidence have not arrived.

PR23 therefore retains **zero admitted backend routes**. No more auth setup or historical staging checks are required for this code step. The next dependency is the owner's exact qualified route contract. The confirmed production Clerk references remain the intended auth references for the original restricted preview; any isolated environment remains a separate explicit setup.

## Existing receiving point

`apps/web/src/shared/preview/backend-policy.server.ts` is already the shared server entry policy. Every allocated forwarding route checks it before application authentication, body reads or dispatch, and the matching Next proxy checks it before Clerk handling. Its current unconditional preview hold is sufficient while the contract is pending; no placeholder route, environment allowlist, adapter, DTO or new auth hook is needed.

Once the qualified contract arrives, a separately bounded source change can evaluate it at this existing boundary. Ordinary application behavior, distinct Portfolio Core/Intel transports, the Modules fixed-operation gateway and Meri's published interface remain separate. No receiving code is implemented or enabled by this document.

## Evidence needed with the contract

- Exact backend qualified commit and public contract/fixture version, with the intended capabilities' actual paths, methods, accepted query/parameter schemas and response/error shapes.
- Existing-identity admission and trusted tenant/actor/client binding through the entire authentication/middleware/handler path. Missing identity or membership must fail without creating, repairing or elevating it; no impersonation or browser-supplied authority.
- Backend evidence of read-only database enforcement covering identity resolution and handlers, including attempted identity/membership writes, repair/admin-mapping paths, rejected requests and error/cancellation paths. Frontend fetch mocks cannot establish this property.
- Clear authorization/revocation and failure behavior so the frontend can preserve its current session/org/client reset, cancellation and unavailable-state semantics. This is contract information to receive, not a request for additional auth setup now.

## Receiving test shape, held until exact contract

| Boundary | Required observable result |
| --- | --- |
| No received/qualified contract or malformed server configuration | Existing preview hold; zero credential retrieval or upstream dispatch |
| Each exact admitted operation from owner fixtures | Only the reviewed method/path/query/parameter combination can reach the designated preview read transport; existing authentication and tenant/client authority checks still apply |
| Every other operation, including current authenticated production data routes | Denied without forwarding, even if the method is GET |
| Encoded/double-encoded paths, traversal, case/trailing-separator variants, duplicate/unrecognized parameters, redirects and method overrides | No widening beyond the received canonical contract |
| Forged identity, organization, client, forwarding, rewrite, authorization, cookie or middleware headers | No admission, impersonation or authority substitution; browser selection remains a hint |
| Missing, unknown, expired or replaced identity/membership | Fail closed with no onboarding, self-healing, admin mapping or elevation; backend evidence proves zero writes |
| Client/org/session replacement, abort or interrupted response | Existing cancellation/cache/editor clearing holds; no stale receipt or late result enters the replacement scope |
| Ordinary application mode and unrelated services | Existing behavior and transport boundaries preserved; no new route or mutation enabled |
| Actual built server | Exact approved reads and all denials match the contract; all non-admitted forwarding remains zero |

Use the backend's qualified fixtures and public contract instead of inventing test endpoints or copying private backend implementation. Preserve PR23's current 36-case actual-handler regression suite and route-allocation controls; add acceptance tests only when their expected wire behavior is supplied. Backend database/identity evidence remains a distinct prerequisite to any frontend positive admission test being treated as production qualification.

This is preparation only. No route, code, configuration or access setting changed. No new test run or native acceptance is claimed. All 337 native Portfolio rows remain open.
