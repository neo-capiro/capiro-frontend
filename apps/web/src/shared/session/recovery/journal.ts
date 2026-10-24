import { z } from "zod";
import {
  decryptJournal,
  encryptJournal,
  type JournalEnvelope,
} from "./journal-crypto";
import { readJournalRecord, writeJournalRecord } from "./journal-db";

const fenceSchema = z
  .object({ version: z.literal(1), requestId: z.uuid() })
  .strict();
export type RecoveryContract<Data> = {
  schema: z.ZodType<Data>;
  requestId: (data: Data) => string;
  validateUpdate?: (previous: Data, next: Data) => void;
};
function decode<Data>(
  record: JournalEnvelope,
  contract: RecoveryContract<Data>,
) {
  if (record.state !== "pending") throw new RecoveryStorageError();
  const value = contract.schema.parse(record.data);
  if (contract.requestId(value) !== record.requestId)
    throw new RecoveryStorageError();
  return value;
}
const prefix = "capiro-command-fence-v1:";
export class RecoveryStorageError extends Error {
  constructor() {
    super(
      "Saved-command recovery is unavailable or inconsistent. No new command will be sent. Restore this browser's recovery storage and retry; do not clear site data to bypass this hold.",
    );
    this.name = "RecoveryStorageError";
  }
}
async function locked<T>(
  scope: string,
  assert: () => void,
  action: () => Promise<T>,
): Promise<T> {
  try {
    if (!navigator.locks || !globalThis.indexedDB || !crypto.subtle)
      throw new RecoveryStorageError();
    return await navigator.locks.request(prefix + scope, async () => {
      assert();
      const result = await action();
      assert();
      return result;
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new RecoveryStorageError();
  }
}
async function current(scope: string): Promise<JournalEnvelope | null> {
  const rawFence = localStorage.getItem(prefix + scope);
  const record = await readJournalRecord(scope);
  if (rawFence === null && record === undefined) return null;
  if (rawFence === null || record === undefined)
    throw new RecoveryStorageError();
  const fence = fenceSchema.parse(JSON.parse(rawFence));
  const result = await decryptJournal(scope, record);
  if (result.requestId !== fence.requestId) throw new RecoveryStorageError();
  return result;
}
export function readRecovery<Data>(
  scope: string,
  contract: RecoveryContract<Data>,
  assert: () => void,
) {
  return locked(scope, assert, async () => {
    const record = await current(scope);
    return record?.state === "pending" ? decode(record, contract) : null;
  });
}
export function reserveRecovery<Data>(
  scope: string,
  requestId: string,
  data: Data,
  contract: RecoveryContract<Data>,
  assert: () => void,
) {
  return locked(scope, assert, async () => {
    const existing = await current(scope);
    if (existing?.state === "pending") return decode(existing, contract);
    if (existing?.requestId === requestId) throw new RecoveryStorageError();
    const value = contract.schema.parse(data);
    if (contract.requestId(value) !== requestId)
      throw new RecoveryStorageError();
    const record = await encryptJournal({
      version: 1,
      scope,
      requestId,
      state: "pending",
      data: value,
    });
    assert();
    // The independent non-sensitive fence is committed first. Partial storage
    // failure leaves a hold, never a falsely empty journal or a new request key.
    localStorage.setItem(
      prefix + scope,
      JSON.stringify({ version: 1, requestId }),
    );
    await writeJournalRecord(scope, record);
    const verified = await current(scope);
    if (verified?.state !== "pending") throw new RecoveryStorageError();
    return decode(verified, contract);
  });
}
export function updateRecovery<Data>(
  scope: string,
  requestId: string,
  data: Data,
  contract: RecoveryContract<Data>,
  assert: () => void,
) {
  return locked(scope, assert, async () => {
    const existing = await current(scope);
    if (existing?.state !== "pending" || existing.requestId !== requestId)
      throw new RecoveryStorageError();
    const value = contract.schema.parse(data);
    if (contract.requestId(value) !== requestId)
      throw new RecoveryStorageError();
    contract.validateUpdate?.(decode(existing, contract), value);
    await writeJournalRecord(
      scope,
      await encryptJournal({
        version: 1,
        scope,
        requestId,
        state: "pending",
        data: value,
      }),
    );
    const verified = await current(scope);
    if (verified?.state !== "pending" || verified.requestId !== requestId)
      throw new RecoveryStorageError();
    decode(verified, contract);
  });
}
function retireRecovery(
  scope: string,
  requestId: string,
  disposition:
    | { state: "acknowledged" }
    | {
        state: "refused";
        code:
          | "WORKSPACE_BRIEF_STATE_CONFLICT"
          | "ACTIVITY_UNDO_REFUSED"
          | "DIRECTORY_NOTE_REFUSED"
          | "PROSPECT_NEW_CLIENT_REFUSED"
          | "OBJECTIVE_GENERATION_FAILED"
          | "OBJECTIVE_CONTEXT_INCOMPLETE"
          | "OBJECTIVE_ASSOCIATION_REJECTED"
          | "OBJECTIVE_VERSION_CONFLICT";
      },
  assert: () => void,
) {
  return locked(scope, assert, async () => {
    const existing = await current(scope);
    if (existing?.state !== "pending" || existing.requestId !== requestId)
      throw new RecoveryStorageError();
    // Retain the non-sensitive fence; erase the encrypted draft payload.
    // A known refusal is distinct from an acknowledged completed receipt.
    const retired = await encryptJournal({
      version: 1,
      scope,
      requestId,
      ...disposition,
    });
    assert();
    await writeJournalRecord(scope, retired);
    const verified = await current(scope);
    if (
      verified?.state !== disposition.state ||
      verified.requestId !== requestId
    )
      throw new RecoveryStorageError();
  });
}

/** Only explicit acknowledgement of a validated completed receipt. */
export function acknowledgeRecovery(
  scope: string,
  requestId: string,
  assert: () => void,
) {
  return retireRecovery(scope, requestId, { state: "acknowledged" }, assert);
}

/** Caller validates the native failure schema and obtains a fresh current read
 * under the execution lock. A missing receipt is never a no-write refusal. */
export function retireAssociationRefusalRecovery(
  scope: string,
  requestId: string,
  failure: { requestId: string | null; outcome: string; code: string },
  assert: () => void,
) {
  if (
    failure.requestId !== requestId ||
    failure.outcome !== "rejected" ||
    ![
      "MALFORMED_REQUEST",
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "OBJECTIVE_VERSION_CONFLICT",
      "ASSOCIATION_VERSION_CONFLICT",
      "REQUEST_CONFLICT",
      "UNSUPPORTED_RESOURCE",
    ].includes(failure.code)
  )
    return Promise.reject(new RecoveryStorageError());
  return retireRecovery(
    scope,
    requestId,
    { state: "refused", code: "OBJECTIVE_ASSOCIATION_REJECTED" },
    assert,
  );
}

/** Caller must verify this exact command's no-write refusal and fresh reads,
 * under the same execution lock used for all attempts. Unknown outcomes remain pending. */
export function retireMemberNoteRefusalRecovery(
  scope: string,
  requestId: string,
  failure: {
    schemaVersion: number;
    code: string;
    requestId: string;
    status: number;
  },
  assert: () => void,
) {
  if (
    failure.schemaVersion !== 1 ||
    failure.code !== "DIRECTORY_NOTE_REFUSED" ||
    failure.requestId !== requestId ||
    ![400, 404, 409].includes(failure.status)
  )
    return Promise.reject(new RecoveryStorageError());
  return retireRecovery(
    scope,
    requestId,
    { state: "refused", code: "DIRECTORY_NOTE_REFUSED" },
    assert,
  );
}

/** Caller binds the Core rollback proof to the original prospect/digest and
 * obtains fresh authority, receipt and prospect reads under the execution lock. */
export function retireNewClientConversionRefusalRecovery(
  scope: string,
  requestId: string,
  failure: {
    schemaVersion: number;
    code: string;
    requestId: string;
    status: number;
  },
  assert: () => void,
) {
  if (
    failure.schemaVersion !== 1 ||
    failure.code !== "PROSPECT_NEW_CLIENT_REFUSED" ||
    failure.requestId !== requestId ||
    ![400, 402, 404, 409].includes(failure.status)
  )
    return Promise.reject(new RecoveryStorageError());
  return retireRecovery(
    scope,
    requestId,
    { state: "refused", code: "PROSPECT_NEW_CLIENT_REFUSED" },
    assert,
  );
}

/** Caller must verify this exact command's no-write refusal and fresh reads,
 * under the same execution lock used for all attempts. Unknown outcomes remain pending. */
export function retireRefusedRecovery(
  scope: string,
  requestId: string,
  code: "WORKSPACE_BRIEF_STATE_CONFLICT" | "ACTIVITY_UNDO_REFUSED",
  assert: () => void,
) {
  if (
    code !== "WORKSPACE_BRIEF_STATE_CONFLICT" &&
    code !== "ACTIVITY_UNDO_REFUSED"
  )
    return Promise.reject(new RecoveryStorageError());
  return retireRecovery(scope, requestId, { state: "refused", code }, assert);
}

/** Serialize dispatch/reconciliation across tabs without nesting the storage lock.
 * Callers re-read the journal after acquiring this lock before sending anything. */
export async function withRecoveryCommandLock<T>(
  scope: string,
  assert: () => void,
  action: () => Promise<T>,
): Promise<T> {
  if (!navigator.locks) throw new RecoveryStorageError();
  return navigator.locks.request(
    "capiro-command-execution-v1:" + scope,
    async () => {
      assert();
      const result = await action();
      assert();
      return result;
    },
  );
}
