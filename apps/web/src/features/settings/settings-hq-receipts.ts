import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import type { SettingsWrite } from "./security-write-types";
import { row, list, equal, sameMembers } from "./settings-receipt-values";

type Api = CapiroApi<typeof capiroOperations>;

/** Receipt identity owned by the hq Settings contract. */
export function hqReceipt(
  write: SettingsWrite,
  value: unknown,
): boolean | undefined {
  const receipt = row(value);
  const { params = {}, body = {} } = write.input;
  switch (write.operation) {
    case "settings.hq.tenants.create":
      return (
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
        )
      );
    case "settings.hq.tenants.resendInvitation":
      return (
        typeof receipt.invitationId === "string" &&
        receipt.invitationId.length > 0 &&
        equal(receipt.tenantId, params.tenantId) &&
        equal(
          receipt.email,
          typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : undefined,
        ) &&
        receipt.role === "user_admin"
      );
    case "settings.hq.tenants.delete":
      return equal(receipt.deletedTenantId, params.tenantId);
    case "settings.hq.customers.comp":
      return receipt.status === (body.comped ? "comped" : "none");
    case "settings.hq.ai.setCredential":
      return (
        equal(receipt.provider, body.provider) &&
        receipt.status === "active" &&
        equal(receipt.last4, body.keyLast4) &&
        receipt.modelOverride === (body.modelOverride ?? null)
      );
    case "settings.hq.ai.updateModel":
      return (
        equal(receipt.provider, body.provider) &&
        receipt.modelOverride ===
          (body.restoreDefault ? null : body.modelOverride) &&
        receipt.updatedAt !== body.expectedUpdatedAt
      );
    case "settings.hq.ai.removeCredential":
      return receipt.removed === true;
    case "settings.hq.broadcasts.send":
      return (
        equal(receipt.tenantId, body.tenantId) &&
        equal(receipt.title, body.title) &&
        equal(receipt.body, body.body) &&
        equal(receipt.audience, body.audience) &&
        (body.audience !== "selected_users" ||
          sameMembers(
            list(receipt.recipients).map((entry) => entry.userId),
            body.userIds,
          ))
      );
    case "settings.hq.broadcasts.archive":
      return (
        equal(receipt.id, params.id) && typeof receipt.archivedAt === "string"
      );
    default:
      return undefined;
  }
}

/** Current authorized readback follows a delivered receipt; it never replays. */
export async function reconcileHq(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean | undefined> {
  const { params = {}, body = {} } = write.input;
  switch (write.operation) {
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
    default:
      return undefined;
  }
}
