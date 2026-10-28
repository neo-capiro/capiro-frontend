# Wave 6 application preparation (item 16)

28 October 2026; source-only B1–B14 requirements, owners, dependencies, unresolved decisions and finite delivery slices. Preparation and local checks do not establish complete product or live acceptance. Remaining product decisions are collected at the end at the user's request. No deployment, application/image build, paid provider call or independent review.

Keep domain logic with existing Core owners and frontend feature modules; reuse public contracts, shared UI and query/state components. Page/route handlers stay thin. Add shared components only for real repeated behavior, with no speculative framework or parallel authority/persistence owner.

## B1 — safe client enrichment

**Owners/current behavior.** Frontend `features/portfolio/client-profile/enrichment` uses shared Dialog, QueryState, Files upload and actor-scoped query keys. Core `clients/client-profile-fill{,-workflow,-completion}.service.ts` and its finding-review/application owners hold runs, tasks and proposed findings. Existing review uses exact client/run/finding identities, source evidence and partial finding statuses; applied canonical data is separate from the frontend review.

**Source correction.** After an ambiguous mutation, the review now remains pinned to the original run and Refresh reads that exact run. Previously the refresh fetched `latest`, which could display an unrelated newer run and obscure the interrupted operation. It retains the uncertainty fence because a status read without an operation receipt cannot prove this request's outcome or authorize replay. Access/actor/lifetime checks still run before and after readback; shared QueryState displays read failure.

**Open integration.** Start/rerun/retry remain unavailable because the current workflow can save website/identity mappings/facility districts before review. Do not enable it under a review-only promise. Existing scalar field comparison is not an end-to-end expected-client-revision contract. Exact reviewed revision/content application, atomic receipt/acceptance with each writer, and durable partial/unknown reconciliation remain required. Reload must recover original request identity, not rely only on in-memory uncertainty. No new client-revision or operation-receipt API is invented here.

**Finite next slice/dependencies.** Core adds a review-only run mode using existing task/finding persistence, freezes selected sources/identity inputs and client revision, and separates all canonical writes into reviewed application. Coordinate the versioned request/receipt contract before frontend activation. Then wire start/rerun/retry to durable identities and exact application readback through current owners.

**Acceptance.** Research changes no canonical field; selected findings apply once against reviewed client revision; concurrent client/finding edits refuse; partial outcomes identify accepted/failed/unresolved findings; retry/lost acknowledgment/reload/cancel preserve the same run and receipt. Source tests: 21 passed across enrichment contracts/actions and presentation; native/browser/DB-backed connected acceptance not run. Full B1 remains incomplete at the named Core boundary.
