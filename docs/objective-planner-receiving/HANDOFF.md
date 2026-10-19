# Objective finish to Planner receiving allocation

Base published frontend9cef177eb294167ea3fbc46289cabbd8c6b8f7c9.
Branchfeat/objective-planner-receiving in separate task-3 receiving worktree.
Reviewed and centrally allocated backend contract42d8142092aa49740526667fd1a58c86ec6c1e61,
tree4143a82437851666ca3ef76bda4647952924dc8c; backendowner01a13d85 owns implementation.

## Owned files before changes

- New shared/capiro/operations/strategy-materialization{,-types,-semantics}.ts
  and exact copied strategy-materialization.contract.json; planner.ts registry.
- Additive shared/portfolio/api/http.ts ApiError unknown response details so this
  receiver can validate the reviewed safe error DTO before displaying it. Existing
  error messages/session handling remain compatible; never display raw details.
- New Portfolio objectives objective-plan-{session,recovery,flow}.ts,
  ObjectivePlanOutcome.tsx; extend ObjectiveGeneration.tsx to compose the single
  finish action and separate generation/plan progress with existing canonical
  generation session/journal owners. No second storage or transport owner.
- New Modules Planner ObjectivePreparedPlan.tsx; minimal PlannerScreen.tsx
  integration in the current project navigation owner. No new global project URL
  contract or replacement task workspace. Route selectors grant no authority.
- Existing Modules objective-destinations/ObjectiveDestinationRoute.tsx: narrowly
  pass a materialization selector to Planner's receiving owner; other module
  kinds refuse it. Planner validates the complete closed selector itself.
- Focused tests/objective-plan\*.test.ts, copied backend wire fixture, dedicated
  browser objective-plan.spec.ts, necessary existing generation regression test
  fixture changes and exact architecture review records if required.

No backend, schema/migration/index/shared-package/lock/Meri/Planner scheduling,
shipping packet or AWS changes. Published9cef177e and shipping4c852b stay fixed.

## Behavior

One explicit finish/generate on a saved ready Objective authorizes generation
then automatic plan preparation after its exact durable receipt. No completed
Objective state, on_hold-asdraft, new task/project cap, or workflow activation.
Recovery after reload uses fresh scope/source checks, frozen request UUIDs and
explicit resume; no automatic uncertain POST replay. Canonical encrypted journal
and cross-tab command locks persist intent before dispatch. Stop observing aborts
reads/unsent automatic continuation, not a durable backend job.

The pinned JSON Schema is copied byte-for-byte and compiled with the locked
Zod4 JSON-Schema reader; semantic checks supplement it. Types describe receiving
values, not a new server DTO/authority owner. Backend remains responsible for
complete locked-snapshot mapping, atomic creation, authorization and lineage.

Prepared plan receiving rereads the generation job and materialization receipt,
checks exact Objective/client/revision/Strategy/version/request chain, disjoint
node/mapping/count/edge and output availability before rendering navigation.
Prepared_with_issues says needs review; partial/unavailable never exposes output
navigation. Existing canonical project/task content and ordinary edits stay in
Planner. Human regrouping does not create a new command or clone tasks.

Full application semantic typing requires suitable Linux qualification with
realistic memory. Focused typing and synthetic browser tests cannot close that
gate; backend nativePG and Coretyping remain independent unqualified gates.
