import { installPlatform } from "./command-recovery-platform";
installPlatform();
import "./command-recovery-platform";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionHostController } from "../src/shared/meri-actions/host-controller";
import { actionQueryJournal } from "../src/shared/meri-actions/query-journal";
import { accepted, clock, context, fixture } from "./meri-action-fixtures";

const credential = `action_session_${"s".repeat(43)}`;
const serverContext = {
  tenantId: context.tenantId,
  actorId: context.actorId,
  conversationId: context.conversationId,
  runId: context.runId,
  selectedClientId: context.clientId,
};
const hosts: ActionHostController[] = [];
const clients: QueryClient[] = [];
function setup(client = new QueryClient()) {
  clients.push(client);
  let now = clock;
  const queue: Array<string | (() => Promise<Response>)> = [];
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const hints = {
    conversationId: context.conversationId,
    clientId: context.clientId,
  };
  const session = () =>
    Response.json({
      credential,
      expiresAtMs: now + 60_000,
      context: serverContext,
    });
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init: init! });
    const next = queue.shift();
    if (typeof next === "function") return next();
    if (next === "session") return session();
    if (!next) throw new Error("Unexpected synthetic host request");
    const value = fixture(next);
    return Response.json(value.response, { status: value.httpStatus });
  }) as typeof fetch;
  const host = new ActionHostController({
    hints,
    journal: (value) => actionQueryJournal(client, value),
    now: () => now,
    fetcher,
  });
  hosts.push(host);
  return {
    host,
    client,
    queue,
    requests,
    hints,
    session,
    setNow: (value: number) => {
      now = value;
    },
  };
}
function ready(host: ActionHostController) {
  const snapshot = host.getSnapshot();
  expect(snapshot.status).toBe("ready");
  if (snapshot.status !== "ready")
    throw new Error("Expected synthetic connection");
  return snapshot;
}
async function connect(h: ReturnType<typeof setup>) {
  const detach = h.host.attach();
  h.queue.push("session");
  await h.host.connect();
  return { detach, ...ready(h.host) };
}
async function proposal(h: ReturnType<typeof setup>) {
  const { port } = ready(h.host);
  h.queue.push("query", "draft", "prepare");
  const signal = new AbortController().signal;
  const page = accepted(await port.query(signal));
  const draft = accepted(
    await port.draft(
      page.items[0]!.selection,
      { title: context.task.title, dueDate: null },
      signal,
    ),
  );
  return accepted(await port.prepare(draft.handle, signal));
}
afterEach(() => {
  for (const host of hosts.splice(0)) host.attach()();
  for (const client of clients.splice(0)) client.clear();
  vi.useRealTimers();
});

describe("Meri explicit host connection lifetime", () => {
  it("constructs, subscribes and attaches without a bootstrap request", async () => {
    const h = setup();
    const listener = vi.fn();
    const unsubscribe = h.host.subscribe(listener);
    await h.host.connect();
    const detach = h.host.attach();
    expect(h.host.getSnapshot()).toEqual({ status: "idle" });
    expect(h.requests).toEqual([]);
    expect(h.client.getQueryCache().getAll()).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    detach();
    unsubscribe();
  });
  it("captures explicit hints, dispatches bootstrap once and exposes only ready context", async () => {
    const h = setup();
    h.host.attach();
    let release!: (response: Response) => void;
    h.queue.push(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = h.host.connect();
    await h.host.connect();
    expect(h.host.getSnapshot()).toEqual({ status: "connecting" });
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]).toMatchObject({
      url: "/api/action-followthrough/session",
      init: {
        method: "POST",
        body: JSON.stringify(h.hints),
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
      },
    });
    expect(h.requests[0]!.init.headers).not.toHaveProperty("Authorization");
    release(h.session());
    await pending;
    expect(ready(h.host).lifetimeKey).toBe(JSON.stringify(serverContext));
    await h.host.connect();
    expect(h.requests).toHaveLength(1);
  });
  it("fails closed for a receipt contradicting the captured client hint", async () => {
    const h = setup();
    h.host.attach();
    h.queue.push(async () =>
      Response.json({
        credential,
        expiresAtMs: clock + 1000,
        context: {
          ...serverContext,
          selectedClientId: "abcdef00-0000-4000-8000-000000000999",
        },
      }),
    );
    await h.host.connect();
    expect(h.host.getSnapshot()).toEqual({ status: "unavailable" });
    expect(h.client.getQueryCache().getAll()).toEqual([]);
    expect(h.requests).toHaveLength(1);
  });
  it("detaches a held bootstrap, discards late receipt and permits deliberate reattachment", async () => {
    const h = setup();
    const detach = h.host.attach();
    let release!: (response: Response) => void;
    h.queue.push(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = h.host.connect();
    detach();
    await pending;
    expect(h.requests[0]!.init.signal!.aborted).toBe(true);
    expect(h.host.getSnapshot()).toEqual({ status: "idle" });
    release(h.session());
    await Promise.resolve();
    await Promise.resolve();
    expect(h.host.getSnapshot()).toEqual({ status: "idle" });
    expect(h.client.getQueryCache().getAll()).toEqual([]);
    await connect(h);
    expect(h.requests).toHaveLength(2);
  });
  it("supports StrictMode attach/detach/attach without implicit connection or old-port reuse", async () => {
    const h = setup();
    const cleanup = h.host.attach();
    cleanup();
    h.host.attach();
    expect(h.requests).toEqual([]);
    h.queue.push("session");
    await h.host.connect();
    const old = ready(h.host).port;
    h.host.attach()();
    h.host.attach();
    expect(h.host.getSnapshot()).toEqual({ status: "idle" });
    expect(await old.query(new AbortController().signal)).toEqual({
      ok: false,
      problem: "access-lost",
    });
    expect(h.requests).toHaveLength(1);
    h.queue.push("session");
    await h.host.connect();
    expect(ready(h.host).port).not.toBe(old);
    expect(h.requests).toHaveLength(2);
  });
  it("expires an idle ready connection and clears the port without another action", async () => {
    vi.useFakeTimers();
    const h = setup();
    const { port } = await connect(h);
    h.setNow(clock + 59_999);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(h.host.getSnapshot().status).toBe("ready");
    h.setNow(clock + 60_000);
    await vi.advanceTimersByTimeAsync(1);
    expect(h.host.getSnapshot()).toEqual({ status: "expired" });
    expect(await port.query(new AbortController().signal)).toEqual({
      ok: false,
      problem: "access-lost",
    });
    expect(h.requests).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("clears a ready view after an actual validated action access refusal", async () => {
    const h = setup();
    const { port } = await connect(h);
    h.queue.push("error-unauthenticated");
    expect(await port.query(new AbortController().signal)).toEqual({
      ok: false,
      problem: "access-lost",
    });
    expect(h.host.getSnapshot()).toEqual({ status: "expired" });
    expect(await port.query(new AbortController().signal)).toEqual({
      ok: false,
      problem: "access-lost",
    });
    expect(h.requests).toHaveLength(2);
  });
});

describe("Meri host availability pause and revocation", () => {
  it("requires an available client for connect and new actions without replacing a paused port", async () => {
    const h = setup();
    h.host.attach();
    h.host.setClientAvailable(false);
    await h.host.connect();
    expect(h.requests).toEqual([]);
    expect(h.host.getSnapshot()).toEqual({ status: "idle" });
    h.host.setClientAvailable(true);
    expect(h.requests).toEqual([]);
    h.queue.push("session");
    await h.host.connect();
    const before = ready(h.host);
    h.host.setClientAvailable(false);
    await h.host.connect();
    expect(await before.port.query(new AbortController().signal)).toEqual({
      ok: false,
      problem: "not-dispatched",
    });
    expect(h.requests).toHaveLength(1);
    expect(actionQueryJournal(h.client, serverContext).read()).toEqual({
      status: "idle",
    });
    h.host.setClientAvailable(true);
    expect(ready(h.host)).toBe(before);
    expect(h.requests).toHaveLength(1);
    h.queue.push("query");
    expect(
      accepted(await before.port.query(new AbortController().signal)).items,
    ).toHaveLength(1);
    expect(h.requests).toHaveLength(2);
  });
  it("withholds a held execution receipt while paused and retains uncertainty after availability returns", async () => {
    const h = setup();
    const { port } = await connect(h);
    const selected = await proposal(h);
    const before = ready(h.host);
    let release!: (response: Response) => void;
    h.queue.push(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = port.execute(selected.handle, new AbortController().signal);
    await vi.waitFor(() => expect(h.requests).toHaveLength(5));
    h.host.setClientAvailable(false);
    release(Response.json(fixture("execute-observed").response));
    expect(await pending).toEqual({ ok: false, problem: "unknown" });
    expect(ready(h.host)).toBe(before);
    expect(actionQueryJournal(h.client, serverContext).read()).toEqual({
      status: "unresolved",
      problem: "unknown",
    });
    h.host.setClientAvailable(true);
    expect(ready(h.host)).toBe(before);
    await vi.waitFor(() => expect(h.requests).toHaveLength(5));
    expect(
      await port.execute(selected.handle, new AbortController().signal),
    ).toEqual({ ok: false, problem: "unknown" });
    expect(h.requests).toHaveLength(5);
  });
  it("revokes a ready connection, aborts its authority and prevents old-port dispatch", async () => {
    vi.useFakeTimers();
    const h = setup();
    const { port } = await connect(h);
    expect(vi.getTimerCount()).toBe(1);
    h.host.revoke();
    expect(h.host.getSnapshot()).toEqual({ status: "expired" });
    expect(h.requests[0]!.init.signal!.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(await port.query(new AbortController().signal)).toEqual({
      ok: false,
      problem: "access-lost",
    });
    h.host.setClientAvailable(true);
    expect(h.host.getSnapshot()).toEqual({ status: "expired" });
    expect(h.requests).toHaveLength(1);
  });
});

describe("Meri scoped cache journal versus private host state", () => {
  it("an old journal cannot overwrite a replacement query after canonical clear", () => {
    const client = new QueryClient();
    clients.push(client);
    const old = actionQueryJournal(client, serverContext);
    old.write({ status: "pending" });
    client.clear();
    const current = actionQueryJournal(client, serverContext);
    current.write({ status: "pending" });
    old.write({ status: "unresolved", problem: "unknown" });
    expect(current.read()).toEqual({ status: "pending" });
    expect(client.getQueryCache().getAll()).toHaveLength(1);
  });
  it("retains unresolved attempts across a new host in the same context without caching credentials or drafts", async () => {
    const h = setup();
    const first = await connect(h);
    const selected = await proposal(h);
    h.queue.push("execute-indeterminate");
    expect(
      await first.port.execute(selected.handle, new AbortController().signal),
    ).toEqual({ ok: true, value: { status: "indeterminate" } });
    first.detach();
    const next = setup(h.client);
    const { port } = await connect(next);
    expect(await port.query(new AbortController().signal)).toEqual({
      ok: false,
      problem: "unknown",
    });
    expect(next.requests).toHaveLength(1);
    const cache = h.client.getQueryCache().getAll();
    expect(cache).toHaveLength(1);
    expect(cache[0]!.state.data).toEqual({
      status: "unresolved",
      problem: "unknown",
    });
    const serialized = JSON.stringify(
      cache.map((query) => ({ key: query.queryKey, data: query.state.data })),
    );
    for (const secret of [
      credential,
      context.task.title,
      "proposalId",
      "commandSha256",
      "recommendation",
      "credential",
    ])
      expect(serialized).not.toContain(secret);
  });
  it("uses a different QueryClient for a replaced identity even when server context fields match", async () => {
    const old = setup();
    await connect(old);
    actionQueryJournal(old.client, serverContext).write({
      status: "unresolved",
      problem: "unknown",
    });
    const next = setup();
    const { port } = await connect(next);
    next.queue.push("query");
    expect(
      accepted(await port.query(new AbortController().signal)).items,
    ).toHaveLength(1);
    expect(next.requests).toHaveLength(2);
    expect(actionQueryJournal(old.client, serverContext).read()).toEqual({
      status: "unresolved",
      problem: "unknown",
    });
    expect(actionQueryJournal(next.client, serverContext).read()).toEqual({
      status: "idle",
    });
  });
  it.each([
    "tenantId",
    "actorId",
    "conversationId",
    "runId",
    "selectedClientId",
  ] as const)("keeps journal metadata isolated by %s", (field) => {
    const client = new QueryClient();
    clients.push(client);
    actionQueryJournal(client, serverContext).write({
      status: "unresolved",
      problem: "stored-withheld",
    });
    expect(
      actionQueryJournal(client, {
        ...serverContext,
        [field]: "different-synthetic-scope",
      }).read(),
    ).toEqual({ status: "idle" });
    expect(actionQueryJournal(client, serverContext).read()).toEqual({
      status: "unresolved",
      problem: "stored-withheld",
    });
  });
  it("does not repopulate a canonically cleared cache when an old dispatched write settles after detachment", async () => {
    const h = setup();
    const { detach, port } = await connect(h);
    const selected = await proposal(h);
    let release!: (response: Response) => void;
    h.queue.push(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = port.execute(selected.handle, new AbortController().signal);
    await vi.waitFor(() => expect(h.requests).toHaveLength(5));
    expect(actionQueryJournal(h.client, serverContext).read()).toEqual({
      status: "pending",
    });
    h.client.clear();
    detach();
    expect(await pending).toEqual({ ok: false, problem: "unknown" });
    release(Response.json(fixture("execute-observed").response));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.client.getQueryCache().getAll()).toEqual([]);
  });
});
