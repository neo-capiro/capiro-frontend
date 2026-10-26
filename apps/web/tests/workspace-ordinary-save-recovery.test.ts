import "./command-recovery-platform";
import { expect, it } from "vitest";
import {
  readRecovery,
  reserveRecovery,
  updateRecovery,
  retireOrdinarySaveConflictRecovery,
  readRecoveryDisposition,
  withRecoveryCommandLock,
} from "../src/shared/session/recovery/journal";
import { installPlatform, db, local } from "./command-recovery-platform";
import {
  captureOrdinarySave,
  ordinaryRecoveryContract,
  ordinaryRecoveryScope,
  type OrdinaryRetained,
} from "../src/features/modules/workspace/ordinary-save/ordinary-save";
import {
  state,
  scope,
  requestId,
  otherId,
  receipt,
} from "./workspace-ordinary-save-fixtures";
installPlatform();
const key = ordinaryRecoveryScope(scope);
const guard = () => {};
const original = (): OrdinaryRetained => ({
  body: captureOrdinarySave(
    state(),
    {
      title: "Retained synthetic title",
      names: ["Body"],
      sections: { Body: "Private synthetic edit" },
    },
    requestId,
  ),
  names: ["Body"],
});
const held = () => readRecovery(key, ordinaryRecoveryContract, guard);
async function reserve(value = original()) {
  await reserveRecovery(key, requestId, value, ordinaryRecoveryContract, guard);
  return value;
}
const retire = (assert = guard, id = requestId) =>
  withRecoveryCommandLock(key, assert, () =>
    retireOrdinarySaveConflictRecovery(
      key,
      id,
      ordinaryRecoveryContract,
      assert,
    ),
  );

it("persists encrypted exact intent and retires only the recorded CAS refusal as refused", async () => {
  const intent = await reserve();
  expect(JSON.stringify([...db.records.values()])).not.toContain(
    "Private synthetic edit",
  );
  expect([...local.values()].join("")).not.toContain("Private synthetic edit");
  const refused: OrdinaryRetained = {
    ...intent,
    outcome: { kind: "conflict" },
  };
  await updateRecovery(
    key,
    requestId,
    refused,
    ordinaryRecoveryContract,
    guard,
  );
  await retire();
  expect(await held()).toBeNull();
  expect(await readRecoveryDisposition(key, requestId, guard)).toMatchObject({
    state: "refused",
    code: "WORKSPACE_SAVE_STATE_CONFLICT",
  });
  expect(
    await reserveRecovery(
      key,
      otherId,
      { ...intent, body: { ...intent.body, requestId: otherId } },
      ordinaryRecoveryContract,
      guard,
    ),
  ).toMatchObject({ body: { requestId: otherId } });
});
it.each(["unknown", "saved"])(
  "never retires %s as a CAS refusal",
  async (outcome) => {
    const intent = original();
    if (outcome === "saved")
      intent.outcome = { kind: "saved", response: receipt(intent.body) };
    await reserve(intent);
    await expect(retire()).rejects.toThrow();
    expect(await held()).toEqual(intent);
  },
);
it("refuses a different request ID or a disposed authority without erasing intent", async () => {
  const intent = await reserve({
    ...original(),
    outcome: { kind: "conflict" },
  });
  await expect(retire(guard, otherId)).rejects.toThrow();
  await expect(
    retire(() => {
      throw new DOMException("Scope changed", "AbortError");
    }),
  ).rejects.toThrow("Scope changed");
  expect(await held()).toEqual(intent);
});
it("refuses changed payload and known-outcome reversal in the actual journal", async () => {
  const intent = await reserve();
  const changed = structuredClone(intent);
  changed.body.draft.docTitle = "Changed";
  await expect(
    updateRecovery(key, requestId, changed, ordinaryRecoveryContract, guard),
  ).rejects.toThrow();
  const refused: OrdinaryRetained = {
    ...intent,
    outcome: { kind: "conflict" },
  };
  await updateRecovery(
    key,
    requestId,
    refused,
    ordinaryRecoveryContract,
    guard,
  );
  await expect(
    updateRecovery(
      key,
      requestId,
      { ...intent, outcome: { kind: "saved", response: receipt(intent.body) } },
      ordinaryRecoveryContract,
      guard,
    ),
  ).rejects.toThrow();
  expect(await held()).toEqual(refused);
});
it("a storage failure cannot release the retained original", async () => {
  const intent = await reserve({
    ...original(),
    outcome: { kind: "conflict" },
  });
  db.failWrite = true;
  await expect(retire()).rejects.toThrow();
  db.failWrite = false;
  expect(await held()).toEqual(intent);
});
