import type { CapiroMe } from "../../shared/capiro/operations/settings-schemas";
import type { CapiroApi } from "../../shared/capiro/http";
import type { capiroOperations } from "../../shared/capiro/registry";

type Actor = Pick<CapiroMe, "role" | "billingAdmin" | "user">;
type Member = {
  userId: string;
  role: string;
  status: string;
  billingAdmin: boolean;
};

/** Presentation and fresh-read eligibility; Core still authorizes each mutation. */
export function teamPermissions(actor: Actor, target: Member) {
  const administrator = ["capiro_admin", "user_admin"].includes(actor.role);
  const protectedReason = !administrator
    ? "Administrator access is required."
    : target.userId === actor.user.id
      ? "You cannot change your own team permissions."
      : target.role === "capiro_admin"
        ? "Capiro staff memberships are managed by HQ."
        : undefined;
  const roleReason =
    protectedReason ??
    (target.status !== "active"
      ? "Only active members can change roles."
      : undefined);
  const billingReason =
    protectedReason ??
    (target.status !== "active"
      ? "Only active members can hold billing access."
      : actor.role !== "capiro_admin" && !actor.billingAdmin
        ? "Only a billing administrator can change billing access."
        : !target.billingAdmin && target.role !== "user_admin"
          ? "Only user admins can be granted billing access."
          : undefined);
  const removeReason =
    protectedReason ??
    (target.status === "removed"
      ? "This membership is already removed."
      : undefined);
  return {
    canChangeRole: !roleReason,
    canGrantBilling: !billingReason && target.role === "user_admin",
    canRevokeBilling: !billingReason,
    canRemove: !removeReason,
    roleReason,
    billingReason,
    removeReason,
  };
}

/** Refresh actor and target immediately before dispatch; never reuse a rendered permission snapshot. */
export async function assertTeamWriteAllowed(
  api: CapiroApi<typeof capiroOperations>,
  operation: string,
  input: { params?: Record<string, unknown>; body?: Record<string, unknown> },
  options?: { signal?: AbortSignal },
) {
  const identity = await api.request("me.read", {}, options);
  if (!["capiro_admin", "user_admin"].includes(identity.role))
    throw new Error(
      "Administrator access is no longer available. Reload Team.",
    );
  if (!input.params?.userId) return;
  const members = await api.request("settings.team.list", {}, options);
  const target = members.find(
    (member) => member.userId === input.params?.userId,
  );
  if (!target)
    throw new Error("This member is no longer available. Reload Team.");
  const permissions = teamPermissions(identity, target);
  const reason =
    operation === "settings.team.setRole"
      ? permissions.roleReason
      : operation === "settings.team.remove"
        ? permissions.removeReason
        : (permissions.billingReason ??
          (input.body?.billingAdmin && !permissions.canGrantBilling
            ? "Only user admins can be granted billing access."
            : undefined));
  if (reason) throw new Error(reason);
}
