import "./command-recovery-platform";
import { expect, it, vi } from "vitest";
import {
  readRecovery,
  reserveRecovery,
  retireRefusedRecovery,
} from "../src/shared/session/recovery/journal";
import {
  barrier,
  code,
  contract,
  current,
  data,
  db,
  id,
  scope,
  usePlatform,
} from "./command-recovery-platform";

usePlatform();

it("preserves pending payload when lifetime is revoked during the retirement read", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  const entered = barrier();
  const release = barrier();
  db.beforeRead = async () => {
    db.beforeRead = undefined;
    entered.resolve();
    await release.promise;
  };
  let valid = true;
  const assert = () => {
    if (!valid) throw new DOMException("scope replaced", "AbortError");
  };
  const writes = db.writes.length;
  const attempt = retireRefusedRecovery(scope, id, code, assert);
  const rejected = expect(attempt).rejects.toMatchObject({
    name: "AbortError",
  });
  await entered.promise;
  valid = false;
  release.resolve();
  await rejected;
  expect(db.writes).toHaveLength(writes);
  expect(await readRecovery(scope, contract, current)).toEqual(data);
});

it("preserves pending recovery if cancellation arrives while its terminal envelope is encrypted", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  const entered = barrier();
  const release = barrier();
  const encrypt = crypto.subtle.encrypt.bind(crypto.subtle);
  const spy = vi
    .spyOn(crypto.subtle, "encrypt")
    .mockImplementation(async (...args) => {
      const result = await encrypt(...args);
      entered.resolve();
      await release.promise;
      return result;
    });
  const abort = new AbortController();
  const assert = () => {
    if (abort.signal.aborted) throw new DOMException("cancelled", "AbortError");
  };
  const writes = db.writes.length;
  const attempt = retireRefusedRecovery(scope, id, code, assert);
  const rejected = expect(attempt).rejects.toMatchObject({
    name: "AbortError",
  });
  await entered.promise;
  abort.abort();
  release.resolve();
  await rejected;
  spy.mockRestore();
  expect(db.writes).toHaveLength(writes);
  expect(await readRecovery(scope, contract, current)).toEqual(data);
});
