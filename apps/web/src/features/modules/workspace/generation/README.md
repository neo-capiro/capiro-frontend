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
| `run-retry.ts`      | durable run continuation: the plan, the reply correlation and its truthful wording                |
| `use-intake-run.ts` | the run the retained receipt named, read through this surface's own run read                      |
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
- `workspace-native-retry` - `generation/retry`, with the explicit
  `intent: "retry-failed-units"` acknowledgement. The server derives failed units
  from the retained native run, preserves successful sections and manual edits,
  and returns changes through the existing proposal owner.
- `workspace-durable-intake` - two-step capability (read), intakes, run status,
  and `runs/:runId/retry-failed`.

Withheld (`meri-greenfield`, no operation declared): `recommend` and
`message.send`. These still route to the legacy
MeriV3/provider handler (`WorkspaceReasoningGateway` / model IO) and have
no approved greenfield owner, so no operation is declared and the panels render
the withheld reason instead of a button. `workspace-generation.test.ts` fails if
any of those routes is re-added to the registry.

### Durable run continuation

`run.retryFailed` is wired for ONE case: the run this surface's own current
durable-intake receipt named. The route is served by the same
`quick-draft/two-step-draft.controller.ts` owner as the intake and the run read,
and its recovery control re-reads/replays the SAME retained native request with
the caller's own current credential. Recovery never asks for a new paid turn.
A separate **Retry failed units** control is available for failed or partial
runs; it adds `intent: "retry-failed-units"` to acknowledge new generation for
the server-derived failed units. The receipt only correlates, so neither control carries a
request identity and can only ever name the run that receipt already names
(`run-retry.ts`).

Both controls carry the route's closed native-only
discriminator: `{ workflow: "native-retained" }`. It selects the route's native
workflow so that a run the durable-intake owner did not create is refused at the
route instead of being handed to the legacy generation owner - a browser receipt
is untrusted and cannot enforce that boundary by itself. It is a workflow
selector and nothing more: it grants no authority, carries no status, secret or
scan result, and the route still applies its own tenant, acting-actor and
edit-ACL checks. The operation's request schema pins the value as a literal, so
no other workflow can be asked for from here, and a route that does not accept
this marker at all rejects the request before the handler runs.

Three facts of the producer decide what the control may offer and what its answer
may be said to mean, and all three are read from the worker rather than assumed:

- ordinary recovery accepts only a `queued` run or an `active` run whose lease
  has expired. Terminal runs require the separate deliberate failed-unit retry;
  complete and cancelled runs are not offered that action;
- without a current session credential a durable-intake run answers
  `awaiting-current-access` and is left exactly as it is, which the panel reports
  in those words; and
- the route answers with the run's CURRENT status and never reports what the
  reconciliation did: it awaits `reconcileRetainedNativeRequest` and discards its
  boolean, which is itself false for a run with nothing retained, for a
  current-access refusal and for a lease another worker still holds. A
  `queued`/`active` answer therefore does not prove that any work resumed, and a
  terminal answer may equally follow a real resume. The panel reports the
  correlated status and leaves the disposition pending instead of claiming an
  effect in either direction.

The reply is read through the operation's own closed schema
(`runRetryResponse`), correlated with the run that was asked about - a reply for
another run never updates this one - and the same run is then re-read for its
current status. An unparseable or failed reply is unconfirmed: the receipt stays,
no second request is sent, and the caller is sent to the run's status read.
The release of that reply is also checked against the journal's own lifetime after
the send resolves, so a scope that was disposed or replaced while the reply was in
flight never receives this attempt's notice or run read
(`intake-run-continuation.test.ts`).

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
   action is ACTIVATED: the run it queues is drafted by the approved greenfield
   native conversation owner (the durable worker's drafting stage issues one
   canonical turn on the same owner), so the capability read, the submit and the
   run-status read are all mounted. `planIntake` hands the caller the identity it
   must retain, `IntakePanel` retains it per acting scope, and an unconfirmed
   outcome is reconciled against that same request instead of a second submit.
   The credential is not a panel concern: `gateway.ts` attaches the current
   session bearer server-side.

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
- The durable intake submit and the durable run continuation are both real
  requests with no interactive UI test in this checkout (no DOM test environment
  is installed): they are covered by the planner/recovery/view/continuation leaf
  tests plus the mounted static-markup test, which proves what is rendered and
  that rendering dispatches nothing.

## Reads never execute

`mountReads` resolves only to GET operations and is asserted as such: a
generation panel may refresh state without any risk of issuing a write. A failed
write is never retried blindly - `classifyGenerationFailure` marks a status-less
failure as `unknown` and `generationRecovery` sends the caller back to a read
before another write.

## Tests

```
node node_modules/vitest/vitest.mjs run \
  --root apps/web/src/shared/capiro --config vitest.config.mts
```

Covered: flag off, missing key/source, capability-disabled intake, duplicate key
with the same payload (replay) versus a changed payload (mismatch), exact
brief/context/outline/cancel approval pins, stale and decided proposals, reads
that never execute, unknown outcomes, cancellation/retry preserving successful
units, and the quality fix ACL per role.
