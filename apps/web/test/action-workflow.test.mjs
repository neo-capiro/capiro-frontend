import test from "node:test";
import assert from "node:assert/strict";
import { ActionWorkflowController } from "../src/features/meri/actions/action-workflow-state.ts";
import { workflowProblems } from "../src/features/meri/actions/workflow-problems.ts";

const ok = (value) => ({ ok: true, value });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

function fixture(overrides = {}) {
  const selection = Object.freeze({ fixture: "selection" });
  const draftHandle = Object.freeze({ fixture: "draft" });
  const proposalHandle = Object.freeze({ fixture: "proposal" });
  const calls = [];
  const proposal = {
    handle: proposalHandle,
    reference: "synthetic-proposal",
    commandHash: "synthetic-command-hash",
    title: "Reviewed task",
    dueDate: "2026-10-20",
    expiresAt: "2026-10-13T12:00:00Z",
    approverLabel: "Separate synthetic reviewer",
  };
  const observed = {
    status: "observed",
    outcome: "succeeded",
    receiptReference: "synthetic-receipt",
    completedAt: "2026-10-13T10:00:00Z",
    taskTitle: "Reviewed task",
  };
  const port = {
    query: async (signal) => {
      calls.push({ operation: "query", signal });
      return ok({
        items: [
          {
            key: "recommendation",
            selection,
            title: "Recommended action",
            description: "Synthetic source context",
            dueDate: null,
          },
        ],
        coverageNotes: ["Partial source coverage; freshness is unknown."],
      });
    },
    draft: async (selected, edits, signal) => {
      calls.push({ operation: "draft", selected, edits, signal });
      return ok({ handle: draftHandle, ...edits });
    },
    prepare: async (draft, signal) => {
      calls.push({ operation: "prepare", draft, signal });
      return ok(proposal);
    },
    execute: async (pending, signal) => {
      calls.push({ operation: "execute", pending, signal });
      return ok(observed);
    },
    ...overrides,
  };
  return {
    controller: new ActionWorkflowController(port),
    port,
    calls,
    selection,
    draftHandle,
    proposalHandle,
    proposal,
    observed,
  };
}

async function prepare(f) {
  await f.controller.query();
  f.controller.select("recommendation");
  f.controller.edit({ title: "Reviewed task", dueDate: "2026-10-20" });
  await f.controller.reviewDraft();
  await f.controller.prepare();
}

test("query, selection and edited review prepare an immutable pending proposal without execution", async () => {
  const f = fixture();
  assert.equal(f.calls.length, 0);
  await prepare(f);
  const state = f.controller.getSnapshot();
  assert.equal(state.stage, "pending");
  assert.equal(state.execution, null);
  assert.deepEqual(
    f.calls.map((x) => x.operation),
    ["query", "draft", "prepare"],
  );
  assert.equal(f.calls[1].selected, f.selection);
  assert.deepEqual(f.calls[1].edits, {
    title: "Reviewed task",
    dueDate: "2026-10-20",
  });
  assert.equal(f.calls[2].draft, f.draftHandle);
  assert.equal(state.proposal.handle, f.proposalHandle);
  f.proposal.title = "Later mutation must not alter the reviewed proposal";
  assert.equal(state.proposal.title, "Reviewed task");
  f.controller.edit({ title: "Unapproved replacement", dueDate: null });
  f.controller.select("recommendation");
  await f.controller.reviewDraft();
  await f.controller.prepare();
  await f.controller.query();
  assert.equal(f.controller.getSnapshot().proposal.title, "Reviewed task");
  assert.equal(f.calls.length, 3);
});

test("an edit invalidates a reviewed draft and preparation cannot use its former handle", async () => {
  const f = fixture();
  await f.controller.query();
  f.controller.select("recommendation");
  await f.controller.reviewDraft();
  f.controller.edit({ title: "Changed after review", dueDate: null });
  await f.controller.prepare();
  assert.equal(f.controller.getSnapshot().draft, null);
  assert.equal(f.calls.filter((x) => x.operation === "prepare").length, 0);
  await f.controller.reviewDraft();
  assert.equal(f.controller.getSnapshot().draft.title, "Changed after review");
});

test("held draft locks the exact submitted edits and synchronous duplicate requests", async () => {
  const hold = deferred();
  let count = 0,
    submitted;
  const f = fixture({
    draft: async (_selection, edits) => {
      count++;
      submitted = edits;
      return hold.promise;
    },
  });
  await f.controller.query();
  f.controller.select("recommendation");
  f.controller.edit({ title: "Captured draft", dueDate: null });
  const request = f.controller.reviewDraft();
  await f.controller.reviewDraft();
  f.controller.edit({ title: "Late edit", dueDate: "2026-11-01" });
  assert.equal(count, 1);
  assert.deepEqual(submitted, { title: "Captured draft", dueDate: null });
  assert.equal(f.controller.getSnapshot().edits.title, "Captured draft");
  hold.resolve(ok({ handle: f.draftHandle, ...submitted }));
  await request;
  assert.equal(f.controller.getSnapshot().draft.title, "Captured draft");
});

test("execution refusal stays pending; later deliberate execution and replay use the identical handle", async () => {
  let approved = false,
    effects = 0,
    receipt;
  const handles = [];
  const f = fixture({
    execute: async (proposal) => {
      handles.push(proposal);
      if (!approved) return ok({ status: "approval-pending" });
      if (!receipt) {
        effects++;
        receipt = f.observed;
      }
      return ok(receipt);
    },
  });
  await prepare(f);
  await f.controller.execute();
  assert.equal(f.controller.getSnapshot().stage, "pending");
  assert.equal(f.controller.getSnapshot().approvalRefused, true);
  assert.equal(effects, 0);
  approved = true; // External synthetic fixture control, never a browser/port approval method.
  assert.equal(handles.length, 1);
  await f.controller.execute();
  const first = f.controller.getSnapshot().execution;
  await f.controller.execute();
  assert.deepEqual(f.controller.getSnapshot().execution, first);
  assert.equal(effects, 1);
  assert.equal(handles.length, 3);
  assert.ok(handles.every((handle) => handle === f.proposalHandle));
  assert.equal("approve" in f.port, false);
});

test("held execution admits only one click until its response settles", async () => {
  const hold = deferred();
  let count = 0;
  const f = fixture({
    execute: async () => {
      count++;
      return hold.promise;
    },
  });
  await prepare(f);
  const first = f.controller.execute();
  await f.controller.execute();
  assert.equal(count, 1);
  assert.equal(f.controller.getSnapshot().execution, null);
  hold.resolve(ok(f.observed));
  await first;
  assert.equal(
    f.controller.getSnapshot().execution.receiptReference,
    "synthetic-receipt",
  );
});

for (const outcome of [
  "unknown",
  "result-withheld",
  "stored-withheld",
  "indeterminate",
  "thrown",
])
  test(`a newer ${outcome} execution retires the former approval refusal and fences repetition`, async () => {
    const hold = deferred();
    let approved = false;
    const handles = [];
    const f = fixture({
      execute: async (proposal) => {
        handles.push(proposal);
        if (!approved) return ok({ status: "approval-pending" });
        await hold.promise;
        if (outcome === "thrown") throw new Error("PRIVATE_LATER_ERROR");
        if (outcome === "indeterminate") return ok({ status: "indeterminate" });
        return { ok: false, problem: outcome };
      },
    });
    await prepare(f);
    await f.controller.execute();
    assert.equal(f.controller.getSnapshot().approvalRefused, true);
    assert.equal(f.controller.getSnapshot().stage, "pending");
    approved = true; // Separate trusted fixture change, never a UI approval action.
    assert.equal(handles.length, 1);
    const request = f.controller.execute();
    const held = f.controller.getSnapshot();
    assert.equal(held.busy, "execute");
    await f.controller.execute();
    assert.equal(handles.length, 2);
    hold.resolve();
    await request;
    const current = f.controller.getSnapshot();
    assert.deepEqual(
      {
        whilePending: held.approvalRefused,
        afterResult: current.approvalRefused,
      },
      { whilePending: false, afterResult: false },
    );
    assert.equal(current.stage, "blocked");
    assert.equal(
      current.problem,
      outcome === "thrown" || outcome === "indeterminate" ? "unknown" : outcome,
    );
    assert.equal(current.execution, null);
    assert.equal(current.proposal.handle, f.proposalHandle);
    assert.ok(!JSON.stringify(current).includes("PRIVATE_LATER_ERROR"));
    await Promise.resolve();
    await f.controller.execute();
    await f.controller.prepare();
    await f.controller.query();
    assert.equal(handles.length, 2);
    assert.ok(handles.every((handle) => handle === f.proposalHandle));
    assert.equal("approve" in f.port, false);
  });

for (const problem of [
  "unknown",
  "result-withheld",
  "stored-withheld",
  "not-stored",
  "read-unavailable",
  "invalid-response",
  "not-dispatched",
])
  test(`${problem} does not schedule or admit a repeat and never claims successful execution`, async () => {
    let count = 0;
    const f = fixture({
      execute: async () => {
        count++;
        return { ok: false, problem };
      },
    });
    await prepare(f);
    await f.controller.execute();
    await Promise.resolve();
    await f.controller.execute();
    await f.controller.prepare();
    await f.controller.query();
    assert.equal(count, 1);
    assert.equal(f.controller.getSnapshot().stage, "blocked");
    assert.equal(f.controller.getSnapshot().problem, problem);
    assert.equal(f.controller.getSnapshot().execution, null);
    assert.equal(f.controller.getSnapshot().proposal.handle, f.proposalHandle);
    assert.ok(workflowProblems[problem].description.length > 30);
  });

test("acknowledged indeterminate result and thrown transport error both withhold success and further requests", async () => {
  for (const execute of [
    async () => ok({ status: "indeterminate" }),
    async () => {
      throw new Error("PRIVATE_RAW_ERROR");
    },
  ]) {
    const f = fixture({ execute });
    await prepare(f);
    await f.controller.execute();
    assert.equal(f.controller.getSnapshot().problem, "unknown");
    assert.equal(f.controller.getSnapshot().execution, null);
    assert.ok(
      !JSON.stringify(f.controller.getSnapshot()).includes("PRIVATE_RAW_ERROR"),
    );
  }
});

test("lost current authority removes all former recommendations, editable inputs and proposal details", async () => {
  const f = fixture({
    execute: async () => ({ ok: false, problem: "access-lost" }),
  });
  await prepare(f);
  await f.controller.execute();
  const state = f.controller.getSnapshot();
  assert.equal(state.problem, "access-lost");
  assert.equal(state.page, null);
  assert.equal(state.proposal, null);
  assert.equal(state.draft, null);
  assert.equal(state.selected, null);
  assert.equal(state.edits.title, "");
});

test("a denied current reread removes prior recommendation cards instead of treating their cache as current", async () => {
  const f = fixture();
  await f.controller.query();
  f.port.query = async () => ({ ok: false, problem: "read-unavailable" });
  await f.controller.query();
  assert.equal(f.controller.getSnapshot().page, null);
  assert.equal(f.controller.getSnapshot().stage, "blocked");
});

for (const replacement of ["actor", "tenant", "session", "client"])
  test(`${replacement} lifetime disposal aborts local observation and rejects a late former proposal`, async () => {
    const hold = deferred();
    let signal;
    const old = fixture({
      prepare: async (_draft, s) => {
        signal = s;
        return hold.promise;
      },
    });
    await old.controller.query();
    old.controller.select("recommendation");
    await old.controller.reviewDraft();
    const request = old.controller.prepare();
    old.controller.dispose();
    const current = fixture();
    assert.equal(signal.aborted, true);
    hold.resolve(ok(old.proposal));
    await request;
    assert.equal(old.controller.getSnapshot().proposal, null);
    assert.equal(current.controller.getSnapshot().proposal, null);
    await old.controller.execute();
    assert.equal(old.calls.filter((c) => c.operation === "execute").length, 0);
    await current.controller.query();
    assert.equal(current.controller.getSnapshot().stage, "recommendations");
  });

test("reattachment never resurrects a request from before disposal", async () => {
  const hold = deferred();
  const f = fixture({ query: async () => hold.promise });
  const request = f.controller.query();
  f.controller.dispose();
  f.controller.attach();
  hold.resolve(ok({ items: [], coverageNotes: ["Former scope"] }));
  await request;
  assert.equal(f.controller.getSnapshot().page, null);
  assert.equal(f.controller.getSnapshot().stage, "idle");
});

test("failed observed receipt is displayed as failure, never converted into task creation success", async () => {
  const f = fixture({
    execute: async () =>
      ok({ ...f.observed, outcome: "failed", taskTitle: null }),
  });
  await prepare(f);
  await f.controller.execute();
  assert.equal(f.controller.getSnapshot().execution.outcome, "failed");
  assert.equal(f.controller.getSnapshot().execution.taskTitle, null);
});
