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
//                             (two-step-draft-capability, intakes, runs/:runId/status).
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
 * The durable intake receipt is real and idempotent, but the run it creates is
 * drafted by `GenerationRunWorkerService` -> `GenerationService`, which performs
 * direct Anthropic provider IO and holds the dormant MeriV2 orchestrator proxy.
 * Submitting one therefore starts legacy provider generation, so the action is
 * unactivated even though its contract and request identity are shipped.
 */
export const intakeGenerationWithheld =
  "The durable receipt is real, but the run's drafting stage delegates to GenerationService (direct Anthropic provider IO plus the dormant MeriV2 orchestrator proxy) - legacy provider generation. Intake submission stays unactivated until the greenfield Meri owner is bridged.";

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
      owner: "meri-greenfield",
      withheldReason: withheld,
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
      withheldReason: intakeGenerationWithheld,
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
      owner: "meri-greenfield",
      withheldReason: withheld,
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
