# Frontend ownership and implementation outline

Human decision10October2026: one new frontend repository hosts Meri and eventually Portfolio, Modules and Settings. The independently deployed Meri backend/runtime remains in `neo-capiro/meri-greenfield`. Current Capiro implementation and infrastructure remain untouched. Cleanup applies to the new backend only.

## Responsibilities and module direction

`apps/web` is the Next.js application. Its entry/layout/routes compose a shared shell and feature modules; they do not authorize data access or orchestrate agent runs. The shell owns navigation, responsive structure, design tokens and session display. Meri owns its conversations/workspace presentation and local interaction. Portfolio, Modules and Settings gain cohesive feature modules when their implementation is authorized and available; disabled mode descriptors reserve intended destinations without dead links or empty service packages.

`packages/ui` owns adopted reusable presentation primitives and their upstream provenance. `packages/meri-client` owns the browser event transport/projection adapter and narrow public exports. Qualification packages own executable compatibility fixtures and are not production import targets. Distinct independent reviews accepted this source ownership and the exact move/coverage mapping for offline migration; backend removal remains a separate verified integration step. Do not copy code into parallel owners.

Dependency direction is web shell/features → public UI/client packages → public backend-owned wire contracts and upstream libraries. Feature modules cannot import another feature's private files. UI primitives depend on neither features nor Meri runtime. Contracts contain protocol validation/types only. No circular package dependencies, private cross-repository paths, unrestricted query service or second agent loop is allowed.

## State, authority and failures

The browser owns draft input, selected local views and subscription disposal. The trusted backend owns authenticated tenant/actor/client binding, run admission/control, authorization/revocation, durable state, skill enforcement, approvals and receipts. Closing a view does not cancel a durable run. Stream completion does not establish run completion. Immutable artifact actions bind the version actually displayed.

Initially use a clearly labelled disconnected synthetic fixture. Do not create an unauthenticated proxy, credential store, fake live endpoint or guessed integration route. Future verified session/navigation contracts preserve scope and handle expiry/revocation. Portfolio/Modules/Settings destinations remain unavailable until implemented and tested.

## Reuse and migration

Use Next.js/React, AI SDK UI transport, AI Elements and shadcn primitives specified in the approved Meri deployment plan. Reuse the independently adopted source and supported SDK APIs from the NEW Meri qualification work, preserving licenses, pins and meaningful19-transport/15-Elements coverage. Generate browser-safe types/validators from backend-owned frozen schemas through a versioned public package. Keep server event production canonical in the backend and consume its deliberate test interface only in composed compatibility checks.

Record every moved/deleted source and surviving test assertion before deletion. Active imports, scripts and documentation entry links must resolve after migration; immutable historical evidence retains original paths and hashes. No duplicate active implementations or abandoned backend UI files may remain when migration is accepted.

The root workspace lock is the only active install lock. Earlier client/transport standalone locks live under `packages/qualification-transport/baseline` as historical evidence; the original Elements lock remains its baseline. Public contract/producer tarballs under `vendor` are immutable, reviewed inputs with backend producing commits and exact byte hashes. They are the supported cross-repository boundary. The frontend does not resolve a backend checkout. Canonical0.1.0 contracts cover the frozen event wire schema; candidate R2 retrieval contracts are not exported or implicitly frozen by this move.

## Verification and review signals

Required foundation checks: exact package pins/lock, safe imports, public export boundaries, TypeScript, relevant meaningful behavior tests, production build, route discovery, actual browser interactions, keyboard/accessibility and comparison with the pinned Figma target. A synthetic screenshot/build does not qualify live authentication, transport, policy, durability or deployment. Report those limits.

Review first-party files over400 nonblank lines, functions over80 nonblank lines and cycles, alongside the human's semantic responsibility triggers. These are proportional review signals, not design proof or fragmentation quotas. Classify generated catalogs, upstream vendor files and evidence separately. Keep a single owner per lockfile/shared interface and return bounded reviewable commits from dedicated worktrees.
