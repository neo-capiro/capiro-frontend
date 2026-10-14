# Strategy stored-operation contract review — 14 October 2026

This source review accepts a frontend read-compatibility change while retaining the existing executable PlanEdit validator. Stored proposals may contain unsupported operation shapes; displaying them does not authorize executing them. No unsupported discriminator alias is inferred.

## Reviewed source pins

Backend: `neo-capiro/capiro-backend@91399fe1a205e37073cbeed2d7eb66a1fafd7fa2`.

Frontend baseline: deployed PR46, `neo-capiro/capiro-frontend@462e7b554200f9b4a96c1589d55b6df7ce4a7df5`.

The source was read through the authorized GitHub repository connector. These pins establish the inspected source contracts; they do not identify the backend revision serving the reported diagnostic.

| Source at the stated pin | Exact blob |
| --- | --- |
| Backend `apps/api-strategy/src/agents/change-sets.service.ts` | `d4c535f42d3582282b61362ff82a18e50aa47be1` |
| Backend `apps/api-strategy/src/agents/dto/agents.dto.ts` | `545da21e7e4fb7ee94426c26fb055ee8d12021ba` |
| Backend `apps/api-strategy/src/meri/meri.types.ts` | `98652a1168ad5a913a367cbf0d4340e04e9e0a88` |
| Backend `apps/api-strategy/src/meri/meri.service.ts` | `7579ff15d9fb4ef0757485529eb2e75a7b1b5ca3` |
| Backend `apps/api-strategy/src/agents/agents.controller.ts` | `a71cdf5b242128d97a85af59fa439c454db98aff` |
| Backend `apps/api-strategy/prisma/schema.prisma` | `8bb37cbda7fbd77e49422fbc182cae0ca58e9d25` |
| Frontend `apps/web/src/shared/capiro/operations/strategies-agents.ts` | `134cc85f069b74a66d277703d2573c9c26e621ed` |
| Frontend `apps/web/src/features/modules/strategies/review/ProposalReview.tsx` | `0754f211e3bda6b7b96a18fcf14956270e16500c` |
| Frontend `apps/web/src/features/modules/strategies/review/StrategyReview.tsx` | `edef9ca811adc277d385ce42832e1b7074253bc7` |
| Frontend `apps/web/src/shared/capiro/queries.ts` | `33abb6c00d2b60b083f601f11ce88a3e47b47a4d` |

## Stored response and executable operation contracts

[Backend PlanEditOp](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api-strategy/src/meri/meri.types.ts#L69) and [runtime discriminator validation](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api-strategy/src/meri/meri.service.ts#L926) admit exactly `add`, `update`, `remove`, and `retime`. The original frontend PlanEdit validator admits the same four literals and validates the existing field shapes. Preserve that complete validator unchanged.

[CreateChangeSetDto](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api-strategy/src/agents/dto/agents.dto.ts#L138) deliberately admits `unknown[]`, with an array maximum of 60 and no deep operation DTO validation. Operation validation is deferred to Apply. The service persists `ops` as JSON; list/get return stored records without filtering operations. Approve and Reject also return stored records, including the original operations. Therefore an unsupported stored entry can be valid read data without being an executable PlanEdit.

The baseline frontend used `z.array(planEdit)` for `strategyChangeSet.ops`, causing one unsupported entry to reject the whole proposal list. The same schema also validated Approve/Reject responses, so a successful server review action could fail response validation when its returned original operations contained an unsupported entry. The baseline projection omitted `approvedOps`.

The compatible read contract should retain the strict change-set metadata envelope and every raw array entry. Optional nullable `approvedOps` accommodates the nullable backend field and the prior frontend projection/fixtures. If a present non-null `approvedOps` value is not an array, reject the envelope rather than silently executing original `ops`. Apply and Undo continue returning the existing `strategyDetail` contract.

Classify each complete raw entry through the existing PlanEdit validator. Keep the raw value separately because successful object parsing can omit unknown fields. Unsupported means the existing wire shape did not validate; supported means it did, not that node access, dates, lifecycle, dependencies, or other backend semantic checks have passed.

## Action indexing and actual subset behavior

The executable [ChangeSetsService](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api-strategy/src/agents/change-sets.service.ts#L235) establishes these action contracts:

| Action | Permitted status | Operation index basis | Successful response |
| --- | --- | --- | --- |
| Approve | `proposed` | Original `ops` | Stored change set |
| Apply | `proposed` or `approved` | `approvedOps ?? ops` | Strategy detail |
| Reject | `proposed` or `approved` | No operation indexes | Stored change set |
| Undo | `applied` | No operation indexes | Strategy detail |

Approve validates each requested integer against original `ops.length`, rejects an explicitly empty array, sorts and deduplicates indexes, and persists the selected entries as a compact `approvedOps` array in original operation order. Omitting `opIndexes` approves without creating a subset.

Apply starts from `cs.approvedOps ?? cs.ops`. When explicit indexes are supplied, it validates them against that effective array, rejects an explicitly empty selection, sorts/deduplicates indexes, and replays the selected entries. It records the applied subset in `approvedOps`; direct Apply from `proposed` does not fabricate approval metadata. Omitting indexes replays the entire effective array.

Examples:

| Stored operations and state | Safe explicit selection | Interpretation |
| --- | --- | --- |
| Original `ops = [unsupported, validA, validB]`, proposed | Approve or direct Apply `[1, 2]` when `approvedOps` is null/absent | Original indexes retain their gaps; never submit compacted `[0, 1]` |
| Original `ops = [unsupported, validA, validB]`; original index `[2]` approved | Apply `[0]` against `approvedOps = [validB]` | The original index `2` is now effective index `0` |
| `approvedOps = [unsupported, validB]` | Apply `[1]` | Unsupported effective index `0` remains visible and unselectable |
| `approvedOps = []` | No Apply selection | Nullish coalescing retains the empty array; it must not fall back to original `ops` |
| `approvedOps = null` or absent | Apply indexes original `ops` | This is the actual nullish fallback |

The backend comment near lines 394–399 says a conflicting selection on an approved row is rejected. The executable body at lines 400–416 contains no equality check against the approved subset: it permits selecting a further subset within `approvedOps`. Follow executable source and preserve valid selective Apply; do not impose an invented all-approved-operations rule.

Do not reconstruct original indexes for compact approved entries by object equality: identical original entries can exist, and the record does not expose an authoritative original-index mapping. Label the effective Apply basis explicitly while keeping the full original list available for audit.

## Authority, locking, stale state, and rollback

The [controller](https://github.com/neo-capiro/capiro-backend/blob/91399fe1a205e37073cbeed2d7eb66a1fafd7fa2/apps/api-strategy/src/agents/agents.controller.ts#L60) retains `TenantGuard`, `StrategyPlannerGuard`, and `AgenticGuard`. It derives tenant and user context server-side. Browser selection and read classification do not establish authority.

The service uses existing `withTenant`/`withTenantUser` scopes. Proposal creation checks the strategy and optional run under the tenant scope, pins the current strategy head, and seals that head against coalescing. Approve/Reject acquire a change-set row lock with an explicit tenant predicate before reading the permitted lifecycle state.

Apply acquires the change-set row lock before checking status, then the strategy row lock before checking its head. The stated lock order is change set then strategy. This serializes repeat Apply on the same proposal and prevents different proposals pinned to the same head from both applying against an unseen concurrent plan mutation.

If the strategy head differs from the proposal's pin, Apply writes/logs `stale` inside the transaction, commits that result, and throws 409 after commit. Malformed executable operations and plan verification failures throw inside the Apply transaction, rolling back the entire operation batch, version, and status mutation.

Undo requires `applied` and checks that the current head still equals `appliedVersionId`. It uses the existing version restore with `expectedHeadVersionId`, then updates the change-set status in a second transaction. The source documents the two-transaction interruption limitation; this frontend compatibility change does not change that contract.

A proposed record can be refreshed in place while its strategy head remains pinned. The existing review API carries operation indexes, not an expected proposal-content revision/hash. A frontend can invalidate a selection/confirmation when it observes same-ID content/status/pin/effective-basis changes; it cannot establish an unseen exact-content revision at the server. Keep this existing limitation explicit and do not invent a new request field or authorization layer.

## Presentation and submission invariants

- Keep every raw original/effective entry in order with its own index. Unsupported entries remain visible, auditable, and unselectable.
- Do not filter unsupported entries before deriving indexes. Do not map unknown discriminator strings to known operations.
- Derive selectable entries using the unchanged full PlanEdit validator, including typed fields and sources. Nulls, primitives, nested arrays, malformed objects, and malformed sources must not crash presentation.
- Display raw unsupported data as escaped text, with a clear unsupported explanation. Audit source rendering must not blindly read or flatten arbitrary raw `sources` fields.
- Use the correct action basis and explicit nonempty supported index arrays for Approve/Apply. A disabled button alone is insufficient; confirmation must recheck the current status, basis, and selected entries.
- Retain Reject independently of executable-operation support. Retain status-appropriate Undo independently of unsupported historical originals.
- Preserve valid selective actions when unsupported originals exist but the effective approved list is supported.
- Invalidate known stale selection/confirmation. On 409/422 or a transport failure, retain the proposal/error, never close as success or automatically retry/replay the write. Existing mutation hooks reject concurrent/replaced writes and remain canonical.
- The strict backend remains authoritative for node authority, field semantics, lifecycle, tenant access, stale plan state, and transactional rollback.

## Reported diagnostic limits and verification scope

The parent supplied value-free upstream failures at `[11, "ops", 0, "op"]`, `[12, "ops", 0, "op"]`, `[19, "ops", 0, "op"]`, and `[20, "ops", 0, "op"]`: code `invalid_value`, expected type `string`, received type `string`. This is consistent with enum/literal rejection but does not reveal any rejected value, the surrounding operation, or the serving backend revision. It does not justify an alias, another executable variant, or weakening the PlanEdit validator.

Relevant synthetic acceptance cases are mixed valid/unsupported queues; invalid and non-string discriminators; null/primitive/array entries; wrong typed fields and sources on known operations; duplicate identical entries; original selective index gaps; compact approved indexes; unsupported effective-index gaps; absent/null/empty approved arrays; compatible Approve/Reject responses; allowed status actions; pending mutations; same-ID refreshed state; and stale 409 without success callbacks or replay. Root owns implementation checks and desktop browser receipts.

This document records a bounded source-contract review. It does not claim live account acceptance, native/backend integration, or deployed backend equivalence. No backend/product/test edits, runtime execution, database writes, AWS actions, deployment, or alias guesses were performed by the contract reviewer.
