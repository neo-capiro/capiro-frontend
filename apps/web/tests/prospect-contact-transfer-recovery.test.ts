import "./command-recovery-platform";
import { expect, it } from "vitest";
import {
  readRecovery,
  readRecoveryDisposition,
  reserveRecovery,
} from "../src/shared/session/recovery/journal";
import {
  prepareContactTransfer,
  transferScope,
} from "../src/features/portfolio/prospects/contact-transfer/command";
import {
  transferRecoveryContract,
  type TransferAttempt,
} from "../src/features/portfolio/prospects/contact-transfer/contracts";
import {
  runContactTransfer,
  type TransferAction,
} from "../src/features/portfolio/prospects/contact-transfer/recovery";
import {
  actor,
  apiFixture,
  id,
  receiptFor,
  review,
} from "./prospect-contact-transfer-fixtures";
import {
  barrier,
  db,
  installPlatform,
  local,
} from "./command-recovery-platform";
installPlatform();
const guard = () => {},
  scope = transferScope(actor, id(3));
const prepare = () =>
  prepareContactTransfer(actor, review, [
    { sourceId: id(5), action: "create" },
  ]);
const submit: TransferAction = {
  kind: "submit",
  review,
  decisions: [{ sourceId: id(5), action: "create" }],
};
async function retain() {
  const saved = await prepare();
  await reserveRecovery(
    scope,
    saved.command.requestId,
    saved,
    transferRecoveryContract,
    guard,
  );
  return saved;
}
const run = (
  api: ReturnType<typeof apiFixture>["api"],
  action: TransferAction,
  observe: (attempt: TransferAttempt | null) => void = () => {},
  signal = new AbortController().signal,
  assert = guard,
) =>
  runContactTransfer(api, actor, id(3), action, assert, signal, observe).then(
    (outcome) => outcome.receipt,
  );

it("retains encrypted immutable intent before dispatch; a lost acknowledgement reloads the exact original and GET reads its result", async () => {
  let attempted: TransferAttempt | null = null;
  const f = apiFixture({
    transfer: async () => {
      expect(
        await readRecovery(scope, transferRecoveryContract, guard),
      ).toEqual(attempted);
      expect([...local.values()].join("")).not.toContain("Synthetic Contact");
      expect(JSON.stringify([...db.records.values()])).not.toContain(
        "Synthetic Contact",
      );
      throw new TypeError("Synthetic lost acknowledgement");
    },
  });
  await expect(
    run(f.api, submit, (value) => {
      attempted = value;
    }),
  ).rejects.toThrow("lost acknowledgement");
  const reloaded = await readRecovery(scope, transferRecoveryContract, guard);
  expect(reloaded).toEqual(attempted);
  const recovered = apiFixture({
    current: { ...review, contacts: [], people: [] },
    transfer: () => Response.json(receiptFor(reloaded!)),
  });
  expect(
    await run(recovered.api, { kind: "check", expected: reloaded! }),
  ).toEqual(receiptFor(reloaded!));
  expect(
    recovered.calls
      .filter((call) => call.path.includes("/transfers"))
      .map((call) => call.method),
  ).toEqual(["GET"]);
  expect(await readRecovery(scope, transferRecoveryContract, guard)).toEqual(
    reloaded,
  );
  await run(recovered.api, { kind: "acknowledge", expected: reloaded! });
  expect(await readRecovery(scope, transferRecoveryContract, guard)).toBeNull();
});
it("only explicit same-command retry POSTs the retained manifest; a new submit is held", async () => {
  const saved = await retain();
  const f = apiFixture({ transfer: () => Response.json(receiptFor(saved)) });
  await expect(run(f.api, submit)).rejects.toThrow("earlier contact transfer");
  expect(f.calls.filter((call) => call.method === "POST")).toEqual([]);
  await run(f.api, { kind: "retry", expected: saved });
  expect(
    f.calls.filter((call) => call.method === "POST").map((call) => call.body),
  ).toEqual([saved.command]);
  expect(await readRecovery(scope, transferRecoveryContract, guard)).toEqual(
    saved,
  );
});
it.each([404, 409, 503, "timeout", "malformed"] as const)(
  "GET %s cannot retire a saved command or start a new transfer",
  async (failure) => {
    const saved = await retain();
    const f = apiFixture({
      transfer: () => {
        if (failure === "timeout") throw new TypeError("Synthetic timeout");
        return failure === "malformed"
          ? Response.json({ status: "refused" })
          : Response.json({ message: "Unavailable" }, { status: failure });
      },
    });
    await expect(
      runContactTransfer(
        f.api,
        actor,
        id(3),
        { kind: "retire-refusal", expected: saved },
        guard,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow();
    expect(await readRecovery(scope, transferRecoveryContract, guard)).toEqual(
      saved,
    );
    expect(f.calls.some((call) => call.method === "POST")).toBe(false);
  },
);
it("requires the exact historical refused receipt and fresh source/client reads before requesting refusal retirement", async () => {
  const saved = await retain();
  const f = apiFixture({
    current: { ...review, contacts: [] },
    transfer: () => Response.json(receiptFor(saved, "refused")),
  });
  await runContactTransfer(
    f.api,
    actor,
    id(3),
    { kind: "retire-refusal", expected: saved },
    guard,
    new AbortController().signal,
    () => {},
  );
  expect(await readRecovery(scope, transferRecoveryContract, guard)).toBeNull();
  expect(
    await readRecoveryDisposition(scope, saved.command.requestId, guard),
  ).toEqual({
    version: 1,
    scope,
    requestId: saved.command.requestId,
    state: "refused",
    code: "PROSPECT_CONTACT_TRANSFER_REFUSED",
  });
  expect([...local.values()].join("")).not.toContain("Synthetic Contact");
  const paths = f.calls.map((call) => call.path);
  expect(paths.findIndex((path) => path.includes("/transfers/"))).toBeLessThan(
    paths.findIndex((path) => path.endsWith("/contacts")),
  );
  expect(paths.some((path) => path.endsWith("/people"))).toBe(true);
  expect(paths.some((path) => path.endsWith(`/clients/${id(4)}`))).toBe(true);
});
it("current source/client loss prevents refusal retirement; completed results cannot be retired as refused", async () => {
  const saved = await retain();
  const f = apiFixture({
    current: {
      ...review,
      prospect: { ...review.prospect, linkedClientId: id(99) },
    },
    transfer: () => Response.json(receiptFor(saved, "refused")),
  });
  await expect(
    runContactTransfer(
      f.api,
      actor,
      id(3),
      { kind: "retire-refusal", expected: saved },
      guard,
      new AbortController().signal,
      () => {},
    ),
  ).rejects.toThrow("linked client");
  expect(await readRecovery(scope, transferRecoveryContract, guard)).toEqual(
    saved,
  );
  const completed = apiFixture({
    transfer: () => Response.json(receiptFor(saved)),
  });
  await expect(
    run(completed.api, { kind: "retire-refusal", expected: saved }),
  ).rejects.toThrow("completed");
  const refused = apiFixture({
    transfer: () => Response.json(receiptFor(saved, "refused")),
  });
  await expect(
    run(refused.api, { kind: "acknowledge", expected: saved }),
  ).rejects.toThrow("refused");
  expect(await readRecovery(scope, transferRecoveryContract, guard)).toEqual(
    saved,
  );
});
it("a GET-confirmed refused disposition permits only a newly reviewed command with a fresh identity", async () => {
  const original = await retain();
  const current = {
    ...review,
    contacts: [{ ...review.contacts[0]!, version: 3 }],
  };
  const refused = apiFixture({
    current,
    transfer: () => Response.json(receiptFor(original, "refused")),
  });
  const outcome = await runContactTransfer(
    refused.api,
    actor,
    id(3),
    { kind: "retire-refusal", expected: original },
    guard,
    new AbortController().signal,
    () => {},
  );
  expect(outcome.freshReview!.review).toEqual(current);
  expect(outcome.freshReview!.decisions).toEqual([
    { sourceId: id(5), action: "create" },
  ]);
  expect(outcome.freshReview!.notices[0]!.message).toContain("changed");
  expect(await readRecovery(scope, transferRecoveryContract, guard)).toBeNull();
  expect(refused.calls.some((call) => call.method === "POST")).toBe(false);
  const next = apiFixture({
    current,
    transfer: async () => {
      const current = await readRecovery(
        scope,
        transferRecoveryContract,
        guard,
      );
      expect(current!.command.requestId).not.toBe(original.command.requestId);
      expect(current!.command.items[0]!.expectedVersion).toBe(3);
      expect(
        current!.command.items[0]!.action === "create" &&
          original.command.items[0]!.action === "create" &&
          current!.command.items[0]!.createRequestId !==
            original.command.items[0]!.createRequestId,
      ).toBe(true);
      return Response.json(receiptFor(current!));
    },
  });
  await run(next.api, {
    kind: "submit",
    review: outcome.freshReview!.review,
    decisions: outcome.freshReview!.decisions,
  });
  expect(next.calls.filter((call) => call.method === "POST")).toHaveLength(1);
  expect(
    await readRecovery(scope, transferRecoveryContract, guard),
  ).not.toBeNull();
});
it("storage failure, stale source and changed retained command prevent dispatch", async () => {
  const f = apiFixture();
  db.failWrite = true;
  await expect(run(f.api, submit)).rejects.toThrow("recovery is unavailable");
  expect(f.calls.some((call) => call.method === "POST")).toBe(false);
  db.failWrite = false;
  db.records.clear();
  local.clear();
  const stale = apiFixture({
    current: { ...review, contacts: [{ ...review.contacts[0]!, version: 3 }] },
  });
  await expect(run(stale.api, submit)).rejects.toThrow(
    "source contact changed",
  );
  expect(await readRecovery(scope, transferRecoveryContract, guard)).toBeNull();
  const saved = await retain();
  await expect(
    run(f.api, {
      kind: "retry",
      expected: { ...saved, clientName: "Changed local review" },
    }),
  ).rejects.toThrow("another tab");
  expect(f.calls.some((call) => call.method === "POST")).toBe(false);
});
it("cross-tab submission serializes on the existing lock and preserves one dispatched original", async () => {
  const entered = barrier(),
    release = barrier();
  let posts = 0;
  const f = apiFixture({
    transfer: async () => {
      posts++;
      entered.resolve();
      await release.promise;
      throw new TypeError("lost acknowledgement");
    },
  });
  const first = run(f.api, submit).catch((error: unknown) => error);
  await entered.promise;
  const second = run(f.api, submit).catch((error: unknown) => error);
  release.resolve();
  expect(await first).toBeInstanceOf(TypeError);
  expect(await second).toMatchObject({
    message: expect.stringContaining("earlier contact transfer"),
  });
  expect(posts).toBe(1);
  expect(
    await readRecovery(scope, transferRecoveryContract, guard),
  ).not.toBeNull();
});
it("snapshots the reviewed decisions before waiting for authority or a cross-tab lock", async () => {
  const entered = barrier(),
    release = barrier(),
    draft = structuredClone(submit);
  const f = apiFixture({
    transfer: async () =>
      Response.json(
        receiptFor(
          (await readRecovery(scope, transferRecoveryContract, guard))!,
        ),
      ),
  });
  const api = {
    request: async <T>(...args: Parameters<typeof f.api.request<T>>) => {
      if (args[1] === "me") {
        entered.resolve();
        await release.promise;
      }
      return f.api.request<T>(...args);
    },
  };
  const pending = run(api, draft);
  await entered.promise;
  if (draft.kind === "submit") {
    draft.decisions[0]!.action = "skip";
    draft.review.contacts[0]!.name = "Later unreviewed change";
  }
  release.resolve();
  const receipt = await pending;
  expect(receipt.status).toBe("completed");
  const saved = await readRecovery(scope, transferRecoveryContract, guard);
  expect(saved!.command.items[0]!.action).toBe("create");
  expect(saved!.summary[0]!.name).toBe("Synthetic Contact");
});
it("actor change after an awaited read prevents dispatch; cancelled responses preserve the original pending command", async () => {
  let current = true;
  const f = apiFixture();
  const api = {
    request: async <T>(...args: Parameters<typeof f.api.request<T>>) => {
      const value = await f.api.request<T>(...args);
      current = false;
      return value;
    },
  };
  await expect(
    run(
      api,
      submit,
      () => {},
      new AbortController().signal,
      () => {
        if (!current) throw new Error("Actor changed");
      },
    ),
  ).rejects.toThrow("Actor changed");
  expect(f.calls.some((call) => call.method === "POST")).toBe(false);
  const saved = await retain(),
    controller = new AbortController();
  const cancelled = apiFixture({
    transfer: () => {
      controller.abort();
      return Response.json(receiptFor(saved));
    },
  });
  await expect(
    run(
      cancelled.api,
      { kind: "retry", expected: saved },
      () => {},
      controller.signal,
    ),
  ).rejects.toThrow();
  expect(await readRecovery(scope, transferRecoveryContract, guard)).toEqual(
    saved,
  );
});
