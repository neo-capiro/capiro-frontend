import type { IntentsItem, IntentsProposal } from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

type WatchProposal = Extract<IntentsProposal, { kind: "watch_action" }>;
export function isWatchProposal(
  proposal: IntentsProposal,
): proposal is WatchProposal {
  return "kind" in proposal && proposal.kind === "watch_action";
}
export function watchSettled(status: string) {
  return [
    "succeeded",
    "dismissed",
    "expired",
    "failed_terminal",
    "blocked",
  ].includes(status);
}

const ownerLabels = {
  legiwatch_keyword: "LegiWatch keyword rule",
  business_development_prospect: "Business-development prospect watch",
  defense_budget_target: "Defense-budget target watch",
  client_watchlist: "Client tracker watchlist",
} satisfies Record<WatchProposal["request"]["family"], string>;
const verbLabels = {
  subscribe: "Subscribe",
  pause: "Pause",
  resume: "Resume",
  unsubscribe: "Unsubscribe",
  set_delivery: "Change delivery preference",
} satisfies Record<WatchProposal["request"]["operation"], string>;

function effectDescription(request: WatchProposal["request"]) {
  if (request.family === "client_watchlist")
    return request.operation === "pause"
      ? "Disable this actor's watchlist alert channels. Keep the watchlist, topics and terms."
      : "Enable this actor's watchlist alert channels. Keep the watchlist, topics and terms.";
  if (request.family === "defense_budget_target")
    return request.operation === "unsubscribe"
      ? "Record an unsubscribed target watch. Keep the watch identity and history."
      : "Subscribe or resume this target through its existing budget-watch owner.";
  if (request.family === "business_development_prospect")
    return request.operation === "unsubscribe"
      ? "End the prospect watch without deleting it."
      : request.operation === "pause"
        ? "Pause the prospect watch without deleting it."
        : "Activate or resume the prospect watch. Suppressed alerts are not replayed.";
  if (request.operation === "set_delivery")
    return "Change only the keyword rule's notification delivery switch. Rule activity is separate.";
  if (request.operation === "pause")
    return "Pause keyword discovery. The delivery switch is not changed by this action.";
  if (request.operation === "unsubscribe")
    return "Pause keyword discovery and disable delivery. Keep the rule and its history.";
  return "Activate keyword discovery from the current baseline using the owner's current preview.";
}

/** The owner-selected verb and immutable target; no generic activation or cancellation is inferred. */
export function watchFields(proposal: WatchProposal): readonly IntentField[] {
  const { request, context } = proposal;
  return [
    { label: "Watch owner", value: ownerLabels[request.family] },
    { label: "Action", value: verbLabels[request.operation] },
    { label: "Effect", value: effectDescription(request) },
    { label: "Target kind", value: request.targetKind },
    { label: "Target reference", value: request.targetKey },
    { label: "Target client", value: request.clientId ?? "No client binding" },
    {
      label: "Conversation scope",
      value: context.selectedClientId
        ? `Client ${context.selectedClientId}`
        : "Private to the current actor",
    },
    {
      label: "Expected version in request",
      value: String(request.expectedVersion),
    },
    ...(["business_development_prospect", "defense_budget_target"].includes(
      request.family,
    )
      ? [
          {
            label: "Version check",
            value:
              "This owner does not publish a version or perform a version-checked write.",
          },
        ]
      : []),
    {
      label: "Source revision",
      value: request.sourceRevision ?? "Not supplied",
    },
    { label: "Reason", value: request.reason ?? "Not supplied" },
    ...(request.operation === "set_delivery"
      ? [
          {
            label: "Requested delivery preference",
            value: request.enabled ? "Enabled" : "Disabled",
          },
        ]
      : []),
    { label: "Expires", value: proposal.expiresAt },
    { label: "Command hash", value: proposal.commandSha256 },
  ];
}

/** Show only the canonical owner's observed state; notification delivery is not implied. */
export function watchRow(
  item: Extract<IntentsItem, { kind: "watch_action" }>,
  now: number,
  viewer: Viewer,
): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Watch action",
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
      detail: "This watch action is unavailable with your current access.",
    };
  const { proposal, result } = item;
  const row = {
    ...base,
    title: ownerLabels[proposal.request.family],
    proposal,
    fields: watchFields(proposal),
  };
  if (result === "unavailable")
    return {
      ...row,
      status: "Status unavailable",
      tone: "warning",
      detail:
        "The current watch outcome could not be read. Refresh checks its owner without repeating the action.",
    };
  if (result.status === "succeeded" && result.receipt) {
    const receipt = result.receipt;
    return {
      ...row,
      status:
        receipt.state === "needs_review"
          ? "Watch needs review"
          : "Watch state confirmed",
      tone: receipt.state === "needs_review" ? "warning" : "success",
      detail:
        "The watch owner confirmed this recorded state. Rule activity and delivery preferences are separate; this is not proof that any notification was delivered.",
      result: [
        { label: "Recorded owner", value: ownerLabels[receipt.owner] },
        { label: "Recorded action", value: verbLabels[receipt.operation] },
        { label: "Recorded target", value: receipt.targetKey },
        { label: "Owner identity", value: receipt.identity },
        { label: "Recorded state", value: receipt.state.replaceAll("_", " ") },
        {
          label: "Recorded version",
          value:
            receipt.version === null
              ? "Not reported by owner"
              : String(receipt.version),
        },
        {
          label: "Delivery preference",
          value:
            receipt.deliveryEnabled === null
              ? "Not reported by owner"
              : receipt.deliveryEnabled
                ? "Enabled"
                : "Disabled",
        },
        {
          label: "Owner event",
          value: receipt.eventId ?? "Not reported by owner",
        },
        {
          label: "State change",
          value: receipt.alreadyInState
            ? "Owner confirmed the state already held"
            : "Owner confirmed the transition",
        },
      ],
    };
  }
  if (result.status === "proposed") {
    const own =
      proposal.binding.tenantId === viewer.tenantId &&
      proposal.binding.actorId === viewer.actorId;
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
        ? "Refresh to read any recorded outcome."
        : "Review this exact owner, target and action before confirming. No watch change occurs until you approve.",
    };
  }
  if (result.status === "dismissed")
    return {
      ...row,
      status: "Rejected",
      tone: "neutral",
      detail: "This proposal was rejected. Its watch action was not executed.",
    };
  if (["outcome_unknown", "failed_retryable"].includes(result.status))
    return {
      ...row,
      status: "Result uncertain",
      tone: "warning",
      detail:
        "No watch outcome is confirmed. Check the recorded state; this action will not be sent again.",
    };
  return {
    ...row,
    status: result.status.replaceAll("_", " "),
    tone: ["failed_terminal", "blocked"].includes(result.status)
      ? "danger"
      : "neutral",
    detail:
      "This is the action owner's recorded status. No watch change is confirmed; refresh reads without repeating the action.",
  };
}
