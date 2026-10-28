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
      preflight: null,
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
/**
 * The owner's answer carries exactly one bounded nullable preflight, so the fixture does too and
 * this helper only substitutes a declared reading for the default `null`. Both arguments are the
 * binding's own types.
 */
export function withPreflight(
  item: ClientItem,
  preflight: ClientResult["preflight"],
): ClientItem {
  return item.result === "unavailable"
    ? item
    : { ...item, result: { ...item.result, preflight } };
}
/**
 * Shapes no canonical receiver admits (out-of-enum verdict, non-object, hidden extra keys, or the
 * key omitted). Admission refuses every one of them — proved executably in the focused spec — so
 * they are only ever projected directly here to show the display invents nothing. Passing
 * `undefined` is how the retained key-less answer is built: JSON.stringify omits an undefined
 * value, so the serialized page carries no preflight key at all. This one boundary cast is the
 * only non-canonical construction in the fixture; product source has none.
 */
export function withHostilePreflight(
  item: ClientItem,
  preflight: unknown,
): ClientItem {
  return item.result === "unavailable"
    ? item
    : ({ ...item, result: { ...item.result, preflight } } as ClientItem);
}
