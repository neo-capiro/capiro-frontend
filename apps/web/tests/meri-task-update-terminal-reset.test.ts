import {
  installPlatform,
  barrier,
  db,
  local,
  locks,
} from "./command-recovery-platform";
installPlatform();
import { expect, it, vi } from "vitest";
import type { TaskCommandPrepareResponse } from "@capiro/meri-contracts/task-command-application";
import {
  taskInput,
  taskNow,
  taskResponse,
  taskSession,
  taskWire,
  taskWorkflow,
} from "./meri-task-command-fixtures";
import { accepted } from "./meri-action-fixtures";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { standaloneTaskRecovery } from "../src/shared/meri-actions/task-recovery";
import { TaskUpdateController } from "../src/features/meri/task-updates/workflow-state";

const signal = () => new AbortController().signal;
const draft = { ...taskInput, title: "Updated", status: "open", dueDate: "" };
const recovery = () =>
  standaloneTaskRecovery("update", taskSession().context, () => undefined);

/** Actual public transport/receiver, adapter, encrypted journal and controller; synthetic HTTP/storage platform. */
function server() {
  const requests: Array<{ requestId?: string; proposal?: unknown }> = [];
  let prepared = taskWire("prepare").response as TaskCommandPrepareResponse;
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    requests.push(body);
    if (body.arguments) {
      prepared = structuredClone(
        taskWire("prepare").response,
      ) as TaskCommandPrepareResponse;
      prepared.proposal.proposalId = crypto.randomUUID();
      prepared.proposal.command.commandId = crypto.randomUUID();
      prepared.proposal.command.idempotencyKey = crypto.randomUUID();
      prepared.proposal.commandSha256 = canonicalSha256(
        prepared.proposal.command,
      );
      return Response.json(prepared);
    }
    const wire = taskWire("observed").response as {
      status: string;
      outcome: { receipt: { completedAt: string }; result: unknown };
    };
    const proposal = prepared.proposal;
    return Response.json({
      status: "observed",
      outcome: {
        execution: {
          kind: "native-task",
          proposalId: proposal.proposalId,
          commandSha256: proposal.commandSha256,
          idempotencyKey: proposal.command.idempotencyKey,
          binding: proposal.command.binding,
          completedAt: wire.outcome.receipt.completedAt,
          approvalDecisionSha256: "a".repeat(64),
        },
        result: wire.outcome.result,
      },
    });
  });
  return { fetcher, requests };
}

async function completed(options?: {
  current?: () => boolean;
  now?: () => number;
}) {
  const h = server();
  const view = taskWorkflow(
    h.fetcher,
    undefined,
    options?.now,
    options?.current,
  );
  const controller = new TaskUpdateController(view.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().checkingRecovery).toBe(false),
  );
  controller.edit(draft);
  await controller.prepare();
  const proposal = controller.getSnapshot().proposal!;
  await controller.execute();
  expect(controller.getSnapshot().execution?.status).toBe("observed");
  return { ...h, ...view, controller, proposal };
}

it("starts another update only after the exact acknowledgment, without HTTP or erasing its receipt", async () => {
  const h = await completed();
  const requestId = h.requests[0]!.requestId!;
  const records = structuredClone([...db.records]);
  await h.controller.startNew(h.proposal.handle);
  expect(h.fetcher).toHaveBeenCalledTimes(2);
  expect([...db.records]).toEqual(records);
  expect(await recovery().acknowledged(requestId)).toBe(true);
  expect(h.controller.getSnapshot()).toMatchObject({
    proposal: null,
    execution: null,
    draft: { taskId: "", title: "", status: "", dueDate: "" },
  });
  expect(await h.port.execute(h.proposal.handle, signal())).toEqual({
    ok: false,
    problem: "not-dispatched",
  });
  expect(await h.port.startNew(h.proposal.handle, signal())).toEqual({
    ok: false,
    problem: "not-dispatched",
  });
  h.controller.edit(draft);
  await h.controller.prepare();
  expect(h.requests[2]!.requestId).not.toBe(requestId);
  expect(h.controller.getSnapshot().proposal?.reference).not.toBe(
    h.proposal.reference,
  );
  expect(h.controller.getSnapshot().execution).toBeNull();
  expect(h.fetcher).toHaveBeenCalledTimes(3); // A new preparation is not approval/execution.
  await h.controller.startNew(h.proposal.handle);
  expect(h.controller.getSnapshot().proposal).not.toBeNull();
  expect(h.fetcher).toHaveBeenCalledTimes(3);
  h.controller.dispose();
  h.port.dispose();
});

it.each(["pending", "unknown", "withheld"])(
  "does not reset a %s command or discard its exact saved identity",
  async (kind) => {
    let count = 0;
    const fetcher = vi.fn(async () => {
      if (!count++) return taskResponse("prepare");
      if (kind === "pending") return taskResponse("pending");
      if (kind === "withheld")
        return Response.json(
          {
            error: { code: "COMMAND_REFUSED", outcome: "RESULT_NOT_RELEASED" },
          },
          { status: 502 },
        );
      throw new Error("lost response");
    });
    const h = taskWorkflow(fetcher);
    const proposal = accepted(await h.port.prepare(taskInput, signal()));
    await h.port.execute(proposal.handle, signal());
    const saved = await recovery().load();
    expect(saved?.executing).toBe(true);
    expect(await h.port.startNew(proposal.handle, signal())).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    expect(await recovery().load()).toEqual(saved);
    expect(fetcher).toHaveBeenCalledTimes(2);
    h.port.dispose();
  },
);

it("recovers the original lost acknowledgment before allowing the explicit new workflow", async () => {
  const h = server();
  const original = h.fetcher.getMockImplementation()!;
  let count = 0;
  h.fetcher.mockImplementation(async (...args) => {
    const result = await original(...args);
    if (++count === 2) throw new Error("lost native acknowledgment");
    return result;
  });
  const first = taskWorkflow(h.fetcher);
  const proposal = accepted(await first.port.prepare(taskInput, signal()));
  expect(await first.port.execute(proposal.handle, signal())).toMatchObject({
    ok: false,
    problem: "unknown",
  });
  first.port.dispose();
  const next = taskWorkflow(h.fetcher, undefined, () => taskNow + 50_000);
  const controller = new TaskUpdateController(next.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().savedRequest).toBe(true),
  );
  const handle = controller.getSnapshot().proposal!.handle;
  await controller.startNew(handle);
  expect(h.fetcher).toHaveBeenCalledTimes(2);
  await controller.retrySaved();
  expect(h.requests[2]).toEqual(h.requests[1]);
  expect(controller.getSnapshot().execution?.status).toBe("observed");
  await controller.startNew(handle);
  expect(controller.getSnapshot().proposal).toBeNull();
  expect(h.fetcher).toHaveBeenCalledTimes(3);
  controller.dispose();
  next.port.dispose();
});

it("serializes reset behind another tab's pending command and preserves that command", async () => {
  const h = await completed();
  const entered = barrier(),
    release = barrier();
  const nextId = crypto.randomUUID();
  const other = recovery().lock(async () => {
    await recovery().reserve({
      requestId: nextId,
      context: taskSession().context,
      prepare: { requestId: nextId, arguments: taskInput },
      executing: false,
    });
    entered.resolve();
    await release.promise;
  });
  await entered.promise;
  const pending = h.controller.startNew(h.proposal.handle);
  await vi.waitFor(() =>
    expect(h.controller.getSnapshot().busy).toBe("start-new"),
  );
  expect(locks.events.at(-1)).toMatch(/^queued:/);
  release.resolve();
  await other;
  await pending;
  expect((await recovery().load())?.requestId).toBe(nextId);
  expect(h.controller.getSnapshot().proposal?.reference).toBe(
    h.proposal.reference,
  );
  expect(h.fetcher).toHaveBeenCalledTimes(2);
  h.controller.dispose();
  h.port.dispose();
});

it.each(["missing-acknowledgment", "unavailable-storage"])(
  "refuses reset with %s",
  async (kind) => {
    const h = await completed();
    if (kind === "missing-acknowledgment") {
      db.records.clear();
      local.clear();
    } else
      db.beforeRead = async () => {
        throw new Error("storage unavailable");
      };
    expect(await h.port.startNew(h.proposal.handle, signal())).toMatchObject({
      ok: false,
      problem: "unknown",
    });
    expect(h.controller.getSnapshot().proposal).not.toBeNull();
    expect(h.fetcher).toHaveBeenCalledTimes(2);
    h.controller.dispose();
    h.port.dispose();
  },
);

it.each(["identity", "expiry", "dispose"])(
  "withholds late reset after %s changes during the journal read",
  async (kind) => {
    let current = true,
      now = taskNow;
    const h = await completed({ current: () => current, now: () => now });
    const entered = barrier(),
      release = barrier();
    db.beforeRead = async () => {
      entered.resolve();
      await release.promise;
    };
    const pending = h.controller.startNew(h.proposal.handle);
    await entered.promise;
    if (kind === "identity") current = false;
    if (kind === "expiry") now += 60_000;
    if (kind === "dispose") {
      h.controller.dispose();
      h.port.dispose();
    }
    release.resolve();
    await pending;
    expect(h.fetcher).toHaveBeenCalledTimes(2);
    if (kind === "dispose")
      expect(h.controller.getSnapshot().proposal).toBeNull();
    else {
      expect(h.controller.getSnapshot()).toMatchObject({
        problem: "access-lost",
        proposal: null,
        execution: null,
      });
      expect(h.lost).toEqual([true]);
    }
    expect(await h.port.startNew(h.proposal.handle, signal())).toMatchObject({
      ok: false,
    });
    h.controller.dispose();
    h.port.dispose();
  },
);
