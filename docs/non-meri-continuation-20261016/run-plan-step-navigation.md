# Run to current plan-step navigation

This source slice owns only the existing `RunActions.tsx` return-link substitution, new `RunPlanStepLink.tsx`, dedicated tests and this document. Root-owned Work/Strategies navigation, mutation actions, DTOs, registry, transport, styles and Meri remain unchanged.

## Actual typed witnesses

- `shared/capiro/operations/strategies-agents.ts` defines `strategyRun`: top-level `id`, `missionId`, nullable `strategyId`, state and run history. There is no client ID.
- `findings.execution` has exactly `kind`, `nodeId`, `strategyId`, `missionId` and nullable `pinnedVersionId`. The run's mission ID must match this execution mission ID; a non-null top-level Strategy ID must agree with the execution Strategy ID. A mission ID is not assumed equal to a Strategy ID, and nodes have no invented mission field.
- `strategies-plan.ts` owns the existing `strategies.detail` GET `/strategies/:id`, request `{params:{id}}`, response `strategyDetail`. `strategies-schemas.ts` supplies its canonical client ID and node/parent IDs, including optional nullable `archivedAt`.
- `SelectedClient.tsx` supplies `no-selection`, `loading`, `authorized-client` and `unavailable`. Loading/unavailable selection blocks this read/link. An authorized selected client must equal the returned Strategy client.

## Receiving and navigation

The existing run policy/state gate continues to decide whether Return to plan step is shown. The child performs only the canonical Strategy detail read. It emits no href until exact detail ID, canonical client ID and unique current non-archived node membership agree with the execution binding. All-client/no-selection mode uses the fresh detail client ID only as a navigation hint; it grants no client authority. The existing destination independently re-verifies the selected Core client, current Strategy and exact node before displaying it.

The child read lifetime is keyed by the actual run/execution binding and current selected-client state. The canonical query owner aborts and hides superseded reads. Loading, backend read failure/retry and an unavailable current node remain explicit; there is no whole-Strategy fallback, create command, alias parser, mutation or frozen-version claim. `pinnedVersionId` remains in the run's existing receiving/history ownership; this link opens current content.

No tests, Node/compiler, browser, install, database or provider calls are launched by this source slice. Eighteen focused synthetic binding/render controls are authored for Qualification, all UNRUN; root will format and scan the coherent source batch. Source remains uncommitted/unstaged for root review and final binding.
