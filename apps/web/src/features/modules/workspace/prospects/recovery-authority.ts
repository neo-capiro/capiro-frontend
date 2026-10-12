import { z } from "zod";
import type { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
export type ProspectWriter = {
  tenantId: string;
  userId: string;
  ownerId: string;
};
export function prospectIntentScope(
  operation: string,
  actor: ProspectWriter,
  ...ids: string[]
) {
  return JSON.stringify([
    operation,
    z.uuid().parse(actor.tenantId).toLowerCase(),
    z.uuid().parse(actor.userId).toLowerCase(),
    actor.ownerId,
    ...ids.map((id) => z.uuid().parse(id).toLowerCase()),
  ]);
}
export async function verifyProspectWriter(
  api: ReturnType<typeof useCapiro>,
  actor: ProspectWriter,
  signal: AbortSignal,
  assert: () => void,
) {
  assert();
  const me = await api.request("me.read", {}, { signal });
  assert();
  if (
    me.tenant.id !== actor.tenantId ||
    me.user.id !== actor.userId ||
    me.user.clerkUserId !== actor.ownerId ||
    !["standard_user", "user_admin", "capiro_admin"].includes(me.role)
  )
    throw new Error(
      "The current Core actor cannot recover this saved prospect intent.",
    );
}
