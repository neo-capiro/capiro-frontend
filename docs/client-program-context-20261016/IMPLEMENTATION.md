# Client program association context — source preparation

This bounded read section sits after the unavailable FY funding totals and before the independent client-attributable awards in `FederalActivity`. It displays returned Program Element associations and reasons, not program funding or an exhaustive funded-program count. No gateway, route, permission, backend, fiscal-year or award calculation changes are included.

## Canonical owners and source contract

- `opportunities/contracts.ts` already owns the native `programResponseSchema`. The newly allocated `opportunities/public.ts` exposes only that schema and `ProgramPage` through the canonical Portfolio area entry. Existing Opportunities queries/schema behavior is unchanged.
- `client-profile/client-program-context.ts` refines that receiver for this fixed request, owns its actor-bound query/cache key and before/after-request actor/abort checks. It does not define a parallel native DTO or copy backend implementation.
- `client-profile/ClientProgramContext.tsx` owns presentation and explicit page selection. Its child lifetime is replaced when client, current actor or enabled state changes. It reuses current card styles and `QueryState`.
- Existing `profile-access`, `profile-keys`, `useApi`/Core proxy, TanStack cancellation and application/session boundary remain canonical. Browser identity fences reject retired UI reads; they do not grant native authority.

The actual local `client-pe-relevance.controller.ts`, service and pure scoring types under `C:/Users/neoma/Documents/Codex/2026-10-15/task-3/backend/apps/api/src/intelligence` were inspected, together with `portfolio-compatibility-audit/CONTRACTS-PROGRAM-FUNDING.md`. That audit pins native source `1b9fedc5bd476311d9234ca4b549ff3ebb14ab2d` and records parity to its frozen baseline; this implementation does not claim a new backend checkout/runtime qualification.

Request: `GET intelligence/clients/:clientId/pe-relevance?minScore=0.5&page=1&limit=20` through existing `useApi().request("core", ...)`. Only explicit Previous/Next or Retry initiates another selected page; no all-pages fetch/prefetch is added. The existing native response is `{data:[{peCode,title:null|string,score,paths:[{path,score,evidence:string[]}]}],total,page,limit}` with no client echo or common AsOf. The service sorts and filters candidates, capped at 400. Its `total` is that bounded matching population, never the client’s exhaustive program count.

The consumer checks its fixed page/limit, exact expected returned population, duplicate PE identities, finite score/path shape and the score floor. Native paths are capability PE, capability keyword, prior award, facility district and ecosystem. Returned order is preserved. Unknown/malformed responses fail as reads, never empty success. An out-of-range returned empty page with a nonzero total remains distinct from total zero.

## Presentation and authority limits

Loading, 403, 404, other failure, disabled session and returned zero are independent states. Read failures/disabled scope hide cached rows. A native empty 200 is not proof of client existence or current actor-wall authority; the native reader can return empty for missing/foreign clients. A 404 is rendered as unavailable context rather than a claimed missing client.

PE code/title, heuristic relevance score and bounded plain-text reasons are displayed. Nullable title remains unavailable. At most three reason strings per non-award path and 300 characters per string are shown, with explicit truncation/omission labels. The prior-award reason’s raw approximate historical dollar string remains valid in the receiver but is not rendered, parsed, summed or rounded as funding. Instead its native path and UEI-or-similar-name caveat are shown. District overlap does not allocate money to a facility. No FY selection, budget amount, client/site allocation, verified award assertion or new detail destination is added.

The existing three unavailable FY/program-total cells, client award facts and source freshness behavior are preserved. A narrow component mock isolates the five existing `facility-federal-evidence.test.ts` award/freshness cases from this new independently tested section; their assertions were not removed or weakened. Root owns the `government-location-profile.spec.ts` synthetic empty-page route fixture update.

## Verification status

All new behavior tests are **authored, UNRUN** by this lane, as allocated:

- `client-program-context.test.ts`: native shape/null/raw reasons, malformed/capped pages, exact request pagination, actor/client cache separation, before-dispatch invalidation, late actor replacement, retired signal and native failure propagation.
- `client-program-context-view.test.ts`: nonmonetary association display, returned zero, loading, 403/404/error cache suppression, disabled session, manual pagination, escaping and bounded reasons.
- Five existing federal evidence assertions remain; browser fixture changes are root-owned and UNRUN.

Only bounded source/file reads and edits ran. No install, test, compiler, browser, DB/provider/cloud or live request ran. Root will own coherent formatting/AST, independent review and subsequent qualification. Installed Next guide paths were not present at the checked local locations; this change uses existing client-component/API patterns and introduces no Next route/server API. No guide dependency was installed or access path bypassed.
