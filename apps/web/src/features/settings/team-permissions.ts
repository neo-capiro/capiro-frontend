import type { z } from "zod";
import type {
  CapiroMe,
  teamRowSchema,
} from "../../shared/capiro/operations/settings-schemas";

/** Presentation mirrors Core; every mutation still rechecks current server authority. */
export function teamPermissions(
  actor: Pick<CapiroMe, "role" | "billingAdmin" | "user">,
  target: z.infer<typeof teamRowSchema>,
) {
  const admin = actor.role === "capiro_admin" || actor.role === "user_admin";
  const protectedTarget =
    target.userId === actor.user.id || target.role === "capiro_admin";
  const active = target.status === "active";
  const billing =
    actor.role === "capiro_admin" || (admin && actor.billingAdmin);
  const reason = protectedTarget
    ? "Your own access and Capiro staff access are managed separately."
    : !admin
      ? "Administrator access is required."
      : !active
        ? "Only active members can change role or billing access."
        : !billing
          ? "Only a billing administrator can change billing access."
          : target.role !== "user_admin" && !target.billingAdmin
            ? "Promote this active member to user admin before granting billing access."
            : undefined;
  return {
    canChangeRole: admin && !protectedTarget && active,
    canGrantBilling:
      billing && !protectedTarget && active && target.role === "user_admin",
    canRevokeBilling: billing && !protectedTarget && active,
    canRemove: admin && !protectedTarget && target.status !== "removed",
    reason,
  };
}
