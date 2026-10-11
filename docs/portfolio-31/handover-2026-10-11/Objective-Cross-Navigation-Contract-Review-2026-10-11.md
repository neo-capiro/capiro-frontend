# Objective cross-navigation contract review

As of 2026-10-11 14:10 UTC. `OBJ-26` remains unimplemented and unaccepted. This is a source and packet review; no destination or objective linkage was changed.

The current Portfolio objective page opens an objective editor by `?objective=<id>`. Its frontend objective schema has a client ID and objective ID, but no strategy, Planner project/task, engagement-plan, Directory target, or file-link fields. The client shell already has generic Calendar and Files routes. Those are client-scoped destinations, and the present objective UI supplies no objective-bound filter or target for either.

The packet's current Meri handoff review finds no verified arbitrary `objectiveId` URL contract for the native Strategy editor. It also finds that ordinary assistant actions can mutate an authoritative plan without a uniform review gate. A generic link to Planner, Directory, or an engagement plan would therefore lose objective context and could suggest lineage that has not been established.

Before implementing the five objective actions, the Objectives/Strategy/Planner and destination owners need to specify:

1. Which persisted identifiers bind an objective to its strategy, Planner project/tasks, engagement plan, Directory targets, and context files, with tenant/client access checks.
2. Exact deep-link or query contracts for each destination, including behavior when a target is absent, deleted, inaccessible, or belongs to a different client.
3. Whether Calendar and Files should open a client view or an objective-filtered view. The UI must label a generic client destination as such if that is the approved behavior.
4. Strategy generation/review/activation semantics for navigation that enters the native editor. A link must not imply a mandatory approval gate that the destination does not enforce.
5. Native browser acceptance for each destination, back navigation, stale linkage, permission loss, and missing-context recovery.

Relevant source: `apps/portfolio-web/src/features/objectives/ObjectivesPage.tsx`, `ObjectiveEditor.tsx`, `contracts.ts`, `src/shared/shell/client-views.ts` at local head `b93609331769db7e6d254c1be2b6b862f5175ec1`; packet `phase-audit-map.csv` row `OBJ-26` and `references/meri-handoff.json` at backend review source `fd8765ec01d292013758606204f2c9d886cd31c1`.
