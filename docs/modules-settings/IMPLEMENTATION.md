# Modules and Settings implementation

Implemented in `apps/web` on `task/modules-settings-20261011`, based on frontend `02c02d95bdf3949662b9123f425271c6491ffdab`. Meri runtime remains in `meri-greenfield`. Portfolio remains in its separately developed `apps/portfolio-web`; the mode link uses the configured `NEXT_PUBLIC_PORTFOLIO_URL`.

## Sources and coverage

The design source is [Capiro 3.1, page 411:40601](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-%E2%80%94-UI-Redesign?node-id=411-40601). [FIGMA-INVENTORY.json](./FIGMA-INVENTORY.json) records the discovered frame IDs and their feature ownership. The shared exact assets have source nodes and SHA-256 checks in `apps/web/design/modules-shared-assets.json`; additional exact exports are under `apps/web/public/figma`. Shared typography uses Geist and Newsreader.

The attached `Capiro-3.1-Portfolio-Audit (1).xlsx` (source pin `fd8765ec`) contains Portfolio and Master Calendar mappings, not Modules or Settings mappings. Missing mappings were established from actual `capirov2` controllers and DTOs at **4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace**. [INTEGRATION-MAP.md](./INTEGRATION-MAP.md) lists every registered method, service path, authentication boundary and controller reference. This source pin does not establish what is deployed in any live environment.

| Surface | Canonical implementation | Connected behavior |
| --- | --- | --- |
| Modules hub and product navigation | `shared/shell`, `features/modules/hub/ModuleHub.tsx` | Meri, Portfolio and Modules modes; module and Settings navigation; responsive shell |
| Engagement | `features/modules/engagement`, `shared/meetings` | Meeting library, prep/notes/debrief/artifacts, versioned V3 campaign sessions, targets, generation review and separately confirmed sends |
| Planner | `features/modules/planner` | Tasks in list/board/calendar/timeline/Gantt, projects, goals, portfolios, rules, templates, dashboards, forms, files, capacity, workload, budgets and timesheets |
| Public Planner forms | `app/forms/[token]`, `planner/PublicForm.tsx` | Revocable share capabilities, conditional question rendering, validated answers, bounded attachments, receipt and unavailable states |
| Master calendar | `features/modules/calendar` | Month/week and client agenda, shared meeting drilldown, hearings, funding and Federal Register date-only entries |
| Workspace | `features/modules/workspace` | Documents, drafts, versions/comments, Hill Day six-stage workflow, Template Studio V3, persisted multi-section newsletters |
| Strategies | `features/modules/strategies` | Library, timeline, phases/calendar, context uploads/imports/evidence, change-set review, hash-bound approvals, execution runs/resume/history |
| Directory | `features/modules/directory` | Congressional/committee/state/department directories, profiles, notes and favorites |
| Intelligence | `features/modules/intelligence` | Seventeen Data Explorer datasets, defense budget and PE detail, funding detail, district nexus and geographic rendering |
| LegiWatch | `features/modules/intelligence/legiwatch` | Federal/Florida hearings and committees, recording/transcripts, claims/publications, report runs and recipients, news/budget/legal evidence, retained revisions, research drafts, monitoring, subscriptions, internal workflows, imports, briefings, analytics and settings |
| Research portfolios | `features/modules/research-portfolios` | Collections, memberships, changes, snapshots, subscriptions, reviews and settings |
| Settings | `features/settings` | Personal/contact/signature, branding, team/invitations, integrations/OAuth, hosted billing, usage, profiles and intelligence mappings; HQ tenants/customers/keys/broadcasts and eight analyst queues |

## Boundaries and organization

Thin Next entrypoints compose feature screens. `shared/module-ui` uses the canonical `packages/ui` primitives for dialogs, inputs, tabs and feedback. Shared meetings, recipients, field editors and task/form presentation have one owner. Feature folders do not import private Meri or Portfolio code.

`shared/capiro/operations` is the fixed allowlist and runtime contract boundary. It is grouped by backend domain; the registry composes those groups. `config.ts` validates service origins; `gateway.ts` handles dispatch and trusted Clerk token retrieval through the route callback. `gateway-input.ts` handles bounded decoding and safe path/query construction. Uploads, binary downloads and the single hearing WebSocket ticket handoff have separate bounded protocols. A component-scoped client lifetime and session generation prevent stale responses after navigation, sign-out or organization changes. Writes are never replayed automatically.

The backend owns tenant/actor/client authorization, durable state, approval validity and execution. The browser forwards reviewed operation fields, optimistic versions and exact retained-source/hash references only. Monetary comparisons retain exact decimal strings/BigInt. Unknown coverage and held scan counts are unavailable, not invented zeroes.

Public forms are a deliberate separate capability boundary: exactly `public-form.read`, `public-form.submit` and `public-form.upload` can run without Clerk. They target only the existing Strategy public-form controller. The backend resolves the token and rechecks revocation; responses expose questions and receipts without project/tenant/owner identities. Protected operations still require the trusted Clerk token. Same-origin writes, bounds, projection and cancellation apply to both boundaries.

## Configuration

Install using Node 24 and the root npm lock (`npm ci`, npm 11.9). Start with `npm run dev`. Supply the designated Clerk application's `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and existing `capiro` JWT template. No secret or tenant authority belongs in a public environment variable.

| Variable | Value shape |
| --- | --- |
| `CORE_API_BASE_URL` | Approved HTTPS origin plus `/api` |
| `STRATEGY_API_BASE_URL` | Approved HTTPS origin plus `/strategy-api`; includes Planner |
| `WORKSPACE_API_BASE_URL` | Approved HTTPS origin plus `/workspace-api` |
| `INTELLIGENCE_API_BASE_URL` | Approved HTTPS origin plus `/intel-api` |
| `ONBOARD_API_BASE_URL` | Approved HTTPS origin plus `/onboard-api`; billing |
| `NEXT_PUBLIC_PORTFOLIO_URL` | Approved HTTPS URL for the separately running Portfolio frontend |

Missing service/session configuration is rendered explicitly and issues no protected requests. Public forms require the Strategy service origin; their capability URL is the credential and must not be placed in analytics/referrer logs. Production routing, Clerk application configuration and live service feature flags must be qualified in the designated environment.

## Backend gaps and intentional unavailable actions

- Greenfield Meri preferences, runtime controls and memory governance do not yet have a verified public greenfield frontend contract here. Their Settings screens show unavailable actions; legacy Clio is not substituted. Existing authorized profile/context reads remain separate.
- HQ impersonation needs a reviewed adapter for its tenant/session handoff. SAM/provisioning review screens lack the required public UI contract.
- Billing uses the existing hosted Stripe portal. The Figma cancellation-window, survey and term-change flow is not represented by an equivalent reviewed API.
- Engagement's aggregate plan/team/DC surfaces do not have verified matching aggregate endpoints. Their availability is explicit.
- Newsletter persistence works; staging that newsletter into Outreach requires a verified bridge. Strategy and Hill Day assistant affordances need the new Meri contract.

These are service-contract gaps, not successful mock writes. No backend, infrastructure, production routing or Meri runtime code was changed.

## Verification and limits

See [VERIFICATION.md](./VERIFICATION.md) for final command results and retained screenshots, and [STRUCTURE-REVIEW.md](./STRUCTURE-REVIEW.md) for review dispositions. The browser harness bundles the actual feature code and replaces Clerk/Next routing plus HTTP responses with explicitly synthetic fixtures. It qualifies rendering, interactions, response handling and session isolation, not live backend connectivity. Screenshots are representative visual evidence, not acceptance of every Figma frame or every user role.

Live sign-in, tenant/role matrices, real integration callbacks, S3 permissions, hearing microphone/WebSocket behavior, real billing, delivery services and durable execution have not been exercised. They need the designated configured preview environment. This branch is for review and has not been deployed or merged.
