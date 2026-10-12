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
export function acknowledgeRecovery(
  scope: string,
  requestId: string,
  assert: () => void,
) {
  return locked(scope, assert, async () => {
    const existing = await current(scope);
    if (existing?.state !== "pending" || existing.requestId !== requestId)
      throw new RecoveryStorageError();
    // Only explicit acknowledgement of a validated completed receipt retires an
    // intent. Retain the non-sensitive fence; erase the encrypted draft payload.
    await writeJournalRecord(
      scope,
      await encryptJournal({
        version: 1,
        scope,
        requestId,
        state: "acknowledged",
      }),
    );
    const verified = await current(scope);
    if (verified?.state !== "acknowledged" || verified.requestId !== requestId)
      throw new RecoveryStorageError();
  });
}
