# Preview backend containment

Bounded successor to PR22 (`bbf1b1b42b213cf971681fde79931afade0804a9`), on `integration/capiro-preview-read-only-20261013`. This prepares the original restricted production-Clerk preview; it does not activate it or change deployed access. The PR22 build-input packet, qualified build and original evidence remain preserved separately.

## Implementation outline before source editing

One shared server policy owns the preview backend hold. All four existing backend route families invoke it before route parameters, configuration, request-body consumption or authentication. The Next proxy uses the same policy before Clerk for API paths it matches. Existing transports, their operation registries, authentication rules and ordinary application behavior remain owned by their current modules.

`CAPIRO_PREVIEW_READ_ONLY` is a server-only deployment setting. Absence or literal `false` retains ordinary behavior; literal `true` and every malformed configured value deny backend dispatch. No browser input can change it. The denial is a bounded, non-cacheable 503 response with a stable preview-hold code.

**The admitted backend read-route set is empty.** GET and HEAD are held alongside mutations. The coordinator relayed backend-owner findings that tenant-context self-healing and internal admin mapping can write during apparently read-only requests. No production route is admitted until an exact backend source and its authentication, tenant resolution and handler effects are reviewed. No environment route string, wildcard, request header or query override grants admission. Adding a route later requires a separately reviewed source change; this patch does not implement a speculative configurable allowlist.

The frontend policy does not authorize tenant/client access, replace backend policy or claim that Clerk itself has no authentication/session effects. Existing production Clerk bindings and immutable internal-tenant identity are pending authoritative readback from Neo. No credentials, production calls, domain changes, access widening, image deployment or backend writes are authorized here.

## Backend coordination

Requested through the active coordinator: any proposed read route must identify its exact backend source pin, authentication and tenant/admin mapping path, side effects and containment evidence. Until the backend owner supplies that review, admission remains empty. This source work is independent of pending auth metadata.

## Planned verification

Preserve a failing baseline on PR22 with the same actual-route tests later used for acceptance. Exercise every API export and all operation families, encoded/mismatched routing, HTTP methods, forged override/tenant/forwarded/Clerk headers, malformed server configuration and zero auth/body/fetch activity. Verify ordinary-mode routing still reaches the original transports. Enforce coverage of every API route entry so future handlers cannot silently omit the policy. Run relevant existing transport tests, types, scoped lint/format, root/architecture/package checks and one production build plus actual-server rejection checks. No product UI change is planned; prior visual evidence remains applicable without a new Figma/WCAG claim.

All 337 native rows remain open. Meri stays on published 0.1.3. Final exact source, results and remaining gates will be appended after qualification.
