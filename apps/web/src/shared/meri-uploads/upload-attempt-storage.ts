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
export type UploadAttemptScope = z.infer<typeof scopeSchema>;
export type UploadAttemptReferences = Readonly<{
  list(): readonly string[];
  retain(requestId: string): void;
  release(requestId: string): void;
}>;
type ReferenceStorage = Pick<
  Storage,
  "length" | "key" | "getItem" | "setItem" | "removeItem"
>;
const prefix = "capiro-meri-upload-attempt-v1:";
const maximum = 128;

/** Untrusted locators only. Current session/Core authority must resolve every reference. */
export function createUploadAttemptReferences(
  scope: UploadAttemptScope,
  storage: () => ReferenceStorage = () => window.localStorage,
): UploadAttemptReferences {
  const scopeKey = () =>
    prefix + encodeURIComponent(JSON.stringify(scopeSchema.parse(scope))) + ":";
  const key = (requestId: string) => scopeKey() + z.uuid().parse(requestId);
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
      const name = key(requestId),
        value = JSON.stringify(
          referenceSchema.parse({ version: 1, scope, requestId }),
        );
      const store = storage();
      store.setItem(name, value);
      if (store.getItem(name) !== value)
        throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
    },
    release(requestId: string) {
      const store = storage(),
        name = key(requestId);
      store.removeItem(name);
      if (store.getItem(name) !== null)
        throw Error("UPLOAD_RECOVERY_UNAVAILABLE");
    },
  });
}
