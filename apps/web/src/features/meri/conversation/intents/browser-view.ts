import type { IntentsItem } from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

export type BrowserItem = Extract<IntentsItem, { kind: "browser_action"; proposal: unknown }>;
type BrowserProposal = Extract<
  BrowserItem,
  { proposal: unknown }
>["proposal"];
export type { BrowserProposal };

/** A retained browser preparation is only approvable by the exact acting actor, inside its live window. */
export function isBrowserProposal(
  proposal: unknown,
): proposal is BrowserProposal & { kind: "browser_action" } {
  return (proposal as { kind?: string } | null | undefined)?.kind === "browser_action";
}

const fingerprint = (value: string) => `${value.slice(0, 12)}…`;

export function browserFields(proposal: BrowserProposal): readonly IntentField[] {
  return [
    { label: "Action", value: proposal.display.tool },
    { label: "Site", value: proposal.display.pageOrigin },
    { label: "Browser session", value: proposal.display.server },
    { label: "Input fingerprint", value: fingerprint(proposal.display.inputSha256) },
    { label: "Policy fingerprint", value: fingerprint(proposal.display.policySha256) },
    {
      label: "Window",
      value: `${new Date(proposal.requestedAtMs).toISOString()} → ${new Date(proposal.expiresAtMs).toISOString()}`,
    },
  ];
}

function decisionFields(item: BrowserItem): readonly IntentField[] {
  const decision = item.decision;
  if (!decision || decision === "unavailable") return [];
  return [
    { label: "Your decision", value: decision.decision === "approved" ? "Approved" : "Rejected" },
    { label: "Decided at", value: decision.decidedAt },
  ];
}

function executionFields(item: BrowserItem): readonly IntentField[] {
  if (!item.execution || item.execution === "unavailable") return [];
  return [
    { label: "Browser result", value: item.execution.outcome === "ok" ? "Completed" : "Failed" },
    ...(item.execution.reference
      ? [{ label: "Reference", value: item.execution.reference }]
      : []),
  ];
}

/**
 * One retained browser action: the bounded reviewed context, the human decision, and — separately — the actual
 * browser observation. A recorded approval is AWAITING EXECUTION; only a completed observation is evidence that
 * the action ran, and nothing here resends, consumes or re-executes it.
 */
export function browserRow(item: BrowserItem, now: number, viewer: Viewer): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Browser action",
    proposal: null,
    decision: "closed" as const,
    fields: [],
    result: [],
  };
  if ("withheld" in item)
    return {
      ...base,
      status: "Unavailable",
      tone: "neutral",
      detail: "This browser action is not visible with your current access.",
    };
  const proposal = item.proposal;
  const fields = browserFields(proposal);
  const decided = decisionFields(item);
  const executed = executionFields(item);
  const result = [...decided, ...executed];
  const mine =
    viewer.tenantId === proposal.requiredApprover.tenantId &&
    viewer.actorId === proposal.requiredApprover.actorId;
  const live = proposal.expiresAtMs > now;
  if (item.execution && item.execution !== "unavailable" && item.execution.state === "completed") {
    const ok = item.execution.outcome === "ok";
    return {
      ...base,
      proposal,
      status: ok ? "Completed" : "Failed",
      tone: ok ? "success" : "danger",
      detail: ok
        ? "The browser reported this action completed."
        : "The browser reported this action did not complete.",
      fields,
      result,
    };
  }
  if (item.decision && item.decision !== "unavailable") {
    const rejected = item.decision.decision === "rejected";
    return {
      ...base,
      proposal,
      status: rejected ? "Rejected" : "Approved · awaiting execution",
      tone: "neutral",
      detail: rejected
        ? "You rejected this browser action. Nothing will run."
        : "Your approval is recorded. The action has not run and its outcome is not confirmed.",
      fields,
      result,
    };
  }
  if (item.phase === "expired" || !live) {
    return {
      ...base,
      proposal,
      status: "Expired",
      tone: "neutral",
      detail: "This browser action passed its approval window and cannot be approved now.",
      fields,
      result,
    };
  }
  if (item.phase === "unknown_decision" || item.decision === "unavailable") {
    return {
      ...base,
      proposal,
      status: "Decision unavailable",
      tone: "warning",
      detail:
        "The recorded decision could not be read. Reload to check the same proposal; nothing is resent.",
      fields,
      result,
    };
  }
  if (!mine) {
    return {
      ...base,
      proposal,
      status: "Waiting for review",
      tone: "neutral",
      detail: "Only the intended approver can decide this browser action.",
      fields,
      result,
    };
  }
  return {
    ...base,
    proposal,
    status: "Waiting for your approval",
    tone: "warning",
    detail:
      "Review the action and site above. Approving records your decision; the action still has to run before any outcome is known.",
    decision: "approvable",
    fields,
    result,
  };
}

/** The exact first-send decide request for a browser proposal: the SUBJECT digest, never a command digest. */
export function browserDecideRequest(
  row: IntentRow,
  conversationId: string,
  decision: "approved" | "rejected",
) {
  const proposal = row.proposal;
  if (!isBrowserProposal(proposal)) return null;
  return {
    conversationId,
    deliveryId: row.deliveryId,
    proposalId: proposal.proposalId,
    subjectSha256: proposal.subjectSha256,
    decision,
  } as const;
}
