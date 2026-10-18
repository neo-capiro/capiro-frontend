/** Browser-only guard for a decision whose Core outcome is not yet known. */
const prefix = "capiro:meri-memory-owner-decision-unknown:v1:";
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
type HoldStorage = Pick<Storage, "getItem" | "setItem">;

export function ownerDecisionHoldKey(
  userId: string | null | undefined,
  orgId: string | null | undefined,
): string | null {
  return userId
    ? `${prefix}${encodeURIComponent(userId)}:${encodeURIComponent(orgId ?? "")}`
    : null;
}

/** Null means storage could not be trusted; callers must hold all decisions. */
export function readOwnerDecisionHolds(
  storage: HoldStorage,
  key: string,
): Set<string> | null {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return new Set();
    const ids: unknown = JSON.parse(raw);
    if (
      !Array.isArray(ids) ||
      ids.length > 1_000 ||
      !ids.every((id) => typeof id === "string" && uuid.test(id))
    )
      return null;
    return new Set(ids);
  } catch {
    return null;
  }
}

/** Write before dispatch so a reload cannot silently forget an in-flight POST. */
export function holdOwnerDecision(
  storage: HoldStorage,
  key: string,
  id: string,
): boolean {
  const ids = readOwnerDecisionHolds(storage, key);
  if (!ids || ids.has(id) || !uuid.test(id) || ids.size >= 1_000) return false;
  try {
    ids.add(id);
    storage.setItem(key, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}

/** Clear only after a definite Core result or a confirmed non-dispatch. */
export function releaseOwnerDecision(
  storage: HoldStorage,
  key: string,
  id: string,
): boolean {
  const ids = readOwnerDecisionHolds(storage, key);
  if (!ids) return false;
  try {
    ids.delete(id);
    storage.setItem(key, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}
