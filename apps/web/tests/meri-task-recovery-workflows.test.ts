import { installPlatform } from "./command-recovery-platform";
installPlatform();
import "./command-recovery-platform";
import { expect, it, vi } from "vitest";
import { db } from "./command-recovery-platform";
import {
  taskInput,
  taskNow,
  taskResponse,
  taskSession,
  taskWire,
  taskWorkflow,
} from "./meri-task-command-fixtures";
import {
  accepted,
  clock,
  fixture,
  harness,
  prepared,
} from "./meri-action-fixtures";
import { ActionWorkflowController } from "../src/features/meri/actions/action-workflow-state";
import { TaskUpdateController } from "../src/features/meri/task-updates/workflow-state";
import { standaloneTaskRecovery } from "../src/shared/meri-actions/task-recovery";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import type { ActionPrepareResponse } from "@capiro/meri-contracts/action-application";
import type { TaskCommandPrepareResponse } from "@capiro/meri-contracts/task-command-application";

const signal = () => new AbortController().signal;
function notExecuted(
  proposal:
    | ActionPrepareResponse["proposal"]
    | TaskCommandPrepareResponse["proposal"],
) {
  return {
    status: "not_executed",
    proposalId: proposal.proposalId,
    commandSha256: proposal.commandSha256,
    idempotencyKey: proposal.command.idempotencyKey,
    binding: proposal.command.binding,
    reason: "expired",
    checkedAt: proposal.expiresAt,
  };
}

it("retains a verified create non-execution proof across reload until explicit retirement, then permits fresh review", async () => {
  const first = harness(),
    { proposal } = await prepared(first);
  first.queue.push(async () => {
    throw new Error("request lost before dispatch");
  });
  await first.port.execute(proposal.handle, signal());
  const next = harness(undefined, { runId: crypto.randomUUID() });
  next.setNow(clock + 50_000);
  const controller = new ActionWorkflowController(next.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().savedRequest).toBe(true),
  );
  const terminal = notExecuted(
    (fixture("prepare").response as ActionPrepareResponse).proposal,
  );
  next.queue.push(async () => Response.json(terminal));
  await controller.retrySaved();
  expect(controller.getSnapshot()).toMatchObject({
    savedRequest: true,
    canDiscard: true,
    notExecutedAt: terminal.checkedAt,
  });
  const storage = standaloneTaskRecovery(
    "create",
    next.session.context,
    () => undefined,
  );
  const retained = await storage.load();
  expect(retained).toMatchObject({ executing: true, notExecuted: terminal });
  controller.dispose();
  const reload = harness();
  const restored = new ActionWorkflowController(reload.port);
  restored.attach();
  await vi.waitFor(() =>
    expect(restored.getSnapshot().notExecutedAt).toBe(terminal.checkedAt),
  );
  await restored.retrySaved();
  expect(reload.requests).toHaveLength(0);
  await restored.discardSaved();
  expect(await storage.load()).toBeNull();
  expect(await storage.acknowledged(retained!.requestId)).toBe(false);
  expect(accepted(await next.port.restore(signal()))).toEqual({
    phase: "empty",
  });
  expect(restored.getSnapshot()).toMatchObject({
    savedRequest: false,
    proposal: null,
  });
  reload.queue.push("query");
  await restored.query();
  expect(reload.requests).toHaveLength(1);
  expect(restored.getSnapshot().stage).toBe("recommendations");
});

it("retains an update non-execution proof and requires explicit retirement before another preparation", async () => {
  const wire = taskWire("prepare").response as TaskCommandPrepareResponse;
  let step = 0;
  const fetcher = vi.fn(async () => {
    if (step++ === 0) return taskResponse("prepare");
    if (step === 2) throw new Error("lost request");
    return Response.json(notExecuted(wire.proposal));
  });
  const first = taskWorkflow(fetcher);
  const proposal = accepted(await first.port.prepare(taskInput, signal()));
  await first.port.execute(proposal.handle, signal());
  const next = taskWorkflow(fetcher, undefined, () => taskNow + 50_000);
  await next.port.restore(signal());
  expect(accepted(await next.port.retrySaved(signal()))).toMatchObject({
    phase: "not-executed",
  });
  const reload = taskWorkflow(fetcher);
  const controller = new TaskUpdateController(reload.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().notExecutedAt).toBe(
      wire.proposal.expiresAt,
    ),
  );
  await controller.retrySaved();
  expect(fetcher).toHaveBeenCalledTimes(3);
  await controller.discardSaved();
  expect(controller.getSnapshot()).toMatchObject({
    savedRequest: false,
    canDiscard: false,
    proposal: null,
  });
  expect(accepted(await next.port.restore(signal()))).toEqual({
    phase: "empty",
  });
});

it.each(["proposal", "binding", "time"])(
  "keeps an unknown execution held when its non-execution proof has wrong %s",
  async (field) => {
    const wire = taskWire("prepare").response as TaskCommandPrepareResponse;
    const terminal = structuredClone(notExecuted(wire.proposal));
    if (field === "proposal") terminal.proposalId = crypto.randomUUID();
    if (field === "binding") terminal.binding.runId = crypto.randomUUID();
    if (field === "time") terminal.checkedAt = wire.proposal.createdAt;
    let step = 0;
    const view = taskWorkflow(
      vi.fn(async () =>
        step++ === 0 ? taskResponse("prepare") : Response.json(terminal),
      ),
    );
    const proposal = accepted(await view.port.prepare(taskInput, signal()));
    expect(await view.port.execute(proposal.handle, signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
    expect(accepted(await view.port.restore(signal()))).toMatchObject({
      phase: "execute",
    });
    expect(await view.port.discardSaved(signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
    expect(
      await standaloneTaskRecovery(
        "update",
        taskSession().context,
        () => undefined,
      ).load(),
    ).toMatchObject({ executing: true });
  },
);

it("revalidates a persisted terminal proof against its original proposal before displaying or retiring it", async () => {
  const wire = taskWire("prepare").response as TaskCommandPrepareResponse;
  const view = taskWorkflow(vi.fn(async () => taskResponse("prepare")));
  await view.port.prepare(taskInput, signal());
  const recovery = standaloneTaskRecovery(
    "update",
    taskSession().context,
    () => undefined,
  );
  const saved = (await recovery.load())!;
  await recovery.update({
    ...saved,
    executing: true,
    notExecuted: {
      ...notExecuted(wire.proposal),
      proposalId: crypto.randomUUID(),
    },
  });
  const reload = taskWorkflow(vi.fn());
  expect(await reload.port.restore(signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  expect(await reload.port.discardSaved(signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  expect(await recovery.load()).not.toBeNull();
});
function nativeUpdate(
  proposal = JSON.parse(JSON.stringify(taskWire("prepare").response)).proposal,
) {
  const original = JSON.parse(JSON.stringify(taskWire("observed").response));
  return {
    ...original,
    outcome: {
      execution: {
        kind: "native-task",
        proposalId: proposal.proposalId,
        commandSha256: proposal.commandSha256,
        idempotencyKey: proposal.command.idempotencyKey,
        binding: proposal.command.binding,
        completedAt: original.outcome.receipt.completedAt,
        approvalDecisionSha256: "a".repeat(64),
      },
      result: original.outcome.result,
    },
  };
}

it("recovers task-update prepare and execute lost acknowledgments with exact requests after adapter replacement and expiry", async () => {
  const calls: unknown[] = [];
  let stage = 0;
  const fetcher: typeof fetch = vi.fn(async (_url, init) => {
    calls.push(JSON.parse(String(init?.body)));
    if (stage++ === 0 || stage === 3) throw new Error("lost acknowledgment");
    return stage === 2
      ? taskResponse("prepare")
      : Response.json(nativeUpdate());
  });
  const first = taskWorkflow(fetcher);
  expect(await first.port.prepare(taskInput, signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  const second = taskWorkflow(fetcher);
  expect(accepted(await second.port.restore(signal()))).toMatchObject({
    phase: "prepare",
  });
  expect(calls).toHaveLength(1);
  const recovered = accepted(await second.port.retrySaved(signal()));
  if (recovered.phase !== "proposal")
    throw new Error("Missing recovered proposal");
  expect(calls[1]).toEqual(calls[0]);
  expect(
    await second.port.execute(recovered.proposal.handle, signal()),
  ).toEqual({ ok: false, problem: "unknown" });
  const third = taskWorkflow(fetcher, undefined, () => taskNow + 50_000);
  expect(accepted(await third.port.restore(signal()))).toMatchObject({
    phase: "execute",
  });
  expect(calls).toHaveLength(3);
  expect(accepted(await third.port.retrySaved(signal()))).toMatchObject({
    phase: "observed",
    execution: { title: "Updated" },
  });
  expect(calls[3]).toEqual(calls[2]);
  expect(
    await standaloneTaskRecovery(
      "update",
      taskSession().context,
      () => undefined,
    ).load(),
  ).toBeNull();
});

it("explicit update prepare retry can admit only the new current run, then retains that exact reviewed proposal across another generation", async () => {
  const currentRun = crypto.randomUUID();
  const fresh = structuredClone(
    taskWire("prepare").response,
  ) as TaskCommandPrepareResponse;
  fresh.proposal.command.binding.runId = currentRun;
  fresh.proposal.command.commandId = crypto.randomUUID();
  fresh.proposal.proposalId = crypto.randomUUID();
  fresh.proposal.commandSha256 = canonicalSha256(fresh.proposal.command);
  let step = 0;
  const fetcher = vi.fn(async () => {
    if (step++ === 0) throw new Error("lost before owner claim");
    return Response.json(step === 2 ? fresh : nativeUpdate(fresh.proposal));
  });
  await taskWorkflow(fetcher).port.prepare(taskInput, signal());
  const original = taskSession();
  const next = taskWorkflow(fetcher, undefined, undefined, undefined, {
    ...original,
    context: { ...original.context, runId: currentRun },
  });
  expect(accepted(await next.port.restore(signal()))).toMatchObject({
    phase: "prepare",
  });
  const recovered = accepted(await next.port.retrySaved(signal()));
  expect(recovered.phase).toBe("proposal");
  expect(fetcher).toHaveBeenCalledTimes(2);
  const after = taskWorkflow(fetcher, undefined, undefined, undefined, {
    ...original,
    context: { ...original.context, runId: crypto.randomUUID() },
  });
  const review = accepted(await after.port.restore(signal()));
  if (review.phase !== "proposal") throw new Error("Missing explicit review");
  expect(review.proposal.reference).toBe(fresh.proposal.proposalId);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(
    accepted(await after.port.execute(review.proposal.handle, signal())),
  ).toMatchObject({ status: "observed" });
});

it("create recovery refuses a substituted current-run proposal instead of rebinding the original reviewed draft", async () => {
  const first = harness();
  first.queue.push("query", "draft", async () => {
    throw new Error("lost before owner claim");
  });
  const page = accepted(await first.port.query(first.signal()));
  const draft = accepted(
    await first.port.draft(
      page.items[0]!.selection,
      { title: "Review the synthetic recommendation", dueDate: null },
      first.signal(),
    ),
  );
  await first.port.prepare(draft.handle, first.signal());
  const runId = crypto.randomUUID();
  const fresh = structuredClone(
    fixture("prepare").response,
  ) as ActionPrepareResponse;
  fresh.proposal.command.binding.runId = runId;
  fresh.proposal.command.commandId = crypto.randomUUID();
  fresh.proposal.proposalId = crypto.randomUUID();
  fresh.proposal.commandSha256 = canonicalSha256(fresh.proposal.command);
  const next = harness(undefined, { runId });
  await next.port.restore(next.signal());
  next.queue.push(async () => Response.json(fresh));
  expect(await next.port.retrySaved(next.signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  expect(next.requests.map((request) => request.body)).toEqual([
    first.requests[2]!.body,
  ]);
  const after = harness(undefined, { runId: crypto.randomUUID() });
  const review = accepted(await after.port.restore(after.signal()));
  expect(review).toMatchObject({
    phase: "prepare",
  });
  expect(after.requests).toHaveLength(0);
});

it("discarded preparation cannot authorize execution from an older view holding that proposal", async () => {
  const first = harness();
  const { proposal } = await prepared(first);
  const next = harness();
  expect(accepted(await next.port.restore(next.signal()))).toMatchObject({
    phase: "proposal",
  });
  expect(accepted(await next.port.discardSaved(next.signal()))).toEqual({
    phase: "empty",
  });
  expect(await first.port.execute(proposal.handle, first.signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  expect(first.requests).toHaveLength(3);
  expect(accepted(await first.port.restore(first.signal()))).toEqual({
    phase: "empty",
  });
  first.queue.push("query");
  expect(accepted(await first.port.query(first.signal())).items).toHaveLength(
    1,
  );
});

it("the preparing owner cannot discard while its request is in flight", async () => {
  const view = harness();
  let release!: (response: Response) => void;
  view.queue.push(
    "query",
    "draft",
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  const page = accepted(await view.port.query(view.signal()));
  const draft = accepted(
    await view.port.draft(
      page.items[0]!.selection,
      { title: "Review the synthetic recommendation", dueDate: null },
      view.signal(),
    ),
  );
  const pending = view.port.prepare(draft.handle, view.signal());
  await vi.waitFor(() => expect(view.requests).toHaveLength(3));
  expect(await view.port.discardSaved(view.signal())).toEqual({
    ok: false,
    problem: "not-dispatched",
  });
  expect(
    await standaloneTaskRecovery(
      "create",
      view.session.context,
      () => undefined,
    ).load(),
  ).toMatchObject({ executing: false });
  release(Response.json(fixture("prepare").response));
  expect(accepted(await pending).reference).toBeTruthy();
});

it("a fresh prepare response from a third unadmitted run stays uncertain", async () => {
  const fresh = structuredClone(
    taskWire("prepare").response,
  ) as TaskCommandPrepareResponse;
  fresh.proposal.command.binding.runId = crypto.randomUUID();
  fresh.proposal.commandSha256 = canonicalSha256(fresh.proposal.command);
  let step = 0;
  const fetcher = vi.fn(async () => {
    if (step++ === 0) throw new Error("lost");
    return Response.json(fresh);
  });
  await taskWorkflow(fetcher).port.prepare(taskInput, signal());
  const original = taskSession();
  const next = taskWorkflow(fetcher, undefined, undefined, undefined, {
    ...original,
    context: { ...original.context, runId: crypto.randomUUID() },
  });
  await next.port.restore(signal());
  expect(await next.port.retrySaved(signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  expect(
    await standaloneTaskRecovery(
      "update",
      original.context,
      () => undefined,
    ).load(),
  ).not.toHaveProperty("prepared");
});

it("retains recommendation preparation before dispatch and restores its original reviewed draft without a fresh query", async () => {
  const first = harness();
  first.queue.push("query", "draft", async () => {
    throw new Error("lost prepare");
  });
  const page = accepted(await first.port.query(first.signal()));
  const draft = accepted(
    await first.port.draft(
      page.items[0]!.selection,
      { title: "Review the synthetic recommendation", dueDate: null },
      first.signal(),
    ),
  );
  expect(await first.port.prepare(draft.handle, first.signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  const request = first.requests[2]?.body;
  const next = harness();
  expect(accepted(await next.port.restore(next.signal()))).toMatchObject({
    phase: "prepare",
  });
  expect(next.requests).toHaveLength(0);
  next.queue.push("prepare");
  const restored = accepted(await next.port.retrySaved(next.signal()));
  expect(restored.phase).toBe("proposal");
  expect(next.requests.map((item) => item.body)).toEqual([request]);
  if (restored.phase !== "proposal") throw new Error("Missing proposal");
  next.queue.push(async () => {
    throw new Error("lost execution");
  });
  expect(
    await next.port.execute(restored.proposal.handle, next.signal()),
  ).toEqual({ ok: false, problem: "unknown" });
  const final = harness();
  expect(accepted(await final.port.restore(final.signal()))).toMatchObject({
    phase: "execute",
  });
  final.queue.push("execute-observed");
  expect(accepted(await final.port.retrySaved(final.signal()))).toMatchObject({
    phase: "observed",
  });
  expect(final.requests[0]?.body).toEqual(next.requests[1]?.body);
});

it("does not dispatch preparation when encrypted storage cannot commit", async () => {
  const fetcher = vi.fn(async () => taskResponse("prepare"));
  const current = taskWorkflow(fetcher);
  db.failWrite = true;
  expect(await current.port.prepare(taskInput, signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  expect(fetcher).not.toHaveBeenCalled();
});

it("a stale retry click adopts a different current saved command without dispatching it", async () => {
  const fetcher = vi.fn(async () => {
    throw new Error("lost");
  });
  const view = taskWorkflow(fetcher);
  await view.port.prepare(taskInput, signal());
  const owner = standaloneTaskRecovery(
    "update",
    taskSession().context,
    () => undefined,
  );
  const original = await owner.load();
  if (!original) throw new Error("Missing original");
  await owner.acknowledge(original);
  const requestId = crypto.randomUUID();
  await owner.reserve({
    ...original,
    requestId,
    prepare: {
      requestId,
      arguments: { ...taskInput, title: "Different reviewed task" },
    },
  });
  const result = accepted(await view.port.retrySaved(signal()));
  expect(result).toMatchObject({ phase: "prepare" });
  expect(fetcher).toHaveBeenCalledTimes(1);
  if (result.phase !== "prepare") throw new Error("Missing held request");
  expect(result.fields).toContainEqual({
    label: "title",
    value: "Different reviewed task",
  });
});

it("does not acknowledge an uncorrelated native outcome and preserves the exact execution for recovery", async () => {
  let step = 0;
  const wrong = nativeUpdate();
  wrong.outcome.execution.proposalId = crypto.randomUUID();
  const fetcher = vi.fn(async () =>
    step++ === 0 ? taskResponse("prepare") : Response.json(wrong),
  );
  const view = taskWorkflow(fetcher);
  const proposal = accepted(await view.port.prepare(taskInput, signal()));
  expect(await view.port.execute(proposal.handle, signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  expect(
    await standaloneTaskRecovery(
      "update",
      taskSession().context,
      () => undefined,
    ).load(),
  ).toMatchObject({ executing: true });
});

it("the recommendation native result passes through the public proposal-correlated receiver", async () => {
  const view = harness(),
    { proposal } = await prepared(view);
  const original = JSON.parse(
    JSON.stringify(fixture("execute-observed").response),
  );
  const wire = JSON.parse(JSON.stringify(fixture("prepare").response)).proposal;
  view.queue.push(async () =>
    Response.json({
      ...original,
      outcome: {
        execution: {
          kind: "native-task",
          proposalId: wire.proposalId,
          commandSha256: wire.commandSha256,
          idempotencyKey: wire.command.idempotencyKey,
          binding: wire.command.binding,
          completedAt: original.outcome.receipt.completedAt,
          approvalDecisionSha256: "b".repeat(64),
        },
        result: original.outcome.result,
      },
    }),
  );
  expect(
    accepted(await view.port.execute(proposal.handle, view.signal())),
  ).toMatchObject({ status: "observed", receiptReference: wire.proposalId });
});

it("an expired unknown create execution remains held after generic approval refusal; no-effect retirement needs canonical proof", async () => {
  const first = harness();
  await prepared(first);
  const controller = new ActionWorkflowController(first.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().proposal).not.toBeNull(),
  );
  first.queue.push(async () => {
    throw new Error("request did not reach owner");
  });
  await controller.execute();
  controller.dispose();
  const next = harness(undefined, { runId: crypto.randomUUID() });
  next.setNow(clock + 50_000);
  const recovered = new ActionWorkflowController(next.port);
  recovered.attach();
  await vi.waitFor(() =>
    expect(recovered.getSnapshot().savedRequest).toBe(true),
  );
  next.queue.push(async () =>
    Response.json(
      {
        error: { code: "COMMAND_APPROVAL_REFUSED", outcome: "NOT_DISPATCHED" },
      },
      { status: 409 },
    ),
  );
  await recovered.retrySaved();
  expect(recovered.getSnapshot()).toMatchObject({
    stage: "pending",
    savedRequest: true,
    canDiscard: false,
    execution: null,
  });
  await recovered.discardSaved();
  expect(next.requests).toHaveLength(1);
  expect(
    await standaloneTaskRecovery(
      "create",
      next.session.context,
      () => undefined,
    ).load(),
  ).toMatchObject({ executing: true });
});

it("an expired unknown update execution cannot be discarded on generic approval refusal", async () => {
  let step = 0;
  const fetcher = vi.fn(async () => {
    if (step++ === 0) return taskResponse("prepare");
    if (step === 2) throw new Error("request did not reach owner");
    return Response.json(
      {
        error: { code: "COMMAND_APPROVAL_REFUSED", outcome: "NOT_DISPATCHED" },
      },
      { status: 409 },
    );
  });
  const first = taskWorkflow(fetcher);
  await first.port.prepare(taskInput, signal());
  const controller = new TaskUpdateController(first.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().proposal).not.toBeNull(),
  );
  await controller.execute();
  controller.dispose();
  const original = taskSession();
  const next = taskWorkflow(
    fetcher,
    undefined,
    () => taskNow + 50_000,
    undefined,
    {
      ...original,
      context: { ...original.context, runId: crypto.randomUUID() },
    },
  );
  const recovered = new TaskUpdateController(next.port);
  recovered.attach();
  await vi.waitFor(() =>
    expect(recovered.getSnapshot().savedRequest).toBe(true),
  );
  await recovered.retrySaved();
  expect(recovered.getSnapshot()).toMatchObject({
    savedRequest: true,
    canDiscard: false,
    execution: null,
  });
  await recovered.discardSaved();
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(
    await standaloneTaskRecovery(
      "update",
      original.context,
      () => undefined,
    ).load(),
  ).toMatchObject({ executing: true });
});
