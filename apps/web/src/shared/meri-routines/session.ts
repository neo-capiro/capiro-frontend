import type { ApiClient } from "../portfolio/api/http";
import { identitySchema } from "../portfolio/auth/identity";
import { bootstrapConversationSession } from "../meri-conversations/session";
import { routineRecovery, type RoutineOwner } from "./recovery";

/** Current Core identity first; recovery keeps the original conversation but permits canonical run renewal. */
export async function bootstrapRoutineSession({
  api,
  owner,
  signal,
  resolveGeneral,
  fetcher = fetch,
  now = Date.now,
}: {
  api: ApiClient;
  owner: RoutineOwner;
  signal: AbortSignal;
  resolveGeneral: (signal: AbortSignal) => Promise<string>;
  fetcher?: typeof fetch;
  now?: () => number;
}) {
  const identity = await api.request("core", "me", identitySchema, { signal });
  if (
    identity.tenant?.id !== owner.tenantId ||
    identity.user.id !== owner.actorId
  )
    throw new Error("Current routine account changed.");
  const saved = await routineRecovery(owner, () =>
    signal.throwIfAborted(),
  ).load();
  const conversationId =
    saved?.context.conversationId ??
    (owner.selectedClientId === null
      ? await resolveGeneral(signal)
      : undefined);
  return bootstrapConversationSession(
    {
      clientId: owner.selectedClientId,
      ...(conversationId ? { conversationId } : {}),
    },
    { tenantId: owner.tenantId, actorId: owner.actorId },
    signal,
    fetcher,
    now,
  );
}
