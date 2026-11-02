import { z } from "zod";

const uuid = z.uuid();
const opaqueId = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => value === value.trim());
const account = { tenantId: opaqueId, actorId: opaqueId };
export const firstChatScope = z.union([
  z.strictObject({ ...account, clientId: uuid }),
  z.strictObject({
    ...account,
    scopeKind: z.literal("general"),
    clientId: z.null(),
  }),
]);
const scopeSchema = firstChatScope;
export type FirstChatScope = z.infer<typeof scopeSchema>;

/** The scope a bound conversation context belongs to: General, or the selected client. */
export function firstChatScopeOf(context: {
  tenantId: string;
  actorId: string;
  selectedClientId: string | null;
}): FirstChatScope {
  const { tenantId, actorId, selectedClientId } = context;
  return selectedClientId === null
    ? { tenantId, actorId, scopeKind: "general", clientId: null }
    : { tenantId, actorId, clientId: selectedClientId };
}

const identity = {
  version: z.literal(1),
  scope: scopeSchema,
  requestId: uuid,
};
const intentSchema = z.discriminatedUnion("state", [
  z.strictObject({ ...identity, state: z.literal("pending") }),
  z.strictObject({
    ...identity,
    state: z.literal("confirmed"),
    conversationId: uuid,
    /** A message was sent to the conversation; the next opening of the scope is a new one. */
    used: z.boolean().optional(),
  }),
]);
export type FirstChatIntent = z.infer<typeof intentSchema>;
type IntentStorage = Pick<Storage, "getItem" | "setItem">;
const prefix = "capiro-meri-first-chat-intent-v1:";

export class FirstChatIntentStorageError extends Error {
  constructor() {
    super("Conversation request identity could not be safely recovered.");
    this.name = "FirstChatIntentStorageError";
  }
}

function scopedKey(scope: FirstChatScope) {
  const checked = scopeSchema.parse(scope);
  return (
    prefix +
    JSON.stringify([
      checked.tenantId,
      checked.actorId,
      checked.clientId,
      ...(checked.clientId === null ? ["general"] : []),
    ])
  );
}

/** Stored request identity is a recovery hint. Core and Meri still decide authority. */
export function readFirstChatIntent(
  scope: FirstChatScope,
  storage: IntentStorage,
): FirstChatIntent | null {
  try {
    const raw = storage.getItem(scopedKey(scope));
    if (raw === null) return null;
    const record = intentSchema.parse(JSON.parse(raw));
    if (
      record.scope.tenantId !== scope.tenantId ||
      record.scope.actorId !== scope.actorId ||
      record.scope.clientId !== scope.clientId
    )
      throw new Error("Stored conversation scope changed");
    return record;
  } catch {
    throw new FirstChatIntentStorageError();
  }
}

function persist(
  scope: FirstChatScope,
  storage: IntentStorage,
  record: FirstChatIntent,
) {
  try {
    storage.setItem(scopedKey(scope), JSON.stringify(record));
    const verified = readFirstChatIntent(scope, storage);
    if (!verified || JSON.stringify(verified) !== JSON.stringify(record))
      throw new Error("Stored conversation request changed");
    return verified;
  } catch {
    throw new FirstChatIntentStorageError();
  }
}

function freshId(issueId: () => string) {
  try {
    return uuid.parse(issueId());
  } catch {
    throw new FirstChatIntentStorageError();
  }
}

/**
 * The one request identity for opening a scope: a request whose outcome is unknown is replayed,
 * a confirmed conversation no message was sent to yet is reopened (reload, a second visit, New
 * conversation while it is still empty), and anything else is a new request. Persist and read
 * back before the Core POST.
 */
export function reserveFirstChatIntent(
  scope: FirstChatScope,
  storage: IntentStorage,
  issueId: () => string = () => crypto.randomUUID(),
): FirstChatIntent {
  const existing = readFirstChatIntent(scope, storage);
  if (existing && (existing.state === "pending" || !existing.used))
    return existing;
  return persist(scope, storage, {
    version: 1,
    scope: scopeSchema.parse(scope),
    requestId: freshId(issueId),
    state: "pending",
  });
}

/**
 * Replace whatever the scope stores with one fresh pending request: Core refused to reopen the
 * stored conversation, so it is never selected again. Storage trouble surfaces as the usual error.
 */
export function supersedeFirstChatIntent(
  scope: FirstChatScope,
  storage: IntentStorage,
  issueId: () => string = () => crypto.randomUUID(),
): FirstChatIntent {
  return persist(scope, storage, {
    version: 1,
    scope: scopeSchema.parse(scope),
    requestId: freshId(issueId),
    state: "pending",
  });
}

/** A timeout leaves the pending record intact. Only a verified receipt confirms it. */
export function confirmFirstChatIntent(
  scope: FirstChatScope,
  requestId: string,
  conversationId: string,
  storage: IntentStorage,
): FirstChatIntent {
  const existing = readFirstChatIntent(scope, storage);
  if (!existing || existing.requestId !== requestId)
    throw new FirstChatIntentStorageError();
  if (existing.state === "confirmed") {
    if (existing.conversationId !== conversationId)
      throw new FirstChatIntentStorageError();
    return existing;
  }
  return persist(scope, storage, {
    ...existing,
    state: "confirmed",
    conversationId: uuid.parse(conversationId),
  });
}

/**
 * New conversation. The scope's still-empty confirmed conversation is reopened only while the
 * person is in it; any other confirmed record is superseded so the opening is a new request. A
 * pending record (an outcome still unknown) is kept for the resolver to replay, never rotated.
 * Storage trouble here costs at most one reopened empty conversation.
 */
export function prepareNewConversation(
  scope: FirstChatScope,
  currentConversationId: string | null,
  storage: IntentStorage,
  issueId: () => string = () => crypto.randomUUID(),
): "reopen" | "new" {
  try {
    const existing = readFirstChatIntent(scope, storage);
    if (!existing || existing.state === "pending") return "new";
    if (!existing.used && existing.conversationId === currentConversationId)
      return "reopen";
    supersedeFirstChatIntent(scope, storage, issueId);
  } catch {
    // The resolver reports storage it cannot read or write.
  }
  return "new";
}

/**
 * A message was sent to the conversation, whatever its outcome (or Core refused to reopen it):
 * the scope's next opening starts a new one. Storage trouble here costs at most one extra
 * conversation later.
 */
export function markFirstChatIntentUsed(
  scope: FirstChatScope,
  conversationId: string,
  storage: IntentStorage,
) {
  try {
    const existing = readFirstChatIntent(scope, storage);
    if (
      existing?.state === "confirmed" &&
      existing.conversationId === conversationId &&
      !existing.used
    )
      persist(scope, storage, { ...existing, used: true });
  } catch {
    // Not a recovery hint worth blocking a send over.
  }
}
