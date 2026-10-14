# Strategy stored proposal compatibility

The proposal queue now retains stored JSON operations that the current frontend cannot execute. Each entry keeps its original index and raw audit details. Unsupported entries are visibly marked and cannot be selected for Approve or Apply. Supported entries retain selective actions; Reject, audit and status-appropriate Undo remain available.

## Source and dependency boundary

Dedicated branch: `repair/capiro-strategy-proposal-compatibility-20261014`. Immutable frontend base: deployed PR46 `462e7b554200f9b4a96c1589d55b6df7ce4a7df5`, tree `adfbf175663a3bb8db78c791117021949b8adf4c`. This candidate is stacked on PR46; it does not merge, deploy or advance another owner's branch.

The unchanged executable PlanEdit validator accepts exactly `add`, `update`, `remove` and `retime`. A separate stored-record schema retains JSON values in `ops` and optional nullable `approvedOps`; it still validates the record's IDs, risk and status. Runtime JSON validation remains `z.json()`, with an opaque static operation type to contain recursive registry type expansion. Classification calls the original validator for every entry. No operation aliases or browser authority are introduced.

[Contract source review](CONTRACT-REVIEW.md) pins the existing backend owner and describes its current code, including the distinction between stored proposal reads and executable Apply validation. The observed deployed diagnostics expose invalid-value types and paths only. They do not reveal the invalid strings or served Strategy source SHA, so this candidate does not guess their meanings.

## Action and index contract

| Action | Current statuses | Index basis | Selection |
| --- | --- | --- | --- |
| Approve | proposed | original `ops` | Explicit nonempty unique supported indexes |
| Apply | proposed, approved | `approvedOps ?? ops` | Explicit nonempty unique supported indexes |
| Reject | proposed, approved | No operation indexes | Unsupported entries do not prevent rejection |
| Undo | applied | No operation indexes | Existing backend stale/later-edit checks remain authoritative |

For example, approving original operation `2` persists a compact one-entry `approvedOps`; applying that stored selection sends index `0`. An empty `approvedOps` array remains empty and disables Apply rather than falling back to original operations. Original and stored application-selection audit sections each retain their own full index space, including malformed and unsupported entries. The existing backend allows further supported subsets of the approved array; this view preserves that behavior.

A changed same-ID receipt, full pin, status, approved selection or read availability disposes the old review session, selections and confirmation. The current read must be available before a decision. Synchronous duplicate confirmation is guarded; retiring an in-flight view prevents its completion from closing or refreshing the replacement. Backend errors retain the review and confirmation and do not automatically replay a mutation. These are view-lifetime controls, not authorization or durable delivery receipts. Existing Approve/Apply requests contain proposal ID and indexes, without an expected operation-content revision. The backend can refresh a still-proposed ops array in place without moving the plan pin. An unobserved refresh between read and command is therefore not durably bound to the displayed operations by this frontend candidate; observed props are invalidated, while backend status/locks and Apply validation/rollback remain authoritative. This existing source limitation does not introduce an API or auth change.

## Ownership and overlap

| Area | Candidate ownership / dependency |
| --- | --- |
| Stored change-set contract | One canonical frontend schema, reused by list/Approve/Reject responses |
| Executable operation validation | Existing PlanEdit shape retained exactly; backend Apply remains authoritative |
| Proposal interaction | Existing Strategy review presentation, classification, selection and raw audit |
| Transport/auth | Existing gateway, mutation hooks, login and tenant permissions unchanged |
| Desktop parity | PR46 is the exact base; no parity component, styling or configuration edits |
| Backend | Read-only pinned contract evidence; no backend, database or migration edits |
| Test harness | Existing synthetic loopback harness plus a bounded refresh probe and focused scenarios |
| Other Capiro work | No engagement reporting, source-contract, provider, newsletter or shared-task changes |

## Verification and limits

The [independent source/design/desktop receipt](INDEPENDENT-SOURCE-DESIGN-REVIEW.json), [final qualification receipt](QUALIFICATION.json) and [byte-exact evidence manifest](EVIDENCE-MANIFEST.json) accompany this handoff. Required npm run check passed: 113 root controls, 84 transport tests, 2367 frontend tests, 483 Capiro tests, 385 newsletter tests and 8 declaration checks; lint has 0 errors and 81 warnings. The default Next/Turbopack production build passes through the task-local exact-version CLI, with 93 warnings retained. The repository credential-free production standalone runner passes. Cached-CLI failures remain separately recorded. All failed attempts remain in the evidence index alongside passing reruns. Synthetic tests cover raw retention and envelope refusal, supported/unsupported classification, status guards, original and compact indexing, empty approved arrays, refresh/availability invalidation, pending duplicate confirmation, stale refusal and audit preservation. Desktop cases reuse existing primitives at the harness's 1440×1040 viewport with light and dark color-scheme emulation. The retained screenshots have identical hashes because the inherited Modules styles remain fixed light; this candidate does not claim new dark-theme visual parity.

Local qualification reuses existing exact-version installed tools and committed public vendor packages. Fifty missing nonoptional packages were materialized locally from committed lockfile URLs, with integrity verification and bounded archive extraction; no lifecycle scripts ran and no dependency, lockfile or source pin changed. [Dependency receipt](LOCKED-DEPENDENCY-MATERIALIZATION.json) records the initial rejected archive-root assumption and corrected retry. The first default production build refused package-source symlinks outside the unchanged Turbopack root. For its retry, 745 already-installed packages were verified against the committed root lock and copied byte-for-byte into task-local resolver directories (679 MiB); six native files remain borrowed links to the existing executable cache. No shared files, package versions, scripts or configuration were changed. [Resolver input receipt](LOCAL-BUILD-PACKAGE-INPUTS.json) and [copy receipt](LOCAL-BUILD-PACKAGE-COPIES.json) retain those details. The default bundler also required identical task-local JS/assets from 745 lock-matched cached packages; native binaries remain borrowed from their existing executable locations because the RAM checkout is mounted noexec. [Local copy receipt](LOCAL-BUILD-PACKAGE-COPIES.json) records this, with no shared-file changes. This is a local qualification environment, not an image, clean-install or native acceptance claim.

Live identity/tenant reads or writes, deployed acceptance, AWS operations, provider sends, paid calls and native database/RLS checks remain unrun. This candidate does not resolve unknown historical operation semantics or migrate stored proposals. Publication is a draft PR only.
