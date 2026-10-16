# Bounded Objective generation receiving

Application base: `4c852b9477801d2671f436af7aa15ec5882f49c3`.
Backend contract: reviewed/published `1bc48d8831b5dad8fbf70c6a24a0c22a944dbf0b`,
tree `74ba4e18fe79d9a41c3a9b9126d7ca73d810c2c9`.
Branch: `feat/objective-generation-receiving`; separate worktree under task-3.

## Ownership before implementation

- New `apps/web/src/shared/capiro/operations/objective-generation.ts`: strict
  HTTP request, accepted receipt and polled job schemas; cross-field validation;
  source/request/result identity checks; fixed POST and GET descriptors.
- Existing `apps/web/src/shared/capiro/operations/strategies.ts`: merge these
  descriptors into the canonical registry. No new gateway or service owner.
- New Portfolio Objective generation session/receiving module and presentation
  under `apps/web/src/features/portfolio/objectives/`; existing
  `ObjectiveEditor.tsx` composes the presentation for a saved ready Objective.
- Existing Modules `objective-destinations/ObjectiveDestinationRoute.tsx` plus
  new generated-Strategy receiving view in that same area. Other destinations
  retain their existing behavior.
- Focused `apps/web/tests/objective-generation*.test.ts` and
  `apps/web/test/browser/objective-generation.spec.ts`; existing browser harness
  fixtures only if required to mount this real flow. Documentation here.
- Existing `shared/session/recovery/{journal.ts,journal-crypto.ts}`: additive
  retirement codes for verified terminal Objective failures. Reuse canonical
  encrypted storage, independent request fence and cross-tab execution locks;
  never retire OUTCOME_UNCONFIRMED. Existing Workspace refusal behavior remains.

No Meri package/runtime, Planner implementation, source origins/gateway,
Dockerfile, lockfile, AWS or shipping packet changes. Shipping's active 4c852b
archive/build is immutable and independent of this branch.

- Existing `scripts/architecture/reviewed-size-findings.json`: exact independent
  size-review receipt for the cohesive generation form after lifecycle and
  outcome rendering were separated; no boundary waiver.

## Behavior and boundaries

Reuse the existing HTTP clients, verified application scope replacement,
Objective editor controls, destination frame and fixed-operation registry.
Browser client/Objective IDs select requests; backend authorization remains
authoritative. Choose an existing Strategy type explicitly; never infer it from
ask type. Send only the saved Objective selector and request identity, not a
browser-generated copy of government context.

Keep the same request UUID and frozen intent for uncertain submission recovery.
No automatic write replay. Poll only the returned job; reject foreign, stale,
malformed or contradictory receipts. Closing the view disposes reads without
claiming to cancel a durable job. Preserve nonsecret uncertainty within the
current verified actor/tenant/Objective scope across reloads and view remounts,
using the existing encrypted recovery journal. Fresh Core identity and Objective
reads precede recovery or dispatch; browser storage never grants authority.

Completed navigation carries and verifies exact job, Strategy and saved version
IDs with the Objective selector. The destination re-reads current authorized job
and Objective binding before rendering. The current Strategy endpoint supplies
current content, not a historical version snapshot: label it accordingly and
show the generated saved-version receipt separately. No immutable historical
content, activation, Planner project/task creation or cardinality policy is
claimed.

Display complete/incomplete context and explicit issues plus compiledAt and
reobservedAt. Complete denotes coverage at the observed snapshot, not all-history
freshness at commit. Backend native PostgreSQL/RLS/grants and full Core typing
remain independently unqualified; this frontend cannot close those gates.

## Verification

Contract identity/invariant negatives, uncertain same-request recovery, scope
replacement and late response refusal, exact receipt navigation, failed and
incomplete states, relevant architecture/type checks and focused desktop browser
interaction/accessibility. No live writes/provider calls or deployment.
