# Capiro frontend

One Next.js application in `apps/web` hosts Portfolio at `/`, Meri at `/meri`,
Modules at `/modules`, and Settings at `/settings`. `/portfolio`, existing client
and prospect deep links, `/calendar`, sign-in and health routes remain compatible.
Settings redirects to its Personal screen. Shared mode links are internal; they
no longer require a sibling Portfolio host or `NEXT_PUBLIC_PORTFOLIO_URL`.
`CAPIRO_DEFAULT_PRODUCT` no longer changes the canonical `/` entry.

Read [implementation standards](docs/IMPLEMENTATION-STANDARDS.md),
[architecture](docs/ARCHITECTURE.md), and the current
[integration status](docs/integration-20261012/STATUS.md) before changing shared
code. The [preservation report](docs/integration-20261012/PRESERVATION.json)
accounts for the three feature inputs. Their exact handovers and context are
linked in [the integration plan](docs/integration-20261012/PLAN.md).

The application owns one Clerk identity/session/client lifetime. Core/Intel
Portfolio transports, the Modules fixed-operation gateway and Meri public
packages remain distinct governed interfaces. Browser selection is a hint;
backend authorization remains authoritative. Meri screens are disclosed,
disconnected synthetic fixtures until their public runtime integration is
qualified. Unsupported operations stay unavailable.

Use Node 24 and npm 11.9.0 from the repository root. `package-lock.json` is the sole
active install lock; historical locks remain immutable qualification evidence.

```sh
npm ci --ignore-scripts --no-audit --fund=false
npm run dev -- --port 5188
npm run check
npm exec --workspace @capiro/web -- playwright install chromium
npm run test:browser
npm run test:browser:modules
npm run build
npm run test:production
npm run start -- --port 5188
```

`check` covers public artifact hashes, all workspace typechecks, repository guards
and assets, architecture, composed Meri transport, web lint, formatting of all web
source/test trees, Portfolio units and Modules contract units. Browser suites use
separate loopback harnesses on 5191 and 5197 with explicit synthetic responses.
`test:production` checks the actual standalone Next output on 5188 without service
credentials. `build` compiles the public Meri client and this one shared app.
A system Chromium can be selected explicitly with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for Portfolio/production and
`CAPIRO_QA_CHROMIUM_EXECUTABLE` for Modules; record its version with results.

The 15-case [UI provenance/SSR qualification](packages/qualification-elements/README.md)
requires its official hash-verified tool and a fresh receipt; run
`npm run check:elements` with that receipt's environment. It does not silently
regenerate or substitute older evidence. Published Meri inputs are recorded in
[vendor metadata](vendor/README.md).

Use only approved existing Clerk and service values; never commit credentials.
Both adapters use `CORE_API_BASE_URL`, `STRATEGY_API_BASE_URL`,
`WORKSPACE_API_BASE_URL` and `INTELLIGENCE_API_BASE_URL`, including their service
prefixes. Modules billing additionally uses `ONBOARD_API_BASE_URL`. Portfolio
retains its explicit `TRACKER_BACKEND` choice and conditional legacy deep-link
adapters; their URL variables are not needed for shared mode navigation. Consult
[Portfolio configuration](apps/web/PORTFOLIO.md) and the
[Modules configuration/operation map](docs/modules-settings/INTEGRATION-MAP.md).
Public Planner capability forms retain their separate unauthenticated contract.
Missing configuration refuses protected requests.

The [Modules handover](docs/modules-settings/HANDOVER.md) and
[Portfolio continuation](docs/portfolio-31/CONTINUATION-2026-10-11.md) preserve
original feature scope and native gaps. All 337 Portfolio rows remain unaccepted.
Historical targeted passes, source readiness and GitHub mergeability do not
establish combined or native acceptance. Independent review, configured preview,
backend/provider acceptance and the single eventual preview image remain separate
shipping gates. No merge or deployment is authorized by a local test result.
