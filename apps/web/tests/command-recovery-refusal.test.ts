import "./command-recovery-platform";
import { expect, it } from "vitest";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  retireRefusedRecovery,
  retireNewClientConversionRefusalRecovery,
  retireProspectContactTransferRefusalRecovery,
  RecoveryStorageError,
} from "../src/shared/session/recovery/journal";
import {
  code,
  contract,
  current,
  data,
  db,
  envelope,
  fenceKey,
  id,
  local,
  nextId,
  scope,
  installPlatform,
} from "./command-recovery-platform";

installPlatform();

const contactRefusal = {
  schemaVersion: 1,
  requestId: id,
  status: "refused",
  result: null,
  refusal: { code: "PROSPECT_CONTACT_TRANSFER_REFUSED" },
};
it("retires a validated contact-transfer refusal to its payload-free exact request fence", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  await retireProspectContactTransferRefusalRecovery(
    scope,
    id,
    contactRefusal,
    current,
  );
  expect(await envelope()).toEqual({
    version: 1,
    scope,
    requestId: id,
    state: "refused",
    code: "PROSPECT_CONTACT_TRANSFER_REFUSED",
  });
  expect(await readRecovery(scope, contract, current)).toBeNull();
  await expect(
    reserveRecovery(scope, id, data, contract, current),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
});
it.each([
  { schemaVersion: 2 },
  { requestId: nextId },
  { status: "completed" },
  { result: {} },
  { refusal: null },
  { refusal: { code: "PROSPECT_NEW_CLIENT_REFUSED" } },
])(
  "retains pending contact command for invalid terminal receipt %j",
  async (patch) => {
    await reserveRecovery(scope, id, data, contract, current);
    const writes = db.writes.length;
    await expect(
      retireProspectContactTransferRefusalRecovery(
        scope,
        id,
        { ...contactRefusal, ...patch },
        current,
      ),
    ).rejects.toBeInstanceOf(RecoveryStorageError);
    expect(db.writes).toHaveLength(writes);
    expect(await readRecovery(scope, contract, current)).toEqual(data);
  },
);
it("failed contact refusal storage preserves the unresolved original payload", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  db.failWrite = true;
  await expect(
    retireProspectContactTransferRefusalRecovery(
      scope,
      id,
      contactRefusal,
      current,
    ),
  ).rejects.toThrow();
  expect(await readRecovery(scope, contract, current)).toEqual(data);
});

const conversionRefusal = {
  schemaVersion: 1,
  code: "PROSPECT_NEW_CLIENT_REFUSED",
  requestId: id,
  status: 402,
};
it("retires only the explicit typed conversion rollback and preserves its distinct fence", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  await retireNewClientConversionRefusalRecovery(
    scope,
    id,
    conversionRefusal,
    current,
  );
  expect(await envelope()).toEqual({
    version: 1,
    scope,
    requestId: id,
    state: "refused",
    code: "PROSPECT_NEW_CLIENT_REFUSED",
  });
  expect(await readRecovery(scope, contract, current)).toBeNull();
  expect(JSON.parse(local.get(fenceKey())!)).toEqual({
    version: 1,
    requestId: id,
  });
  await expect(
    reserveRecovery(scope, id, data, contract, current),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
});
it.each([
  { schemaVersion: 2 },
  { code: "DIRECTORY_NOTE_REFUSED" },
  { requestId: nextId },
  { status: 403 },
  { status: 500 },
])(
  "does not retire malformed or mismatched conversion disposition %j",
  async (patch) => {
    await reserveRecovery(scope, id, data, contract, current);
    const writes = db.writes.length;
    await expect(
      retireNewClientConversionRefusalRecovery(
        scope,
        id,
        { ...conversionRefusal, ...patch },
        current,
      ),
    ).rejects.toBeInstanceOf(RecoveryStorageError);
    expect(db.writes).toHaveLength(writes);
    expect(await readRecovery(scope, contract, current)).toEqual(data);
  },
);

it("retires only the exact pending request, erases its payload, and retains a refusal fence", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  const before = db.records.get(scope);
  await retireRefusedRecovery(scope, id, code, current);
  expect(await envelope()).toEqual({
    version: 1,
    scope,
    requestId: id,
    state: "refused",
    code,
  });
  expect(db.records.get(scope)).not.toEqual(before);
  expect(JSON.stringify(db.records.get(scope))).not.toContain(data.body);
  expect(JSON.parse(local.get(fenceKey())!)).toEqual({
    version: 1,
    requestId: id,
  });
  expect(await readRecovery(scope, contract, current)).toBeNull();
  await expect(acknowledgeRecovery(scope, id, current)).rejects.toBeInstanceOf(
    RecoveryStorageError,
  );
  expect((await envelope()).state).toBe("refused");
});

it("keeps successful acknowledgement a different payload-free terminal state", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  await acknowledgeRecovery(scope, id, current);
  expect(await envelope()).toEqual({
    version: 1,
    scope,
    requestId: id,
    state: "acknowledged",
  });
  await expect(
    retireRefusedRecovery(scope, id, code, current),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
});

it("blocks reuse of the retired UUID and admits a deliberately new request", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  await retireRefusedRecovery(scope, id, code, current);
  await expect(
    reserveRecovery(scope, id, data, contract, current),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
  const next = { requestId: nextId, body: "new deliberate draft" };
  expect(await reserveRecovery(scope, nextId, next, contract, current)).toEqual(
    next,
  );
  expect(await readRecovery(scope, contract, current)).toEqual(next);
});

it("refuses a different request UUID without altering encrypted pending data or the fence", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  const stored = structuredClone(db.records.get(scope));
  const fence = local.get(fenceKey());
  await expect(
    retireRefusedRecovery(scope, nextId, code, current),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
  expect(db.records.get(scope)).toEqual(stored);
  expect(local.get(fenceKey())).toBe(fence);
  expect(await readRecovery(scope, contract, current)).toEqual(data);
});

it.each([
  "WORKSPACE_BRIEF_REQUEST_CONFLICT",
  "NETWORK_ERROR",
  "WORKSPACE_BRIEF_COPY_LIMIT",
  "",
  "ACKNOWLEDGED",
])("does not retire an arbitrary disposition %s", async (invalid) => {
  await reserveRecovery(scope, id, data, contract, current);
  const writes = db.writes.length;
  await expect(
    retireRefusedRecovery(scope, id, invalid as typeof code, current),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
  expect(db.writes).toHaveLength(writes);
  expect(await readRecovery(scope, contract, current)).toEqual(data);
});

it("does not replace uncertain pending recovery with a new request or edited draft", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  expect(
    await reserveRecovery(
      scope,
      nextId,
      { requestId: nextId, body: "different" },
      contract,
      current,
    ),
  ).toEqual(data);
  expect(db.writes).toHaveLength(1);
  expect((await envelope()).state).toBe("pending");
});

it("rejects disagreement between the supplied and encoded request IDs before reservation", async () => {
  await expect(
    reserveRecovery(scope, nextId, data, contract, current),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
  expect(db.writes).toHaveLength(0);
  expect(local.size).toBe(0);
});

it("retains pending recovery after a failed retirement write", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  db.failWrite = true;
  await expect(
    retireRefusedRecovery(scope, id, code, current),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
  expect(await readRecovery(scope, contract, current)).toEqual(data);
  expect(JSON.parse(local.get(fenceKey())!).requestId).toBe(id);
});

it("keeps a storage inconsistency fenced rather than admitting a replacement", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  db.records.delete(scope);
  await expect(
    reserveRecovery(
      scope,
      nextId,
      { ...data, requestId: nextId },
      contract,
      current,
    ),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
  expect(JSON.parse(local.get(fenceKey())!).requestId).toBe(id);
});
