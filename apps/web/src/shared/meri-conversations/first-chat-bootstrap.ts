import {
  firstChatCoreRequest,
  firstChatCoreScope,
  requireFirstChatCoreReceipt,
  type FirstChatCoreRequest,
} from "../capiro/operations/meri-first-chat";
import {
  confirmFirstChatIntent,
  readFirstChatIntent,
  reserveFirstChatIntent,
  type FirstChatScope,
} from "./first-chat-intent";
import { CapiroApiError } from "../capiro/http";

type IntentStorage = Pick<Storage, "getItem" | "setItem">;

/** A resolved request may be rotated by the user after Core refuses its replay. */
export function canBeginNewChatAfterConflict(
  error: unknown,
  scope: FirstChatScope,
  storage: () => IntentStorage,
): boolean {
  if (!(error instanceof CapiroApiError) || error.status !== 409) return false;
  try {
    return readFirstChatIntent(scope, storage())?.state === "confirmed";
  } catch {
    return false;
  }
}

/** Unmounted resolver: a Core replay must verify even a browser-stored confirmed intent. */
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
    body: FirstChatCoreRequest,
    signal: AbortSignal,
  ) => Promise<unknown>;
  issueId?: () => string;
}): Promise<{ conversationId: string; clientId: string }> {
  signal.throwIfAborted();
  const current = firstChatCoreScope.parse(scope);
  const intent = reserveFirstChatIntent(current, storage, issueId);
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
