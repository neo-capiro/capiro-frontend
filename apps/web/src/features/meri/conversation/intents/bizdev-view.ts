import type { IntentsItem, IntentsProposal } from "@capiro/meri-client/intents";
import type { IntentField, IntentRow, Viewer } from "./intent-view-types";

type BizdevProposal = Extract<IntentsProposal, { kind: "bizdev_action" }>;

export function isBizdevProposal(
  proposal: IntentsProposal,
): proposal is BizdevProposal {
  return "kind" in proposal && proposal.kind === "bizdev_action";
}

/** An observed terminal owner state settles the existing exact decision journal. */
export function bizdevSettled(status: string) {
  return [
    "succeeded",
    "dismissed",
    "expired",
    "failed_terminal",
    "blocked",
  ].includes(status);
}

const sectionLabels = {
  companyAndFirmImplication: "Company and firm implication",
  verifiedEvidence: "Verified evidence",
  judgment: "Judgment",
  practicalAction: "Practical action",
  missingInformation: "Missing information",
} satisfies Record<keyof BizdevProposal["request"]["sections"], string>;

/** Render every bounded retained section; indexes are references, not invented source text. */
export function bizdevFields(proposal: BizdevProposal): readonly IntentField[] {
  const { request, context } = proposal;
  return [
    { label: "Action", value: "Save a business-development brief version" },
    { label: "Prospect", value: context.prospectName },
    { label: "Prospect reference", value: context.prospectId },
    {
      label: "Scope",
      value: context.linkedClientId
        ? `Client ${context.linkedClientId}`
        : "Private to the current actor",
    },
    { label: "Title", value: request.title ?? "Keep the current brief title" },
    {
      label: "Expected current version",
      value: String(request.expectedVersionNumber),
    },
    ...Object.entries(sectionLabels).flatMap(([key, label]) => {
      const section = request.sections[key as keyof typeof sectionLabels];
      return [
        { label, value: section.text },
        {
          label: `${label} citation indexes (zero-based)`,
          value: section.citationIndexes.length
            ? section.citationIndexes.join(", ")
            : "None",
        },
      ];
    }),
    { label: "Expires", value: proposal.expiresAt },
    { label: "Command hash", value: proposal.commandSha256 },
  ];
}

/** Only the saved-version owner's exact receipt confirms a saved brief; no publication is inferred. */
export function bizdevRow(
  item: Extract<IntentsItem, { kind: "bizdev_action" }>,
  now: number,
  viewer: Viewer,
): IntentRow {
  const base = {
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    title: "Business-development brief",
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
      detail: "This brief action is unavailable with your current access.",
    };
  const { proposal, result } = item;
  const row = { ...base, proposal, fields: bizdevFields(proposal) };
  if (result === "unavailable")
    return {
      ...row,
      status: "Status unavailable",
      tone: "warning",
      detail:
        "The saved version could not be confirmed. Refresh reads the recorded status without repeating the save.",
    };
  if (result.status === "succeeded" && result.receipt) {
    const receipt = result.receipt;
    return {
      ...row,
      status: "Brief version saved",
      tone: "success",
      detail:
        "The saved-version owner confirmed this exact brief version. This does not publish or send the brief.",
      result: [
        { label: "Saved brief", value: receipt.brief.id },
        { label: "Saved title", value: receipt.brief.title },
        { label: "Brief status", value: receipt.brief.status },
        {
          label: "Saved version",
          value: String(receipt.version.versionNumber),
        },
        { label: "Version reference", value: receipt.version.id },
        { label: "Saved at", value: receipt.version.createdAt },
        {
          label: "Citation count",
          value: String(receipt.version.citationCount),
        },
        {
          label: "Receipt",
          value: receipt.reused
            ? "Previously saved version confirmed"
            : "Saved version confirmed",
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
        : "Review all five retained sections before confirming the new saved version. Nothing is saved until you approve.",
    };
  }
  if (result.status === "dismissed")
    return {
      ...row,
      status: "Rejected",
      tone: "neutral",
      detail:
        "The proposal was rejected. No brief version was saved by this decision.",
    };
  if (["outcome_unknown", "failed_retryable"].includes(result.status))
    return {
      ...row,
      status: "Result uncertain",
      tone: "warning",
      detail:
        "No saved version is confirmed. Check the recorded status; this save will not be sent again.",
    };
  return {
    ...row,
    status: result.status.replaceAll("_", " "),
    tone: ["failed_terminal", "blocked"].includes(result.status)
      ? "danger"
      : "neutral",
    detail:
      "This is the action owner's recorded status. A saved version has not been confirmed; refresh reads without repeating the save.",
  };
}
