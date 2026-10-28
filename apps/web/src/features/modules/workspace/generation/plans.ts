// WS-22 planners for the Workspace-owned manual state-machine writes: brief,
// context, outline, proposals, cancel, quality fix and generation mode. Each
// planner either returns one typed request against a declared Workspace
// operation or an explicit refusal, and each pins `expectedRevision` from the
// state it was given.
import type {
  AgentDocumentType,
  AgentProposal,
  AgentQualityCheck,
  AgentRunSummary,
  DocumentAgentState,
  GenerationMode,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";
import {
  briefEditBody,
  conflictResolutionBody,
  outlineEditBody,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";
import {
  workspaceRoleCanEdit,
  workspaceRoleCanReview,
  type ResolvedWorkspaceRole,
} from "./access";
import {
  generationRequest,
  invalid,
  refusal,
  type GenerationPlan,
} from "./controller";
import {
  briefApproval,
  contextApproval,
  openConflicts,
  outlineApproval,
  unitRetryPlan,
} from "./state";

export function planInitialize(
  draftId: string,
  documentType: AgentDocumentType,
  goal: string,
): GenerationPlan {
  if (!documentType.id)
    return refusal("Choose a document type before initializing.");
  if (goal.trim().length < 3)
    return refusal("Describe the goal in at least three characters.");
  return generationRequest(
    "workspace.generation.initialize",
    { draftId },
    { documentType, goal },
  );
}

/** The generation mode selector is a plain workspace-state write. */
export function planModeChange(
  state: DocumentAgentState,
  draftId: string,
  mode: GenerationMode,
): GenerationPlan {
  return generationRequest(
    "workspace.generation.patch",
    { draftId },
    {
      expectedRevision: state.revision,
      generation: { mode },
    },
  );
}

export function planBriefEdit(
  state: DocumentAgentState,
  draftId: string,
  draft: Record<string, unknown>,
): GenerationPlan {
  if (briefApproval(state).status === "approved")
    return refusal("The brief is approved. Reopen it before editing.");
  const parsed = briefEditBody.safeParse({
    ...draft,
    expectedRevision: state.revision,
  });
  if (!parsed.success) return refusal(invalid(parsed));
  return generationRequest(
    "workspace.generation.brief.update",
    { draftId },
    parsed.data,
  );
}

export function planBriefApprove(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  const approval = briefApproval(state);
  if (approval.status === "approved")
    return refusal("The brief is already approved.");
  if (approval.status === "editable")
    return refusal("Write the brief objective before approving it.");
  return generationRequest(
    "workspace.generation.brief.approve",
    { draftId },
    { expectedRevision: state.revision },
  );
}

export function planBriefReopen(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  if (briefApproval(state).status !== "approved")
    return refusal("Only an approved brief can be reopened.");
  return generationRequest(
    "workspace.generation.brief.reopen",
    { draftId },
    { expectedRevision: state.revision },
  );
}

export function planContextApprove(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  const approval = contextApproval(state);
  if (approval.status === "approved")
    return refusal("The context plan is already approved.");
  if (approval.status === "blocked_conflicts")
    return refusal(
      `Resolve ${approval.conflicts} context conflict(s) before approving.`,
    );
  if (approval.status === "not_started")
    return refusal("Build the context plan before approving it.");
  return generationRequest(
    "workspace.generation.context.approve",
    { draftId },
    { expectedRevision: state.revision },
  );
}

export function planContextResolve(
  state: DocumentAgentState,
  draftId: string,
  conflictId: string,
  resolution: string,
): GenerationPlan {
  const conflict = openConflicts(state).find((item) => item.id === conflictId);
  if (!conflict) return refusal("That context conflict is not open.");
  const parsed = conflictResolutionBody.safeParse({
    conflictId,
    resolution,
    expectedRevision: state.revision,
  });
  if (!parsed.success) return refusal(invalid(parsed));
  return generationRequest(
    "workspace.generation.context.resolve",
    { draftId },
    parsed.data,
  );
}

export function planOutlineEdit(
  state: DocumentAgentState,
  draftId: string,
  sections: unknown,
): GenerationPlan {
  if (outlineApproval(state).status === "approved")
    return refusal("The outline is approved. Revise it before editing.");
  const parsed = outlineEditBody.safeParse({
    sections,
    expectedRevision: state.revision,
  });
  if (!parsed.success) return refusal(invalid(parsed));
  return generationRequest(
    "workspace.generation.outline.update",
    { draftId },
    parsed.data,
  );
}

export function planOutlineApprove(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  const approval = outlineApproval(state);
  if (approval.status === "approved")
    return refusal("The outline is already approved.");
  if (approval.status === "not_started")
    return refusal("An outline needs at least one section before approval.");
  return generationRequest(
    "workspace.generation.outline.approve",
    { draftId },
    { expectedRevision: state.revision },
  );
}

function pendingProposal(
  state: DocumentAgentState,
  proposal: AgentProposal,
  role: ResolvedWorkspaceRole,
): string | undefined {
  if (!workspaceRoleCanReview(role))
    return "Only owners, editors and reviewers can decide a proposal.";
  if (proposal.status !== "pending")
    return `That proposal is already ${proposal.status}.`;
  if (proposal.baseRevision !== state.revision)
    return "The proposal is stale: the document changed since it was made.";
  return undefined;
}

export function planProposalAccept(
  state: DocumentAgentState,
  draftId: string,
  proposal: AgentProposal,
  role: ResolvedWorkspaceRole,
): GenerationPlan {
  const blocked = pendingProposal(state, proposal, role);
  if (blocked) return refusal(blocked);
  return generationRequest(
    "workspace.generation.proposal.accept",
    { draftId, proposalId: proposal.id },
    { expectedRevision: state.revision },
  );
}

export function planProposalReject(
  state: DocumentAgentState,
  draftId: string,
  proposal: AgentProposal,
  role: ResolvedWorkspaceRole,
  note?: string,
): GenerationPlan {
  const blocked = pendingProposal(state, proposal, role);
  if (blocked) return refusal(blocked);
  return generationRequest(
    "workspace.generation.proposal.reject",
    { draftId, proposalId: proposal.id },
    {
      expectedRevision: state.revision,
      ...(note === undefined ? {} : { note }),
    },
  );
}

export function planCancel(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  if (!state.generation.activeRunId)
    return refusal("There is no active generation run to cancel.");
  return generationRequest(
    "workspace.generation.cancel",
    { draftId },
    { expectedRevision: state.revision },
  );
}

export function planQualityFix(
  state: DocumentAgentState,
  draftId: string,
  check: AgentQualityCheck,
  role: ResolvedWorkspaceRole,
  instruction?: string,
): GenerationPlan {
  if (!workspaceRoleCanEdit(role))
    return refusal("Only owners and editors can create a quality fix.");
  if (!check.fixable) return refusal("That quality finding is not fixable.");
  return generationRequest(
    "workspace.generation.quality.fix",
    { draftId, issueId: check.id },
    {
      expectedRevision: state.revision,
      ...(instruction === undefined ? {} : { instruction }),
    },
  );
}

export function planRetry(run: AgentRunSummary | undefined): GenerationPlan {
  const plan = unitRetryPlan(run);
  if (plan.retryable.length === 0)
    return refusal("Every unit completed; there is nothing to retry.");
  return {
    kind: "withheld",
    reason:
      "Retrying a unit re-runs generation, which is still served by the legacy MeriV3/provider handler. " +
      `The ${plan.preserved.length} successful unit(s) stay untouched; wire generation.retry once a greenfield Meri public owner exists.`,
  };
}
