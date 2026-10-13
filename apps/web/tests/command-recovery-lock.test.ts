import "./command-recovery-platform";
import { expect, it } from "vitest";
import {
  readRecovery,
  reserveRecovery,
  retireRefusedRecovery,
  withRecoveryCommandLock,
  RecoveryStorageError,
} from "../src/shared/session/recovery/journal";
import {
  barrier,
  code,
  contract,
  current,
  data,
  db,
  envelope,
  executionKey,
  fenceKey,
  id,
  locks,
  scope,
  installPlatform,
} from "./command-recovery-platform";

installPlatform();

it("rereads under the execution lock, so a queued tab cannot redispatch a retired refusal", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  const entered = barrier();
  const release = barrier();
  const sent: (typeof data)[] = [];
  const first = withRecoveryCommandLock(scope, current, async () => {
    const intent = await readRecovery(scope, contract, current);
    sent.push(intent!);
    entered.resolve();
    await release.promise;
    await retireRefusedRecovery(scope, id, code, current);
  });
  await entered.promise;
  const second = withRecoveryCommandLock(scope, current, async () => {
    const intent = await readRecovery(scope, contract, current);
    if (intent) sent.push(intent);
  });
  expect(sent).toEqual([data]);
  release.resolve();
  await Promise.all([first, second]);
  expect(sent).toEqual([data]);
  expect((await envelope()).state).toBe("refused");
  expect(
    locks.events.filter((entry) => entry.endsWith(executionKey())),
  ).toEqual([
    `queued:${executionKey()}`,
    `entered:${executionKey()}`,
    `queued:${executionKey()}`,
    `released:${executionKey()}`,
    `entered:${executionKey()}`,
    `released:${executionKey()}`,
  ]);
  expect(locks.events).toContain(`entered:${fenceKey()}`);
});

it.each([
  "actor replacement",
  "tenant replacement",
  "client replacement",
  "aborted signal",
])("never enters a queued command after %s", async (replacement) => {
  const entered = barrier();
  const release = barrier();
  const abort = new AbortController();
  const identity = { actor: "a", tenant: "t", client: "c" };
  const captured = { ...identity };
  const assert = () => {
    if (
      abort.signal.aborted ||
      identity.actor !== captured.actor ||
      identity.tenant !== captured.tenant ||
      identity.client !== captured.client
    )
      throw new DOMException("replaced", "AbortError");
  };
  let dispatches = 0;
  const holder = withRecoveryCommandLock(scope, current, async () => {
    entered.resolve();
    await release.promise;
  });
  await entered.promise;
  const queued = withRecoveryCommandLock(scope, assert, async () => {
    dispatches++;
  });
  const rejected = expect(queued).rejects.toMatchObject({ name: "AbortError" });
  if (replacement === "actor replacement") identity.actor = "b";
  else if (replacement === "tenant replacement") identity.tenant = "u";
  else if (replacement === "client replacement") identity.client = "d";
  else abort.abort();
  release.resolve();
  await holder;
  await rejected;
  expect(dispatches).toBe(0);
});

it("keeps an uncertain attempt pending and releases the lock for deliberate same-ID recovery", async () => {
  await reserveRecovery(scope, id, data, contract, current);
  const sent: (typeof data)[] = [];
  await expect(
    withRecoveryCommandLock(scope, current, async () => {
      sent.push((await readRecovery(scope, contract, current))!);
      throw new Error("response lost after dispatch");
    }),
  ).rejects.toThrow("response lost");
  expect(await readRecovery(scope, contract, current)).toEqual(data);
  expect(sent).toEqual([data]);
  await withRecoveryCommandLock(scope, current, async () => {
    sent.push((await readRecovery(scope, contract, current))!);
  });
  expect(sent).toEqual([data, data]);
  expect((await envelope()).state).toBe("pending");
});

it("serializes two actual async command bodies until the first settles", async () => {
  const entered = barrier();
  const release = barrier();
  const order: string[] = [];
  const first = withRecoveryCommandLock(scope, current, async () => {
    order.push("first-start");
    entered.resolve();
    await release.promise;
    order.push("first-finish");
  });
  await entered.promise;
  const second = withRecoveryCommandLock(scope, current, async () => {
    order.push("second");
  });
  expect(order).toEqual(["first-start"]);
  release.resolve();
  await Promise.all([first, second]);
  expect(order).toEqual(["first-start", "first-finish", "second"]);
});

it("does not let an unrelated scope block a current command", async () => {
  const entered = barrier();
  const release = barrier();
  const first = withRecoveryCommandLock(scope, current, async () => {
    entered.resolve();
    await release.promise;
  });
  await entered.promise;
  expect(
    await withRecoveryCommandLock(
      "other-tenant",
      current,
      async () => "complete",
    ),
  ).toBe("complete");
  release.resolve();
  await first;
});

it("fails closed when the browser has no command-lock capability", async () => {
  Object.assign(navigator, { locks: undefined });
  let dispatches = 0;
  await expect(
    withRecoveryCommandLock(scope, current, async () => {
      dispatches++;
    }),
  ).rejects.toBeInstanceOf(RecoveryStorageError);
  expect(dispatches).toBe(0);
  expect(db.writes).toHaveLength(0);
});
