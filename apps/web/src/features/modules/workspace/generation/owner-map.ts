// WS-22 owner map: every advertised document-agent action, the Workspace route
// that actually serves it, and the approved owner that serves it.
//
// The approved owners this consumer may call:
//   workspace-state         — state machine + revision (`document-agent.service.ts`,
//                             `document-agent.controller.ts`: initialize, patch,
//                             brief, context, outline, proposals, cancel).
//   workspace-native-generation — the SAME service/controller, whose five
//                             supported generated phases (brief/synthesize,
//                             context/recommend, context/analyze,
//                             outline/generate, generate) now issue ONE canonical
//                             native conversation SDK turn through
//                             `document-agent/native-generation.bridge.ts` and
//                             admit the result through the existing Workspace
//                             state/revision/approval owners. No legacy
//                             provider handler is reached from these routes.
//   workspace-quality       — `document-agent-quality.service.ts` (evaluate,
//                             createFixProposal with its canEdit gate).
//   workspace-durable-intake— `quick-draft/two-step-draft.controller.ts`
//                             (two-step-draft-capability, intakes,
//                             runs/:runId/status, runs/:runId/retry-failed).
//
// The remaining model-backed actions have no approved greenfield owner yet: they
// are still served by the legacy MeriV3/provider handler, so they are marked
// `withheld` and carry no operation. Wiring one without a greenfield owner would
// activate that legacy handler, which is not an approved path. The tests pin
// exactly which actions are wired and which are withheld.
import type { workspaceGenerationOperations } from "../../../../shared/capiro/operations/workspace-generation";

export type WorkspaceGenerationOperationKey =
  keyof typeof workspaceGenerationOperations;

export type GenerationOwner =
  | "workspace-state"
  | "workspace-native-generation"
  /** The greenfield native owner's failed-unit retry: it answers with the state, not an admission. */
  | "workspace-native-retry"
  | "workspace-quality"
  | "workspace-durable-intake"
  | "meri-greenfield";

export type AdvertisedGenerationAction = {
  action: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  path: string;
  owner: GenerationOwner;
  operation?: WorkspaceGenerationOperationKey;
  withheldReason?: string;
};

const withheld =
  "Model-backed action: still served by the legacy MeriV3/provider handler. Withheld until a greenfield Meri public owner exists.";

/**
 * The durable intake receipt is real and idempotent, and the run it creates is
 * now drafted by the approved greenfield native conversation owner: the durable
 * worker's drafting stage issues one canonical turn on the SAME
 * `NATIVE_GENERATION_TURN` owner (and closed wire protocol) the five Workspace
 * document-agent phases use, and never reaches the legacy provider handler.
 * Submitting one therefore starts greenfield native generation. Availability
 * still depends on this environment's real current configuration and the
 * caller's current credential: the capability read gates the control, and an
 * unbound owner is reported by the run itself instead of being retried blindly.
 */
export const advertisedGenerationActions: readonly AdvertisedGenerationAction[] =
  [
    {
      action: "catalog",
      method: "GET",
      path: "/document-agent/catalog",
      owner: "workspace-state",
      operation: "workspace.generation.catalog",
    },
    {
      action: "recommend",
      method: "POST",
      path: "/document-agent/recommend",
      owner: "meri-greenfield",
      withheldReason: withheld,
    },
    {
      action: "state",
      method: "GET",
      path: "/drafts/:draftId/agent",
      owner: "workspace-state",
      operation: "workspace.generation.state",
    },
    {
      action: "initialize",
      method: "POST",
      path: "/drafts/:draftId/agent/initialize",
      owner: "workspace-state",
      operation: "workspace.generation.initialize",
    },
    {
      action: "patch",
      method: "PATCH",
      path: "/drafts/:draftId/agent",
      owner: "workspace-state",
      operation: "workspace.generation.patch",
    },
    {
      action: "messages",
      method: "GET",
      path: "/drafts/:draftId/agent/messages",
      owner: "workspace-state",
      operation: "workspace.generation.messages",
    },
    {
      action: "message.send",
      method: "POST",
      path: "/drafts/:draftId/agent/messages",
      owner: "meri-greenfield",
      withheldReason: withheld,
    },
    {
      action: "brief.edit",
      method: "PUT",
      path: "/drafts/:draftId/agent/brief",
      owner: "workspace-state",
      operation: "workspace.generation.brief.update",
    },
    {
      action: "brief.synthesize",
      method: "POST",
      path: "/drafts/:draftId/agent/brief/synthesize",
      owner: "workspace-native-generation",
      operation: "workspace.generation.brief.synthesize",
    },
    {
      action: "brief.approve",
      method: "POST",
      path: "/drafts/:draftId/agent/brief/approve",
      owner: "workspace-state",
      operation: "workspace.generation.brief.approve",
    },
    {
      action: "brief.reopen",
      method: "POST",
      path: "/drafts/:draftId/agent/brief/reopen",
      owner: "workspace-state",
      operation: "workspace.generation.brief.reopen",
    },
    {
      action: "context.recommend",
      method: "POST",
      path: "/drafts/:draftId/agent/context/recommend",
      owner: "workspace-native-generation",
      operation: "workspace.generation.context.recommend",
    },
    {
      action: "context.analyze",
      method: "POST",
      path: "/drafts/:draftId/agent/context/analyze",
      owner: "workspace-native-generation",
      operation: "workspace.generation.context.analyze",
    },
    {
      action: "context.item.edit",
      method: "PATCH",
      path: "/drafts/:draftId/context/:itemId",
      owner: "workspace-state",
      operation: "workspace.generation.context.item",
    },
    {
      action: "context.approve",
      method: "POST",
      path: "/drafts/:draftId/agent/context/approve",
      owner: "workspace-state",
      operation: "workspace.generation.context.approve",
    },
    {
      action: "context.resolve",
      method: "POST",
      path: "/drafts/:draftId/agent/context/resolve",
      owner: "workspace-state",
      operation: "workspace.generation.context.resolve",
    },
    {
      action: "outline.generate",
      method: "POST",
      path: "/drafts/:draftId/agent/outline/generate",
      owner: "workspace-native-generation",
      operation: "workspace.generation.outline.generate",
    },
    {
      action: "outline.edit",
      method: "PUT",
      path: "/drafts/:draftId/agent/outline",
      owner: "workspace-state",
      operation: "workspace.generation.outline.update",
    },
    {
      action: "outline.revise",
      method: "POST",
      path: "/drafts/:draftId/agent/outline/revise",
      owner: "workspace-state",
      operation: "workspace.generation.outline.revise",
    },
    {
      action: "outline.approve",
      method: "POST",
      path: "/drafts/:draftId/agent/outline/approve",
      owner: "workspace-state",
      operation: "workspace.generation.outline.approve",
    },
    {
      action: "proposals",
      method: "GET",
      path: "/drafts/:draftId/agent/proposals",
      owner: "workspace-state",
      operation: "workspace.generation.proposals",
    },
    {
      action: "proposal.accept",
      method: "POST",
      path: "/drafts/:draftId/agent/proposals/:proposalId/accept",
      owner: "workspace-state",
      operation: "workspace.generation.proposal.accept",
    },
    {
      action: "proposal.reject",
      method: "POST",
      path: "/drafts/:draftId/agent/proposals/:proposalId/reject",
      owner: "workspace-state",
      operation: "workspace.generation.proposal.reject",
    },
    {
      action: "generation.status",
      method: "GET",
      path: "/drafts/:draftId/agent/generation",
      owner: "workspace-state",
      operation: "workspace.generation.status",
    },
    {
      action: "generation.generate",
      method: "POST",
      path: "/drafts/:draftId/agent/generate",
      owner: "workspace-native-generation",
      operation: "workspace.generation.generate",
    },
    {
      action: "generation.retry",
      method: "POST",
      path: "/drafts/:draftId/agent/generation/retry",
      // Served by the greenfield native owner for a run that carries a retained native
      // request: the retry re-enters the same native bridge/turn for the run's own
      // failed units and lands them as an existing pending `content_revision` proposal,
      // so it never reaches the legacy provider handler for such a run. It answers with
      // the document STATE, not a native admission, so it is named as its own Workspace
      // owner: a mounted control for it must never be classified as an admission (that
      // would report a successful retry as unconfirmed) and it is not one of the five
      // supported generated phases. Its control is planned by `planNativeDocumentRetry`,
      // which refuses a run with no retained request, and a legacy engine run keeps the
      // withheld legacy planner instead of this operation.
      owner: "workspace-native-retry",
      operation: "workspace.generation.document.retry",
    },
    {
      action: "generation.cancel",
      method: "POST",
      path: "/drafts/:draftId/agent/generation/cancel",
      owner: "workspace-state",
      operation: "workspace.generation.cancel",
    },
    {
      action: "quality.evaluate",
      method: "GET",
      path: "/drafts/:draftId/agent/quality",
      owner: "workspace-quality",
      operation: "workspace.generation.quality",
    },
    {
      action: "quality.fix",
      method: "POST",
      path: "/drafts/:draftId/agent/quality/issues/:issueId/fix",
      owner: "workspace-quality",
      operation: "workspace.generation.quality.fix",
    },
    {
      action: "intake.capability",
      method: "GET",
      path: "/document-agent/two-step-draft-capability",
      owner: "workspace-durable-intake",
      operation: "workspace.generation.intake.capability",
    },
    {
      action: "intake.submit",
      method: "POST",
      path: "/document-agent/intakes",
      owner: "workspace-durable-intake",
      operation: "workspace.generation.intake",
      // Activated: the run's drafting stage is served by the greenfield native
      // conversation owner (see the note above), and the request is idempotent
      // per caller, so a retry inside one user action cannot be billed twice.
    },
    {
      action: "run.status",
      method: "GET",
      path: "/document-agent/runs/:runId/status",
      owner: "workspace-durable-intake",
      operation: "workspace.generation.run.status",
    },
    {
      action: "run.retryFailed",
      method: "POST",
      path: "/document-agent/runs/:runId/retry-failed",
      owner: "workspace-durable-intake",
      operation: "workspace.generation.run.retryFailed",
      // Activated for ONE case only: this surface's own current durable-intake
      // receipt, whose run is still live. The worker's atomic claim accepts only
      // `queued` or an expired-lease `active` run, so a run that already resolved
      // is reported as such and never promised a continuation; a caller without a
      // current credential is answered `awaiting-current-access` and its retained
      // request is left exactly as it is.
    },
  ];

/** An action is withheld when it carries a reason, whether or not it declares an operation. */
export function wiredGenerationActions(): AdvertisedGenerationAction[] {
  return advertisedGenerationActions.filter(
    (entry) =>
      entry.operation !== undefined && entry.withheldReason === undefined,
  );
}

export function withheldGenerationActions(): AdvertisedGenerationAction[] {
  return advertisedGenerationActions.filter(
    (entry) => entry.withheldReason !== undefined,
  );
}

/**
 * The operations a mounted control may dispatch, and nothing else. The dispatch
 * guard and the planners both consult this, so an unactivated action cannot be
 * reached by building a request for it directly.
 */
export function mountedGenerationOperations(): ReadonlySet<WorkspaceGenerationOperationKey> {
  return new Set(
    wiredGenerationActions().map(
      (entry) => entry.operation as WorkspaceGenerationOperationKey,
    ),
  );
}

export function isMountedGenerationOperation(
  operation: WorkspaceGenerationOperationKey,
): boolean {
  return mountedGenerationOperations().has(operation);
}

/**
 * The five SUPPORTED generated phases: the operations served by the approved
 * greenfield Meri native conversation owner. A caller that receives a response
 * for one of these must read it through the operation's own response schema and
 * reconcile an `unknown` admission — see `nativeAdmissionOutcome`.
 */
export function nativeGenerationOperations(): ReadonlySet<WorkspaceGenerationOperationKey> {
  return new Set(
    wiredGenerationActions()
      .filter((entry) => entry.owner === "workspace-native-generation")
      .map((entry) => entry.operation as WorkspaceGenerationOperationKey),
  );
}

export function isNativeGenerationOperation(
  operation: WorkspaceGenerationOperationKey,
): boolean {
  return nativeGenerationOperations().has(operation);
}
