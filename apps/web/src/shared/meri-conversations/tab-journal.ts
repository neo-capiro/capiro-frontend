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
/** Intentional retirement is still blocked until fresh server history resolves it. */
export class TabJournalRetired extends TabJournalUnavailable {
  constructor(readonly requestId: string) {
    super();
  }
}

function retiredRecord(value: unknown, scope: string, key: string) {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.keys(value).sort().join() ===
      "key,requestId,retired,scope,version" &&
    "requestId" in value &&
    typeof value.requestId === "string" &&
    value.requestId.length > 0 &&
    "version" in value &&
    value.version === 1 &&
    "scope" in value &&
    value.scope === scope &&
    "key" in value &&
    value.key === key &&
    "retired" in value &&
    value.retired === true
  );
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
  | "turn-open"
  | "selection"
  | "management"
  | "lifecycle"
  | "feedback"
  | "handoff"
  | "preview";

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

/** The record envelope: `at` (write time) is absent on records written before it existed. */
const envelopeShape = (value: object) =>
  ["key,scope,value,version", "at,key,scope,value,version"].includes(
    Object.keys(value).sort().join(),
  ) &&
  (!("at" in value) || Number.isSafeInteger(value.at));

/**
 * A record's write time (0 when absent, so such records count as oldest), scope, kind and whether it is
 * settled: it holds nothing the server does not already have. Settled means a request the server
 * observed with no cancellation outstanding, or a draft with no text, capture, reservation or selection.
 * Every run leaves one request record, so without making room a long-lived tab reached the record
 * budget and refused every later message.
 */
function recordFacts(name: string, raw: string | null) {
  try {
    const [scope, kind] = JSON.parse(name.slice(prefix.length)) as unknown[];
    const envelope: unknown = raw === null ? undefined : JSON.parse(raw);
    if (!envelope || typeof envelope !== "object" || !envelopeShape(envelope))
      return null;
    const at = "at" in envelope ? Number(envelope.at) : 0;
    const value: unknown = "value" in envelope ? envelope.value : undefined;
    if (!value || typeof value !== "object") return null;
    const settled =
      kind === "request"
        ? "submit" in value &&
          !!value.submit &&
          typeof value.submit === "object" &&
          "state" in value.submit &&
          value.submit.state === "observed" &&
          (!("cancel" in value) || value.cancel === "observed")
        : kind === "turn-open"
          ? // Control's answer about one reservation: losing it only asks the check again.
            true
          : kind === "draft" &&
            "draft" in value &&
            value.draft === "" &&
            "pending" in value &&
            value.pending === null &&
            "reserved" in value &&
            value.reserved === null &&
            (!("selection" in value) ||
              value.selection === undefined ||
              (!!value.selection &&
                typeof value.selection === "object" &&
                Object.keys(value.selection).length === 0));
    return { name, scope, kind, at, settled };
  } catch {
    return null;
  }
}

/**
 * Never evict unresolved identities to make room for a new request. Settled records make room, oldest
 * first, except each conversation's newest request record: the current run's, which guards the first
 * message while its history is unavailable.
 */
function checkBudget(storage: TabStorage, key: string, raw: string) {
  const names: string[] = [];
  const facts: NonNullable<ReturnType<typeof recordFacts>>[] = [];
  for (let index = 0; index < storage.length; index++) {
    const name = storage.key(index);
    if (!name?.startsWith(prefix) || name === key) continue;
    names.push(name);
    const found = recordFacts(name, storage.getItem(name));
    if (found) facts.push(found);
  }
  const newestRequest = new Map<unknown, (typeof facts)[number]>();
  for (const fact of facts)
    if (
      fact.kind === "request" &&
      (newestRequest.get(fact.scope)?.at ?? -1) <= fact.at
    )
      newestRequest.set(fact.scope, fact);
  const evictable = facts
    .filter((fact) => fact.settled && newestRequest.get(fact.scope) !== fact)
    .sort((left, right) => left.at - right.at);
  let count = names.length + 1;
  let bytes = names.reduce(
    (total, name) => total + byteLength(storage.getItem(name) ?? ""),
    byteLength(raw),
  );
  for (const fact of evictable) {
    if (count <= maxRecords && bytes <= maxTotalBytes) break;
    bytes -= byteLength(storage.getItem(fact.name) ?? "");
    count--;
    storage.removeItem(fact.name);
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
    if (kind === "request" && retiredRecord(value, scopeKey, key))
      throw new TabJournalRetired(value.requestId);
    if (
      !value ||
      !envelopeShape(value) ||
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
      } catch (error) {
        if (error instanceof TabJournalRetired) throw error;
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
          at: Date.now(),
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
  receiveRequest?: (value: unknown) => string,
) {
  if (!storage) return;
  const expected = tabScopeKey(scope);
  retireScope(storage, expected);
  clearRememberedConversation(storage, scope);
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    let parts: unknown;
    try {
      parts = JSON.parse(key.slice(prefix.length));
    } catch {
      parts = undefined;
    }
    if (!Array.isArray(parts)) {
      storage.removeItem(key);
      continue;
    }
    if (parts[0] !== expected) continue;
    if (parts[1] === "request" || parts[1] === "feedback") {
      // Erase private bytes without inventing a disposition for a possibly delivered request.
      // Only a validated request gets an explicit retirement marker. Corruption and feedback
      // uncertainty remain closed; a completed conversation cannot settle a feedback operation.
      const raw =
        parts[1] === "request"
          ? retireRequest(storage.getItem(key), expected, key, receiveRequest)
          : "null";
      storage.setItem(key, raw);
      if (storage.getItem(key) !== raw) throw new TabJournalUnavailable();
    } else {
      storage.removeItem(key);
    }
  }
}

/**
 * The person gives up whatever message this tab could not save or recover in one conversation: its draft,
 * captured and retained requests and next-turn record are removed (nothing is sent, nothing is marked as
 * delivered) and every owner still holding them stops writing. Feedback and the remembered selection stay.
 * Fresh owners then start empty, so a new message can be written and sent.
 */
export function discardMeriConversationMessages(
  scope: TabScope,
  storage = browserTabStorage(),
) {
  if (!storage) return;
  const expected = tabScopeKey(scope);
  retireScope(storage, expected);
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (!key?.startsWith(prefix)) continue;
    let parts: unknown;
    try {
      parts = JSON.parse(key.slice(prefix.length));
    } catch {
      continue;
    }
    if (
      Array.isArray(parts) &&
      parts[0] === expected &&
      ["draft", "draft-capture", "request", "turn", "turn-open"].includes(
        parts[1],
      )
    )
      storage.removeItem(key);
  }
}

function retireRequest(
  raw: string | null,
  scope: string,
  key: string,
  receive?: (value: unknown) => string,
) {
  try {
    if (raw === null || byteLength(raw) > maxBytes) return "null";
    const value = JSON.parse(raw);
    if (retiredRecord(value, scope, key)) return raw;
    if (
      !receive ||
      !value ||
      !envelopeShape(value) ||
      value.version !== 1 ||
      value.scope !== scope ||
      value.key !== key
    )
      return "null";
    const requestId = receive(value.value);
    return JSON.stringify({ version: 1, scope, key, requestId, retired: true });
  } catch {
    return "null";
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
