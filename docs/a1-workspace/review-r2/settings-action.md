# PR117 canonical Settings test correction

The review at `ceeecdf7066ca7ed9cc17f8a8e86a32ef6d29b6e` found that `security-action.test.ts` requested undeclared jsdom. The canonical Capiro command includes this source test; passing web-suite totals did not qualify its worker startup. No package, lockfile, test glob or test configuration is changed.

Only this test file changes executable code. It uses the existing Node/SSR hook-probe pattern, with stable state/ref/memo cells, real QueryClient snapshots and subscriptions, effect dependency tracking and cleanup, and explicit rerenders. Render-phase updates settle before effects commit. Unmount runs cleanups and discards hook cells; the recovery storage survives a new mount/cache. Late setters retain their original cell array. The harness does not itself abort signals, freeze write inputs or validate receipts: those remain real production behavior.

Independent TypeScript AST comparison confirms all **27 complete assertion expressions**, in order, and all test declarations/parameterized inputs are unchanged: **10 expanded cases**. No case is skipped, renamed out of the glob or deleted. The 376 nonblank lines have one test responsibility: the Settings write lifecycle and its local probe. No production hook or shared shell changes.

## Verification

- Exact canonical command `npm run test:capiro --workspace @capiro/web -- --maxWorkers=1`: **exit 0, 54 files / 590 tests passed**, no worker startup errors; 65.37 seconds. The process exit is checked, not inferred from a JSON success field.
- `NODE_OPTIONS=--max-old-space-size=5120 npm run typecheck`: **exit 0, zero diagnostics** across configured workspaces.
- ESLint on the changed test: **exit 0, zero errors/warnings**.
- Three focused mutants: **3/3 killed by assertions**, all 10 tests collected per run, no unhandled errors. Removing scope abort fails all five scope-change cases; removing input cloning fails frozen-input assertions; removing receipt validation fails the uncertain-receipt fence. Both temporarily mutated production files were restored byte-exact to the passing candidate; hashes are recorded in JSON.
- Diff whitespace check passes. Dependencies reuse the existing matching-lock installation, including pinned nested contracts for typechecking. This is not a fresh-install claim.

The canonical pass preceded temporary mutations; exact restoration is verified. Source hashes, command/exit/counts and mutation failing names are retained in `settings-action.json`; raw local logs are `/dev/shm/fe117-r2-*`.

## Coverage boundaries

This is synchronous hook behavior through Node/SSR, not DOM, StrictMode, concurrent React or external-store tearing qualification. `security-form.test.tsx` remains outside the Capiro `*.test.ts` include, and its DOM behavior remains explicitly unqualified. The previous web 3064/build/full-lint receipts apply to their recorded earlier snapshot; those broad checks were not rerun for this test-only correction. No browser, native, provider or live checks are implied. No new dependency, SQL execution, merge or deployment occurred.
