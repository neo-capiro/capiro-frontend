import {
  installPlatform,
  barrier,
  db,
  local,
  locks,
} from "./command-recovery-platform";
installPlatform();
import { expect, it, vi } from "vitest";
import { cell, clock, context, fixture, harness } from "./meri-action-fixtures";
import { standaloneTaskRecovery } from "../src/shared/meri-actions/task-recovery";
import { GovernedActionWorkflow } from "../src/shared/meri-actions/workflow-adapter";
import { actionTransport } from "../src/shared/meri-actions/workflow-transport";
import { ActionWorkflowController } from "../src/features/meri/actions/action-workflow-state";

const signal = () => new AbortController().signal;
function controlled() {
  const original = harness(),
    journal = cell();
  original.port.dispose();
  let current = true,
    now = clock,
    lost = 0;
  const queue: Array<string | (() => Promise<Response>)> = [],
    requests: unknown[] = [];
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    const next = queue.shift();
    if (typeof next === "function") return next();
    if (!next) throw new Error("Unexpected synthetic request");
    const wire = fixture(next);
    return Response.json(wire.response, { status: wire.httpStatus });
  });
  const port = new GovernedActionWorkflow({
    session: original.session,
    journal,
    transport: actionTransport(original.session.credential, signal(), fetcher),
    isCurrent: () => current,
    now: () => now,
    onAccessLost: () => {
      lost++;
    },
  });
  return {
    port,
    journal,
    queue,
    requests,
    fetcher,
    session: original.session,
    lost: () => lost,
    retire: () => {
      current = false;
    },
    expire: () => {
      now += 60000;
    },
  };
}
const recovery = (h: ReturnType<typeof controlled>) =>
  standaloneTaskRecovery("create", h.session.context, () => undefined);
async function prepare(
  h: ReturnType<typeof controlled>,
  controller: ActionWorkflowController,
) {
  h.queue.push("query", "draft", "prepare");
  await controller.query();
  const selection = controller.getSnapshot().page!.items[0]!.selection;
  controller.select(controller.getSnapshot().page!.items[0]!.key);
  controller.edit({ title: context.task.title, dueDate: null });
  await controller.reviewDraft();
  const draft = controller.getSnapshot().draft!;
  await controller.prepare();
  return { selection, draft, proposal: controller.getSnapshot().proposal! };
}
async function completed() {
  const h = controlled(),
    controller = new ActionWorkflowController(h.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().checkingRecovery).toBe(false),
  );
  const handles = await prepare(h, controller);
  h.queue.push("execute-observed");
  await controller.execute();
  expect(controller.getSnapshot().execution?.status).toBe("observed");
  return { ...h, ...handles, controller };
}

it("starts another create only after exact acknowledgment, preserves the durable receipt and retires all old handles without HTTP", async () => {
  const h = await completed(),
    requestId = (h.requests[2] as { requestId: string }).requestId;
  const records = structuredClone([...db.records]);
  await h.controller.startNew(h.proposal.handle);
  expect(h.fetcher).toHaveBeenCalledTimes(4);
  expect([...db.records]).toEqual(records);
  expect(await recovery(h).acknowledged(requestId)).toBe(true);
  expect(h.controller.getSnapshot()).toMatchObject({
    stage: "idle",
    page: null,
    selected: null,
    edits: { title: "", dueDate: null },
    draft: null,
    proposal: null,
    execution: null,
  });
  expect(
    await h.port.draft(
      h.selection,
      { title: context.task.title, dueDate: null },
      signal(),
    ),
  ).toEqual({ ok: false, problem: "not-dispatched" });
  expect(await h.port.prepare(h.draft.handle, signal())).toEqual({
    ok: false,
    problem: "not-dispatched",
  });
  expect(await h.port.execute(h.proposal.handle, signal())).toEqual({
    ok: false,
    problem: "not-dispatched",
  });
  expect(await h.port.startNew(h.proposal.handle, signal())).toEqual({
    ok: false,
    problem: "not-dispatched",
  });
  expect(h.fetcher).toHaveBeenCalledTimes(4);
  await prepare(h, h.controller);
  expect((h.requests[6] as { requestId: string }).requestId).not.toBe(
    requestId,
  );
  expect(h.controller.getSnapshot().proposal?.handle).not.toBe(
    h.proposal.handle,
  );
  expect(h.controller.getSnapshot().execution).toBeNull();
  expect(h.fetcher).toHaveBeenCalledTimes(7); // Explicit query/draft/prepare only, no automatic execute.
  await h.controller.startNew(h.proposal.handle);
  expect(h.controller.getSnapshot().proposal).not.toBeNull();
  expect(h.controller.getSnapshot().problem).toBeNull();
  h.controller.dispose();
  h.port.dispose();
});

it.each(["pending", "unknown", "withheld"])(
  "keeps a %s create fenced with its exact saved command",
  async (kind) => {
    const h = controlled(),
      controller = new ActionWorkflowController(h.port);
    controller.attach();
    await vi.waitFor(() =>
      expect(controller.getSnapshot().checkingRecovery).toBe(false),
    );
    const { proposal } = await prepare(h, controller);
    h.queue.push(
      kind === "pending"
        ? "execute-approval-pending"
        : kind === "unknown"
          ? async () => {
              throw new Error("lost response");
            }
          : async () =>
              Response.json(
                {
                  error: {
                    code: "COMMAND_REFUSED",
                    outcome: "RESULT_NOT_RELEASED",
                  },
                },
                { status: 502 },
              ),
    );
    await controller.execute();
    const saved = await recovery(h).load();
    expect(saved?.executing).toBe(true);
    expect(await h.port.startNew(proposal.handle, signal())).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    expect(await recovery(h).load()).toEqual(saved);
    expect(h.fetcher).toHaveBeenCalledTimes(4);
    controller.dispose();
    h.port.dispose();
  },
);

it("recovers a lost original response before permitting an explicit new create", async () => {
  const first = controlled(),
    controller = new ActionWorkflowController(first.port);
  controller.attach();
  await vi.waitFor(() =>
    expect(controller.getSnapshot().checkingRecovery).toBe(false),
  );
  await prepare(first, controller);
  first.queue.push(async () => {
    throw new Error("lost acknowledgment");
  });
  await controller.execute();
  controller.dispose();
  first.port.dispose();
  const next = controlled(),
    restored = new ActionWorkflowController(next.port);
  restored.attach();
  await vi.waitFor(() =>
    expect(restored.getSnapshot().savedRequest).toBe(true),
  );
  const handle = restored.getSnapshot().proposal!.handle;
  await restored.startNew(handle);
  expect(next.fetcher).not.toHaveBeenCalled();
  next.queue.push("execute-observed");
  await restored.retrySaved();
  expect(next.requests[0]).toEqual(first.requests[3]);
  expect(restored.getSnapshot().execution?.status).toBe("observed");
  await restored.startNew(handle);
  expect(restored.getSnapshot().proposal).toBeNull();
  expect(next.fetcher).toHaveBeenCalledTimes(1);
  restored.dispose();
  next.port.dispose();
});

it("serializes reset behind another tab and leaves its pending create intact", async () => {
  const h = await completed(),
    entered = barrier(),
    release = barrier(),
    requestId = crypto.randomUUID();
  const other = recovery(h).lock(async () => {
    await recovery(h).reserve({
      requestId,
      context: h.session.context,
      prepare: { ...(fixture("prepare").request as object), requestId },
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
  expect((await recovery(h).load())?.requestId).toBe(requestId);
  expect(h.controller.getSnapshot().proposal?.handle).toBe(h.proposal.handle);
  expect(h.fetcher).toHaveBeenCalledTimes(4);
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
    expect(await h.port.startNew(h.proposal.handle, signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
    expect(h.fetcher).toHaveBeenCalledTimes(4);
    h.controller.dispose();
    h.port.dispose();
  },
);

it.each(["identity", "expiry", "dispose"])(
  "withholds reset after %s changes during storage read",
  async (kind) => {
    const h = await completed(),
      entered = barrier(),
      release = barrier();
    db.beforeRead = async () => {
      entered.resolve();
      await release.promise;
    };
    const pending = h.controller.startNew(h.proposal.handle);
    await entered.promise;
    if (kind === "identity") h.retire();
    if (kind === "expiry") h.expire();
    if (kind === "dispose") {
      h.controller.dispose();
      h.port.dispose();
    }
    release.resolve();
    await pending;
    expect(h.fetcher).toHaveBeenCalledTimes(4);
    if (kind !== "dispose") {
      expect(h.controller.getSnapshot()).toMatchObject({
        problem: "access-lost",
        proposal: null,
        execution: null,
      });
      expect(h.lost()).toBe(1);
    } else expect(h.controller.getSnapshot().proposal).toBeNull();
    h.controller.dispose();
    h.port.dispose();
  },
);

it.each(["identity", "expiry"])(
  "clears stale receipt after %s changes during a failing storage read",
  async (kind) => {
    const h = await completed();
    db.beforeRead = async () => {
      if (kind === "identity") h.retire();
      else h.expire();
      throw new Error("storage failed");
    };
    await h.controller.startNew(h.proposal.handle);
    expect(h.controller.getSnapshot()).toMatchObject({
      problem: "access-lost",
      proposal: null,
      execution: null,
    });
    expect(h.lost()).toBe(1);
    expect(h.fetcher).toHaveBeenCalledTimes(4);
    h.controller.dispose();
    h.port.dispose();
  },
);
