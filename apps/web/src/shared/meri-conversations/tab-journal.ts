/** Same-tab recovery hints only. The current server session still owns all authority. */
export type TabScope = Readonly<{
  tenantId: string;
  actorId: string;
  clientId: string | null;
  conversationId: string;
}>;
export type TabStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;
const prefix = "capiro-meri-chat-v1:";
const identityKey = "capiro-meri-tab-identity-v1";
// A persisted marker is not proof that this page has resolved its current sign-in.
const verifiedIdentities = new WeakMap<TabStorage, string>();
const maxBytes = 262_144;
const maxRecords = 128;
const maxTotalBytes = 2_097_152;
const generations = new WeakMap<TabStorage, number>();
const scopeGenerations = new WeakMap<TabStorage, Map<string, number>>();
export class TabJournalUnavailable extends Error {
  constructor() {
    super(
      "This tab could not safely save or recover the message. Keep this page open and recover its status before trying again.",
    );
    this.name = "TabJournalUnavailable";
  }
}
export const tabScopeKey = (scope: TabScope) =>
  JSON.stringify([
    scope.tenantId,
    scope.actorId,
    scope.clientId,
    scope.conversationId,
  ]);
export function browserTabStorage(): TabStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    throw new TabJournalUnavailable();
  }
}
/** Loading/public pages may check readiness without reading or removing recovery content. */
export function meriTabStorageReady(storage = browserTabStorage()): boolean {
  if (!storage) return false;
  const identity = verifiedIdentities.get(storage);
  if (!identity) return false;
  try {
    return storage.getItem(identityKey) === identity;
  } catch {
    return false;
  }
}

/** Production callers opt in only after this page's canonical identity boundary has primed storage. */
export function requireMeriTabStorage(
  storage = browserTabStorage(),
): TabStorage | undefined {
  if (storage && !meriTabStorageReady(storage))
    throw new TabJournalUnavailable();
  return storage;
}

type Kind =
  | "draft"
  | "draft-capture"
  | "request"
  | "turn"
  | "selection"
  | "management"
  | "lifecycle"
  | "handoff";

/** Pending management commands stay recoverable after the row moves to Archive or Trash. */
export function pendingManagementScopes(
  account: { tenantId: string; actorId: string },
  storage = browserTabStorage(),
): TabScope[] {
  const ready = requireMeriTabStorage(storage);
  if (!ready) return [];
  const scopes: TabScope[] = [];
  let records = 0;
  for (let index = 0; index < ready.length; index++) {
    const key = ready.key(index);
    if (!key?.startsWith(prefix)) continue;
    if (++records > maxRecords) throw new TabJournalUnavailable();
    const parts: unknown = JSON.parse(key.slice(prefix.length));
    if (
      !Array.isArray(parts) ||
      parts.length !== 3 ||
      parts[1] !== "management" ||
      parts[2] !== "" ||
      typeof parts[0] !== "string"
    )
      continue;
    const scope: unknown = JSON.parse(parts[0]);
    if (
      !Array.isArray(scope) ||
      scope.length !== 4 ||
      scope[0] !== account.tenantId ||
      scope[1] !== account.actorId
    )
      continue;
    if (
      !(scope[2] === null || typeof scope[2] === "string") ||
      typeof scope[3] !== "string"
    )
      throw new TabJournalUnavailable();
    scopes.push({
      tenantId: account.tenantId,
      actorId: account.actorId,
      clientId: scope[2],
      conversationId: scope[3],
    });
  }
  return scopes;
}
const byteLength = (value: string) =>
  new TextEncoder().encode(value).byteLength;

/** Never evict unresolved identities to make room for a new request. */
function checkBudget(storage: TabStorage, key: string, raw: string) {
  let count = 1,
    bytes = byteLength(raw);
  for (let index = 0; index < storage.length; index++) {
    const found = storage.key(index);
    if (found?.startsWith(prefix) && found !== key) {
      count++;
      bytes += byteLength(storage.getItem(found) ?? "");
    }
  }
  if (count > maxRecords || bytes > maxTotalBytes)
    throw new TabJournalUnavailable();
}

/** Fixed record families, bounded bytes and exact scope/run; payloads have strict caller receivers. */
export function tabRecord<T>(
  scope: TabScope,
  kind: Kind,
  receive: (value: unknown) => T,
  suffix = "",
  storage: TabStorage | null | undefined = browserTabStorage(),
) {
  const scopeKey = tabScopeKey(scope);
  const key = prefix + JSON.stringify([scopeKey, kind, suffix]);
  const generation = storage ? (generations.get(storage) ?? 0) : 0;
  const scopeGeneration = storage
    ? (scopeGenerations.get(storage)?.get(scopeKey) ?? 0)
    : 0;
  const current = () =>
    !storage ||
    (meriTabStorageReady(storage) &&
      (generations.get(storage) ?? 0) === generation &&
      (scopeGenerations.get(storage)?.get(scopeKey) ?? 0) === scopeGeneration);
  const assertCurrent = () => {
    if (!current()) throw new TabJournalUnavailable();
  };
  const decode = (raw: string): T => {
    if (byteLength(raw) > maxBytes) throw new TabJournalUnavailable();
    const value = JSON.parse(raw);
    if (
      !value ||
      Object.keys(value).sort().join() !== "key,scope,value,version" ||
      value.version !== 1 ||
      value.scope !== scopeKey ||
      value.key !== key
    )
      throw new TabJournalUnavailable();
    return receive(value.value);
  };
  return {
    current,
    read(): T | undefined {
      try {
        assertCurrent();
        const raw = storage?.getItem(key);
        return raw == null ? undefined : decode(raw);
      } catch {
        throw new TabJournalUnavailable();
      }
    },
    write(value: T) {
      if (!storage) return;
      try {
        assertCurrent();
        const raw = JSON.stringify({
          version: 1,
          scope: scopeKey,
          key,
          value: receive(value),
        });
        decode(raw);
        checkBudget(storage, key, raw);
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw) throw new TabJournalUnavailable();
      } catch {
        throw new TabJournalUnavailable();
      }
    },
    clear() {
      try {
        assertCurrent();
        storage?.removeItem(key);
      } catch {
        throw new TabJournalUnavailable();
      }
    },
  };
}

const recoveryPrefixes = [
  prefix,
  "capiro-meri-lifecycle-v1:",
  "capiro-meri-first-chat-intent-v1:",
];
/** Signout/identity replacement retires local recovery only; it never cancels service work. */
export function clearMeriTabJournal(
  storage: TabStorage | undefined = browserTabStorage(),
) {
  if (!storage) return;
  verifiedIdentities.delete(storage);
  generations.set(storage, (generations.get(storage) ?? 0) + 1);
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (key && recoveryPrefixes.some((value) => key.startsWith(value)))
      storage.removeItem(key);
  }
}
export function syncMeriTabIdentity(
  identity: string | null,
  storage = browserTabStorage(),
) {
  if (!storage) return;
  verifiedIdentities.delete(storage);
  try {
    const previous = storage.getItem(identityKey);
    if (identity === null || previous !== identity)
      clearMeriTabJournal(storage);
    if (identity === null) storage.removeItem(identityKey);
    else {
      if (!identity) throw new TabJournalUnavailable();
      storage.setItem(identityKey, identity);
      if (storage.getItem(identityKey) !== identity)
        throw new TabJournalUnavailable();
      verifiedIdentities.set(storage, identity);
    }
  } catch {
    throw new TabJournalUnavailable();
  }
}

export function clearMeriConversationScope(
  scope: TabScope,
  storage = browserTabStorage(),
) {
  if (!storage) return;
  const expected = tabScopeKey(scope);
  retireScope(storage, expected);
  clearRememberedConversation(storage, scope);
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    try {
      if (JSON.parse(key.slice(prefix.length))[0] === expected)
        storage.removeItem(key);
    } catch {
      storage.removeItem(key);
    }
  }
}

function retireScope(storage: TabStorage, expected: string) {
  const scoped = scopeGenerations.get(storage) ?? new Map<string, number>();
  scoped.set(expected, (scoped.get(expected) ?? 0) + 1);
  scopeGenerations.set(storage, scoped);
}

/** A route without a conversation hint may remember this exact revoked conversation. */
function clearRememberedConversation(storage: TabStorage, scope: TabScope) {
  const unscoped = tabScopeKey({ ...scope, conversationId: "" });
  const key = prefix + JSON.stringify([unscoped, "selection", ""]);
  const raw = storage.getItem(key);
  if (raw === null) return;
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return;
  }
  if (
    value?.version !== 1 ||
    value.scope !== unscoped ||
    value.key !== key ||
    value.value?.conversationId !== scope.conversationId
  )
    return;
  retireScope(storage, unscoped);
  storage.removeItem(key);
}
