import type { IntentsItem } from "@capiro/meri-client/intents";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { legiwatchFixture } from "./meri-legiwatch-fixture";

export type BizdevItem = Extract<
  IntentsItem,
  { kind: "bizdev_action"; proposal: unknown }
>;
export type BizdevResult = Exclude<BizdevItem["result"], "unavailable">;
export function bizdevFixture(
  status: BizdevResult["status"] = "proposed",
  linked = false,
): BizdevItem {
  const seed = legiwatchFixture();
  const clientId = "00000000-0000-4000-8000-000000000019";
  const request: BizdevItem["proposal"]["request"] = {
    conversationId: seed.proposal.binding.conversationId,
    expectedVersionNumber: 2,
    title: "Synthetic saved brief",
    requestKey: "meri-bizdev-brief-" + "a".repeat(64),
    sections: {
      companyAndFirmImplication: {
        text: "Firm implication " + "界".repeat(2050) + " retained tail",
        citationIndexes: [1, 0, 1],
      },
      verifiedEvidence: {
        text: "Synthetic verified evidence",
        citationIndexes: [0],
      },
      judgment: { text: "Synthetic judgment", citationIndexes: [] },
      practicalAction: {
        text: "Synthetic practical action",
        citationIndexes: [2],
      },
      missingInformation: {
        text: "Synthetic missing information",
        citationIndexes: [],
      },
    },
  };
  const bound: Omit<BizdevItem["proposal"], "commandSha256"> = {
    kind: "bizdev_action",
    operation: "save_business_development_brief",
    proposalId: seed.proposal.proposalId,
    binding: seed.proposal.binding,
    scopes: linked
      ? [{ ...seed.proposal.scopes[0], kind: "client", resourceId: clientId }]
      : seed.proposal.scopes,
    request,
    context: {
      conversationId: request.conversationId,
      prospectId: "00000000-0000-4000-8000-000000000020",
      prospectName: "Synthetic prospect",
      canonicalOrganizationId: null,
      linkedClientId: linked ? clientId : null,
      scopeVersion: "b".repeat(64),
    },
    createdAt: seed.createdAt,
    expiresAt: seed.proposal.expiresAt,
  };
  const proposal = { ...bound, commandSha256: canonicalSha256(bound) };
  return {
    deliveryId: seed.deliveryId,
    createdAt: seed.createdAt,
    state: "prepared",
    kind: "bizdev_action",
    operation: { id: bound.operation, version: "0.2.0" },
    proposal,
    result: {
      version: "0.1.0",
      proposalId: proposal.proposalId,
      request,
      context: proposal.context,
      createdAt: proposal.createdAt,
      expiresAt: proposal.expiresAt,
      status,
      receipt: null,
    },
  };
}

export function bizdevResult(
  item: BizdevItem,
  status: BizdevResult["status"],
): BizdevItem {
  if (item.result === "unavailable")
    throw Error("Synthetic fixture has no owner result");
  const { request, context, createdAt } = item.proposal;
  return {
    ...item,
    result: {
      ...item.result,
      status,
      receipt:
        status === "succeeded"
          ? {
              request,
              binding: "c".repeat(64),
              tool: "save_business_development_brief",
              status: "saved",
              generatedAt: createdAt,
              brief: {
                id: "00000000-0000-4000-8000-000000000021",
                title: request.title ?? "Existing title",
                status: "draft",
                currentVersionNumber: 3,
                updatedAt: createdAt,
              },
              version: {
                id: "00000000-0000-4000-8000-000000000022",
                versionNumber: 3,
                createdAt,
                citationCount: 3,
              },
              reused: false,
              prospectName: context.prospectName,
            }
          : null,
    },
  };
}

export function bizdevDecision(
  item: BizdevItem,
  decision: "approved" | "rejected" = "approved",
) {
  return {
    conversationId: item.proposal.binding.conversationId,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    commandSha256: item.proposal.commandSha256,
    decision,
  };
}
export function bizdevDecisionResponse(item: BizdevItem) {
  if (item.result === "unavailable")
    throw Error("Synthetic fixture has no owner result");
  return {
    status: "bizdev_decided" as const,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    result: item.result,
  };
}
