import type {
  IntentsItem,
  IntentsProposal,
  IntentsResearchShareProposal,
  IntentsDecideResponse,
} from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

export function isResearchShareProposal(
  proposal: IntentsProposal,
): proposal is IntentsResearchShareProposal {
  return "kind" in proposal && proposal.kind === "research_share";
}

export function intentDecisionSettled(response: IntentsDecideResponse) {
  return (
    response.status !== "indeterminate" &&
    (response.status !== "research_share_decided" ||
      ![
        "proposed",
        "executing",
        "outcome_unknown",
        "failed_retryable",
      ].includes(response.proposalStatus))
  );
}

export function researchShareFields(
  proposal: IntentsResearchShareProposal,
): readonly IntentField[] {
  const request = proposal.request;
  return [
    { label: "Action", value: proposal.preview.label },
    ...(proposal.preview.clientName
      ? [{ label: "Prepared for", value: proposal.preview.clientName }]
      : []),
    ...("snapshotId" in request
      ? [
          { label: "Snapshot", value: request.snapshotId },
          {
            label: "Design version",
            value: `${request.designId} v${request.expectedDesignVersion}`,
          },
          {
            label: "Branding",
            value: request.branding ? "Firm name and logo" : "Off",
          },
        ]
      : [{ label: "Link", value: request.linkId }]),
    { label: "Expires", value: proposal.expiresAt },
  ];
}

export function researchShareRow(
  item: Extract<IntentsItem, { kind: "research_share" }>,
  now: number,
  viewer: Viewer,
): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Client share link",
    proposal: null,
    fields: [],
    result: [],
    decision: "closed" as const,
  };
  if ("withheld" in item)
    return {
      ...base,
      status: "Unavailable",
      tone: "neutral",
      detail: "This action is unavailable with your current access.",
    };
  const proposal = item.proposal;
  const own =
    proposal.binding.tenantId === viewer.tenantId &&
    proposal.binding.actorId === viewer.actorId;
  const expired = Date.parse(proposal.expiresAt) <= now;
  const status = item.proposalStatus;
  return {
    ...base,
    proposal,
    title: proposal.preview.label,
    fields: researchShareFields(proposal),
    decision:
      status === "proposed" && own && !expired ? "approvable" : "closed",
    status:
      status === "proposed"
        ? expired
          ? "Expired"
          : "Awaiting your confirmation"
        : status.replaceAll("_", " "),
    tone:
      status === "succeeded"
        ? "success"
        : ["failed_terminal", "blocked"].includes(status)
          ? "danger"
          : "neutral",
    detail:
      status === "succeeded"
        ? "The action completed. A publication address is returned once to the person who confirms it; it is not recoverable from history."
        : status === "proposed"
          ? "Review this exact action before confirming it. Creating a link sends nothing."
          : "This is the action owner's recorded status. No new publication has been requested here.",
  };
}
