import type { IntentsItem } from "@capiro/meri-client/intents";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { legiwatchFixture } from "./meri-legiwatch-fixture";

export type ClientItem = Extract<
  IntentsItem,
  { kind: "client_record_action"; proposal: unknown }
>;
export type ClientResult = Exclude<ClientItem["result"], "unavailable">;
export function clientRecordFixture(
  status: ClientResult["status"] = "proposed",
  create = false,
): ClientItem {
  const seed = legiwatchFixture();
  const request: ClientItem["proposal"]["request"] = create
    ? {
        operation: "create_client",
        input: {
          name: "Synthetic client",
          website: "https://example.invalid",
          ldaClientId: 42,
        },
      }
    : {
        operation: "update_client_profile",
        input: {
          clientId: "00000000-0000-4000-8000-000000000019",
          description: "Approved description",
          issueCodes: [],
          people: [
            { name: "Synthetic Person", email: "person@example.invalid" },
          ],
          facilities: [{ name: "Synthetic office", city: "Tampa" }],
        },
      };
  const bound: Omit<ClientItem["proposal"], "commandSha256"> = {
    kind: "client_record_action",
    operation: request.operation,
    proposalId: seed.proposal.proposalId,
    binding: seed.proposal.binding,
    scopes: seed.proposal.scopes,
    request,
    context: seed.proposal.context,
    createdAt: seed.createdAt,
    expiresAt: seed.proposal.expiresAt,
  };
  const proposal = { ...bound, commandSha256: canonicalSha256(bound) };
  const receipt: ClientResult["receipt"] =
    request.operation === "create_client"
      ? {
          request,
          outcome: "created",
          created: true,
          client: {
            id: "00000000-0000-4000-8000-000000000020",
            name: request.input.name,
            website: request.input.website ?? null,
          },
          ldaMatch: {
            ldaClientId: 42,
            name: "Synthetic registry name",
            totalFilings: 4,
            latestFilingYear: 2026,
          },
        }
      : {
          request,
          outcome: "partially_updated",
          tool: "update_client_profile",
          updated: true,
          clientId: request.input.clientId,
          clientName: "Synthetic existing client",
          fieldsWritten: ["description", "issueCodes"],
          facilitiesCreated: [],
          capabilitiesCreated: [],
          peopleCreated: [],
          peopleUpdated: ["Synthetic Person"],
          skipped: [],
          rowErrors: ["Synthetic office could not be updated"],
        };
  return {
    state: "prepared",
    kind: "client_record_action",
    operation: { id: request.operation, version: "0.2.0" },
    deliveryId: seed.deliveryId,
    createdAt: seed.createdAt,
    proposal,
    result: {
      version: "0.1.0",
      proposalId: proposal.proposalId,
      request,
      context: proposal.context,
      createdAt: proposal.createdAt,
      expiresAt: proposal.expiresAt,
      status,
      receipt: status === "succeeded" ? receipt : null,
    },
  };
}

export function clientDecision(
  item: ClientItem,
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
export function clientDecisionResponse(item: ClientItem) {
  if (item.result === "unavailable")
    throw Error("Synthetic fixture has no owner result");
  return {
    status: "client_record_decided" as const,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    result: item.result,
  };
}
