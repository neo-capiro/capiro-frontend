import type { ApiClient } from "../portfolio/api/http";
import { identitySchema } from "../portfolio/auth/identity";
import { bootstrapActionSession } from "./session-bootstrap";
import { resolveFirstChatConversation } from "../meri-conversations/first-chat-bootstrap";
import {
  standaloneTaskRecovery,
  sameTaskConversation,
  type StandaloneTaskKind,
} from "./task-recovery";

/** Explicit reconnect reads current Core identity before selecting this actor's original saved context. */
export async function bootstrapTaskRecoverySession(
  api: ApiClient,
  kind: StandaloneTaskKind,
  clientId: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
  expectedAccount?: { tenantId: string; actorId: string },
  firstChat?: () => Pick<
    Parameters<typeof resolveFirstChatConversation>[0],
    "storage" | "createOrReuse"
  >,
) {
  const identity = await api.request("core", "me", identitySchema, { signal });
  if (!identity.tenant?.id || !identity.user.id)
    throw new Error("Current account is unavailable.");
  const owner = {
    tenantId: identity.tenant.id,
    actorId: identity.user.id,
    selectedClientId: clientId,
  };
  if (
    expectedAccount &&
    (owner.tenantId !== expectedAccount.tenantId ||
      owner.actorId !== expectedAccount.actorId)
  )
    throw new Error("The current account changed before task recovery.");
  const saved = await standaloneTaskRecovery(kind, owner, () =>
    signal.throwIfAborted(),
  ).load();
  const context = saved?.context;
  if (!context && !firstChat)
    throw new Error("The current task conversation could not be confirmed.");
  const conversationId = context
    ? context.conversationId
    : (
        await resolveFirstChatConversation({
          ...firstChat!(),
          scope: { tenantId: owner.tenantId, actorId: owner.actorId, clientId },
          signal,
        })
      ).conversationId;
  const session = await bootstrapActionSession(
    {
      clientId,
      conversationId,
    },
    signal,
    fetcher,
    now,
  );
  if (
    session.context.tenantId !== owner.tenantId ||
    session.context.actorId !== owner.actorId ||
    (context && !sameTaskConversation(context, session.context))
  )
    throw new Error(
      "The current task session does not match the saved account and context.",
    );
  signal.throwIfAborted();
  return session;
}
