import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { taskCommandJournal } from "../src/shared/meri-task-commands/query-journal";
import { actionQueryJournal } from "../src/shared/meri-actions/query-journal";
import {
  taskInput,
  taskSession,
  taskWorkflow,
  taskResponse,
  taskWire,
  taskNow,
} from "./meri-task-command-fixtures";

const signal = () => new AbortController().signal;
describe("actual public task-command receiver and immutable proposal adapter", () => {
  it("prepares without execution; separate approval and replay keep the exact proposal", async () => {
    const replies = ["prepare", "pending", "observed", "replay"];
    const fetcher = vi.fn(async () => taskResponse(replies.shift()!));
    const { port, journal } = taskWorkflow(fetcher);
    const prepared = await port.prepare(taskInput, signal());
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(fetcher).toHaveBeenCalledOnce();
    expect(prepared.value.patch).toEqual({ title: "Updated", status: "todo" });
    expect(await port.execute(prepared.value.handle, signal())).toEqual({
      ok: true,
      value: { status: "approval-pending" },
    });
    expect(journal.read()).toEqual({ status: "idle" });
    for (let i = 0; i < 2; i++)
      expect((await port.execute(prepared.value.handle, signal())).ok).toBe(
        true,
      );
    const bodies = fetcher.mock.calls
      .slice(1)
      .map((call) =>
        JSON.parse(
          (call as unknown as [string, RequestInit])[1].body as string,
        ),
      );
    expect(bodies).toEqual([
      taskWire("observed").request,
      taskWire("observed").request,
      taskWire("observed").request,
    ]);
  });
  it("rejects forged handles without dispatch", async () => {
    const fetcher = vi.fn(async () => taskResponse("prepare"));
    const { port } = taskWorkflow(fetcher);
    expect(await port.execute({}, signal())).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects cross-run/hash/task substitution and retains uncertainty", async () => {
    for (const mutate of [
      (wire: Record<string, unknown>) => {
        const p = wire.proposal as { commandSha256: string };
        p.commandSha256 = "f".repeat(64);
      },
      (wire: Record<string, unknown>) => {
        const p = wire.proposal as {
          command: { arguments: { taskId: string } };
        };
        p.command.arguments.taskId = "00000000-0000-4000-8000-000000000099";
      },
    ]) {
      const wire = structuredClone(taskWire("prepare").response) as Record<
        string,
        unknown
      >;
      mutate(wire);
      const fetcher = vi.fn(async () => Response.json(wire));
      const { port, journal } = taskWorkflow(fetcher);
      expect(await port.prepare(taskInput, signal())).toEqual({
        ok: false,
        problem: "unknown",
      });
      expect(journal.read()).toEqual({
        status: "unresolved",
        problem: "unknown",
      });
      await port.prepare(taskInput, signal());
      expect(fetcher).toHaveBeenCalledOnce();
    }
  });
  it("keeps approval-store read failure uncertain instead of treating it as approval pending", async () => {
    const replies = ["prepare", "missingApprovalStore"];
    const fetcher = vi.fn(async () => taskResponse(replies.shift()!));
    const { port, journal } = taskWorkflow(fetcher);
    const prepared = await port.prepare(taskInput, signal());
    if (!prepared.ok) throw Error("fixture");
    expect(await port.execute(prepared.value.handle, signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
    expect(journal.read()).toEqual({
      status: "unresolved",
      problem: "unknown",
    });
    await port.execute(prepared.value.handle, signal());
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("retains uncertainty across adapters/navigation, separates recommendation attempts and clears with application scope", async () => {
    const client = new QueryClient(),
      context = taskSession().context;
    const journal = taskCommandJournal(client, context),
      actions = actionQueryJournal(client, context);
    journal.write({ status: "unresolved", problem: "unknown" });
    expect(actions.read()).toEqual({ status: "idle" });
    const fetcher = vi.fn(async () => taskResponse("prepare"));
    expect(
      await taskWorkflow(
        fetcher,
        taskCommandJournal(client, context),
      ).port.prepare(taskInput, signal()),
    ).toEqual({ ok: false, problem: "unknown" });
    expect(fetcher).not.toHaveBeenCalled();
    client.clear();
    expect(journal.read()).toEqual({
      status: "unresolved",
      problem: "access-lost",
    });
    expect(taskCommandJournal(client, context).read()).toEqual({
      status: "idle",
    });
  });
  it("does not dispatch or poison the journal when public request admission fails", async () => {
    const fetcher = vi.fn(async () => taskResponse("prepare"));
    const { port, journal } = taskWorkflow(fetcher);
    expect(
      await port.prepare(
        { ...taskInput, extraAuthority: true } as typeof taskInput,
        signal(),
      ),
    ).toEqual({ ok: false, problem: "not-dispatched" });
    expect(fetcher).not.toHaveBeenCalled();
    expect(journal.read()).toEqual({ status: "idle" });
  });
  it("bounds declared response bytes and cancels an oversized stream before accepting a proposal", async () => {
    let cancelled = false;
    const fetcher = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
          {
            headers: {
              "content-type": "application/json",
              "content-length": String(16 * 1024 * 1024 + 1),
            },
          },
        ),
    );
    const { port, journal } = taskWorkflow(fetcher);
    expect(await port.prepare(taskInput, signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
    expect(cancelled).toBe(true);
    expect(journal.read()).toEqual({
      status: "unresolved",
      problem: "unknown",
    });
  });
  it("clears the connection on current-authentication refusal even when the body is not admitted", async () => {
    const { port, lost } = taskWorkflow(
      async () =>
        new Response("untrusted", {
          status: 401,
          headers: { "content-type": "text/plain" },
        }),
    );
    expect(await port.prepare(taskInput, signal())).toEqual({
      ok: false,
      problem: "access-lost",
    });
    expect(lost).toEqual([true]);
  });
  it("rejects invalid original UTF-8 instead of accepting a replacement-decoded response", async () => {
    const { port } = taskWorkflow(
      async () =>
        new Response(new Uint8Array([0xff]), {
          headers: { "content-type": "application/json" },
        }),
    );
    expect(await port.prepare(taskInput, signal())).toEqual({
      ok: false,
      problem: "unknown",
    });
  });
  it("withholds proposals whose created/expiry times do not contain the fresh clock", async () => {
    for (const at of [taskNow - 1, taskNow + 45_001]) {
      const fetcher = vi.fn(async () => taskResponse("prepare"));
      const { port, journal } = taskWorkflow(fetcher, undefined, () => at);
      expect(await port.prepare(taskInput, signal())).toEqual({
        ok: false,
        problem: "unknown",
      });
      expect(journal.read()).toEqual({
        status: "unresolved",
        problem: "unknown",
      });
      expect(fetcher).toHaveBeenCalledOnce();
    }
  });
  it("refuses a delayed valid proposal when current client access changes during the request", async () => {
    let release!: (response: Response) => void;
    let current = true;
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetcher = vi.fn(async () => pending);
    const { port, journal, lost } = taskWorkflow(
      fetcher,
      undefined,
      undefined,
      () => current,
    );
    const request = port.prepare(taskInput, signal());
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    current = false;
    release(taskResponse("prepare"));
    expect(await request).toEqual({ ok: false, problem: "access-lost" });
    expect(lost).toEqual([true]);
    expect(journal.read()).toEqual({
      status: "unresolved",
      problem: "unknown",
    });
  });
  it.each([
    ["STORED_NOT_RELEASED", "stored-withheld", "prepare"],
    ["RESULT_NOT_RELEASED", "result-withheld", "execute"],
  ] as const)(
    "retains admitted %s when access loss clears private handles",
    async (outcome, problem, phase) => {
      let responses = phase === "execute" ? 0 : 1;
      const fetcher = vi.fn(async () =>
        responses++ === 0
          ? taskResponse("prepare")
          : Response.json(
              { error: { code: "ACCESS_DENIED", outcome } },
              { status: 403 },
            ),
      );
      const { port, journal, lost } = taskWorkflow(fetcher);
      let handle: object | null = null;
      if (phase === "execute") {
        const prepared = await port.prepare(taskInput, signal());
        if (!prepared.ok) throw Error("fixture");
        handle = prepared.value.handle;
      }
      const reply = handle
        ? await port.execute(handle, signal())
        : await port.prepare(taskInput, signal());
      expect(reply).toEqual({ ok: false, problem: "access-lost" });
      expect(journal.read()).toEqual({ status: "unresolved", problem });
      expect(lost).toEqual([true]);
      if (handle)
        expect(await port.execute(handle, signal())).toEqual({
          ok: false,
          problem: "not-dispatched",
        });
      const blocked = taskWorkflow(fetcher, journal);
      expect(await blocked.port.prepare(taskInput, signal())).toEqual({
        ok: false,
        problem,
      });
      expect(fetcher).toHaveBeenCalledTimes(phase === "execute" ? 2 : 1);
    },
  );
});
