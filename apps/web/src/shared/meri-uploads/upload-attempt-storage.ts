import { z } from "zod";

const scopeSchema = z.strictObject({
  tenantId: z.string().min(1).max(256),
  actorId: z.string().min(1).max(256),
  clientId: z.uuid().nullable(),
  conversationId: z.uuid(),
});
const referenceSchema = z.strictObject({
  version: z.literal(1),
  scope: scopeSchema,
  requestId: z.uuid(),
});
const waitSchema = referenceSchema.extend({
  version: z.literal(2),
  firstPendingAtMs: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
export type UploadAttemptScope = z.infer<typeof scopeSchema>;
export type UploadAttemptReferences = Readonly<{
  list(): readonly string[];
  retain(requestId: string): void;
  release(requestId: string): void;
  /** Display wait only; the v1 locator and current service receipt still own recovery/readiness. */
  pendingSince?(requestId: string, observedAtMs: number): number;
  clearPending?(requestId: string): void;
}>;
type ReferenceStorage = Pick<
  Storage,
  "length" | "key" | "getItem" | "setItem" | "removeItem"
>;
const prefix = "capiro-meri-upload-attempt-v1:";
const waitPrefix = "capiro-meri-upload-attempt-wait-v2:";
const maximum = 128;

/** Untrusted locators only. Current session/Core authority must resolve every reference. */
export function createUploadAttemptReferences(
  scope: UploadAttemptScope,
  storage: () => ReferenceStorage = () => window.localStorage,
): UploadAttemptReferences {
  const scopeKey = () =>
    prefix + encodeURIComponent(JSON.stringify(scopeSchema.parse(scope))) + ":";
  const key = (requestId: string) => scopeKey() + z.uuid().parse(requestId);
  const waitKey = (requestId: string) =>
    waitPrefix +
    encodeURIComponent(JSON.stringify(scopeSchema.parse(scope))) +
    ":" +
    z.uuid().parse(requestId);
  function clearPending(requestId: string) {
    const store = storage(),
      name = waitKey(requestId);
    if (store.getItem(name) === null) return;
    store.removeItem(name);
    if (store.getItem(name) !== null)
      throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
  }
  function list() {
    const store = storage(),
      start = scopeKey(),
      found: string[] = [];
    for (let index = 0; index < store.length; index++) {
      const name = store.key(index);
      if (!name?.startsWith(start)) continue;
      const raw = store.getItem(name);
      if (raw === null || raw.length > 2048)
        throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
      const ref = referenceSchema.parse(JSON.parse(raw));
      if (
        key(ref.requestId) !== name ||
        JSON.stringify(ref.scope) !== JSON.stringify(scopeSchema.parse(scope))
      )
        throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
      found.push(ref.requestId);
      if (found.length > maximum) throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
    }
    return Object.freeze(found);
  }
  return Object.freeze({
    list,
    retain(requestId: string) {
      const refs = list();
      if (refs.length >= maximum && !refs.includes(requestId))
        throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
      if (!refs.includes(requestId)) clearPending(requestId);
      const name = key(requestId),
        value = JSON.stringify(
          referenceSchema.parse({ version: 1, scope, requestId }),
        );
      const store = storage();
      store.setItem(name, value);
      if (store.getItem(name) !== value)
        throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
    },
    pendingSince(requestId: string, observedAtMs: number) {
      if (
        !Number.isSafeInteger(observedAtMs) ||
        observedAtMs < 0 ||
        !list().includes(requestId)
      )
        throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
      const store = storage(),
        name = waitKey(requestId),
        raw = store.getItem(name);
      if (raw !== null) {
        if (raw.length > 2048) throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
        const saved = waitSchema.parse(JSON.parse(raw));
        if (
          saved.requestId !== requestId ||
          JSON.stringify(saved.scope) !==
            JSON.stringify(scopeSchema.parse(scope)) ||
          saved.firstPendingAtMs > observedAtMs
        )
          throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
        return saved.firstPendingAtMs;
      }
      const value = JSON.stringify(
        waitSchema.parse({
          version: 2,
          scope,
          requestId,
          firstPendingAtMs: observedAtMs,
        }),
      );
      store.setItem(name, value);
      if (store.getItem(name) !== value)
        throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
      return observedAtMs;
    },
    clearPending,
    release(requestId: string) {
      const store = storage(),
        name = key(requestId);
      store.removeItem(name);
      if (store.getItem(name) !== null)
        throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
      clearPending(requestId);
    },
  });
}
