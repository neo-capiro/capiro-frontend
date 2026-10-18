import { describe, expect, it } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  type ActivityCommandInput,
  activityCommandInputSchema,
  followUpInputSchema,
  scopedCommandReceipt,
} from "../src/features/portfolio/client-profile/quick-log/command-contracts";
import {
  createActivityCommand,
  readActivityCommand,
  resumeActivityCommand,
} from "../src/features/portfolio/client-profile/quick-log/command-actions";
import {
  commandActor,
  commandAssignee,
  commandClientId,
  commandInput,
  commandReceipt,
} from "./activity-command-fixtures";

const context = {
  actor: commandActor,
  clientId: commandClientId,
  input: commandInput,
};
function wire(result: unknown, status = 200, afterOptions?: () => void) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const api = createApiClient(async (path, init) => {
    calls.push({
      path: String(path),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    const options = String(path).endsWith("/options");
    if (options) afterOptions?.();
    return new Response(JSON.stringify(options ? [commandAssignee] : result), {
      status: options ? 200 : status,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { api, calls };
}
describe("generic activity command contracts", () => {
  it("retains legacy command bodies, accepts supported commitments, and rejects unsupported task associations", () => {
    expect(activityCommandInputSchema.parse(commandInput)).toEqual(
      commandInput,
    );
    expect(
      activityCommandInputSchema.safeParse({
        ...commandInput,
        activity: {
          ...commandInput.activity,
          kind: "commitment",
          direction: "we_owe",
          counterparty: "Client team",
          occurredAt: "2025-10-17T14:00:00-04:00",
          dueAt: "2026-10-25T17:00:00-04:00",
          objectiveId: "90000000-0000-4000-8000-000000000001",
          objectiveVersion: 3,
        },
      }).success,
    ).toBe(true);
    for (const kind of ["meeting", "we_owe", "they_owe"])
      expect(
        activityCommandInputSchema.safeParse({
          ...commandInput,
          activity: { ...commandInput.activity, kind },
        }).success,
      ).toBe(false);
    expect(
      activityCommandInputSchema.safeParse({
        ...commandInput,
        activity: { ...commandInput.activity, direction: "we_owe" },
      }).success,
    ).toBe(false);
    expect(
      activityCommandInputSchema.safeParse({
        ...commandInput,
        activity: {
          ...commandInput.activity,
          objectiveId: "90000000-0000-4000-8000-000000000001",
        },
      }).success,
    ).toBe(false);
    for (const extra of [
      { clientId: commandClientId },
      { objectiveId: commandClientId },
      { counterparty: "Synthetic" },
    ])
      expect(
        activityCommandInputSchema.safeParse({
          ...commandInput,
          followUp: { ...commandInput.followUp, ...extra },
        }).success,
      ).toBe(false);
  });
  it("requires an explicit valid schedule zone and never invents a date or midnight", () => {
    expect(followUpInputSchema.parse(commandInput.followUp)).toEqual({
      assigneeUserId: commandAssignee.id,
    });
    expect(
      followUpInputSchema.safeParse({
        ...commandInput.followUp,
        dueOn: "2026-11-01",
        timeZone: "America/New_York",
        dueTime: "01:30",
      }).success,
    ).toBe(true);
    for (const fields of [
      { dueOn: "2026-11-01" },
      { timeZone: "UTC" },
      { dueTime: "14:30" },
      { dueOn: "2026-02-30", timeZone: "UTC" },
      { dueOn: "2026-11-01", timeZone: "not/a-zone" },
      { dueOn: "2026-11-01", timeZone: "UTC", dueTime: "25:00" },
    ])
      expect(
        followUpInputSchema.safeParse({ ...commandInput.followUp, ...fields })
          .success,
      ).toBe(false);
  });
  it.each([
    "tenant",
    "actor",
    "client",
    "request",
    "command-lineage",
    "assignee",
    "person",
    "receipt-version",
    "completed-without-task",
    "pending-with-task",
    "reason",
    "activity-availability",
  ])("refuses a %s receipt mismatch", (change) => {
    const receipt = commandReceipt();
    if (change === "tenant") receipt.tenantId = commandAssignee.id;
    if (change === "actor") receipt.actorUserId = commandAssignee.id;
    if (change === "client") receipt.clientId = commandAssignee.id;
    if (change === "request") receipt.requestId = commandAssignee.id;
    if (change === "command-lineage")
      receipt.followUp!.requestId = commandInput.requestId;
    if (change === "assignee")
      receipt.followUp!.assigneeUserId = commandActor.userId;
    if (change === "person") receipt.activity.personId = commandAssignee.id;
    if (change === "receipt-version")
      Object.assign(receipt, { receiptVersion: 2 });
    if (change === "completed-without-task") {
      receipt.status = "completed";
      receipt.reason = null;
      receipt.followUp!.state = "completed";
    }
    if (change === "pending-with-task")
      receipt.followUp!.taskId = "unexpected-task";
    if (change === "reason") receipt.reason = null;
    if (change === "activity-availability") receipt.activity.available = false;
    expect(
      scopedCommandReceipt(
        commandClientId,
        commandActor,
        commandInput,
      ).safeParse(receipt).success,
    ).toBe(false);
  });
  it("pins known activity/command/task identities and never accepts a lower server version", () => {
    const receipt = commandReceipt();
    receipt.status = "completed";
    receipt.reason = null;
    receipt.followUp!.state = "completed";
    receipt.followUp!.taskId = "planner-task-1";
    const schema = scopedCommandReceipt(
      commandClientId,
      commandActor,
      commandInput,
      {
        commandId: receipt.commandId,
        activityId: receipt.activity.id,
        taskId: "planner-task-1",
        version: 2,
      },
    );
    expect(schema.safeParse(receipt).success).toBe(true);
    expect(schema.safeParse({ ...receipt, version: 1 }).success).toBe(false);
    expect(
      schema.safeParse({ ...receipt, commandId: commandAssignee.id }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...receipt,
        activity: { ...receipt.activity, id: commandAssignee.id },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...receipt,
        followUp: { ...receipt.followUp, taskId: "replacement-task" },
      }).success,
    ).toBe(false);
  });
});
describe("single Core command owner and explicit recovery", () => {
  it("verifies rich activity details from the canonical timeline after a command receipt", async () => {
    const rich: ActivityCommandInput = {
      ...commandInput,
      activity: {
        ...commandInput.activity,
        kind: "commitment",
        occurredAt: "2025-10-17T14:00:00-04:00",
        dueAt: "2026-10-25T17:00:00-04:00",
        direction: "we_owe",
        counterparty: "Client counsel",
        objectiveId: "90000000-0000-4000-8000-000000000001",
        objectiveVersion: 3,
      },
    };
    const reply = commandReceipt(rich);
    const row = {
      id: reply.activity.id,
      kind: rich.activity.kind,
      title: rich.activity.title,
      body: rich.activity.body,
      personId: null,
      occurredAt: "2025-10-17T18:00:00.000Z",
      dueAt: "2026-10-25T21:00:00.000Z",
      sourceType: "activity_command",
      sourceId: reply.commandId,
      origin: "recorded",
      pinned: false,
      settledAt: null,
      direction: "we_owe",
      counterparty: "Client counsel",
      objective: {
        objectiveId: rich.activity.objectiveId,
        objectiveVersion: 3,
        objectiveRevisionId: "90000000-0000-4000-8000-000000000002",
        availability: "current",
      },
    };
    let timeline: unknown[] = [row];
    const calls: string[] = [];
    const api = createApiClient(async (path, init) => {
      const route = String(path);
      calls.push(`${init?.method ?? "GET"} ${route}`);
      const data = route.endsWith("/options")
        ? [commandAssignee]
        : route.endsWith("/activity?limit=500")
          ? timeline
          : reply;
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    });
    const run = () =>
      createActivityCommand(
        api,
        { ...context, input: rich },
        new AbortController().signal,
        () => {},
        () => {},
      );
    await expect(run()).resolves.toMatchObject({ commandId: reply.commandId });
    expect(calls).toContain(
      `GET /api/backend/core/clients/${commandClientId}/activity?limit=500`,
    );
    timeline = [{ ...row, counterparty: null }];
    await expect(run()).rejects.toThrow("details are not confirmed");
    timeline = [];
    await expect(run()).rejects.toThrow("details are not confirmed");
  });
  it("does not confirm a compound commitment when a command response omits its due instant", async () => {
    const input: ActivityCommandInput = {
      ...commandInput,
      activity: {
        ...commandInput.activity,
        kind: "commitment",
        occurredAt: "2025-10-17T14:00:00-04:00",
        dueAt: "2026-10-25T17:00:00-04:00",
      },
    };
    const receipt = commandReceipt(input);
    const api = createApiClient(async (path) => {
      const route = String(path);
      const data = route.endsWith("/options")
        ? [commandAssignee]
        : route.endsWith("/activity?limit=500")
          ? [
              {
                id: receipt.activity.id,
                kind: "commitment",
                title: input.activity.title,
                body: input.activity.body,
                personId: null,
                occurredAt: "2025-10-17T18:00:00.000Z",
                dueAt: null,
                sourceType: "activity_command",
                sourceId: receipt.commandId,
                origin: "recorded",
                pinned: false,
                settledAt: null,
              },
            ]
          : receipt;
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    });
    await expect(
      createActivityCommand(
        api,
        { ...context, input },
        new AbortController().signal,
        () => {},
        () => {},
      ),
    ).rejects.toThrow("details are not confirmed");
  });
  it("retains the exact browser key/body and makes only one command POST after a current assignee read", async () => {
    const test = wire(commandReceipt());
    const dispatched: string[] = [];
    await createActivityCommand(
      test.api,
      context,
      new AbortController().signal,
      () => {},
      () => dispatched.push("dispatched"),
    );
    expect(dispatched).toEqual(["dispatched"]);
    expect(test.calls).toEqual([
      {
        path: "/api/backend/core/client-account-owners/options",
        method: "GET",
        body: null,
      },
      {
        path: `/api/backend/core/clients/${commandClientId}/activity-commands`,
        method: "POST",
        body: commandInput,
      },
    ]);
  });
  it.each(["actor", "abort", "assignee"])(
    "sends no command after %s replacement during preflight",
    async (change) => {
      const controller = new AbortController();
      let replaced = false;
      let dispatched = false;
      const test = wire(commandReceipt(), 200, () => {
        replaced = true;
        if (change === "abort") controller.abort();
      });
      await expect(
        createActivityCommand(
          test.api,
          change === "assignee"
            ? {
                ...context,
                input: {
                  ...commandInput,
                  followUp: { assigneeUserId: commandActor.userId },
                },
              }
            : context,
          controller.signal,
          () => {
            if (change === "actor" && replaced)
              throw new Error("Actor replaced");
          },
          () => {
            dispatched = true;
          },
        ),
      ).rejects.toThrow();
      expect(test.calls.filter((call) => call.method === "POST")).toEqual([]);
      expect(dispatched).toBe(false);
    },
  );
  it.each([404, 409, 503])(
    "never retries HTTP %s or allocates a replacement command",
    async (status) => {
      const test = wire({ message: "Synthetic unavailable result" }, status);
      await expect(
        createActivityCommand(
          test.api,
          context,
          new AbortController().signal,
          () => {},
          () => {},
        ),
      ).rejects.toThrow();
      expect(test.calls.filter((call) => call.method === "POST")).toEqual([
        {
          path: `/api/backend/core/clients/${commandClientId}/activity-commands`,
          method: "POST",
          body: commandInput,
        },
      ]);
    },
  );
  it("reads the original browser key, then resumes only the latest server version without guessing its increment", async () => {
    const current = { ...commandReceipt(), version: 9 };
    const read = wire(current);
    const received = await readActivityCommand(
      read.api,
      context,
      new AbortController().signal,
      () => {},
    );
    expect(read.calls).toEqual([
      {
        path: `/api/backend/core/clients/${commandClientId}/activity-commands/${commandInput.requestId}`,
        method: "GET",
        body: null,
      },
    ]);
    const next = { ...commandReceipt(), version: 12 };
    const resume = wire(next);
    expect(
      await resumeActivityCommand(
        resume.api,
        context,
        received,
        new AbortController().signal,
        () => {},
        () => {},
      ),
    ).toEqual(next);
    expect(resume.calls).toEqual([
      {
        path: `/api/backend/core/clients/${commandClientId}/activity-commands/${commandInput.requestId}/resume`,
        method: "POST",
        body: { expectedVersion: 9 },
      },
    ]);
  });
  it.each(["active", "exhausted", "completed"])(
    "refuses %s resume state before dispatch",
    async (mode) => {
      const current = commandReceipt();
      if (mode === "active") {
        current.status = "in_progress";
        current.reason = null;
      }
      if (mode === "exhausted") current.version = 2147483647;
      if (mode === "completed") {
        current.status = "completed";
        current.reason = null;
        current.followUp!.state = "completed";
        current.followUp!.taskId = "task";
      }
      const test = wire(current);
      await expect(
        resumeActivityCommand(
          test.api,
          context,
          current,
          new AbortController().signal,
          () => {},
          () => {},
        ),
      ).rejects.toThrow();
      expect(test.calls).toEqual([]);
    },
  );
});
