# Desktop application integration — 19 October 2026

## Ownership and implementation outline

The receiving owner owns the shared shell/session navigation, shared meeting-material lifecycle, architecture review registry, documentation and final integration. Separate Codex workers own Portfolio feature fixes and Modules campaign fixes in dedicated worktrees. No worker is configured with an unsupported reasoning override. Meri remains read-only: the receiver composes published PR98 unchanged, without authoring Meri controls or contracts. The roster/config chain PR99–101 is retained unchanged; no frozen build input or deployment configuration is edited.

The candidate starts from frontend PR101 `4814e642dc11df6815f01ac9f64c4ac0b24a1251`, receives PR98 `5c784e3e46114816ba57db17ad7a2c2013a8d81a`, and receives the additive Outreach campaign source `3e6c0a9e39b858fb47eb6cad9ca79008963619aa`. Every input remains a separately identifiable ancestor. Do not merge protected branches or deploy this source.

Canonical responsibilities remain: server-side Core authorization/data; shared SelectedClientProvider for verified navigation hints; fixed-operation Capiro transport for Modules/Settings; existing Portfolio transport; domain-specific campaign and meeting presentation. Route hints never grant authority. Account-wide Settings must stay accessible if its optional client hint is unavailable; only a verified hint may leave Settings.

Pending mutations must freeze submitted fields and competing/dismissal actions, reject overlapping submissions synchronously, preserve a rejected draft, and validate receipt association before exposing editing. Scope replacement retains the existing cancellation/currentness behavior. No generic abstraction, contract duplication, new dependency, migration or backend authentication change is proposed.

## Verification

Run immediate focused receipt/data-loss regressions; check changed types, formatting and boundaries. After worker integration, run one production build, repository integration checks, and desktop regression suites. Record exact viewport and fixture status for browser screenshots. Inaccessible Figma assets, unavailable live services and unrun authentication/migration gates remain explicit. Design inventory is screen/state coverage, not a count of shipped routes.
