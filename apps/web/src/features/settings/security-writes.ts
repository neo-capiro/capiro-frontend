import { CapiroApiError } from "../../shared/capiro/http";

type Row = Record<string, unknown>;
const row = (value: unknown): Row =>
  value && typeof value === "object" ? (value as Row) : {};
const list = (value: unknown): Row[] =>
  Array.isArray(value) ? value.map(row) : [];
const equal = (a: unknown, b: unknown) => a !== undefined && a === b;
const sameMembers = (a: unknown, b: unknown) => {
  const left = Array.isArray(a) ? [...a].sort() : [];
  const right = Array.isArray(b) ? [...b].sort() : [];
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
};
export type SettingsWrite = {
  operation: string;
  attemptId: string;
  input: { params?: Row; body?: Row };
  state: "pending" | "unknown";
  expectedInvitation?: { email: string; role: string };
  receiptId?: string;
  acceptedResult?: boolean;
  startedAt: string;
};
export const uncertainSettingsWrite =
  "The result is not confirmed. This write will not be sent again. Check the recorded target before making another change.";

/** Shape validation belongs to the transport; these checks bind a receipt to the reviewed write. */
export function assertSettingsReceipt(write: SettingsWrite, value: unknown) {
  const receipt = row(value);
  const { params = {}, body = {} } = write.input;
  let confirmed = false;
  switch (write.operation) {
    case "settings.team.remove":
      confirmed = receipt.ok === true || typeof receipt.jobId === "string";
      break;
    case "settings.team.resend":
      confirmed =
        !!write.expectedInvitation &&
        typeof receipt.invitationId === "string" &&
        receipt.invitationId.length > 0;
      if (confirmed) write.receiptId = String(receipt.invitationId);
      break;
    case "settings.analyst.personnelMerge.decide":
      confirmed = receipt.resolved === true;
      break;
    case "settings.analyst.quarantine.discard":
      confirmed = receipt.discarded === true;
      break;
    case "settings.analyst.quarantine.reprocess":
      confirmed =
        receipt.reprocessed === true && typeof receipt.accepted === "boolean";
      if (confirmed) write.acceptedResult = Boolean(receipt.accepted);
      break;
    case "settings.mappings.resolveClient":
      confirmed =
        Array.isArray(value) &&
        value.every((entry) => row(entry).clientId === params.clientId);
      break;
    case "settings.mappings.resolveAll":
    case "settings.mappings.exactIdentifiers":
      confirmed =
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
        Number(receipt.needsReview) <= Number(receipt.mappingsCreated);
      break;
    case "settings.mappings.confirmIndividual":
      confirmed =
        equal(receipt.id, params.mappingId) &&
        equal(receipt.confirmed, body.confirmed) &&
        (body.relationshipType === undefined ||
          receipt.relationshipType === body.relationshipType) &&
        (body.rollUpAwards === undefined ||
          receipt.rollUpAwards === body.rollUpAwards);
      break;
    case "settings.mappings.manual":
    case "settings.mappings.rejectContractorCandidate":
      confirmed =
        equal(receipt.clientId, params.clientId) &&
        equal(receipt.source, body.source) &&
        equal(receipt.externalId, body.externalId) &&
        (write.operation === "settings.mappings.rejectContractorCandidate"
          ? receipt.reviewStatus === "rejected" && receipt.confirmed === false
          : receipt.confirmed === true) &&
        (body.relationshipType === undefined ||
          receipt.relationshipType === body.relationshipType) &&
        (body.rollUpAwards === undefined ||
          receipt.rollUpAwards === body.rollUpAwards);
      break;
    case "settings.analyst.programMatches.decide":
      confirmed =
        equal(receipt.id, params.id) &&
        equal(receipt.decision, body.decision) &&
        receipt.status ===
          (
            {
              accept: "accepted",
              reject: "rejected",
              quarantine: "quarantined",
            } as Row
          )[String(body.decision)];
      break;
    case "settings.analyst.reconciliation.resolve":
      confirmed =
        equal(receipt.id, params.id) &&
        equal(receipt.decision, body.decision) &&
        (receipt.resolved === true || receipt.pendingApproval === true) &&
        (body.decision !== "manual_value" ||
          equal(receipt.proposedValue, body.manualValue));
      break;
    case "settings.analyst.reconciliation.approve":
    case "settings.analyst.aliases.delete":
      confirmed = equal(receipt.id, params.id);
      break;
    case "settings.analyst.aliases.add":
    case "settings.analyst.aliases.update":
      confirmed =
        (write.operation.endsWith("add")
          ? equal(receipt.programId, params.programId)
          : equal(receipt.id, params.id)) &&
        equal(receipt.alias, body.alias) &&
        equal(receipt.aliasType, body.aliasType);
      break;
    case "settings.analyst.programs.merge":
      confirmed =
        equal(receipt.keepProgramId, body.keepProgramId) &&
        equal(receipt.mergeProgramId, body.mergeProgramId);
      break;
    case "settings.analyst.personCandidates.decide":
      confirmed =
        receipt.resolved === true &&
        receipt.linked === (body.decision === "confirm");
      break;
    case "settings.team.invite":
      confirmed =
        equal(
          row(receipt.invitation).email,
          typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : undefined,
        ) && equal(row(receipt.invitation).role, body.role);
      break;
    case "settings.team.setRole":
      confirmed =
        equal(row(receipt.member).localUserId, params.userId) &&
        equal(receipt.role, body.role);
      break;
    case "settings.team.setBillingAdmin":
      confirmed =
        equal(receipt.userId, params.userId) &&
        equal(receipt.billingAdmin, body.billingAdmin);
      break;
    case "settings.hq.tenants.create":
      confirmed =
        equal(
          row(receipt.tenant).slug,
          typeof body.slug === "string" ? body.slug.toLowerCase() : undefined,
        ) &&
        equal(row(receipt.tenant).name, body.name) &&
        equal(
          row(receipt.invitation).email,
          typeof body.adminEmail === "string"
            ? body.adminEmail.trim().toLowerCase()
            : undefined,
        );
      break;
    case "settings.hq.tenants.resendInvitation":
      confirmed =
        typeof receipt.invitationId === "string" &&
        receipt.invitationId.length > 0 &&
        equal(receipt.tenantId, params.tenantId) &&
        equal(
          receipt.email,
          typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : undefined,
        ) &&
        receipt.role === "user_admin";
      break;
    case "settings.hq.tenants.delete":
      confirmed = equal(receipt.deletedTenantId, params.tenantId);
      break;
    case "settings.hq.customers.comp":
      confirmed = receipt.status === (body.comped ? "comped" : "none");
      break;
    case "settings.hq.ai.setCredential":
      confirmed =
        equal(receipt.provider, body.provider) &&
        receipt.status === "active" &&
        equal(receipt.last4, body.keyLast4) &&
        receipt.modelOverride === (body.modelOverride ?? null);
      break;
    case "settings.hq.ai.updateModel":
      confirmed =
        equal(receipt.provider, body.provider) &&
        receipt.modelOverride ===
          (body.restoreDefault ? null : body.modelOverride) &&
        receipt.updatedAt !== body.expectedUpdatedAt;
      break;
    case "settings.hq.ai.removeCredential":
      confirmed = receipt.removed === true;
      break;
    case "settings.hq.broadcasts.send":
      confirmed =
        equal(receipt.tenantId, body.tenantId) &&
        equal(receipt.title, body.title) &&
        equal(receipt.body, body.body) &&
        equal(receipt.audience, body.audience) &&
        (body.audience !== "selected_users" ||
          sameMembers(
            list(receipt.recipients).map((entry) => entry.userId),
            body.userIds,
          ));
      break;
    case "settings.hq.broadcasts.archive":
      confirmed =
        equal(receipt.id, params.id) && typeof receipt.archivedAt === "string";
      break;
    case "settings.integrations.disconnectMicrosoft":
    case "settings.integrations.disconnectGoogle":
      confirmed =
        equal(receipt.connectionId, params.connectionId) &&
        receipt.disconnected === true;
      break;
  }
  if (!confirmed) throw new Error(uncertainSettingsWrite);
}

export function isDefiniteSettingsRejection(error: unknown) {
  return (
    error instanceof CapiroApiError &&
    [400, 401, 403, 404, 409, 422].includes(error.status)
  );
}
export function snapshotSettingsWrite(
  operation: string,
  input: unknown,
): SettingsWrite {
  const captured = structuredClone(row(input)) as SettingsWrite["input"];
  if (typeof captured.body?.apiKey === "string") {
    captured.body.keyLast4 = captured.body.apiKey.slice(-4);
    delete captured.body.apiKey; // Never retain a credential in the navigation journal.
  }
  return {
    operation,
    attemptId: crypto.randomUUID(),
    input: captured,
    state: "pending",
    startedAt: new Date().toISOString(),
  };
}
