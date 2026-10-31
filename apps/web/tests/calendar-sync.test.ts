import "./command-recovery-platform";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db, installPlatform } from "./command-recovery-platform";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { fetchOwnedCalendarConnections } from "../src/features/portfolio/calendar/sync/api";
import {
  calendarReceiptSchema,
  syncIntentSchema,
  syncRangeSchema,
  type CalendarSyncIntent,
} from "../src/features/portfolio/calendar/sync/contracts";
import {
  calendarRecoveryContract,
  calendarRecoveryScope,
  runCalendarSync,
  type CalendarAction,
} from "../src/features/portfolio/calendar/sync/recovery";
import { readRecovery } from "../src/shared/session/recovery/journal";
installPlatform();
const id = "80000000-0000-4000-8000-000000000001";
const actor = { tenantId: "tenant", userId: "user" };
const intent: CalendarSyncIntent = {
  connectionId: id,
  provider: "microsoft_365",
};
const range = {
  from: "2026-10-01T00:00:00.000Z",
  to: "2026-11-01T00:00:00.000Z",
};
const account = {
  id,
  provider: "microsoft_365",
  accountEmail: "synthetic@example.test",
  displayName: null,
  status: "connected",
  createdByUserId: actor.userId,
  lastSyncAt: null,
};
const stats = {
  scanned: 2,
  matched: 1,
  skipped: 1,
  removed: 0,
  failed: 0,
  pages: 1,
  hasMore: false,
};
const current = (identity = actor) =>
  readRecovery(
    calendarRecoveryScope(identity),
    calendarRecoveryContract,
    () => {},
  );
function fixture() {
  const state = {
    calls: [] as {
      url: string;
      method: string;
      body?: {
        schemaVersion: number;
        requestId: string;
        range: typeof range | null;
      };
    }[],
    account: { ...account },
    rows: new Map<string, unknown>(),
    loss: "" as "" | "before" | "after",
    status: 0,
    pending: false,
    patch: {} as Record<string, unknown>,
    effects: 0,
    authority: true,
    afterPreflight: () => {},
    afterCommit: () => {},
  };
  const api = createApiClient(async (input, options) => {
    const url = String(input),
      method = options?.method ?? "GET";
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    state.calls.push({ url, method, body });
    if (url.endsWith("/integrations")) {
      state.afterPreflight();
      return Response.json([state.account]);
    }
    let row;
    if (method === "POST") {
      if (state.loss === "before") {
        state.loss = "";
        throw Error("request lost");
      }
      row = state.rows.get(body.requestId);
      if (!row || (row as { status: string }).status === "pending") {
        state.effects++;
        row = {
          schemaVersion: 1,
          requestId: body.requestId,
          connectionId: id,
          provider: state.account.provider,
          payloadDigest: createHash("sha256")
            .update(
              JSON.stringify([
                1,
                actor.tenantId,
                actor.userId,
                id,
                state.account.provider,
                body.range,
              ]),
            )
            .digest("hex"),
          range: body.range,
          window: body.range ?? range,
          status: state.pending ? "pending" : "completed",
          calendar: { ...stats, pages: state.effects, hasMore: state.pending },
          createdAt: range.from,
          updatedAt: range.to,
        };
        state.rows.set(body.requestId, row);
      }
      state.afterCommit();
      if (state.loss === "after") {
        state.loss = "";
        throw Error("response lost");
      }
    } else row = state.rows.get(url.split("/").at(-1)!);
    if (state.status)
      return Response.json(
        { message: "Synthetic refusal" },
        { status: state.status },
      );
    return row
      ? Response.json({ ...(row as object), ...state.patch })
      : Response.json({}, { status: 404 });
  });
  const run = (action: CalendarAction, signal = new AbortController().signal) =>
    runCalendarSync(
      api,
      actor,
      action,
      () => {
        if (!state.authority) throw Error("Session invalidated");
      },
      signal,
      () => {},
      async () => {
        if (!state.authority) throw Error("Session invalidated");
      },
    );
  return {
    state,
    api,
    run,
    start: (change = intent) => run({ kind: "start", intent: change }),
    posts: () => state.calls.filter((c) => c.method === "POST"),
  };
}
describe("durable calendar imports", () => {
  it.each(["microsoft_365", "google_workspace"] as const)(
    "%s sends a calendar command and retains its exact request",
    async (provider) => {
      const f = fixture();
      f.state.account.provider = provider;
      const receipt = await f.start({ ...intent, provider });
      const saved = (await current())!;
      expect(receipt).toMatchObject({
        status: "completed",
        requestId: saved.requestId,
        payloadDigest: saved.payloadDigest,
      });
      expect(f.posts()[0]).toEqual({
        url: `/api/backend/core/engagement/integrations/${provider === "microsoft_365" ? "microsoft" : "google"}/${id}/calendar-commands`,
        method: "POST",
        body: { schemaVersion: 1, requestId: saved.requestId, range: null },
      });
      await expect(f.start()).rejects.toMatchObject({ status: 409 });
      await f.run({ kind: "done", expected: saved });
      expect(await current()).toBeNull();
      expect(f.posts()).toHaveLength(1);
    },
  );
  it("normalizes the reviewed Microsoft range and binds it in the receipt", async () => {
    const f = fixture();
    await f.start({
      ...intent,
      range: { from: "2026-10-01T01:00:00+01:00", to: "2026-11-01T00:00:00Z" },
    });
    expect(f.posts()[0]?.body?.range).toEqual(range);
    expect((await current())?.intent.range).toEqual(range);
  });
  it.each(["before", "after"] as const)(
    "recovers %s-commit loss after rehydration with the original request",
    async (loss) => {
      const f = fixture();
      f.state.loss = loss;
      await expect(f.start()).rejects.toThrow();
      const saved = (await current())!;
      if (loss === "before") {
        await expect(
          f.run({ kind: "check", expected: saved }),
        ).rejects.toMatchObject({ status: 404 });
        expect(await current()).toEqual(saved);
      } else
        expect(await f.run({ kind: "check", expected: saved })).toMatchObject({
          status: "completed",
        });
      expect(f.posts()).toHaveLength(1);
      await f.run({ kind: "continue", expected: saved });
      expect(f.posts().map((c) => c.body?.requestId)).toEqual([
        saved.requestId,
        saved.requestId,
      ]);
      expect(f.state.effects).toBe(1);
    },
  );
  it("pending progress requires explicit same-request continuation, never acknowledgement", async () => {
    const f = fixture();
    f.state.pending = true;
    expect(await f.start()).toMatchObject({ status: "pending" });
    const saved = (await current())!;
    await expect(
      f.run({ kind: "done", expected: saved }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await current()).toEqual(saved);
    expect(f.posts()).toHaveLength(1);
    f.state.pending = false;
    f.state.account.status = "error";
    expect(await f.run({ kind: "continue", expected: saved })).toMatchObject({
      status: "completed",
      calendar: { pages: 2 },
    });
    expect(f.posts()[1]?.body).toEqual(f.posts()[0]?.body);
  });
  it.each([400, 401, 403, 404, 409, 500])(
    "HTTP %s never clears an uncertain import",
    async (status) => {
      const f = fixture();
      f.state.status = status;
      await expect(f.start()).rejects.toMatchObject({ status });
      const saved = (await current())!;
      expect(saved).toBeTruthy();
      await expect(
        f.run({ kind: "check", expected: saved }),
      ).rejects.toMatchObject({ status });
      expect(await current()).toEqual(saved);
      expect(f.posts()).toHaveLength(1);
    },
  );
  it.each([
    { connectionId: "80000000-0000-4000-8000-000000000002" },
    { payloadDigest: "0".repeat(64) },
    { provider: "google_workspace" },
    { range },
    { status: "completed", calendar: { ...stats, hasMore: true } },
  ])(
    "rejects mismatched or dishonest receipts without losing the request: %j",
    async (patch) => {
      const f = fixture();
      f.state.patch = patch;
      await expect(f.start()).rejects.toThrow();
      expect(await current()).toBeTruthy();
      expect(f.posts()).toHaveLength(1);
    },
  );
  it("storage failure prevents dispatch", async () => {
    const f = fixture();
    db.failWrite = true;
    await expect(f.start()).rejects.toThrow();
    expect(f.posts()).toHaveLength(0);
  });
  it("changed authority after preflight prevents dispatch", async () => {
    const f = fixture();
    f.state.afterPreflight = () => {
      f.state.authority = false;
    };
    await expect(f.start()).rejects.toThrow("Session invalidated");
    expect(f.posts()).toHaveLength(0);
    expect(await current()).toBeNull();
  });
  it("changed authority or abort after commit preserves recovery and hides the receipt", async () => {
    const f = fixture();
    f.state.afterCommit = () => {
      f.state.authority = false;
    };
    await expect(f.start()).rejects.toThrow("Session invalidated");
    expect(await current()).toBeTruthy();
    expect(f.posts()).toHaveLength(1);
  });
  it("abort after dispatch preserves recovery", async () => {
    const f = fixture(),
      controller = new AbortController();
    f.state.afterCommit = () => controller.abort();
    await expect(
      f.run({ kind: "start", intent }, controller.signal),
    ).rejects.toThrow();
    expect(await current()).toBeTruthy();
  });
  it("another actor cannot read this retained import", async () => {
    const f = fixture();
    await f.start();
    expect(await current({ ...actor, userId: "another" })).toBeNull();
    expect(await current({ ...actor, tenantId: "another" })).toBeNull();
  });
  it("cross-tab duplicate starts serialize to one provider request", async () => {
    const f = fixture();
    const results = await Promise.allSettled([f.start(), f.start()]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(f.posts()).toHaveLength(1);
  });
  it.each([
    { provider: "google_workspace" },
    { status: "disabled" },
    { status: "error" },
    { createdByUserId: "other" },
  ])("rejects changed/unowned accounts before dispatch: %j", async (patch) => {
    const f = fixture();
    Object.assign(f.state.account, patch);
    await expect(f.start()).rejects.toThrow();
    expect(f.posts()).toHaveLength(0);
  });
  it("owned connection list rejects a different creator", async () => {
    const f = fixture();
    // B3: the guard now fires on a STATED different owner and uses one accurate
    // message instead of the schema's generic "unexpected response".
    await expect(
      fetchOwnedCalendarConnections(f.api, "other-user"),
    ).rejects.toThrow(/did not match your account/i);
  });
  it("validates explicit bounds, Google range prohibition, and cumulative page counts", () => {
    expect(syncRangeSchema.safeParse(range).success).toBe(true);
    expect(
      syncRangeSchema.safeParse({ ...range, to: range.from }).success,
    ).toBe(false);
    expect(
      syncRangeSchema.safeParse({ ...range, to: "2030-01-01T00:00:00Z" })
        .success,
    ).toBe(false);
    expect(
      syncRangeSchema.safeParse({ ...range, from: "2026-10-01" }).success,
    ).toBe(false);
    expect(
      syncIntentSchema.safeParse({
        ...intent,
        provider: "google_workspace",
        range,
      }).success,
    ).toBe(false);
    expect(
      calendarReceiptSchema.safeParse({
        schemaVersion: 1,
        requestId: id,
        connectionId: id,
        provider: intent.provider,
        payloadDigest: "0".repeat(64),
        range: null,
        window: range,
        status: "completed",
        calendar: { ...stats, pages: 24 },
        createdAt: range.from,
        updatedAt: range.to,
      }).success,
    ).toBe(true);
  });
});
