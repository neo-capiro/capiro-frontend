import test from "node:test";
import assert from "node:assert/strict";
import { TaskUpdateController } from "../src/features/meri/task-updates/workflow-state.ts";

test("saved task reconciliation replaces an old proposal without executing the newly displayed request", async () => {
  let next = {
    phase: "prepare",
    fields: [{ label: "title", value: "Another saved task" }],
  };
  const controller = new TaskUpdateController({
    restore: async () => ({ ok: true, value: { phase: "proposal", proposal } }),
    retrySaved: async () => ({ ok: true, value: next }),
    prepare: () => {
      throw Error("No prepare on reconciliation");
    },
    execute: () => {
      throw Error("No execute on reconciliation");
    },
  });
  controller.attach();
  await Promise.resolve();
  assert.equal(controller.getSnapshot().proposal.reference, proposal.reference);
  await controller.retrySaved();
  assert.equal(controller.getSnapshot().proposal, null);
  assert.equal(controller.getSnapshot().savedRequest, true);
  assert.equal(
    controller.getSnapshot().recoveryFields[0].value,
    "Another saved task",
  );
  await controller.execute();
  next = { phase: "empty" };
  await controller.retrySaved();
  assert.equal(controller.getSnapshot().savedRequest, false);
  assert.equal(controller.getSnapshot().proposal, null);
});

const proposal = Object.freeze({
  handle: Object.freeze({}),
  reference: "synthetic",
  commandHash: "a".repeat(64),
  taskId: "known",
  patch: Object.freeze({ title: "Changed" }),
  expiresAt: "2026-10-12T20:00:45.000Z",
  approverLabel: "reviewer",
});
function fixture() {
  const calls = [],
    replies = [
      { status: "approval-pending" },
      {
        status: "observed",
        receiptReference: "receipt",
        completedAt: "2026-10-12T20:00:00.000Z",
        title: "Changed",
        taskStatus: "todo",
        dueDate: null,
      },
    ];
  const controller = new TaskUpdateController({
    prepare: async (input) => {
      calls.push(["prepare", input]);
      return { ok: true, value: proposal };
    },
    execute: async (handle) => {
      calls.push(["execute", handle]);
      return { ok: true, value: replies.shift() };
    },
  });
  controller.edit({
    taskId: "known",
    title: "Changed",
    status: "",
    dueDate: "",
  });
  return { controller, calls };
}
test("task update controller dispatches only explicit choices and locks the immutable prepared patch", async () => {
  const { controller, calls } = fixture();
  assert.equal(calls.length, 0);
  await controller.prepare();
  assert.deepEqual(calls, [["prepare", { taskId: "known", title: "Changed" }]]);
  controller.edit({
    taskId: "other",
    title: "Tampered",
    status: "",
    dueDate: "",
  });
  assert.equal(controller.getSnapshot().draft.title, "Changed");
  await controller.prepare();
  assert.equal(calls.length, 1);
  await controller.execute();
  assert.equal(controller.getSnapshot().execution.status, "approval-pending");
  await controller.execute();
  assert.equal(controller.getSnapshot().execution.status, "observed");
  assert.equal(calls[1][1], proposal.handle);
  assert.equal(calls[2][1], proposal.handle);
});
test("a late prepared response cannot repopulate a disposed/replaced view", async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const controller = new TaskUpdateController({
    prepare: () => pending,
    execute: () => {
      throw Error("unexpected");
    },
  });
  controller.edit({
    taskId: "known",
    title: "Changed",
    status: "",
    dueDate: "",
  });
  const operation = controller.prepare();
  controller.dispose();
  controller.attach();
  release({ ok: true, value: proposal });
  await operation;
  assert.equal(controller.getSnapshot().proposal, null);
  assert.equal(controller.getSnapshot().draft.title, "");
});
test("uncertain disposition fences new writes and causes no automatic retry", async () => {
  let calls = 0;
  const controller = new TaskUpdateController({
    prepare: async () => {
      calls++;
      return { ok: false, problem: "unknown" };
    },
    execute: () => {
      throw Error("unexpected");
    },
  });
  controller.edit({
    taskId: "known",
    title: "Changed",
    status: "",
    dueDate: "",
  });
  await controller.prepare();
  await controller.prepare();
  await controller.execute();
  assert.equal(calls, 1);
  assert.equal(controller.getSnapshot().problem, "unknown");
});
