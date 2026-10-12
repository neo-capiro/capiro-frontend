# Shared frontend integration — 12 October 2026

Neo assigns this session sole shared frontend integration ownership. Worktree:
`/workspace/capiro-integration`; branch `integration/capiro-shared-20261012`.
Original mounted checkouts and feature-owner branches remain untouched.

## Pinned inputs

- main: `02c02d95bdf3949662b9123f425271c6491ffdab`
- Portfolio PR6 foundation: `abaeab37b36d60b3e5185755e1b2c9169d7c92f3`; later
  archive-only additions preserved through `c330cebbd021eb984b4bf64ae13dbb991ae6b1c0`
- Meri PR4: `3cc30ff3182e8050d563516607866cf07efe2aef` (includes PR1)
- Modules PR5: `50155cbbf0e4df1eecba22cbfc9b2c35bff87e0a`

Exact handovers read: Portfolio `c953bc08`, Modules `50155cbb`, Meri backend
`c57b7d26`. Their historical missing-source/ownership holds are superseded by
verified published source and this session's explicit assignment. Runtime,
backend, native row acceptance and shipping holds remain.

## Design and ownership

One Next `apps/web`, root npm lock and build. Portfolio renders at `/`, with
`/portfolio`, existing deep links, `/calendar`, health, sign-in and narrow APIs
preserved. Meri and Modules/Settings keep their existing feature implementations,
assets and meaningful tests. Shared shell composes `HeaderFrame`, a canonical
mode registry and session actions while retaining product-specific controls.

Promote existing Clerk/session lifecycle into one application boundary. Identity
is keyed by user/session/organization; changes abort outstanding requests, clear
queries, selected-client state and mounted editors. Shared client selection has
explicit no-selection/loading/authorized/unavailable states; backend projections
validate availability, and selection never establishes backend authority.

Keep Portfolio service transports, Core/Intel Tracker contracts, Modules fixed
operation gateway and Meri public 0.1 packages distinct. No backend implementation
is copied. Public Planner capability forms retain their deliberate unauthenticated
boundary. No endpoint or unavailable operation is invented.

Preserve the union of all architecture rules, adapting obsolete unallocated-feature
rules to the assigned canonical app and allocating each narrow server adapter.
Keep source-hash size reviews and original test assertions, recording intentional
contract changes. Changed-file intersections: Portfolio/Meri 5, Portfolio/Modules
11, Meri/Modules 3; textual conflicts are assessed during each merge.

## Verification

Retain failing regression baselines for Intel accepted targeting projection,
requested phone-code design copy and disabled Core-404 alert preferences with
zero Intel requests. Then clean install, type/lint/format/architecture/public
package/transport/unit gates, one production build, actual-server and browser
checks on one pinned final application source. Include cross-mode navigation,
history, identity/client replacement, interrupted writes, mobile/desktop,
accessibility and Figma inspection. Historical passes do not qualify this tree.
Record passed, failed and unrun separately. All 337 Portfolio rows remain open.

Publish a new draft integration PR. No main merge, deployment, resources,
credentials, database/security change, real provider messages, billing or paid
model calls. The original owner completed the Portfolio archive; its later commits are merged
and the history bundle is hash-verified without restoring over this checkout.
