# Capiro 3.1 Portfolio

Portfolio is part of the canonical `apps/web` application in `capiro-frontend`.
It connects to existing services in `neo-capiro/capirov2`. The transferred source
and all its tests have been consolidated under this application; the repository
root owns dependency installation and the active lockfile.

This is an implementation checkpoint. **337 in-scope audit rows remain open for
final acceptance, and the preview has not had signed-in acceptance.** Read the
[current continuation](../../docs/portfolio-31/CONTINUATION-2026-10-11.md) for
source-specific changes and results, and the
[portable handover](../../docs/portfolio-31/handover-2026-10-11/HANDOVER.md) for
the phased plan and previous operational evidence. Older running logs are
preserved in Git history, not current deployment instructions.

## Run from the repository root

Use Node 24 and npm 11. Copy `apps/web/.env.example` to a local environment file
and populate the designated service origins and matching Clerk configuration
through the approved secret mechanism. Do not commit credentials.

```sh
npm ci --no-audit --no-fund
npm run dev -- --port 5188
```

Open `http://127.0.0.1:5188/portfolio`. Missing configuration displays a setup
page; there is no fixture sign-in or production authentication bypass.
`CAPIRO_DEFAULT_PRODUCT=portfolio` also makes `/` redirect to `/portfolio`.
Leaving it unset retains the existing shared application's synthetic Meri home.

```sh
npm run check
npm exec --workspace @capiro/web -- playwright install chromium
npm run test:browser
npm run build
npm run start -- --port 5188
```

Browser tests start their own loopback component host on port 5191, import the
actual feature components and intercept synthetic service responses. They do
not establish live authentication, tenant access, provider delivery or deployed
behavior. A local environment with a separately verified compatible Chromium
can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; the default uses Playwright's
pinned installation. Record the actual browser version with test evidence.

## Configuration and service ownership

| Server configuration | Existing responsibility |
| --- | --- |
| `CORE_API_BASE_URL` | Clients, people, facilities, team, advocacy, Objectives candidate, Engagement meetings/mail/files, hearings and deadlines |
| `STRATEGY_API_BASE_URL` | Strategies and paginated Planner tasks |
| `WORKSPACE_API_BASE_URL` | Existing drafts, documents, artifacts and read-only template catalog |
| `INTELLIGENCE_API_BASE_URL` | Intel Bill Tracker board, search and versioned watchlist configuration |
| `TRACKER_BACKEND` | Explicit `core` or `intelligence` owner; the owner selected `intelligence` for the designated preview |
| `MERI_API_BASE_URL` | Reserved configuration; no alternate Meri implementation |
| `CAPIRO_EXISTING_APP_URL` | Existing Workspace, Strategies and meeting-preparation deep links |
| `CAPIRO_MERI_URL`, `CAPIRO_MODULES_URL`, `CAPIRO_WORKSPACE_URL` | Existing destinations; unavailable destinations remain disabled |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Matching keys for the designated Clerk application and backend JWT trust |

Origins include their existing routing prefixes, for example
`https://test.example/api`. Browser requests use
`/api/backend/<service>/...`; the server obtains the existing `capiro` JWT and
does not trust browser tenant or permission headers. Configuration rejects URL
credentials, query/fragment and non-loopback HTTP. There is no automatic fallback
between Tracker backends.

## Code ownership

| Area | Canonical source |
| --- | --- |
| Routes and Portfolio provider composition | `src/app/(portfolio)` |
| Portfolio domain presentation and interaction | `src/features/portfolio/<area>` |
| Service proxy, session/cache, shell, validation and form wrappers | `src/shared/portfolio` |
| Common header geometry | `src/shared/shell/HeaderFrame.tsx` |
| Adopted presentation primitives | `../../packages/ui` public exports |
| Unit and synthetic browser checks | `tests` |
| Exact Figma assets | `public/design` and domain-local asset folders |
| Isolated preview templates/build instructions | `deployment/portfolio` |

Routes compose public feature interfaces. Cross-area imports use explicit
public entries; shared foundations do not import features. The Portfolio Dialog
wrapper reuses `@capiro/ui/dialog`. Schedule-X owns calendar grids and React Flow
owns organization chart rendering. Existing Workspace items open the existing
editor. The consolidation's complete source mapping is recorded
[here](../../docs/portfolio-31/CONSOLIDATION-SOURCE-MAP-20261011.json).

## Design and acceptance boundaries

UI work references the current
[Portfolio Figma page](https://www.figma.com/design/Zc2dEN5aLU47dVdsewDmiJ/Capiro-3.0-UI-Redesign?node-id=411-40601)
and its exact child frames. Current continuation reports record the selected
nodes, exported asset hashes, desktop/phone screenshots and behavior checks.
Do not substitute temporary Figma URLs or approximate icons in production code.

Objectives readiness uses outcome, government problem, ask type and minimum win.
Limits remain optional. The native Objectives candidate and other pending
backend capabilities remain subject to their actual deployment state.

Calendar Agenda includes the existing Planner start and due occurrences without
invented Government/deadline sources. The other calendar grids retain their
existing meeting coverage. Committee selection follows the service taxonomy.

Prospects use Business Development records, distinct from legacy client-profile
types. Existing stages remain visible without an invented migration mapping.
New-stage activation, native proposal version bindings, a prospect parent for
Files and paid conversion semantics remain contract dependencies. Notes remain
firm-scoped under the existing service contract.

## Preview runtime

The handover records an isolated Portfolio ECS preview service and image as
deployed on 11 October 2026. That historical state does not establish the current
service, DNS, ingress or Clerk state. Fresh read-only verification is required
before a new shipment. Signed-in browser acceptance remains open.

The [deployment guide](deployment/portfolio/README.md) describes the existing
preview resources and the exact-source build/update process. The container now
builds from the **repository root** with `apps/web/Dockerfile`, uses the one
workspace lock, and starts the shared standalone server on port 5188 as a
non-root user. Its default product is Portfolio. No backend deployment, new
resource allocation or production cutover is part of the local source checks.
