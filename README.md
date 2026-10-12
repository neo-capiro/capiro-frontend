# Capiro frontend

Independent product frontend for Meri, Portfolio, Modules and Settings. Meri backend and runtime remain separately owned in [meri-greenfield](https://github.com/neo-capiro/meri-greenfield); Portfolio and Modules backend services remain in [capirov2](https://github.com/neo-capiro/capirov2).

Read [the architecture](docs/ARCHITECTURE.md) and [implementation standards](docs/IMPLEMENTATION-STANDARDS.md) before changes. `apps/web` is the canonical Next.js application for the shared shell, Meri Home and Portfolio routes. `packages/ui` owns reusable presentation, and `packages/meri-client` owns the public Meri browser transport/projection adapter. Portfolio has cohesive domain modules under `apps/web/src/features/portfolio` and foundations under `apps/web/src/shared/portfolio`; its [guide](apps/web/PORTFOLIO.md) describes configuration and existing service boundaries. Modules and Settings remain disabled destinations. The Meri shell's Portfolio button remains disabled pending verified navigation integration.

The default `/` entry and `/meri` screen are a disclosed, disconnected Meri fixture. Setting the server variable `CAPIRO_DEFAULT_PRODUCT=portfolio` redirects `/` to `/portfolio` for the isolated Portfolio preview. Home responsive repair and comparison with the finalized Figma Home reference are [independently accepted](docs/coordination/CODEX-MERI-HOME-FINAL-ACCEPTANCE.md). Browse workflows is visibly unavailable until its library is implemented. Portfolio uses the designated Clerk application and existing `capirov2` services; its signed-in preview acceptance remains open.

Use Node 24 and npm 11. Install and run commands from the repository root; `package-lock.json` is the only active install lock.

```sh
npm ci --no-audit --no-fund
npm run dev -- --port 5188
npm run check
npm exec --workspace @capiro/web -- playwright install chromium
npm run test:browser
npm run build
npm run start -- --port 5188
```

`check` verifies immutable public artifact bytes, workspace typechecks, focused Meri and architecture tests, dependency boundaries, the 21-case composed transport qualification, application lint, Portfolio formatting and Portfolio unit tests. Browser tests use a separate loopback component host on port 5191 with synthetic service responses. `build` compiles the public Meri client before the shared Next.js application. The [Portfolio container](apps/web/deployment/portfolio/README.md) also builds from this root and lock.

The 15-case Elements qualification requires a fresh, hash-bound SSR receipt and is deliberately separate from routine `check`. Follow [its explicit preparation instructions](packages/qualification-elements/README.md), then run `npm run check:elements` with the receipt environment. Commands must not silently substitute an old receipt or imply live authentication, source policy, persistence or G1 qualification.

Public backend inputs and their acceptance limits are recorded in [vendor metadata](vendor/README.md) and [the migration acceptance](docs/coordination/CODEX-FRONTEND-MIGRATION-ACCEPTANCE.md). `node scripts/public-packages.mjs --help` documents the read-only artifact checker. Historical standalone locks and provenance remain qualification baseline data.

Portfolio's [11 October continuation](docs/portfolio-31/CONTINUATION-2026-10-11.md) records the current change and verification. The [portable handover](docs/portfolio-31/handover-2026-10-11/HANDOVER.md) preserves the prior 728-unit / 459-browser checkpoint, phased plan and operational history. The [consolidation source map](docs/portfolio-31/CONSOLIDATION-SOURCE-MAP-20261011.json) accounts for every moved or superseded source file. Portfolio still has 337 in-scope audit rows awaiting final acceptance.


## Modules integration context

# Capiro frontend

For the complete Modules and Settings restart package, read the [session handover](docs/modules-settings/HANDOVER.md) and [context file index](docs/modules-settings/CONTEXT-INDEX.md), including pinned source inventories and the captured design/workbook archive.

Independent product frontend for Meri, Portfolio, Modules and Settings. Created at the human owner's request on10October2026. Meri backend and runtime remain separately owned in [meri-greenfield](https://github.com/neo-capiro/meri-greenfield); Portfolio and Modules backend services remain in [capirov2](https://github.com/neo-capiro/capirov2).

Read [the architecture](docs/ARCHITECTURE.md) and [implementation standards](docs/IMPLEMENTATION-STANDARDS.md) before changes. `apps/web` composes the shared shell, Meri Home, Modules and Settings; `packages/ui` owns reusable presentation, and `packages/meri-client` owns the public browser transport/projection adapter. Portfolio's transferred source is in `apps/portfolio-web` pending shared-app consolidation; see its [move outline](docs/portfolio-31/REPOSITORY-MOVE-OUTLINE.md) and [handover](docs/portfolio-31/handover-2026-10-11/HANDOVER.md). Modules and Settings use the reviewed existing Capiro service boundary; see their [implementation and configuration guide](docs/modules-settings/IMPLEMENTATION.md), [operation map](docs/modules-settings/INTEGRATION-MAP.md) and [verification limits](docs/modules-settings/VERIFICATION.md). The Portfolio mode link requires the approved `NEXT_PUBLIC_PORTFOLIO_URL`.

The current `/` entry and `/meri` screen are a disclosed, disconnected synthetic fixture. Home responsive repair and comparison with the finalized Figma Home reference are [independently accepted](docs/coordination/CODEX-MERI-HOME-FINAL-ACCEPTANCE.md). Browse workflows is visibly unavailable until its library is implemented. Meri authentication/runtime integration and deployment remain open. Modules and Settings have their own Clerk boundary; live service qualification is documented separately.

Use Node24 and install from the repository root with `npm ci --ignore-scripts --no-audit --fund=false --update-notifier=false`. The root lock controls the workspace install. During the Portfolio repository transfer, `apps/portfolio-web` also retains its original lock for the independently built preview container; unify this when Portfolio joins the canonical `apps/web` build. `npm run dev` starts the local Meri web app; `npm run check` verifies public artifact bytes, all declared workspace typechecks, Meri and Modules/Settings behavior tests, architecture and the21-case composed transport qualification. Run the Portfolio app's `check`, `format:check` and `test:browser` scripts separately from its workspace directory. `npm run build` compiles the public client before building the shared web app; Portfolio has its own build until consolidation.

The15-case Elements qualification requires a fresh, hash-bound SSR receipt and is deliberately separate from routine `check`. Follow [its explicit preparation instructions](packages/qualification-elements/README.md), then run `npm run check:elements` with the receipt environment. Commands must not silently substitute an old receipt or imply live authentication, source policy, persistence or G1 qualification.

Public backend inputs and their acceptance limits are recorded in [vendor metadata](vendor/README.md) and [the migration acceptance](docs/coordination/CODEX-FRONTEND-MIGRATION-ACCEPTANCE.md). `node scripts/public-packages.mjs --help` documents the read-only artifact checker. Historical standalone locks and provenance remain qualification baseline data.
