import { z } from "zod";

const uuid = z.uuid();
const opaqueId = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => value === value.trim());
const scopeSchema = z.strictObject({
  tenantId: opaqueId,
  actorId: opaqueId,
  clientId: uuid,
});
export type FirstChatScope = z.infer<typeof scopeSchema>;

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
  }),
]);
export type FirstChatIntent = z.infer<typeof intentSchema>;
/** Local presentation signal after an explicit, durably recorded New Chat intent. */
export const newChatIntentEvent = "meri:new-chat-intent";
type IntentStorage = Pick<Storage, "getItem" | "setItem">;
const prefix = "capiro-meri-first-chat-intent-v1:";

export class FirstChatIntentStorageError extends Error {
  constructor() {
    super("Conversation request identity could not be safely recovered.");
    this.name = "FirstChatIntentStorageError";
  }
}

export class FirstChatIntentPendingError extends Error {
  constructor() {
    super(
      "The previous conversation request has an unknown outcome. Retry it before starting another conversation.",
    );
    this.name = "FirstChatIntentPendingError";
  }
}

function scopedKey(scope: FirstChatScope) {
  const checked = scopeSchema.parse(scope);
  return (
    prefix +
    JSON.stringify([checked.tenantId, checked.actorId, checked.clientId])
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

/** Persist and read back the same key before the first Core POST or any retry. */
export function reserveFirstChatIntent(
  scope: FirstChatScope,
  storage: IntentStorage,
  issueId: () => string = () => crypto.randomUUID(),
): FirstChatIntent {
  const existing = readFirstChatIntent(scope, storage);
  if (existing) return existing;
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

/** Call only for an explicit New Chat action after the prior intent was resolved. */
export function beginNewChatIntent(
  scope: FirstChatScope,
  storage: IntentStorage,
  issueId: () => string = () => crypto.randomUUID(),
): FirstChatIntent {
  const previous = readFirstChatIntent(scope, storage);
  if (previous?.state === "pending") throw new FirstChatIntentPendingError();
  const requestId = freshId(issueId);
  if (requestId === previous?.requestId)
    throw new FirstChatIntentStorageError();
  return persist(scope, storage, {
    version: 1,
    scope: scopeSchema.parse(scope),
    requestId,
    state: "pending",
  });
}
