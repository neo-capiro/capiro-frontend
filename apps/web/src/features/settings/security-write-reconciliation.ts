import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import type { SettingsWrite } from "./security-writes";
type Api = CapiroApi<typeof capiroOperations>;
const row = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/** Read-only reconciliation proves the exact current state, never replays a write. */
export async function reconcileSettingsWrite(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean> {
  signal.throwIfAborted();
  const { params = {}, body = {} } = write.input;
  switch (write.operation) {
    case "settings.team.resend": {
      if (!write.expectedInvitation || !write.receiptId) return false;
      const invitations = await api.request(
        "settings.team.invitations",
        {},
        { signal },
      );
      return invitations.some(
        (entry) =>
          entry.id === write.receiptId &&
          entry.email === write.expectedInvitation!.email &&
          entry.role === write.expectedInvitation!.role,
      );
    }
    case "settings.analyst.personCandidates.decide":
    case "settings.analyst.personnelMerge.decide": {
      const person =
        write.operation === "settings.analyst.personCandidates.decide";
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
    case "settings.analyst.quarantine.discard":
    case "settings.analyst.quarantine.reprocess": {
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
    case "settings.team.remove":
    case "settings.team.setRole":
    case "settings.team.setBillingAdmin": {
      const members = await api.request("settings.team.list", {}, { signal });
      const member = members.find((item) => item.userId === params.userId);
      if (write.operation === "settings.team.remove")
        return !member || member.status === "removed";
      return (
        !!member &&
        (write.operation === "settings.team.setRole"
          ? member.role === body.role
          : member.billingAdmin === body.billingAdmin)
      );
    }
    case "settings.hq.tenants.delete": {
      const tenants = await api.request(
        "settings.hq.tenants.list",
        {},
        { signal },
      );
      return !tenants.some((item) => item.id === params.tenantId);
    }
    case "settings.hq.customers.comp": {
      const customers = await api.request(
        "settings.hq.customers.list",
        {},
        { signal },
      );
      return customers.some(
        (item) =>
          item.tenantId === params.tenantId &&
          item.status === (body.comped ? "comped" : "none"),
      );
    }
    case "settings.hq.ai.removeCredential":
    case "settings.hq.ai.updateModel": {
      const credentials = await api.request(
        "settings.hq.ai.credentials",
        { params: { tenantId: String(params.tenantId) } },
        { signal },
      );
      const credential = credentials.find(
        (item) => item.provider === (params.provider ?? body.provider),
      );
      if (write.operation === "settings.hq.ai.removeCredential")
        return !credential;
      return (
        !!credential &&
        credential.modelOverride ===
          (body.restoreDefault ? null : body.modelOverride) &&
        credential.updatedAt !== body.expectedUpdatedAt
      );
    }
    case "settings.hq.broadcasts.archive": {
      const broadcast = await api.request(
        "settings.hq.broadcasts.detail",
        { params: { id: String(params.id) } },
        { signal },
      );
      return broadcast.id === params.id && !!broadcast.archivedAt;
    }
    case "settings.integrations.disconnectMicrosoft":
    case "settings.integrations.disconnectGoogle": {
      const connections = await api.request(
        "settings.integrations.list",
        {},
        { signal },
      );
      return !connections.some(
        (item) => item.id === params.connectionId && item.status !== "disabled",
      );
    }
    default:
      // An invitation, broadcast, creation or key rotation has no durable request ID.
      // A matching row alone cannot prove that this exact attempt completed.
      return false;
  }
}

export const settingsWriteNeedsReadback = (operation: string) =>
  [
    "settings.team.remove",
    "settings.team.resend",
    "settings.analyst.personCandidates.decide",
    "settings.analyst.personnelMerge.decide",
    "settings.analyst.quarantine.discard",
    "settings.analyst.quarantine.reprocess",
    "settings.hq.ai.removeCredential",
    "settings.hq.customers.comp",
  ].includes(operation);
