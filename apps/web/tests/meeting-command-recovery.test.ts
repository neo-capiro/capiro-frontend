import "./command-recovery-platform";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { installPlatform, db } from "./command-recovery-platform";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
} from "../src/shared/session/recovery/journal";
import {
  meetingCommandContract,
  meetingCommandScope,
  prepareMeetingCommand,
  runMeetingCommand,
  type MeetingAction,
  type MeetingAttempt,
  type MeetingChange,
} from "../src/features/portfolio/calendar/commands/recovery";
import { meetingReceiptSchema } from "../src/features/portfolio/calendar/commands/receipt";
installPlatform();
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = { tenantId: id(1), userId: id(2) };
const stamp = "2026-10-24T12:00:00.000Z";
const change: MeetingChange = {
  operation: "create",
  meetingId: null,
  expectedClientId: null,
  expectedRevision: null,
  meeting: {
    subject: "Synthetic",
    description: null,
    location: null,
    startsAt: stamp,
    endsAt: "2026-10-24T13:00:00.000Z",
    assignClient: true,
    clientId: id(4),
  },
  artifact: null,
  artifacts: [],
};
const scope = meetingCommandScope(actor, null);
const guard = () => {};
const current = () => readRecovery(scope, meetingCommandContract, guard);
function outcome(attempt: MeetingAttempt, refused = false) {
  return {
    schemaVersion: 1,
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    requestId: attempt.input.requestId,
    payloadDigest: attempt.payloadDigest,
    operation: attempt.input.operation,
    requestedMeetingId: attempt.input.meetingId,
    expectedClientId: attempt.input.expectedClientId,
    status: refused ? "refused" : "completed",
    result: refused
      ? null
      : {
          meetingId: attempt.input.meetingId ?? id(5),
          clientId: id(4),
          revision: stamp,
          artifacts: [],
        },
    refusal: refused
      ? {
          code: "MEETING_COMMAND_REFUSED",
          message: "Review the changed meeting.",
        }
      : null,
    createdAt: stamp,
    available: !refused,
  };
}
function fixture() {
  const state = {
    posts: [] as MeetingAttempt["input"][],
    gets: 0,
    writes: 0,
    rows: new Map<string, ReturnType<typeof outcome>>(),
    loss: "" as "" | "before" | "after",
    status: 0,
    refused: false,
    patch: {} as Record<string, unknown>,
    afterCommit: () => {},
  };
  const api = createApiClient(async (url, request) => {
    if (state.status)
      return Response.json(
        { message: "Synthetic denial" },
        { status: state.status },
      );
    let row;
    if (request?.method === "POST") {
      const input = JSON.parse(String(request.body)) as MeetingAttempt["input"];
      state.posts.push(input);
      if (state.loss === "before") {
        state.loss = "";
        throw Error("request lost");
      }
      const digest = createHash("sha256")
        .update(
          JSON.stringify([
            "meeting-command",
            1,
            actor.tenantId,
            actor.userId,
            input,
          ]),
        )
        .digest("hex");
      row = state.rows.get(input.requestId);
      if (row && row.payloadDigest !== digest)
        return Response.json({}, { status: 409 });
      if (!row) {
        if (!state.refused) state.writes++;
        row = outcome({ input, payloadDigest: digest }, state.refused);
        state.rows.set(input.requestId, row);
      }
      state.afterCommit();
      if (state.loss === "after") {
        state.loss = "";
        throw Error("response lost");
      }
    } else {
      state.gets++;
      row = state.rows.get(String(url).split("/").at(-1)!);
    }
    return row
      ? Response.json({ ...row, ...state.patch })
      : Response.json({}, { status: 404 });
  });
  const observed: Array<MeetingAttempt | null> = [];
  const authorized: string[] = [];
  const run = (action: MeetingAction, signal = new AbortController().signal) =>
    runMeetingCommand(
      api,
      actor,
      null,
      action,
      guard,
      signal,
      (value) => observed.push(value),
      async () => {
        authorized.push(action.kind);
      },
    );
  return {
    state,
    run,
    observed,
    authorized,
    save: () => run({ kind: "save", change }),
  };
}
it("retains normalized input until explicit acknowledgement of a fresh exact result", async () => {
  const f = fixture();
  expect(await f.save()).toMatchObject({ status: "completed" });
  const saved = (await current())!;
  expect(saved.input.meeting?.subject).toBe("Synthetic");
  await expect(f.save()).rejects.toMatchObject({ status: 409 });
  await f.run({ kind: "done", expected: saved });
  expect(await current()).toBeNull();
  expect(f.state.gets).toBe(1);
  await f.save();
  expect(f.state.writes).toBe(2);
  expect(f.state.posts[0]!.requestId).not.toBe(f.state.posts[1]!.requestId);
});
it.each(["before", "after"] as const)(
  "recovers %s-commit loss after rehydration using the original key",
  async (loss) => {
    const f = fixture();
    f.state.loss = loss;
    await expect(f.save()).rejects.toThrow();
    const saved = (await current())!;
    if (loss === "before") {
      await expect(
        f.run({ kind: "check", expected: saved }),
      ).rejects.toMatchObject({ status: 404 });
      expect(await current()).toEqual(saved);
      await f.run({ kind: "retry", expected: saved });
      expect(f.state.posts).toEqual([saved.input, saved.input]);
    } else {
      await f.run({ kind: "check", expected: saved });
      expect(f.state.posts).toHaveLength(1);
    }
    expect(f.state.writes).toBe(1);
    await f.run({ kind: "done", expected: saved });
    expect(await current()).toBeNull();
  },
);
it.each([400, 401, 403, 404, 409, 422, 500, 502])(
  "generic HTTP %s never releases a retained action",
  async (status) => {
    const f = fixture();
    f.state.status = status;
    await expect(f.save()).rejects.toThrow();
    const saved = (await current())!;
    await expect(f.run({ kind: "review", expected: saved })).rejects.toThrow();
    expect(await current()).toEqual(saved);
  },
);
it("only an exact stored refusal permits returning to review", async () => {
  const f = fixture();
  f.state.refused = true;
  expect(await f.save()).toMatchObject({ status: "refused" });
  const saved = (await current())!;
  await expect(f.run({ kind: "done", expected: saved })).rejects.toMatchObject({
    status: 409,
  });
  await f.run({ kind: "retry", expected: saved });
  expect(f.state.writes).toBe(0);
  await f.run({ kind: "review", expected: saved });
  expect(await current()).toBeNull();
});
it.each([
  "tenantId",
  "actorUserId",
  "requestId",
  "payloadDigest",
  "operation",
  "requestedMeetingId",
  "expectedClientId",
])(
  "rejects mismatched %s receipts and retains the original draft",
  async (field) => {
    const f = fixture();
    f.state.patch = {
      [field]:
        field === "payloadDigest"
          ? "a".repeat(64)
          : field === "operation"
            ? "update"
            : id(9),
    };
    await expect(f.save()).rejects.toMatchObject({ status: 502 });
    expect(await current()).not.toBeNull();
  },
);
it("serializes two views and reconciles a stale retry to a different retained action without HTTP", async () => {
  const f = fixture();
  f.state.loss = "after";
  const pair = await Promise.allSettled([f.save(), f.save()]);
  expect(pair.map((value) => value.status)).toEqual(["rejected", "rejected"]);
  expect(f.state.posts).toHaveLength(1);
  const old = (await current())!;
  await acknowledgeRecovery(scope, old.input.requestId, guard);
  const next = await prepareMeetingCommand(actor, {
    ...change,
    meeting: { ...change.meeting!, subject: "Different reviewed action" },
  });
  await reserveRecovery(
    scope,
    next.input.requestId,
    next,
    meetingCommandContract,
    guard,
  );
  const calls = f.state.posts.length + f.state.gets;
  const admissions = f.authorized.length;
  await expect(f.run({ kind: "retry", expected: old })).rejects.toMatchObject({
    status: 409,
  });
  expect(f.observed.at(-1)).toEqual(next);
  expect(f.state.posts.length + f.state.gets).toBe(calls);
  expect(f.authorized).toHaveLength(admissions);
  expect(await current()).toEqual(next);
});
it("keeps the saved action when the session ends after commit", async () => {
  const f = fixture();
  const controller = new AbortController();
  f.state.afterCommit = () => controller.abort();
  await expect(
    f.run({ kind: "save", change }, controller.signal),
  ).rejects.toThrow();
  const saved = (await current())!;
  expect(saved).not.toBeNull();
  await f.run({ kind: "check", expected: saved });
  expect(f.state.writes).toBe(1);
});
it("never sends if recovery storage cannot retain the original action", async () => {
  const f = fixture();
  db.failWrite = true;
  await expect(f.save()).rejects.toThrow();
  expect(f.state.posts).toHaveLength(0);
});
it("keeps completion recoverable if acknowledgement fails", async () => {
  const f = fixture();
  await f.save();
  const saved = (await current())!;
  db.failWrite = true;
  await expect(f.run({ kind: "done", expected: saved })).rejects.toThrow();
  db.failWrite = false;
  expect(await current()).toEqual(saved);
  await f.run({ kind: "done", expected: saved });
  expect(f.state.writes).toBe(1);
});
it("accepts historical completion after removal without another create", async () => {
  const f = fixture();
  f.state.loss = "after";
  await expect(f.save()).rejects.toThrow();
  f.state.patch = { available: false };
  await expect(
    f.run({ kind: "done", expected: (await current())! }),
  ).resolves.toMatchObject({ available: false });
  expect(f.state.posts).toHaveLength(1);
});
it("binds the exact selected set and reviewed revisions", async () => {
  const share: MeetingChange = {
    ...change,
    operation: "share",
    meetingId: id(5),
    expectedClientId: id(4),
    expectedRevision: stamp,
    meeting: null,
    artifacts: [
      { type: "note", id: id(7), revision: stamp },
      { type: "debrief", id: id(6), revision: stamp },
    ],
  };
  const a = await prepareMeetingCommand(actor, share, id(3));
  const b = await prepareMeetingCommand(
    actor,
    { ...share, artifacts: [...share.artifacts].reverse() },
    id(3),
  );
  expect(a).toEqual(b);
  const row = {
    ...outcome(a),
    result: {
      meetingId: id(5),
      clientId: id(4),
      revision: stamp,
      artifacts: a.input.artifacts,
    },
  };
  const schema = meetingReceiptSchema(actor, a.input, a.payloadDigest);
  expect(schema.safeParse(row).success).toBe(true);
  expect(
    schema.safeParse({
      ...row,
      result: { ...row.result, artifacts: row.result.artifacts.slice(1) },
    }).success,
  ).toBe(false);
  expect(
    schema.safeParse({
      ...row,
      result: {
        ...row.result,
        artifacts: [row.result.artifacts[0], row.result.artifacts[0]],
      },
    }).success,
  ).toBe(false);
});
