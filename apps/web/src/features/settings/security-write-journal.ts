import { type SettingsWrite } from "./security-writes";

type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const retainedValues = [
  "tenantId",
  "clientId",
  "userIds",
  "programId",
  "externalId",
  "source",
  "role",
  "billingAdmin",
  "comped",
  "provider",
  "modelOverride",
  "restoreDefault",
  "expectedModelOverride",
  "expectedUpdatedAt",
  "confirmed",
  "relationshipType",
  "rollUpAwards",
  "decision",
  "keepProgramId",
  "mergeProgramId",
];
/** Only recovery metadata is persisted: never email, message text, credentials or replayable payloads. */
export async function persistSettingsWrite(
  storage: StoragePort,
  key: string,
  write: SettingsWrite,
  dispatchedInput: unknown,
) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([key, write.operation, write.attemptId, dispatchedInput]),
    ),
  );
  const requestHash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const body = Object.fromEntries(
    Object.entries(write.input.body ?? {}).filter(([name]) =>
      retainedValues.includes(name),
    ),
  );
  storage.setItem(
    key,
    JSON.stringify({
      version: 1,
      attemptId: write.attemptId,
      requestHash,
      operation: write.operation,
      startedAt: write.startedAt,
      state: "unknown",
      subjectId: write.subjectId,
      scopeHash: write.scopeHash,
      receiptConfirmed: write.receiptConfirmed,
      projection: write.projection,
      input: { params: write.input.params, body },
    }),
  );
}
export function restoreSettingsWrite(
  storage: StoragePort,
  key: string,
): SettingsWrite | undefined {
  const serialized = storage.getItem(key);
  if (!serialized) return undefined;
  try {
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== "object") throw new Error("invalid journal");
    const data = value as Record<string, unknown>;
    if (
      data.version !== 1 ||
      typeof data.attemptId !== "string" ||
      typeof data.requestHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(data.requestHash) ||
      typeof data.operation !== "string" ||
      !(
        data.operation.startsWith("settings.") ||
        ["me.update", "me.emailSignature.update"].includes(data.operation)
      ) ||
      typeof data.startedAt !== "string" ||
      !data.input ||
      typeof data.input !== "object"
    )
      throw new Error("invalid journal");
    if (data.projection !== undefined) {
      const projection = data.projection as Record<string, unknown>;
      if (
        !projection ||
        !Array.isArray(projection.keys) ||
        projection.keys.length > 20 ||
        !projection.keys.every(
          (key) => typeof key === "string" && key.length <= 64,
        ) ||
        typeof projection.hash !== "string" ||
        !/^[a-f0-9]{64}$/.test(projection.hash)
      )
        throw new Error("invalid projection");
    }
    return {
      operation: data.operation,
      attemptId: data.attemptId,
      input: data.input as SettingsWrite["input"],
      startedAt: data.startedAt,
      state: "unknown",
      subjectId:
        typeof data.subjectId === "string" ? data.subjectId : undefined,
      scopeHash:
        typeof data.scopeHash === "string" ? data.scopeHash : undefined,
      receiptConfirmed: data.receiptConfirmed === true,
      projection: data.projection as SettingsWrite["projection"],
    };
  } catch {
    // Corrupt recovery data must not make a prior dispatch safe to repeat.
    return {
      operation: "settings.unconfirmed",
      attemptId: "unconfirmed",
      input: {},
      startedAt: "unavailable",
      state: "unknown",
    };
  }
}

/** An old scope may finish after a new operation started; it must never erase the new recovery record. */
export function clearSettingsWrite(
  storage: StoragePort,
  key: string,
  write: SettingsWrite,
) {
  if (restoreSettingsWrite(storage, key)?.attemptId === write.attemptId)
    storage.removeItem(key);
}
