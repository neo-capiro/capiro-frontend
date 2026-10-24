import "./command-recovery-platform";
import { expect, it } from "vitest";
import {
  readRecovery,
  reserveRecovery,
  retireAssociationRefusalRecovery,
} from "../src/shared/session/recovery/journal";
import {
  contract,
  current,
  data,
  envelope,
  id,
  nextId,
  scope,
  installPlatform,
} from "./command-recovery-platform";
installPlatform();
const failure = {
  requestId: id,
  outcome: "rejected",
  code: "ASSOCIATION_VERSION_CONFLICT",
};

it("retires an exact canonical refusal without acknowledging success", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  await retireAssociationRefusalRecovery(scope, id, failure, current);
  expect(await envelope()).toEqual({
    version: 1,
    scope,
    requestId: id,
    state: "refused",
    code: "OBJECTIVE_ASSOCIATION_REJECTED",
  });
  expect(await readRecovery(scope, contract, current)).toBeNull();
});
it.each([
  { ...failure, requestId: nextId },
  { ...failure, requestId: null },
  { ...failure, outcome: "unknown" },
  { ...failure, code: "NOT_AVAILABLE" },
  { ...failure, code: "RECEIPT_NOT_AVAILABLE" },
  { ...failure, code: "OWNER_UNAVAILABLE" },
  { ...failure, code: "CURSOR_STALE" },
])("retains the unknown fence for invalid refusal %j", async (invalid) => {
  await reserveRecovery(scope, id, data, contract, current);
  await expect(
    retireAssociationRefusalRecovery(scope, id, invalid, current),
  ).rejects.toThrow();
  expect(await readRecovery(scope, contract, current)).toEqual(data);
});
