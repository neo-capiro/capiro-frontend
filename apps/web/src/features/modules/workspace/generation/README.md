# Workspace generation (WS-22) consumer

Frontend consumer of the Workspace-owned document-agent and quick-draft APIs in
`capiro-backend` (`apps/workspace`, served under `/workspace-api`). The declared
operations live in `apps/web/src/shared/capiro/operations/workspace-generation.ts`;
this module turns a draft's agent state plus an operator intent into one typed
request against an approved owner, or an explicit refusal.

## Files

| File                | Role                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `state.ts`          | projections of server state (brief/context/outline gates, unit retry plan, run progress, quality) |
| `access.ts`         | client mirror of `apps/workspace/src/collaborators/role-policy.ts`                                |
| `owner-map.ts`      | every advertised action -> route -> approved owner, or `withheld`                                 |
| `controller.ts`     | plan shape, the read set, failure classification and recovery                                     |
| `plans.ts`          | planners for the manual state-machine writes                                                      |
| `intake.ts`         | durable intake planning, payload digest and replay guard                                          |
| `GeneratePanel.tsx` | draft gates: brief, context, outline, proposals, generation, quality                              |
| `IntakePanel.tsx`   | two-step intake form and submit                                                                   |

## Owner map

`owner-map.ts` is the acceptance artifact for ticket lines 330-336: every
advertised action is listed with the route that actually serves it and the owner
that serves it. `owner-map.test.ts` asserts the map and the declared operations
are exactly equal, so a route cannot be wired without an owner.

Wired (Workspace-owned, no model call):

- `workspace-state` - catalog, agent state, initialize, patch, messages (read),
  brief edit/approve/reopen, context approve/resolve, context item patch, outline
  edit/approve, outline revise (writes a proposal), proposals list/accept/reject,
  generation status (read), generation cancel.
- `workspace-native-generation` - the five SUPPORTED generated phases:
  `brief.synthesize`, `context.recommend`, `context.analyze`,
  `outline.generate`, `generation.generate`. The Workspace route for each issues
  ONE canonical native conversation SDK turn through the approved greenfield Meri
  owner (`apps/workspace/src/document-agent/native-generation.bridge.ts`) for the
  current identity and the draft's selected client, and admits the result through
  the existing Workspace state/revision/approval owners. Brief and context land
  under the service's own mutation lock behind the existing approval pins; an
  outline lands as a PENDING `outline_revision` proposal an editor must accept;
  a document run is admitted by the existing document/artifact approval owner.
  `WorkspaceReasoningGateway` / `GenerationService` are not reached from these
  routes.
- `workspace-quality` - quality read and `quality/issues/:issueId/fix`. The fix
  endpoint creates a proposal and is gated by the service's `canEdit`, mirrored in
  `access.ts`.
- `workspace-durable-intake` - two-step capability (read), intakes, run status.

Withheld (`meri-greenfield`, no operation declared): `recommend`,
`message.send`, `generation.retry`, `run.retryFailed`. These still route to the
legacy MeriV3/provider handler (`WorkspaceReasoningGateway` / model IO) and have
no approved greenfield owner, so no operation is declared and the panels render
the withheld reason instead of a button. `workspace-generation.test.ts` fails if
any of those routes is re-added to the registry.

### Paid-generation intent

A generated phase spends money, so it must carry an explicit intent. Each of the
five phase bodies declares it as the truthful field `paidGeneration: true`: the
document-agent DTOs are closed and the workspace `ValidationPipe` forbids
non-whitelisted body fields, so a missing intent, a `false` intent or an extra
field is refused, and no ordinary retry or read can start a paid run. No paid
phase declares or sends a request header: `Idempotency-Key` is declared by
exactly one operation, the durable intake `POST /document-agent/intakes`, and
stays that request's identity channel alone.

An accepted response reports its own admission: `result` (brief/context applied),
`proposed` (outline waiting for an editor's acceptance), `approval-required` (the
document run), or `unknown`. `unknown` is NOT a failure the UI may retry: the
panel re-reads the document and hands the decision back, because re-issuing the
turn would either replay the identical derived request identity or start a second
paid run, and only the owner can tell which.

## Integrated in this delta

1. **Registry.** `workspaceGenerationOperations` is composed into
   `shared/capiro/registry.ts` by one additive spread.
2. **Transport.** `POST /document-agent/intakes` requires an `Idempotency-Key`
   request header. `OperationDefinition.idempotency` names that single header and
   `gateway.ts` forwards exactly it from the request's `idempotencyKey`, validated
   against the shared `requestIdentity` leaf; an operation that does not declare
   it cannot send one, and a missing or malformed identity is refused with 400
   rather than sent without it. `gateway-handoff.ts` holds the `browserHandoff`
   helper moved out of `gateway.ts` unchanged so the gateway module stays inside
   its reviewed size.
3. **Mount.** `GenerationPanelHost` (with `useGenerationReads`,
   `useGenerationDispatch`, `useActionRole`) is rendered from
   `WorkspaceDraft.tsx` for ordinary saved drafts, resolving the acting role from
   the canonical collaborators list. `WorkspaceScreen.tsx` was not edited: its
   draft view (line ~113) delegates to `WorkspaceDraft`, so the panel is
   reachable there without a second mount and a doubled read set.
4. **Intake.** `intake-recovery.ts` is the scoped leaf: digest, derived
   `Idempotency-Key`, and the send/replay/reconcile/retire decision. The submit
   action stays unactivated (`withheld`) because the run it queues is drafted by
   the legacy provider path; the capability and run-status reads are mounted.

## Still parent/other-owner

- The Meri-side producer leaf that answers ONE native conversation turn for a
  Workspace phase exists in source: `apps/control/conversations/workspace-generation/`
  in `meri-greenfield` (its closed turn/read/cancel protocol mounted by
  `apps/runtime/control-route-boundary.mjs`) with the matching Workspace Core
  client/module binding `NATIVE_GENERATION_TURN`. Answering a phase in a running
  environment still depends on that environment's real current configuration and
  authority: the Workspace module builds the client from `NATIVE_GENERATION_ORIGIN`
  (`MERI_CONTROL_ORIGIN`) and `INTERNAL_SERVICE_SECRET`
  (`MERI_CONTROL_SERVICE_SECRET`) and binds `null` when either is unset, and each
  turn still needs the caller's current identity credential. An unbound
  environment answers 503 with the explicit "approved greenfield Meri native
  conversation owner is not composed" refusal — a real control with an honest,
  non-legacy failure, never a silent fallback to the provider path. No deployment
  claim is made here.
- The size-review record for the edited `DraftEditor` function
  (`docs/architecture-size-reviews.json` is an architecture-registry write).

## Reads never execute

`mountReads` resolves only to GET operations and is asserted as such: a
generation panel may refresh state without any risk of issuing a write. A failed
write is never retried blindly - `classifyGenerationFailure` marks a status-less
failure as `unknown` and `generationRecovery` sends the caller back to a read
before another write.

## Tests

```
node node_modules/vitest/vitest.mjs run \
  --root apps/web/src/shared/capiro \
  --config apps/web/src/shared/capiro/vitest.config.mts
```

Covered: flag off, missing key/source, capability-disabled intake, duplicate key
with the same payload (replay) versus a changed payload (mismatch), exact
brief/context/outline/cancel approval pins, stale and decided proposals, reads
that never execute, unknown outcomes, cancellation/retry preserving successful
units, and the quality fix ACL per role.
