import type {
  IntentsItem,
  IntentsProposal,
  IntentsLegiwatchProposal,
} from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

export function isLegiwatchProposal(
  proposal: IntentsProposal,
): proposal is IntentsLegiwatchProposal {
  return "kind" in proposal && proposal.kind === "legiwatch_action";
}

/** Only an observed terminal owner state settles a saved decision. */
export function legiwatchSettled(status: string) {
  return [
    "succeeded",
    "dismissed",
    "expired",
    "failed_terminal",
    "blocked",
  ].includes(status);
}

const actions = {
  add: "Add suggestion to the folder",
  dismiss: "Dismiss suggestion",
  exclude: "Exclude suggestion",
  restore: "Restore suggestion for review",
  undo: "Undo suggestion decision",
};

export function legiwatchFields(
  proposal: IntentsLegiwatchProposal,
): readonly IntentField[] {
  const request = proposal.request;
  return [
    { label: "Action", value: actions[request.action] },
    { label: "Client", value: request.clientId ?? "General" },
    { label: "Folder", value: request.folderId },
    { label: "Jurisdiction", value: request.jurisdiction },
    { label: "Session", value: request.sessionKey },
    { label: "Suggestion", value: request.suggestionId },
    { label: "Expected version", value: String(request.expectedVersion) },
    { label: "Expires", value: proposal.expiresAt },
  ];
}

const outcomes = {
  added: {
    status: "Added",
    tone: "success",
    detail: "The suggestion was added to the folder.",
  },
  already_present: {
    status: "Already present",
    tone: "neutral",
    detail: "The item was already present in the folder.",
  },
  dismissed: {
    status: "Suggestion dismissed",
    tone: "neutral",
    detail: "The suggestion owner recorded the dismissal.",
  },
  excluded: {
    status: "Excluded",
    tone: "neutral",
    detail:
      "The suggestion owner recorded an exclusion. This does not mean an item was added.",
  },
  pending: {
    status: "Pending review",
    tone: "neutral",
    detail:
      "The suggestion is pending review. This does not mean an item was added.",
  },
  stale: {
    status: "Suggestion changed",
    tone: "warning",
    detail:
      "The reviewed version is stale. Read the current suggestion before proposing another action.",
  },
  undone: {
    status: "Decision undone",
    tone: "success",
    detail: "The suggestion owner confirmed that the decision was undone.",
  },
  undo_conflict: {
    status: "Undo conflict",
    tone: "warning",
    detail:
      "The suggestion owner reported an undo conflict; an undo was not confirmed.",
  },
  held: {
    status: "Held",
    tone: "warning",
    detail:
      "The suggestion owner held this action. This does not mean an item was added.",
  },
} satisfies Record<string, Pick<IntentRow, "status" | "tone" | "detail">>;

/** Show the retained request and exact recorded outcome, without inferring a completed effect. */
export function legiwatchRow(
  item: Extract<IntentsItem, { kind: "legiwatch_action" }>,
  now: number,
  viewer: Viewer,
): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "LegiWatch suggestion",
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
  const proposal = item.proposal,
    result = item.result;
  const row = { ...base, proposal, fields: legiwatchFields(proposal) };
  if (result === "unavailable")
    return {
      ...row,
      status: "Status unavailable",
      tone: "warning",
      detail:
        "The current recorded outcome could not be read. Refresh to check; no action is repeated.",
    };
  if (result.status === "succeeded" && result.receipt)
    return {
      ...row,
      ...outcomes[result.receipt.outcome],
      result: [
        {
          label: "Recorded outcome",
          value: result.receipt.outcome.replaceAll("_", " "),
        },
        {
          label: "Recorded version",
          value: String(result.receipt.payload.version),
        },
        ...(result.receipt.payload.decisionId
          ? [
              {
                label: "Decision reference",
                value: result.receipt.payload.decisionId,
              },
            ]
          : []),
      ],
    };
  const own =
    proposal.binding.tenantId === viewer.tenantId &&
    proposal.binding.actorId === viewer.actorId;
  if (result.status === "proposed") {
    const expired = Date.parse(proposal.expiresAt) <= now;
    return {
      ...row,
      decision: own && !expired ? "approvable" : "closed",
      status: expired
        ? "Expired"
        : own
          ? "Awaiting your confirmation"
          : "Needs the original approver",
      tone: "neutral",
      detail: expired
        ? "The approval period has expired. Refresh to read any recorded outcome."
        : "Review this exact suggestion action before confirming it. Nothing happens until you approve.",
    };
  }
  if (result.status === "dismissed")
    return {
      ...row,
      status: "Rejected",
      tone: "neutral",
      detail:
        "This proposal was rejected. Its suggestion action was not executed.",
    };
  if (
    result.status === "outcome_unknown" ||
    result.status === "failed_retryable"
  )
    return {
      ...row,
      status: "Result uncertain",
      tone: "warning",
      detail:
        "No confirmed outcome is available. Check the recorded status; this action will not be sent again.",
    };
  return {
    ...row,
    status: result.status.replaceAll("_", " "),
    tone: ["failed_terminal", "blocked"].includes(result.status)
      ? "danger"
      : "neutral",
    detail:
      "This is the action owner's recorded status. Refresh to check for an outcome; no action is repeated.",
  };
}
