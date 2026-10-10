# Capiro frontend

Independent product frontend for Meri and the future Portfolio, Modules and Settings areas. Created at the human owner's request on10October2026. Meri backend and runtime remain separately owned in [meri-greenfield](https://github.com/neo-capiro/meri-greenfield).

Read [the architecture](docs/ARCHITECTURE.md) and [implementation standards](docs/IMPLEMENTATION-STANDARDS.md) before changes. `apps/web` composes the shared shell and Meri Home; `packages/ui` owns reusable presentation, and `packages/meri-client` owns the public browser transport/projection adapter. Portfolio, Modules and Settings remain disabled destinations until their cohesive feature implementations are available.

The current `/` entry and `/meri` screen are a disclosed, disconnected synthetic fixture. They contain no authenticated service connection. Home responsive repair and final comparison with the updated Figma reference remain open; local build success does not establish deployment readiness.

Use Node24 and install from the repository root with `npm ci --ignore-scripts --no-audit --fund=false --update-notifier=false`. The root lock is the sole active workspace lock. `npm run dev` starts the local web app; `npm run check` verifies public artifact bytes, all declared workspace typechecks, focused tests, architecture and the21-case composed transport qualification. `npm run build` compiles the public client before building the web app.

The15-case Elements qualification requires a fresh, hash-bound SSR receipt and is deliberately separate from routine `check`. Follow [its explicit preparation instructions](packages/qualification-elements/README.md), then run `npm run check:elements` with the receipt environment. Commands must not silently substitute an old receipt or imply live authentication, source policy, persistence or G1 qualification.

Public backend inputs and their acceptance limits are recorded in [vendor metadata](vendor/README.md) and [the migration acceptance](docs/coordination/CODEX-FRONTEND-MIGRATION-ACCEPTANCE.md). `node scripts/public-packages.mjs --help` documents the read-only artifact checker. Historical standalone locks and provenance remain qualification baseline data.
