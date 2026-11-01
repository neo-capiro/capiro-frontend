import {
  firstChatCoreRequest,
  firstChatCoreScope,
  requireFirstChatCoreReceipt,
  type FirstChatCoreRequest,
  firstChatV2Request,
  firstChatV2Receipt,
  type FirstChatV2Request,
} from "../capiro/operations/meri-first-chat";
import {
  confirmFirstChatIntent,
  reserveFirstChatIntent,
  supersedeFirstChatIntent,
  type FirstChatScope,
  firstChatScope,
} from "./first-chat-intent";
import { CapiroApiError } from "../capiro/http";

type IntentStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Unmounted resolver. An unknown-outcome request is replayed, an empty confirmed conversation is
 * reopened through Core (which rechecks access and refuses a changed record with 409, after which
 * the scope gets a new request), and anything else is a new conversation.
 */
export async function resolveFirstChatConversation(options: {
  scope: FirstChatScope;
  storage: IntentStorage;
  signal: AbortSignal;
  createOrReuse: (
    body: FirstChatCoreRequest | FirstChatV2Request,
    signal: AbortSignal,
  ) => Promise<unknown>;
  issueId?: () => string;
}): Promise<{ conversationId: string; clientId: string | null }> {
  const { scope, storage, signal, issueId } = options;
  signal.throwIfAborted();
  const current = firstChatScope.parse(scope);
  const intent = reserveFirstChatIntent(current, storage, issueId);
  if (intent.state === "confirmed")
    try {
      return await openFirstChat(current, intent, options);
    } catch (error) {
      // Core refused to reopen the stored conversation (changed, deleted, no longer permitted):
      // the stored record is replaced by one fresh request, which is tried exactly once.
      if (
        !(error instanceof CapiroApiError) ||
        error.status < 400 ||
        error.status >= 500
      )
        throw error;
      return openFirstChat(
        current,
        supersedeFirstChatIntent(current, storage, issueId),
        options,
      );
    }
  return openFirstChat(current, intent, options);
}

async function openFirstChat(
  current: FirstChatScope,
  intent: { requestId: string },
  {
    storage,
    signal,
    createOrReuse,
  }: Pick<
    Parameters<typeof resolveFirstChatConversation>[0],
    "storage" | "signal" | "createOrReuse"
  >,
): Promise<{ conversationId: string; clientId: string | null }> {
  if (current.clientId === null) {
    const body = firstChatV2Request.parse({
      schemaVersion: 2,
      requestId: intent.requestId,
      scopeKind: "general",
      clientId: null,
    });
    const response = await createOrReuse(body, signal);
    signal.throwIfAborted();
    const result = firstChatV2Receipt.parse(response);
    if (
      result.requestId !== intent.requestId ||
      result.tenantId !== current.tenantId ||
      result.actorId !== current.actorId ||
      result.scopeKind !== "general" ||
      result.clientId !== null
    )
      throw new Error("General chat binding changed");
    confirmFirstChatIntent(
      current,
      intent.requestId,
      result.conversationId,
      storage,
    );
    return { conversationId: result.conversationId, clientId: null };
  }
  firstChatCoreScope.parse(current);
  const body = firstChatCoreRequest.parse({
    schemaVersion: 1,
    requestId: intent.requestId,
    clientId: current.clientId,
  });
  signal.throwIfAborted();
  const result = await createOrReuse(body, signal);
  signal.throwIfAborted();
  const verified = requireFirstChatCoreReceipt(result, {
    ...current,
    requestId: intent.requestId,
  });
  confirmFirstChatIntent(
    current,
    intent.requestId,
    verified.conversationId,
    storage,
  );
  signal.throwIfAborted();
  return {
    conversationId: verified.conversationId,
    clientId: current.clientId,
  };
}
