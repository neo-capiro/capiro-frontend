# Preview backend containment

Bounded successor to PR22 (`bbf1b1b42b213cf971681fde79931afade0804a9`), on `integration/capiro-preview-read-only-20261013`. This prepares the original restricted production-Clerk preview; it does not activate it or change deployed access. The PR22 build-input packet, qualified build and original evidence remain preserved separately.

## Implementation outline before source editing

One shared server policy owns the preview backend hold. All four existing backend route families invoke it before route parameters, configuration, application body reads or authentication. The Next proxy uses the same policy before Clerk for API paths it matches. Next itself can buffer a request body before invoking application code; the policy does not claim to prevent that framework buffering. Existing transports, their operation registries, authentication rules and ordinary application behavior remain owned by their current modules.

`CAPIRO_PREVIEW_READ_ONLY` is a server-only deployment setting. Absence or literal `false` retains ordinary behavior; literal `true` and every malformed configured value deny backend dispatch. No browser input can change it. The denial is a bounded, non-cacheable 503 response with a stable preview-hold code.

**The admitted backend read-route set is empty.** GET and HEAD are held alongside mutations. The coordinator relayed backend-owner findings that tenant-context self-healing and internal admin mapping can write during apparently read-only requests. No production route is admitted until an exact backend source and its authentication, tenant resolution and handler effects are reviewed. No environment route string, wildcard, request header or query override grants admission. Adding a route later requires a separately reviewed source change; this patch does not implement a speculative configurable allowlist.

The frontend policy does not authorize tenant/client access, replace backend policy or claim that Clerk itself has no authentication/session effects. Existing production Clerk bindings and immutable internal-tenant identity are pending authoritative readback from Neo. No credentials, production calls, domain changes, access widening, image deployment or backend writes are authorized here.

## Backend coordination

Requested through the active coordinator: any proposed read route must identify its exact backend source pin, authentication and tenant/admin mapping path, side effects and containment evidence. Until the backend owner supplies that review, admission remains empty. This source work is independent of pending auth metadata.

**Latest definitive decision:** all current authenticated production data routes pass through tenant middleware that writes identity/membership before handlers. None is admissible as a strictly mutation-free read. The backend owner is implementing a preview-only path for existing identities with read-only DB enforcement and no impersonation or privilege expansion. The [receiving requirements and test shape](BACKEND-CONTRACT-RECEIVING.md) prepare for its exact qualified contract without inventing or enabling a route. The existing shared guard remains unchanged with an empty allowlist. No further auth setup or historical staging checks are needed for this code step.

## Planned verification

Preserve a failing baseline on PR22 with the same actual-route tests later used for acceptance. Exercise every API export and all operation families, encoded/mismatched routing, HTTP methods, forged override/tenant/forwarded/Clerk headers, malformed server configuration and zero auth/body/fetch activity. Verify ordinary-mode routing still reaches the original transports. Enforce coverage of every API route entry so future handlers cannot silently omit the policy. Run relevant existing transport tests, types, scoped lint/format, root/architecture/package checks and one production build plus actual-server rejection checks. No product UI change is planned; prior visual evidence remains applicable without a new Figma/WCAG claim.

All 337 native rows remain open. Meri stays on published 0.1.3.

## Exact-source result

Qualified source: **`c84472e523311988a7ab42b42f7ae4053ac9b3cf`**. Application tree: `b0f1a663e1cae5d0a290e0721176b9342aba4e42`; production-source tree: `e70d90a58c115e6ae3da061c6801dd164a1f4629`. Later publication adds documentation/evidence only. The base was refreshed and remains PR22 `bbf1b1b42b213cf971681fde79931afade0804a9`, open/draft/unmerged. No merge conflict or feature-source change was needed.

The canonical implementation is `apps/web/src/shared/preview/backend-policy.server.ts`, a 26-line pure policy with no network, request-derived settings or route admissions. Each existing route checks it before any other handler work; its duplicate use in the Next proxy prevents Clerk handling for matching held API requests. Existing proxy matchers are unchanged. Architecture rules allocate the policy only to these server entries, reject feature/page/foundation consumers, and preserve every prior boundary rule. A separate AST check enumerates every API route and verifies the policy is the first handler action, so new routes require explicit review.

| Gate on c84472e5 | Result |
| --- | --- |
| Actual-handler containment and existing Portfolio/Meri proxy tests | 175 passed, including 36 new containment/ordinary-behavior cases |
| Existing Capiro gateway, public Onboard, config and registry tests | 38 passed |
| Root controls, including four new boundary/allocation cases | 110 passed; zero failed/skipped |
| Types, public packages, focused lint and formatting | Passed |
| Architecture | Zero errors/blockers; 488 signals, 466 reviewed, 22 inherited unreviewed |
| Production build after output-path correction | Passed in 53.89 seconds |
| Isolated actual preview server | 62 observations in 3.04 seconds; zero upstream requests |
| Isolated actual ordinary server/browser | 30 observations in 10.01 seconds; zero page errors |

All final gate receipts bind unchanged source before and after. The preview server covers ordinary methods, automatic HEAD/OPTIONS behavior, public operations, encoded/mismatched paths, forged method/tenant/forwarded/middleware/authorization/cookie headers, malformed server setting, interrupted bodies, health and canonical pages. Unsupported framework methods/routes remain rejected without forwarding. The ordinary browser gate preserves desktop/mobile, light/dark, canonical/deep links, shared navigation and back/forward behavior. It uses no credentials or service interception. No live backend or Clerk service was called by these checks.

## Retained failures and harness corrections

- Before production editing, the corrected 36-case actual-route suite produced **33 intended failures and three ordinary-mode passes** against PR22. Exactly the same test bytes pass in the final source: SHA256 `a31b19dc6c914d7a7963026d0744cf19f3a1f3d3deb64e856f1fb75e378c3314`. The first probe also had a consumed-Response mock error; its test and 34-failure result remain, and that harness error was corrected before the meaningful baseline.
- The new architecture allocation tests also failed before the exact server dependency allocation was added. No previous guard was relaxed.
- Initial typechecking failed because the bounded worktree omitted Meri client's package-local installed contract directory. The existing exact dependency files were hardlinked into the new worktree on the same filesystem. No install, package, lock or published contract changed. The failed log remains; complete-graph types and final types pass.
- The first Next build compiled and typechecked but could not resolve Next's external runtime from the separate output directory. Its output and log remain. A temporary build-only ancestor dependency link enabled normal resolution for a fresh successful output; it was removed before final server checks. A generated Shiki ancestor directory was also preserved outside resolution. Final receipts prove all four ancestor dependency paths absent and no escaping standalone symlinks.
- The first HTTP probe completed 49 cases with zero upstream requests, then timed out expecting a response before completing a body. Installed Next documentation states that Proxy clones/buffers bodies. The corrected probe retains all completed-request assertions and verifies client interruption causes zero dispatch; five unfinished requests were interrupted, while the document handler returned the hold immediately. No source change or timeout increase was used to hide that failed assumption. Both probes and results remain. Initial browser evidence is retained; the final browser gate was repeated after dependency isolation.

## Preserved scope and release holds

PR22's 6 MB input packet and 29.8 MB original evidence archive were hashed before and after and remain byte-identical. Its qualified build and all original failures are retained. The dedicated worktree reuses exact installed dependencies; no clean install was repeated. New generated output is separate. Source manifests/lockfiles, published Meri 0.1.3 artifacts, ordinary feature code, styles and transport implementations remain unchanged.

No deployed setting or template was changed. The shipping owner must explicitly set `CAPIRO_PREVIEW_READ_ONLY=true` for the intended preview; omission or literal `false` deliberately preserves the ordinary app. The separate Test-only deployment proposal still cannot represent the original production-Clerk profile. This patch supplies containment preparation, not an activation-ready production configuration.

The backend-owner side-effect warning was incorporated by keeping **zero admitted routes**. Proposed route reviews were requested through the coordinator; no backend admission evidence or new auth metadata arrived during qualification. Native identity/tenant/issuer/audience, production route effects, DNS/host restrictions and deployed containment remain unverified. No new Test application is required by this source change. Independent backend route approval and external PR review remain pending.

After qualification, the owner supplied current preview Clerk/KMS **stack parameter references** at 23:15:57 UTC and confirmed them as the existing production Clerk references. Neo also explicitly corrected the historical context: **there is no staging environment**. The [readback, correction and narrow production metadata check](OWNER-READBACK-20261013T231557Z.md) preserve those references without inferring secret contents or current auth suitability. The historical staging candidate and staging DescribeSecret request are withdrawn; no more staging reads are requested. Any isolated environment remains a separate explicit setup. No command was repeated, no access boundary changed and route admission remains empty.

Full unit/browser/transport suites, a clean install, Docker/musl/image scanning, live auth/backend tests, new Figma retrieval, full accessibility and native device/assistive-technology checks were not run for this bounded server-only change. Historical passes are not represented as a new full qualification. No deployment, resource/credential/domain/security/database change, provider message, billing, paid model work or main merge occurred. All **337 native rows remain open**.

## Evidence

The portable packet includes raw red/green tests, preserved failures, build/runtime logs, screenshots, exact commands/source receipts, storage/dependency corrections and PR22 preservation hashes. Generated builds, dependency caches and temporary browser data remain local and are excluded explicitly. `MANIFEST.json` and `EVIDENCE.json` bind archive members and original bytes. The packet is supplementary to PR22; it does not replace or republish PR22's evidence.

Archive: `evidence.tar.gz`, 2,759,480 bytes; 116 regular files totaling 4,809,731 uncompressed bytes. SHA256: `a26dcc2367fd4d7457ac11ac9d3cb1a3d9c04bdaf57cc57aa37b9173d5bcc0a7`. Manifest SHA256: `742a2f8445a6ca0dc3fc693b8dec8e76fa1fdbcba9035980b45fa50861093050`. Every archive member and original byte hash was verified; file-mode restoration is not claimed. Verify this digest before extracting into an empty review directory. Raw local evidence remains at `/workspace/capiro-preview-read-only-evidence-20261013`; the publication copy is at `/workspace/capiro-preview-read-only-publication-20261013`.
