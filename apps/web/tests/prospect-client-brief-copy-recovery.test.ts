import "./command-recovery-platform";
import { expect, it } from "vitest";
import {
  readRecovery,
  reserveRecovery,
  readRecoveryDisposition,
} from "../src/shared/session/recovery/journal";
import {
  clientBriefCopyScope,
  prepareClientBriefCopy,
} from "../src/features/portfolio/prospects/brief/client-copy/command";
import {
  clientBriefCopyRecoveryContract,
  type ClientBriefCopyAttempt,
} from "../src/features/portfolio/prospects/brief/client-copy/contracts";
import {
  runClientBriefCopy,
  type ClientBriefCopyAction,
} from "../src/features/portfolio/prospects/brief/client-copy/recovery";
import {
  actor,
  identity,
  fixture,
  id,
  receiptFor,
  review,
} from "./prospect-client-brief-copy-fixtures";
import {
  barrier,
  db,
  installPlatform,
  local,
} from "./command-recovery-platform";
installPlatform();
const guard = () => {},
  scope = clientBriefCopyScope(actor, id(3));
const submit: ClientBriefCopyAction = {
  kind: "submit",
  review,
  docTitle: "Synthetic private title",
};
const run = (
  f: ReturnType<typeof fixture>,
  action: ClientBriefCopyAction,
  observe: (value: ClientBriefCopyAttempt | null) => void = () => {},
  signal = new AbortController().signal,
  assert = guard,
) =>
  runClientBriefCopy(
    f.api,
    f.workspace,
    actor,
    id(3),
    id(4),
    action,
    assert,
    signal,
    observe,
  );
async function retain() {
  const saved = await prepareClientBriefCopy(
    actor,
    review,
    "Synthetic private title",
    id(50),
  );
  await reserveRecovery(
    scope,
    saved.command.requestId,
    saved,
    clientBriefCopyRecoveryContract,
    guard,
  );
  return saved;
}
const copyCalls = (f: ReturnType<typeof fixture>) =>
  f.calls.filter((call) => call.path.startsWith("workspace.client-brief-copy"));
it("retains encrypted intent before POST; lost acknowledgement recovers by GET after source deletion and acknowledges only after another matching GET", async () => {
  let sent: ClientBriefCopyAttempt | null = null;
  const f = fixture({
    copy: async () => {
      expect(
        await readRecovery(scope, clientBriefCopyRecoveryContract, guard),
      ).toEqual(sent);
      expect([...local.values()].join("")).not.toContain(
        "Synthetic private title",
      );
      expect(JSON.stringify([...db.records.values()])).not.toContain(
        "Synthetic private title",
      );
      throw new TypeError("Synthetic lost acknowledgement");
    },
  });
  await expect(
    run(f, submit, (value) => {
      sent = value;
    }),
  ).rejects.toThrow("lost acknowledgement");
  const original = (await readRecovery(
    scope,
    clientBriefCopyRecoveryContract,
    guard,
  ))!;
  const recovered = fixture({
    current: {
      ...review,
      prospect: { ...review.prospect, updatedAt: "2026-10-25T02:00:00.987Z" },
    },
    coreResponse: (path) =>
      path.includes("/brief")
        ? Response.json({ message: "Source removed" }, { status: 404 })
        : undefined,
    copy: () => receiptFor(original),
  });
  expect(await run(recovered, { kind: "check", expected: original })).toEqual(
    receiptFor(original),
  );
  expect(
    recovered.calls.filter((call) => call.path.includes("/brief")),
  ).toEqual([]);
  await run(recovered, { kind: "acknowledge", expected: original });
  expect(copyCalls(recovered).map((call) => call.method)).toEqual([
    "GET",
    "GET",
  ]);
  expect(
    await readRecovery(scope, clientBriefCopyRecoveryContract, guard),
  ).toBeNull();
  expect(
    await readRecoveryDisposition(scope, original.command.requestId, guard),
  ).toMatchObject({
    state: "acknowledged",
    requestId: original.command.requestId,
  });
});
it.each([true, false])(
  "matching completed GET available=%s suppresses retry POST, including a deleted draft",
  async (available) => {
    const saved = await retain(),
      f = fixture({ copy: () => receiptFor(saved, available) });
    expect((await run(f, { kind: "retry", expected: saved })).available).toBe(
      available,
    );
    expect(copyCalls(f).map((call) => call.method)).toEqual(["GET"]);
    expect(
      await readRecovery(scope, clientBriefCopyRecoveryContract, guard),
    ).toEqual(saved);
    await run(f, { kind: "acknowledge", expected: saved });
    expect(copyCalls(f).map((call) => call.method)).toEqual(["GET", "GET"]);
  },
);
it("initial HTTP503 remains uncertain and retains the original command for GET reconciliation", async () => {
  const f = fixture({
    copy: () =>
      Response.json(
        { message: "The saved brief copy has not been confirmed" },
        { status: 503 },
      ),
  });
  await expect(run(f, submit)).rejects.toThrow("has not been confirmed");
  const saved = (await readRecovery(
    scope,
    clientBriefCopyRecoveryContract,
    guard,
  ))!;
  expect(saved.command.docTitle).toBe("Synthetic private title");
  expect(copyCalls(f).map((call) => call.method)).toEqual(["POST"]);
  const recovered = fixture({ copy: () => receiptFor(saved) });
  await run(recovered, { kind: "retry", expected: saved });
  expect(copyCalls(recovered).map((call) => call.method)).toEqual(["GET"]);
  expect(
    await readRecovery(scope, clientBriefCopyRecoveryContract, guard),
  ).toEqual(saved);
});
it("only explicit retry after GET404 sends the identical retained request and body, while a new submit remains held", async () => {
  const saved = await retain(),
    f = fixture({
      copy: (method) =>
        method === "GET"
          ? Response.json({ message: "Missing" }, { status: 404 })
          : receiptFor(saved),
    });
  await expect(run(f, submit)).rejects.toThrow("earlier brief copy");
  await run(f, { kind: "retry", expected: saved });
  expect(copyCalls(f).map((call) => call.method)).toEqual(["GET", "POST"]);
  expect(copyCalls(f)[1]!.input).toEqual({
    params: { prospectId: id(3), clientId: id(4) },
    body: saved.command,
  });
  expect(
    await readRecovery(scope, clientBriefCopyRecoveryContract, guard),
  ).toEqual(saved);
});
it.each([401, 403, 409, 503, "timeout", "malformed", "mismatch"])(
  "GET %s neither retires nor retries the command",
  async (failure) => {
    const saved = await retain(),
      f = fixture({
        copy: () => {
          if (failure === "timeout") throw new TypeError("Timeout");
          if (failure === "malformed") return { status: "completed" };
          if (failure === "mismatch")
            return { ...receiptFor(saved), actorId: actor.userId };
          return Response.json(
            { message: "Unavailable" },
            { status: failure as number },
          );
        },
      });
    await expect(run(f, { kind: "retry", expected: saved })).rejects.toThrow();
    await expect(
      run(f, { kind: "acknowledge", expected: saved }),
    ).rejects.toThrow();
    expect(copyCalls(f).every((call) => call.method === "GET")).toBe(true);
    expect(
      await readRecovery(scope, clientBriefCopyRecoveryContract, guard),
    ).toEqual(saved);
  },
);
it("GET404 is not acknowledgement or a release for a new request", async () => {
  const saved = await retain(),
    f = fixture();
  await expect(
    run(f, { kind: "acknowledge", expected: saved }),
  ).rejects.toThrow();
  expect(
    await readRecovery(scope, clientBriefCopyRecoveryContract, guard),
  ).toEqual(saved);
});
it.each(["wall", "link"])(
  "current %s loss prevents revealing the saved payload or dispatching",
  async (loss) => {
    const saved = await retain(),
      observed: unknown[] = [];
    const current = structuredClone(review);
    if (loss === "link") current.prospect.linkedClientId = id(90);
    const f = fixture({
      current,
      coreResponse: (path) =>
        loss === "wall" && path.includes("/clients/")
          ? Response.json({ message: "Denied" }, { status: 403 })
          : undefined,
    });
    await expect(
      run(f, { kind: "check", expected: saved }, (value) =>
        observed.push(value),
      ),
    ).rejects.toThrow();
    expect(observed).toEqual([]);
    expect(copyCalls(f)).toEqual([]);
    expect(
      await readRecovery(scope, clientBriefCopyRecoveryContract, guard),
    ).toEqual(saved);
  },
);
it("rejects changed Clerk identity before reading the private journal or sending", async () => {
  const saved = await retain(),
    f = fixture({
      identity: {
        ...identity,
        user: { ...identity.user, clerkUserId: "user_other" },
      },
    });
  await expect(run(f, { kind: "retry", expected: saved })).rejects.toThrow(
    "current Core actor",
  );
  expect(copyCalls(f)).toEqual([]);
});
it("holds the old linked-client command rather than copying to a relinked client", async () => {
  const saved = await retain(),
    f = fixture({
      current: {
        ...review,
        prospect: { ...review.prospect, linkedClientId: id(90) },
        client: { ...review.client, id: id(90) },
      },
    });
  await expect(
    runClientBriefCopy(
      f.api,
      f.workspace,
      actor,
      id(3),
      id(90),
      { kind: "retry", expected: saved },
      guard,
      new AbortController().signal,
      () => {},
    ),
  ).rejects.toThrow("original prospect and linked client");
  expect(copyCalls(f)).toEqual([]);
});
it("snapshots review and title before asynchronous reads; only the explicit reviewed title reaches the journal", async () => {
  const parked = barrier(),
    entered = barrier(),
    input = structuredClone(submit);
  db.beforeRead = async () => {
    entered.resolve();
    await parked.promise;
  };
  const f = fixture({
    copy: () => {
      throw new TypeError("Lost ack");
    },
  });
  const operation = run(f, input);
  await entered.promise;
  if (input.kind === "submit") {
    input.docTitle = "Mutated title";
    input.review.selection.source.versionId = id(90);
  }
  parked.resolve();
  await expect(operation).rejects.toThrow("Lost ack");
  const saved = (await readRecovery(
    scope,
    clientBriefCopyRecoveryContract,
    guard,
  ))!;
  expect(saved.command.docTitle).toBe("Synthetic private title");
  expect(saved.command.source).toEqual(review.selection.source);
});
it("stops after an actor/context abort during read-only review, without retaining or sending", async () => {
  const controller = new AbortController(),
    f = fixture({
      coreResponse: (path) => {
        if (path.endsWith("/brief")) controller.abort();
        return undefined;
      },
    });
  await expect(
    run(
      f,
      submit,
      () => {},
      controller.signal,
      () => controller.signal.throwIfAborted(),
    ),
  ).rejects.toThrow();
  expect(copyCalls(f)).toEqual([]);
  expect(
    await readRecovery(scope, clientBriefCopyRecoveryContract, guard),
  ).toBeNull();
});
it("failed encrypted storage never dispatches and concurrent submissions share one held command", async () => {
  db.failWrite = true;
  const f = fixture();
  await expect(run(f, submit)).rejects.toThrow();
  expect(copyCalls(f)).toEqual([]);
  db.failWrite = false;
  db.records.clear();
  local.clear();
  const g = fixture({
    copy: () => {
      throw new TypeError("Lost ack");
    },
  });
  const outcomes = await Promise.allSettled([run(g, submit), run(g, submit)]);
  expect(outcomes.every((result) => result.status === "rejected")).toBe(true);
  expect(copyCalls(g).map((call) => call.method)).toEqual(["POST"]);
});
