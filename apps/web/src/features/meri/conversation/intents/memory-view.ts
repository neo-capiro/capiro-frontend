import type {
  IntentsProposal,
  IntentsExecutionOutcome,
  IntentsNativeMemoryOutcome,
  IntentsNativeProposal,
} from "@capiro/meri-client/intents";
import type { IntentField, IntentRow } from "./intent-view-types";

export function isMemoryProposal(
  proposal: IntentsProposal,
): proposal is IntentsNativeProposal & {
  command: IntentsNativeProposal["command"] & { action: "memory.propose" };
} {
  return "command" in proposal && proposal.command.action === "memory.propose";
}

/** Only narrow an outcome already accepted by the shared public receiver. */
export function isNativeMemoryOutcome(
  outcome: IntentsExecutionOutcome,
): outcome is IntentsNativeMemoryOutcome {
  return (
    "result" in outcome &&
    "execution" in outcome &&
    "kind" in outcome.execution &&
    outcome.execution.kind === "native-memory"
  );
}

const reviewLooks = {
  pending: {
    status: "Submitted for review",
    tone: "neutral",
    detail:
      "The exact proposal was submitted. Memory review is pending; submission does not activate or publish memory.",
  },
  approved: {
    status: "Review approved",
    tone: "success",
    detail:
      "The review owner recorded approval and a published memory reference. This does not confirm current recall eligibility.",
  },
  rejected: {
    status: "Review rejected",
    tone: "neutral",
    detail:
      "The review owner rejected this candidate. The submission receipt is retained; no publication was recorded.",
  },
  withdrawn: {
    status: "Review withdrawn",
    tone: "neutral",
    detail:
      "This candidate was withdrawn. The submission receipt is retained; no publication was recorded.",
  },
  not_found: {
    status: "Review unavailable",
    tone: "warning",
    detail:
      "Submission was recorded, but the candidate is no longer available. This does not authorize another submission.",
  },
} satisfies Record<
  IntentsNativeMemoryOutcome["result"]["review"]["status"],
  Pick<IntentRow, "status" | "tone" | "detail">
>;

export function memoryOutcomeLook(outcome: IntentsNativeMemoryOutcome) {
  return reviewLooks[outcome.result.review.status];
}

export function memoryResultFields(
  outcome: IntentsNativeMemoryOutcome,
): readonly IntentField[] {
  const { result, execution } = outcome;
  return [
    { label: "Candidate reference", value: result.candidateId },
    { label: "Candidate hash", value: result.candidateSha256 },
    // reviewId is a submission correlation, not a routable review-request ID.
    { label: "Submission reference", value: result.reviewId },
    { label: "Submitted", value: execution.completedAt },
    { label: "Review checked", value: result.review.checkedAt },
    ...(result.review.decidedAt === null
      ? []
      : [{ label: "Review decided", value: result.review.decidedAt }]),
    ...(result.review.publishedMemoryId === null
      ? []
      : [
          {
            label: "Published memory reference",
            value: result.review.publishedMemoryId,
          },
        ]),
  ];
}

/** Memory approval must display the complete retained text, never a shortened preview. */
export function memoryProposalFields(
  proposal: IntentsNativeProposal,
): readonly IntentField[] {
  const args = proposal.command.arguments as Record<string, unknown>;
  const scopes: Record<string, string> = {
    personal: "Personal memory (private)",
    client: "Client memory",
    firm: "Firm memory",
  };
  return [
    { label: "Action", value: "Submit a memory proposal for review" },
    { label: "Exact proposed content", value: String(args.content) },
    {
      label: "Destination",
      value: scopes[String(args.scope)] ?? "Unavailable",
    },
    {
      label: "Client",
      value: typeof args.clientId === "string" ? args.clientId : "None",
    },
    {
      label: "Memory key",
      value: typeof args.key === "string" ? args.key : "Unkeyed proposal",
    },
    {
      label: "Requested expiry",
      value:
        typeof args.ttlDays === "number"
          ? `${args.ttlDays} days`
          : "Owner policy",
    },
    {
      label: "Effect",
      value:
        "Approval submits this exact content for memory review. Submission does not activate or publish memory.",
    },
    { label: "Expires", value: proposal.expiresAt },
    { label: "Command hash", value: proposal.commandSha256 },
  ];
}
