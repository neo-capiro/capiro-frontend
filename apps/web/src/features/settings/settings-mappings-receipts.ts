import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import type { SettingsWrite } from "./security-write-types";
import { row, equal } from "./settings-receipt-values";

type Api = CapiroApi<typeof capiroOperations>;

/** Receipt identity owned by the mappings Settings contract. */
export function mappingsReceipt(
  write: SettingsWrite,
  value: unknown,
): boolean | undefined {
  const receipt = row(value);
  const { params = {}, body = {} } = write.input;
  switch (write.operation) {
    case "settings.mappings.resolveClient":
      return (
        Array.isArray(value) &&
        value.every((entry) => row(entry).clientId === params.clientId)
      );
    case "settings.mappings.resolveAll":
    case "settings.mappings.exactIdentifiers":
      return (
        [
          "totalClients",
          "mappingsCreated",
          "autoConfirmed",
          "needsReview",
        ].every(
          (name) =>
            typeof receipt[name] === "number" &&
            Number.isInteger(receipt[name]) &&
            Number(receipt[name]) >= 0,
        ) &&
        Number(receipt.autoConfirmed) <= Number(receipt.mappingsCreated) &&
        Number(receipt.needsReview) <= Number(receipt.mappingsCreated)
      );
    case "settings.mappings.confirmIndividual":
      return (
        equal(receipt.id, params.mappingId) &&
        equal(receipt.confirmed, body.confirmed) &&
        (body.relationshipType === undefined ||
          receipt.relationshipType === body.relationshipType) &&
        (body.rollUpAwards === undefined ||
          receipt.rollUpAwards === body.rollUpAwards)
      );
    case "settings.mappings.manual":
    case "settings.mappings.rejectContractorCandidate":
      return (
        equal(receipt.clientId, params.clientId) &&
        equal(receipt.source, body.source) &&
        equal(receipt.externalId, body.externalId) &&
        (write.operation === "settings.mappings.rejectContractorCandidate"
          ? receipt.reviewStatus === "rejected" && receipt.confirmed === false
          : receipt.confirmed === true) &&
        (body.relationshipType === undefined ||
          receipt.relationshipType === body.relationshipType) &&
        (body.rollUpAwards === undefined ||
          receipt.rollUpAwards === body.rollUpAwards)
      );
    default:
      return undefined;
  }
}

/** Current authorized readback follows a delivered receipt; it never replays. */
export async function reconcileMappings(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean | undefined> {
  const { params = {}, body = {} } = write.input;
  switch (write.operation) {
    case "settings.mappings.confirmIndividual": {
      const mappings = await api.request(
        "settings.mappings.list",
        {},
        { signal },
      );
      const target = mappings.find((entry) => entry.id === params.mappingId);
      return (
        !!target &&
        target.confirmed === body.confirmed &&
        (body.relationshipType === undefined ||
          target.relationshipType === body.relationshipType) &&
        (body.rollUpAwards === undefined ||
          target.rollUpAwards === body.rollUpAwards)
      );
    }
    default:
      return undefined;
  }
}
