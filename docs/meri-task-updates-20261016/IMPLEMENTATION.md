# Desktop governed task updates

Owner: Codex task-6. Base: `ba95f63b4ec98078547958e32833e791be77a656` (PR60).
The task started at `67d4574d`; the coordinator fast-forwarded the isolated branch
to preserve the shipment owner's later, disjoint initial-input test timing fix.
Branch: `codex/meri-task-update-desktop-task6-20261016`. Separate task-owned checkout;
shipment source and existing test edits remain untouched. No dependency installation,
lockfile change, live credentials, AWS, migrations or deployment.

## Outline

- Meri remains the canonical owner of the task-update receiving contract, normalization,
  immutable approval metadata, authorization, approval decisions, execution and receipts.
  Retain its reviewed generated public receiver/types/schema/metadata as an immutable
  supplemental input; expose only the deliberate `@capiro/meri-client/task-commands` entry.
  Existing contracts0.1.8 and all installed dependencies stay unchanged.
- The new fixed same-origin `/api/task-commands/{prepare,execute}` adapter admits only
  authenticated, origin-checked, bounded JSON requests. The existing opaque session
  bootstrap/lifetime and canonical application/client boundary own connection disposal.
  A literal server opt-in defaults off; preview policy continues to hold these writes.
- `shared/meri-task-commands` owns receiving, exact-proposal retention behind opaque
  handles, bounded transport and retained write uncertainty. A separate journal key
  avoids confusing recommendation attempts with task updates. No automatic write/retry.
- `/meri/task-updates` is direct desktop composition; its feature owns task/patch input,
  proposal presentation and explicit approval-check/execution interaction. Preparation
  locks the reviewed proposal; the browser records no approval decision. No shell or
  first-chat host edits are needed.
- Verify public-input bytes/exports, default-off/API admission and transport bounds,
  exact proposal/receipt correlation, separate approval refusal and recheck, uncertainty,
  expiry and identity/client replacement. Exercise actual host and UI interactions with
  the existing credential-free browser harness. Run focused types, lint and architecture.
  Synthetic HTTP/browser checks do not qualify native authorization or live deployment.

## Ownership

New route, page/host, `features/meri/task-updates`, `shared/meri-task-commands`, scoped tests,
the additive client package export/vendor input and provenance check. Shared edits are
limited to connection-config/bootstrap availability, architecture allocation and browser
harness discovery. Existing shell, initial chat host, package dependencies and lock are held.

## Results

Implemented direct desktop `/meri/task-updates`: explicit opaque connection, known task
ID and optional title/status/date input, immutable approval proposal, explicit separate
approval check/execution, and verified recorded result/replay. Preparing never executes;
there is no browser approval-decision endpoint. The existing application/client boundary
and opaque connection clear private state on replacement, expiry and access loss.

The new fixed authenticated API adapter consumes the public request receiver and forwards
only `/api/task-commands/prepare` and `/api/task-commands/execute`. It retains the existing
same-origin, native Clerk token check, opaque bearer, JSON byte/UTF-8/deadline bounds,
no-store responses and redirect refusal. `MERI_TASK_COMMAND_WORKFLOW_ENABLED` requires
literal `true` plus valid existing connection configuration; its default is off.
Enabling it permits opaque bootstrap, never recommendation/document operations. The
unchanged preview policy continues to hold task-command writes.

`TaskUpdateWorkflow` holds exact received proposals behind opaque UI handles. Its own
scoped query journal retains content-free uncertainty across navigation. A known
`STORED_NOT_RELEASED` / `RESULT_NOT_RELEASED` disposition survives access-loss cleanup;
genuinely unknown outcomes stay unknown. No automatic write/retry or new authority owner
was introduced. Task client selection is a verified UI context, not proof that a task
belongs to that client; trusted Meri/Core owners authorize every task operation.

The immutable supplemental public input comes from Meri [draft PR102](https://github.com/neo-capiro/meri-greenfield/pull/102),
producing commit `cc43d0004be59f315658207405ff1aea126adad5`, tree
`07c333a2e0bd1374386813ccc44fafb2c3d577ec`. The four generated browser/types/schema/metadata
files are retained with exact byte hashes in `packages/meri-client/vendor/task-command-application/0.1.0/provenance.json`.
The deliberate `@capiro/meri-client/task-commands` export references that snapshot directly.
No private runtime source, handwritten wire DTO, installed dependency, existing tarball or
lockfile was changed. No dead code was removed.

### Verification and independent review

- Explicit borrowed Node `24.19.0`; no installs. Task-local dependency overlay avoids any
  writes to shipment dependencies; scoped contracts remain the installed reviewed0.1.8.
- Focused Vitest: **30/30 passed**, covering public receiving/correlation, exact prepare and
  execute/replay, separate approval refusal, hostile authority/route/input, source uncertainty,
  response byte/UTF-8 limits, delayed client replacement, fresh proposal clock and withheld-result
  dispositions during access loss. Synthetic HTTP/SQL/source fixtures were generated through the
  actual Meri task application and command owners by `scripts/task-command-fixtures.mjs`.
- Node controller, public-input and architecture allocation checks: **7/7 passed**.
- Full web TypeScript and client-package TypeScript: **passed**. Scoped ESLint and Prettier:
  **passed**. `git diff --check` passes; root dependency lock is byte unchanged.
- Actual desktop Chrome/Playwright host interactions: **4/4 passed** on task-owned localhost5216.
  Covered keyboard prepare, exact immutable execute/replay and separate approval, default-off,
  uncertainty across client-side navigation, client replacement and opaque expiry. Screenshot
  reviewed at1440px: no horizontal overflow or clipped proposal/receipt content. Browser API
  responses and identity are explicitly synthetic. Browser uses a fresh Playwright profile.
- Independent Codex reviewer `/root/scope_audit`: **ACCEPT**, no remaining source behavior
  findings; independently reran30/30 frontend checks,7 controller/boundary/provenance checks,
  and14 generated receiving adversarial controls. All four vendor files match the exact producing
  source tree. Two mandatory size signals were substantively reviewed and recorded with exact
  function fingerprints: the83-line single patch form and87-line single bounded transport factory.
- Full architecture scan retains exit1: `errors=[]`, both new findings are reviewed/nonblocking,
  and **233 pre-existing blocking size findings** remain on unmodified baseline sources. No broad
  cleanup or weakened boundary rule was introduced.

The first Node controller run exposed an unsupported strip-only TypeScript constructor property;
the constructor now uses an ordinary field. Initial Vitest failed before test discovery when Vite
tried a borrowed dependency cache; the overlay was corrected and native config loading used.
Initial browser build saw a root0.1.0 contract rather than package-local0.1.8; the task-local
overlay corrected that. The first interaction run retained three selector timeouts/one pass;
the native status combobox is now selected by accessible role and all four interactions pass.
The browser harness required stopping its exact task-owned Vite PID28284 after tests; the runner
then exited0 and that server's exit was verified. No shared process was stopped.

Successful text receipts, full architecture output, browser summary and reviewed screenshot are
retained under sibling `task-6/validation-evidence/frontend-task-update-*` and
`task-6/validation-evidence/task-update-desktop.png`. Screenshot source is also in the ignored
`apps/web/test-results/modules-browser` output. No heavyweight evidence archive was created.

Full production Next build/standalone release, native Clerk/PostgreSQL/Core authority,
distributed sessions and deployed execution remain **unrun**. These synthetic checks qualify
the source integration only. No live AWS, credentials, migrations, service activation,
deployment or shipment candidate mutation occurred.
