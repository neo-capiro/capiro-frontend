import { z } from "zod";
import type { PendingImportRequest } from "./import-client-selection";

/**
 * Pre-dispatch import request identity retained across a reload.
 *
 * Session-scoped and account-bound (Clerk org + user), following the existing
 * sessionStorage recovery pattern used by other owner features. It stores only
 * the request UUID and selected public LDA ids — never client names or any
 * Core payload. Reading is fail-closed: a different account, a corrupt record,
 * an old schema or an expired record yields nothing.
 */
export const IMPORT_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

export type ImportRequestScope = { orgId: string | null; userId: string };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type StorageReader = () => StorageLike;

const scopeSchema = z
  .object({ orgId: z.string().min(1).nullable(), userId: z.string().min(1) })
  .strict();
const retainedSchema = z
  .object({
    v: z.literal(1),
    scope: scopeSchema,
    requestId: z.uuid(),
    ids: z.array(z.number().int().positive()).min(1).max(100),
    savedAt: z.number().int().nonnegative(),
  })
  .strict();

export function importRequestStorageKey(scope: ImportRequestScope): string {
  return `capiro-onboard-import-request.v1:${scope.orgId ?? "no-org"}:${scope.userId}`;
}

function sameScope(a: ImportRequestScope, b: ImportRequestScope): boolean {
  return a.orgId === b.orgId && a.userId === b.userId;
}

function defaultStorage(): StorageLike {
  return window.sessionStorage;
}

export function retainImportRequest(
  scope: ImportRequestScope,
  request: PendingImportRequest,
  storage: StorageReader = defaultStorage,
): void {
  try {
    storage().setItem(
      importRequestStorageKey(scope),
      JSON.stringify({
        v: 1,
        scope,
        requestId: request.requestId,
        ids: request.ids,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Storage unavailable: the in-view attempt guard still limits duplicate
    // submissions; reload reconciliation simply has no retained identity.
  }
}

export function readImportRequest(
  scope: ImportRequestScope,
  storage: StorageReader = defaultStorage,
  now: number = Date.now(),
): PendingImportRequest | null {
  let raw: string | null = null;
  try {
    raw = storage().getItem(importRequestStorageKey(scope));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = retainedSchema.parse(JSON.parse(raw));
    if (
      !sameScope(parsed.scope, scope) ||
      now - parsed.savedAt > IMPORT_REQUEST_TTL_MS
    ) {
      clearImportRequest(scope, storage);
      return null;
    }
    return { requestId: parsed.requestId, ids: parsed.ids };
  } catch {
    clearImportRequest(scope, storage);
    return null;
  }
}

/** Remove the retained identity, or only when it still names `requestId`. */
export function clearImportRequest(
  scope: ImportRequestScope,
  storage: StorageReader = defaultStorage,
  requestId?: string,
): void {
  try {
    if (requestId !== undefined) {
      const current = readImportRequest(scope, storage);
      if (current && current.requestId !== requestId) return;
    }
    storage().removeItem(importRequestStorageKey(scope));
  } catch {
    /* storage unavailable */
  }
}
