import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import type { SettingsWrite } from "./security-write-types";
import { row, equal, type Row } from "./settings-receipt-values";

type Api = CapiroApi<typeof capiroOperations>;

/** Receipt identity owned by the analyst Settings contract. */
export function analystReceipt(
  write: SettingsWrite,
  value: unknown,
): boolean | undefined {
  const receipt = row(value);
  const { params = {}, body = {} } = write.input;
  let confirmed = false;
  switch (write.operation) {
    case "settings.analyst.personnelMerge.decide":
      return receipt.resolved === true;
    case "settings.analyst.quarantine.discard":
      return receipt.discarded === true;
    case "settings.analyst.quarantine.reprocess":
      confirmed =
        receipt.reprocessed === true && typeof receipt.accepted === "boolean";
      if (confirmed) write.acceptedResult = Boolean(receipt.accepted);
      break;
    case "settings.analyst.programMatches.decide":
      return (
        equal(receipt.id, params.id) &&
        equal(receipt.decision, body.decision) &&
        receipt.status ===
          (
            {
              accept: "accepted",
              reject: "rejected",
              quarantine: "quarantined",
            } as Row
          )[String(body.decision)]
      );
    case "settings.analyst.reconciliation.resolve":
      return (
        equal(receipt.id, params.id) &&
        equal(receipt.decision, body.decision) &&
        (receipt.resolved === true || receipt.pendingApproval === true) &&
        (body.decision !== "manual_value" ||
          equal(receipt.proposedValue, body.manualValue))
      );
    case "settings.analyst.reconciliation.approve":
    case "settings.analyst.aliases.delete":
      return equal(receipt.id, params.id);
    case "settings.analyst.aliases.add":
    case "settings.analyst.aliases.update":
      return (
        (write.operation.endsWith("add")
          ? equal(receipt.programId, params.programId)
          : equal(receipt.id, params.id)) &&
        equal(receipt.alias, body.alias) &&
        equal(receipt.aliasType, body.aliasType)
      );
    case "settings.analyst.programs.merge":
      return (
        equal(receipt.keepProgramId, body.keepProgramId) &&
        equal(receipt.mergeProgramId, body.mergeProgramId)
      );
    case "settings.analyst.personCandidates.decide":
      return (
        receipt.resolved === true &&
        receipt.linked === (body.decision === "confirm")
      );
    default:
      return undefined;
  }
  return confirmed;
}

async function reconcilePersonReview(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean> {
  const { params = {}, body = {} } = write.input;
  const person = write.operation === "settings.analyst.personCandidates.decide";
  const status = person
    ? body.decision === "confirm"
      ? "confirmed"
      : "rejected"
    : body.decision === "merge"
      ? "merged"
      : String(body.decision);
  for (let page = 1; page <= 20; page++) {
    signal.throwIfAborted();
    const result = person
      ? await api.request(
          "settings.analyst.personCandidates.list",
          { query: { status, page, limit: 100 } },
          { signal },
        )
      : await api.request(
          "settings.analyst.personnelMerge.list",
          { query: { status, page, limit: 100 } },
          { signal },
        );
    const target = result.data.find((entry) => entry.id === params.id);
    if (target) return target.status === status;
    if (result.page * result.limit >= result.total) return false;
  }
  return false;
}

async function reconcileQuarantine(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean> {
  const { params = {} } = write.input;
  const action = write.operation.endsWith("discard")
    ? "quarantine.discard"
    : "quarantine.reprocess";
  const entityType =
    params.type === "program_element"
      ? "program_element_quarantine"
      : "acquisition_personnel_quarantine";
  for (let page = 1; page <= 20; page++) {
    signal.throwIfAborted();
    const result = await api.request(
      "settings.analyst.audit.list",
      {
        query: {
          action,
          entityType,
          from: write.startedAt,
          page,
          limit: 100,
        },
      },
      { signal },
    );
    const event = result.data.find(
      (entry) =>
        entry.entityId === params.id &&
        entry.action === action &&
        entry.entityType === entityType &&
        Date.parse(entry.occurredAt) >= Date.parse(write.startedAt),
    );
    if (event)
      return (
        action === "quarantine.discard" ||
        (write.acceptedResult !== undefined &&
          row(event.after).accepted === write.acceptedResult)
      );
    if (result.page * result.limit >= result.total) return false;
  }
  return false;
}

export async function reconcileAnalyst(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean | undefined> {
  if (
    [
      "settings.analyst.personCandidates.decide",
      "settings.analyst.personnelMerge.decide",
    ].includes(write.operation)
  )
    return reconcilePersonReview(api, write, signal);
  if (
    [
      "settings.analyst.quarantine.discard",
      "settings.analyst.quarantine.reprocess",
    ].includes(write.operation)
  )
    return reconcileQuarantine(api, write, signal);
  return undefined;
}
