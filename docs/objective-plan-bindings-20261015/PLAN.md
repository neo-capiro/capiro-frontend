# Objective operations and manual Engagement plans

This independent candidate starts at sealed frontend `9da3616a4c700b658770897c827f517997b69a5e` on `feat/non-meri-objective-plan-bindings`. It does not change the ready shipment or its evidence and will not be merged into it. Parent allocated this desktop work separately on 15 October 2026. Meri/Fable, deployment, paid execution and backend implementation remain outside this lane.

## Canonical responsibilities and ownership

- Root owns Objective full-page presentation under `features/portfolio/objectives/operational`, its existing Objective entry integration, Figma/reference evidence, registry composition, final verification and architecture records.
- The Objective adapter worker owns `shared/capiro/operations/objective-operational.ts`, any cohesive receiving validator, the operational query hook and focused contract tests. It consumes reviewed backend candidate `6ce5cacd261e4e4541fea482beea160a3f6c3702`, not private backend runtime code. Four named cursors and request/previous-page context must preserve source/scope consistency. Existing Portfolio intake/editor/generation/receiving owners remain canonical.
- The Engagement worker owns PlanView, feature-local `engagement/plan` components/state, the PlanView scope mount in EngagementScreen, one `engagement-plans` operation/schema module and Plan tests. It must receive exact f41/successor wire definitions before implementing adapters; the owner's current route summary alone cannot establish response shapes.
- Existing fixed-operation HTTP/gateway/session/query and shared UI primitives retain transport, auth, selected-client lifetime, retries, cancellation and error ownership. No parallel fetch/authorization owner is introduced. Generic 409/reload remains truthful until any narrow structured-error projection is separately coordinated.

## Receiving and UI constraints

The Objective operational read presents Strategies/cycle annotations, multiple Planner projects, typed decisions, questions and next engagement with independent availability. It preserves current/requested/applied truth, historical linking revision and current independent resource ACLs. Only complete authorized task unions can yield exact counts. Questions/automation and feasibility/window facts remain explicitly unavailable where no owner exists. Ready is not relabelled Active. Existing owner actions are navigation/review, not a generic approval endpoint. No generated-current action or frozen saved-version receiving is enabled before the owner mapping is allocated and verified.

Engagement plans support the reviewed bounded manual CRUD/lifecycle/version/review workflow. Review freshness means the explicitly reviewed aggregate version and deadline, not external business freshness. Office references require authoritative server verification; no wall-scoped picker contract exists yet, so no invented catalog/ID selector will be offered. Ranking, recommendations, scheduling availability and wave execution remain unavailable. API failure, partial coverage and unknown delivery must not become zero metrics or successful writes.

## Design and verification

Use actual Figma file `Zc2dEN5aLU47dVdsewDmiJ`, Objective `411:61442` and Engagement Plan `411:95121`, adapting existing tokens/components and preserving the shell. Static prototype values/policy text do not override reviewed domain semantics. Capture the design and affected actual desktop states; preserve pending/error/empty/unavailable distinctions, keyboard focus and no overflow.

Verification covers exact reviewed wire correspondence, response/request identity and late-result handling, no cross-scope data/actions, version conflicts/unknown delivery, honest partial counters, current resource navigation and Plan lifecycle/review behavior. Run focused contract/render/desktop Playwright checks, canonical typing/build and required lint/format/architecture gates; independent review must distinguish fixture behavior from unrun native backend/live API/image/deployment acceptance. Reuse the existing harness and physical locked dependencies; do not create another runner framework.
