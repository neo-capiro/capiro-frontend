# Native Research and customer Coverage author handoff

27 October 2026. Source authoring and focused regression evidence only. Hermes owns independent review and visual/live acceptance; root owns the shared registry, route mounting and release.

## Implementation and ownership

S11 now has native Context documents, Offices & relationships, Acquisitions, and Dossiers & funding segments. S14 has customer Research coverage. The new components live under `apps/web/src/features/modules/intelligence/research/`; they reuse the existing `useCapiroQuery`, authenticated fixed-operation gateway, Next URL navigation and shared module controls/tables/status panels. The seven components separate route composition, shared research navigation/evidence presentation and the five domain views. Core remains the only authorization, source qualification and publication owner.

The new `defense-research.ts`, `defense-research-schemas.ts` and `defense-product-coverage.ts` operation files receive public Core DTO projections from `capiro-backend@f7b3c4401`, `packages/shared/src/defense-research.ts` and `defense-research.controller.ts`. Only fixed GET operations are added. Unknown acquisition payloads and internal coverage metadata are stripped. Exact funding strings, missing versus zero, fiscal-year/request-edition distinctions, source review state, partial records and unknown physical denominators remain visible. Source links admit only HTTP(S). No source import, recheck endpoint, semantic search, provider action, data mutation or new backend owner is introduced.

Root integrates `defenseResearchOperations` and `defenseProductCoverageOperations` into the existing registry and mounts exported `ResearchWorkspace` / `ResearchCoverage`. This author's commit excludes those shared files. The component URL state preserves the current route and client hint, selected segment, filter, record and page through Back/refresh. Context results are explicitly capped at 100; office/acquisition results retain canonical paging. Outgoing office relationships are explicitly capped at 100. Refresh is a current read, never a request to ingest or requalify sources.

## Checks and limits

- Four focused DTO tests pass: fixed read-only paths and authority rejection; unknown coverage denominator/internal-field stripping; exact funding precision and missing versus zero; acquisition raw-payload stripping.
- Four mounted Playwright cases pass: context selection/filter/Back/refresh and unsafe-link refusal; unknown Coverage and filtered read-only refresh; exact dossier funding; office relationship and acquisition detail controls. These use the actual components, registry/client and canonical query hook against explicitly synthetic intercepted responses.
- Owned ESLint and Prettier checks pass. Full shared TypeScript check reported zero diagnostics in these files; eight comparison diagnostics belonged to another concurrently edited owner and were reported to it. That owner subsequently fixed them; this author does not claim a full-project PASS from the earlier run.
- No whole-app build, independent source/visual review, real tenant/corpus qualification or deployment acceptance was performed. The existing DEV harness ran on allocated port 5203 and exited; no listener remained. No shared services, credentials, packages or target data were changed.
- Design-review signals remain explicit: JSX-heavy domain render functions exceed 80 nonblank lines in ContextRecords, OfficeRecords, DossierDetail, ResearchCoverage, AcquisitionRecords and AcquisitionDetail. Each owns one domain receiver/presentation flow; no new source file exceeds 400 nonblank lines. Hermes/root should assess these exact responsibilities rather than infer architectural acceptance from the tests.

Private ordinary logs: `C:/dev/w4-fable-research-browser-final.log`, `C:/dev/w4-fable-research-typecheck-final.log`. The four browser scenarios are in `apps/web/test/browser/defense-research.spec.ts`; DTO cases are in `apps/web/tests/defense-research.test.ts`. No new validation framework is created.

## Remaining scope boundaries

Native controls are not source-corpus acceptance. DI qualification still needs actual narratives, source locators, dated relationships, acquisition continuity, denominators, qualified cohorts and historical cycles under existing governed owners. S09 Explore URL/results/selection, S10 composed Changes, S13 saved comparisons, S15 detailed evidence and existing program-profile tabs belong to their allocated owners. This commit does not silently declare those rows complete.

The current customer Core contract exposes `GET /defense-budget/product-coverage`; no customer governed recheck operation is published. The UI therefore offers an accurately labelled read refresh and current source limitations. A missing denominator stays unknown; no completion percentage or fabricated physical population is derived. Real source requalification/publication remains with the existing governed source owner and is not simulated by a button.
