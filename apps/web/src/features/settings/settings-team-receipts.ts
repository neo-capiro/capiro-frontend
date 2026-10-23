import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";
import type { SettingsWrite } from "./security-write-types";
import { row, equal } from "./settings-receipt-values";

type Api = CapiroApi<typeof capiroOperations>;

/** Receipt identity owned by the team Settings contract. */
export function teamReceipt(
  write: SettingsWrite,
  value: unknown,
): boolean | undefined {
  const receipt = row(value);
  const { params = {}, body = {} } = write.input;
  let confirmed = false;
  switch (write.operation) {
    case "settings.team.remove":
      return receipt.ok === true || typeof receipt.jobId === "string";
    case "settings.team.resend":
      confirmed =
        !!write.expectedInvitation &&
        typeof receipt.invitationId === "string" &&
        receipt.invitationId.length > 0;
      if (confirmed) write.receiptId = String(receipt.invitationId);
      break;
    case "settings.team.invite":
      return (
        equal(
          row(receipt.invitation).email,
          typeof body.email === "string"
            ? body.email.trim().toLowerCase()
            : undefined,
        ) && equal(row(receipt.invitation).role, body.role)
      );
    case "settings.team.setRole":
      return (
        equal(row(receipt.member).localUserId, params.userId) &&
        equal(receipt.role, body.role)
      );
    case "settings.team.setBillingAdmin":
      return (
        equal(receipt.userId, params.userId) &&
        equal(receipt.billingAdmin, body.billingAdmin)
      );
    default:
      return undefined;
  }
  return confirmed;
}

/** Current authorized readback follows a delivered receipt; it never replays. */
export async function reconcileTeam(
  api: Api,
  write: SettingsWrite,
  signal: AbortSignal,
): Promise<boolean | undefined> {
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
    default:
      return undefined;
  }
}
