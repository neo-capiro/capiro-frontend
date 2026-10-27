import { installPlatform } from "./command-recovery-platform";
installPlatform();
import { expect, it, vi } from "vitest";
import { accepted, fixture, harness, prepared } from "./meri-action-fixtures";
import {
  taskInput,
  taskResponse,
  taskWire,
  taskWorkflow,
} from "./meri-task-command-fixtures";

function native(original: unknown, prepared: unknown) {
  const value = JSON.parse(JSON.stringify(original));
  const { proposal } = JSON.parse(JSON.stringify(prepared));
  return {
    ...value,
    outcome: {
      execution: {
        kind: "native-task",
        proposalId: proposal.proposalId,
        commandSha256: proposal.commandSha256,
        idempotencyKey: proposal.command.idempotencyKey,
        binding: proposal.command.binding,
        completedAt: value.outcome.receipt.completedAt,
        approvalDecisionSha256: "a".repeat(64),
      },
      result: value.outcome.result,
    },
  };
}
const signal = () => new AbortController().signal;
it("carries the admitted create identity without an extra execution", async () => {
  const view = harness(),
    { proposal } = await prepared(view);
  const wire = native(
    fixture("execute-observed").response,
    fixture("prepare").response,
  );
  view.queue.push(async () => Response.json(wire));
  expect(
    accepted(await view.port.execute(proposal.handle, signal())),
  ).toMatchObject({
    status: "observed",
    task: {
      id: wire.outcome.result.id,
      clientId: wire.outcome.result.clientId,
    },
  });
  expect(view.requests).toHaveLength(4);
});
it("leaves legacy create result unlinked", async () => {
  const view = harness(),
    { proposal } = await prepared(view);
  view.queue.push("execute-observed");
  expect(
    accepted(await view.port.execute(proposal.handle, signal())),
  ).not.toHaveProperty("task");
});
it("recovers the same unknown update and projects only its exact native receipt", async () => {
  const wire = native(
    taskWire("observed").response,
    taskWire("prepare").response,
  );
  const calls: unknown[] = [];
  let step = 0;
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    calls.push(JSON.parse(String(init?.body)));
    if (step++ === 0) return taskResponse("prepare");
    if (step === 2) throw Error("lost acknowledgment");
    return Response.json(wire);
  });
  const first = taskWorkflow(fetcher);
  const proposal = accepted(await first.port.prepare(taskInput, signal()));
  expect(await first.port.execute(proposal.handle, signal())).toEqual({
    ok: false,
    problem: "unknown",
  });
  const next = taskWorkflow(fetcher);
  expect(accepted(await next.port.restore(signal()))).toMatchObject({
    phase: "execute",
  });
  expect(accepted(await next.port.retrySaved(signal()))).toMatchObject({
    phase: "observed",
    execution: {
      task: {
        id: wire.outcome.result.id,
        clientId: wire.outcome.result.clientId,
      },
    },
  });
  expect(calls[2]).toEqual(calls[1]);
  expect(calls).toHaveLength(3);
});
it.each(["id", "binding"])(
  "withholds the mismatched native update %s",
  async (field) => {
    const wire = native(
      taskWire("observed").response,
      taskWire("prepare").response,
    );
    if (field === "id") wire.outcome.result.id = crypto.randomUUID();
    if (field === "binding")
      wire.outcome.execution.binding.runId = crypto.randomUUID();
    let step = 0;
    const view = taskWorkflow(
      vi.fn(async () =>
        step++ === 0 ? taskResponse("prepare") : Response.json(wire),
      ),
    );
    const proposal = accepted(await view.port.prepare(taskInput, signal()));
    expect(await view.port.execute(proposal.handle, signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
  },
);
it("does not link a legacy update receipt", async () => {
  let step = 0;
  const view = taskWorkflow(
    vi.fn(async () => taskResponse(step++ === 0 ? "prepare" : "observed")),
  );
  const proposal = accepted(await view.port.prepare(taskInput, signal()));
  expect(
    accepted(await view.port.execute(proposal.handle, signal())),
  ).not.toHaveProperty("task");
});
