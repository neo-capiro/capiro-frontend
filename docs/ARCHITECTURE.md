# Frontend ownership and implementation outline

Human decision 10 October 2026: one frontend repository hosts Meri, Portfolio and eventually Modules and Settings. The independently deployed Meri backend/runtime remains in `neo-capiro/meri-greenfield`. Portfolio connects to existing `neo-capiro/capirov2` services. The current Portfolio continuation does not implement Modules or Meri features or change existing backend infrastructure.

## Responsibilities and module direction

`apps/web` is the canonical Next.js application. Its entry/layout/routes compose a shared shell and feature modules; they do not authorize data access or orchestrate agent runs. The shared `HeaderFrame` owns common header geometry through explicit slots. Each product owns its navigation and session composition. Meri owns its conversations/workspace presentation and local interaction. Portfolio owns its index, client profile, Objectives, Calendar, Relationships, Prospects, Files and retained client surfaces under `src/features/portfolio`. Modules and Settings remain unavailable without speculative services or empty feature packages.

Portfolio routes live in `src/app/(portfolio)`. This route group's layout owns the Portfolio Clerk provider and a scoped styling marker; the canonical root layout owns the document and shared fonts. Portfolio CSS and dark tokens are scoped to a document containing that marker, including dialogs rendered through portals. A Portfolio form/drawer wrapper consumes the canonical `@capiro/ui/dialog` primitives. The Meri synthetic entry remains the default home; the isolated Portfolio image explicitly sets `CAPIRO_DEFAULT_PRODUCT=portfolio` to redirect `/` to `/portfolio`.

`packages/ui` owns adopted reusable presentation primitives and their upstream provenance. `packages/meri-client` owns the browser event transport/projection adapter and narrow public exports. Qualification packages own executable compatibility fixtures and are not production import targets. Distinct independent reviews accepted this source ownership and the exact move/coverage mapping for offline migration; backend removal remains a separate verified integration step. Do not copy code into parallel owners.

Dependency direction is web shell/features → shared foundations and public UI/client packages → published contracts and upstream libraries. Feature modules cannot import another feature's private files. Portfolio areas expose deliberate `public.ts` or `*-public.ts` interfaces to other Portfolio areas. Shared Portfolio foundations never import feature modules; reusable website validation and current-client writer checks have shared owners. UI primitives depend on neither features nor Meri runtime. Contracts contain protocol validation/types only. No circular package dependencies, private cross-repository paths, unrestricted query service or second agent loop is allowed.

## State, authority and failures

The browser owns draft input, selected local views and subscription disposal. The trusted backend owns authenticated tenant/actor/client binding, run admission/control, authorization/revocation, durable state, skill enforcement, approvals and receipts. Closing a view does not cancel a durable run. Stream completion does not establish run completion. Immutable artifact actions bind the version actually displayed.

Meri currently uses a clearly labelled disconnected synthetic fixture. Portfolio's narrow `/api/backend/[service]/[...path]` adapter consumes the existing designated Clerk `capiro` JWT and explicitly configured `capirov2` service origins. Its allowlists, same-origin mutation checks, deadlines and no-store responses remain in `shared/portfolio/api`; the route only adapts Next requests. Missing configuration fails closed. The session boundary replaces the query cache when user, session or organization changes. Browser checks reject stale or mismatched receipts; trusted backend authorization remains authoritative. No credential store, guessed endpoint, second backend service or authentication bypass belongs in the frontend.

## Reuse and migration

Use Next.js/React, AI SDK UI transport, AI Elements and shadcn primitives specified in the approved Meri deployment plan. Reuse the independently adopted source and supported SDK APIs from the NEW Meri qualification work, preserving licenses, pins and meaningful19-transport/15-Elements coverage. Generate browser-safe types/validators from backend-owned frozen schemas through a versioned public package. Keep server event production canonical in the backend and consume its deliberate test interface only in composed compatibility checks.

Record every moved/deleted source and surviving test assertion before deletion. Active imports, scripts and documentation entry links must resolve after migration; immutable historical evidence retains original paths and hashes. No duplicate active implementations or abandoned backend UI files may remain when migration is accepted.

The root workspace lock is the only active install lock. Portfolio's former independent lock and entry/config duplicates were superseded by the shared application; its source map records all 710 original files, including 703 moves and seven superseded files. Earlier client/transport standalone locks live under `packages/qualification-transport/baseline` as historical evidence; the original Elements lock remains its baseline. Public Meri contract/producer tarballs under `vendor` are immutable, reviewed inputs with backend producing commits and exact byte hashes. They are the supported Meri cross-repository boundary. Portfolio schemas validate the existing `capirov2` HTTP contracts and record pinned backend references; they do not create a new backend owner. The frontend does not resolve a backend checkout. Canonical 0.1.0 Meri contracts cover the frozen event wire schema; candidate R2 retrieval contracts are not exported or implicitly frozen by this move.

## Verification and review signals

Required foundation checks: exact package pins/lock, safe imports, public export boundaries, TypeScript, relevant meaningful behavior tests, production build, route discovery, actual browser interactions, keyboard/accessibility and comparison with the pinned Figma target. A synthetic screenshot/build does not qualify live authentication, transport, policy, durability or deployment. Report those limits.

Review first-party files over400 nonblank lines, functions over80 nonblank lines and cycles, alongside the human's semantic responsibility triggers. These are proportional review signals, not design proof or fragmentation quotas. Classify generated catalogs, upstream vendor files and evidence separately. Keep a single owner per lockfile/shared interface and return bounded reviewable commits from dedicated worktrees.

The architecture guard scans imports and function bodies through the TypeScript AST. It enforces package exports, route thinness, Portfolio public interfaces, shared-foundation direction, cycles and restricted browser patterns. A fingerprinted transfer baseline identifies unchanged inherited size findings as **unreviewed**, not approved. New or changed findings require an exact, function-specific responsibility review; all findings remain visible. Reviews and the transfer baseline are data owned by `scripts/architecture`, separate from the scanner and policy code.



## Modules and Settings allocation — 12 October 2026

The owner has now allocated Modules and Settings under `apps/web/src/features/modules` and `features/settings`. Their shared application boundary lives in `shared/capiro`; reusable controls and meetings live in `shared/module-ui` and `shared/meetings`. The Meri runtime and the separate Portfolio application remain independently owned. See [implementation](modules-settings/IMPLEMENTATION.md), [design review](modules-settings/STRUCTURE-REVIEW.md) and [verification](modules-settings/VERIFICATION.md). The earlier disconnected-destination description above records the foundation phase and is superseded for these allocated surfaces.

Size signals remain visible. Exact source-hash review records in `docs/architecture-size-reviews.json` satisfy a completed design review, with no blanket path/JSX exemption. A changed file or new signal requires review again. Boundary errors and cycles always fail; they cannot be waived by a size record.
