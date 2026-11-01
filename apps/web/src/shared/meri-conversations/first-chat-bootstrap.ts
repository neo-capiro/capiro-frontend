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
  type FirstChatScope,
  firstChatScope,
} from "./first-chat-intent";

type IntentStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Unmounted resolver: one new conversation per opening of a scope. Only a request whose outcome is
 * still unknown is replayed, so a lost response never creates a second conversation.
 */
export async function resolveFirstChatConversation({
  scope,
  storage,
  signal,
  createOrReuse,
  issueId,
}: {
  scope: FirstChatScope;
  storage: IntentStorage;
  signal: AbortSignal;
  createOrReuse: (
    body: FirstChatCoreRequest | FirstChatV2Request,
    signal: AbortSignal,
  ) => Promise<unknown>;
  issueId?: () => string;
}): Promise<{ conversationId: string; clientId: string | null }> {
  signal.throwIfAborted();
  const current = firstChatScope.parse(scope);
  const intent = reserveFirstChatIntent(current, storage, issueId);
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
