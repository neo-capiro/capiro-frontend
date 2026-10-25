import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoutinesWorkspace } from "../src/features/meri/routines/RoutinesWorkspace";
import {
  installPlatform,
  db,
  local,
  barrier,
} from "./command-recovery-platform";
import { RoutineWorkflow } from "../src/shared/meri-routines/workflow";
import {
  routineRecovery,
  type SavedRoutine,
} from "../src/shared/meri-routines/recovery";
import {
  createRoutinesAccess,
  RoutinesAccessDenied,
  type RoutinesAccess,
} from "../src/shared/meri-routines/access";
import { bootstrapRoutineSession } from "../src/shared/meri-routines/session";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { proxyActionRequest } from "../src/shared/meri-actions/proxy";
import { receiveRoutinesResponse } from "@capiro/meri-contracts/routines-application";
import { receiveIntentsResponse } from "@capiro/meri-contracts/intents-application";

installPlatform();
// Retain the workspace's hook state between static renders and invoke its actual button handlers.
const view = vi.hoisted(() => ({
  values: [] as unknown[],
  index: 0,
  changed: false,
  buttons: [] as ComponentProps<typeof import("@capiro/ui/button").Button>[],
}));
vi.mock("react", async (original) => {
  const actual = await original<typeof import("react")>();
  const useState = (initial: unknown) => {
    const index = view.index++;
    if (index === view.values.length)
      view.values.push(typeof initial === "function" ? initial() : initial);
    return [
      view.values[index],
      (next: unknown) => {
        const value =
          typeof next === "function" ? next(view.values[index]) : next;
        view.changed ||= !Object.is(value, view.values[index]);
        view.values[index] = value;
      },
    ];
  };
  return {
    ...actual,
    useState,
    useRef: (initial: unknown) => useState({ current: initial })[0],
    useLayoutEffect: (effect: () => void) => effect(),
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) =>
      snapshot(),
  };
});
vi.mock("@capiro/ui/button", () => ({
  Button: (
    props: ComponentProps<typeof import("@capiro/ui/button").Button>,
  ) => {
    view.buttons.push(props);
    return createElement(
      "button",
      { disabled: props.disabled },
      props.children,
    );
  },
}));
vi.mock("../src/features/meri/routines/RoutineForm", () => ({
  RoutineForm: () => createElement("p", null, "Unsaved routine editor"),
  RoutineCancellation: () =>
    createElement("p", null, "Routine cancellation editor"),
}));
beforeEach(() => {
  view.values = [];
  view.buttons = [];
});
function renderWorkspace(port: RoutineWorkflow) {
  let html = "";
  for (let render = 0; render < 5; render++) {
    view.index = 0;
    view.buttons = [];
    view.changed = false;
    html = renderToStaticMarkup(createElement(RoutinesWorkspace, { port }));
    if (!view.changed) return html;
  }
  throw new Error("Workspace did not settle");
}
function clickRoutine(label: string) {
  const button = view.buttons.find((props) => props.children === label);
  expect(button, label).toBeDefined();
  expect(button!.disabled).not.toBe(true);
  button!.onClick!({} as never);
}
async function readWorkspace(
  port: RoutineWorkflow,
  label = "Refresh routines",
) {
  renderWorkspace(port);
  clickRoutine(label);
  await vi.waitFor(() =>
    expect(renderWorkspace(port)).not.toContain("Reading current routines"),
  );
  return renderWorkspace(port);
}
const wire = () =>
  JSON.parse(
    readFileSync(
      new URL("./fixtures/meri-routines/canonical.json", import.meta.url),
      "utf8",
    ),
  );
const f = wire();
it("admits the exact chat schedule history fixture through the public receiver", async () => {
  const result = {
    conversationId: f.context.conversationId,
    next: null,
    intents: [
      {
        deliveryId: "sdk:" + "a".repeat(64),
        createdAt: f.prepared.proposal.projection.createdAt,
        operation: { id: "schedule_task", version: "0.2.0" },
        state: "prepared",
        kind: "schedule_proposal",
        binding: {
          tenantId: f.context.tenantId,
          actorId: f.context.actorId,
          conversationId: f.context.conversationId,
          runId: f.context.runId,
          attemptId: crypto.randomUUID(),
          workerId: crypto.randomUUID(),
          writerFence: 1,
        },
        request: f.request.request,
        proposal: f.prepared.proposal,
      },
    ],
  };
  await expect(
    receiveIntentsResponse("list", 200, JSON.stringify(result), {
      request: { conversationId: f.context.conversationId },
    }),
  ).resolves.toEqual(result);
});
const signal = () => new AbortController().signal;
const journal = () => routineRecovery(f.context, () => {});
const fetcher = (
  reply: (route: string, body: unknown) => Promise<Response> | Response,
) =>
  vi.fn<typeof fetch>(async (url, init) =>
    reply(String(url).split("routine-")[1]!, JSON.parse(String(init?.body))),
  );
function workflow(fetch: typeof globalThis.fetch, context = f.context) {
  const lifetime = signal();
  return new RoutineWorkflow({
    context,
    access: createRoutinesAccess(
      "action_session_" + "a".repeat(43),
      lifetime,
      fetch,
    ),
    signal: lifetime,
    isCurrent: () => true,
  });
}
const prepared = () => Response.json(f.prepared);
async function ready(fetch: typeof globalThis.fetch) {
  const port = workflow(fetch);
  await port.load();
  await port.prepare(f.request);
  return port;
}

it("persists exact encrypted preparation before HTTP and reload only reads; explicit retry preserves requestId/body", async () => {
  const fetch = fetcher(async (_route, body) => {
    expect((await journal().load())?.prepare).toEqual(body);
    expect(
      JSON.stringify([...local.values(), ...db.records.values()]),
    ).not.toContain("Summarize authorized");
    throw new Error("lost prepare acknowledgement");
  });
  const port = await ready(fetch);
  expect(port.getSnapshot().saved?.proposal).toBeUndefined();
  const next = workflow(fetch);
  await next.load();
  expect(fetch).toHaveBeenCalledTimes(1);
  fetch.mockImplementationOnce(async () => prepared());
  await next.retryPrepare();
  expect(next.getSnapshot().saved?.proposal).toEqual(f.prepared.proposal);
  expect(JSON.parse(String(fetch.mock.calls[1]![1]?.body))).toEqual(f.request);
});

it("commits approval marker before HTTP, survives new-run reconnect and acknowledges only exact owner reconciliation", async () => {
  const fetch = fetcher(async (route) => {
    if (route === "prepare") return prepared();
    expect((await journal().load())?.approving).toBe(true);
    throw new Error("lost approval ACK");
  });
  const port = await ready(fetch);
  await port.approve();
  const next = workflow(fetch, { ...f.context, runId: crypto.randomUUID() });
  await next.load();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(next.getSnapshot().saved?.context.runId).toBe(f.context.runId);
  fetch.mockImplementationOnce(async () => Response.json(f.reconciled));
  await next.reconcile();
  expect(next.getSnapshot().saved?.result?.value).toEqual(f.reconciled);
  expect(JSON.parse(String(fetch.mock.calls[2]![1]?.body))).toEqual(
    f.reconcileRequest,
  );
  await next.finish();
  expect(await journal().load()).toBeNull();
  expect((await journal().disposition(f.request.requestId))?.state).toBe(
    "acknowledged",
  );
});

it.each([400, 403, 404, 409, 500])(
  "untyped %i never erases an uncertain approval or permits discard",
  async (status) => {
    const fetch = fetcher((route) =>
      route === "prepare"
        ? prepared()
        : Response.json({ message: "refused" }, { status }),
    );
    const port = await ready(fetch);
    await port.approve();
    await port.discard();
    expect((await journal().load())?.approving).toBe(true);
    expect(port.getSnapshot().saved?.result).toBeUndefined();
  },
);

it("a mismatched acknowledged receipt remains unresolved", async () => {
  const wrong = wire().acknowledged;
  wrong.receipt.intentId = crypto.randomUUID();
  const port = await ready(
    fetcher((route) =>
      route === "prepare" ? prepared() : Response.json(wrong),
    ),
  );
  await port.approve();
  expect(port.getSnapshot().saved?.result).toBeUndefined();
  expect((await journal().load())?.approving).toBe(true);
});

it("changed durable command is adopted without dispatch from a stale retry", async () => {
  const fetch = fetcher(() => {
    throw new Error("unknown");
  });
  const a = await ready(fetch);
  const b = workflow(fetch);
  await b.load();
  await b.discard();
  await b.prepare({
    ...f.request,
    requestId: crypto.randomUUID(),
    request: {
      ...f.request.request,
      taskInstruction: "Different reviewed work",
    },
  });
  const calls = fetch.mock.calls.length;
  await a.retryPrepare();
  expect(fetch).toHaveBeenCalledTimes(calls);
  expect(a.getSnapshot().saved?.prepare).toEqual(
    b.getSnapshot().saved?.prepare,
  );
});

it("cross-view approval flip prevents discarding what previously looked unapproved", async () => {
  const fetch = fetcher((route) =>
    route === "prepare"
      ? prepared()
      : Response.json(
          { error: { code: "ROUTINES_UNKNOWN", outcome: "UNKNOWN" } },
          { status: 502 },
        ),
  );
  const a = await ready(fetch),
    b = workflow(fetch);
  await b.load();
  await a.approve();
  await b.discard();
  expect(b.getSnapshot().saved?.approving).toBe(true);
  expect((await journal().load())?.approving).toBe(true);
  await expect(
    journal().discard({ ...b.getSnapshot().saved!, approving: false }),
  ).rejects.toThrow();
});

it("completed cross-view disposition clears old review without issuing another approval", async () => {
  const fetch = fetcher((route) =>
    route === "prepare" ? prepared() : Response.json(f.acknowledged),
  );
  const a = await ready(fetch),
    b = workflow(fetch);
  await b.load();
  await b.approve();
  await b.finish();
  const calls = fetch.mock.calls.length;
  await a.approve();
  expect(fetch).toHaveBeenCalledTimes(calls);
  expect(a.getSnapshot()).toMatchObject({ saved: null, settled: true });
});

it("missing or corrupt recovery cannot become an empty writable editor", async () => {
  const fetch = fetcher(prepared);
  await ready(fetch);
  db.records.clear();
  const next = workflow(fetch);
  await next.load();
  await next.prepare(f.request);
  expect(next.getSnapshot().ready).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("journal refuses altered original input, proposal, approval marker and result", async () => {
  const port = await ready(
    fetcher((route) =>
      route === "prepare" ? prepared() : Response.json(f.acknowledged),
    ),
  );
  const original = port.getSnapshot().saved!;
  await expect(
    journal().update({
      ...original,
      prepare: { ...original.prepare, requestId: crypto.randomUUID() },
    }),
  ).rejects.toThrow();
  await port.approve();
  const saved = port.getSnapshot().saved!;
  await expect(
    journal().update({ ...saved, approving: false }),
  ).rejects.toThrow();
  await expect(
    journal().update({ ...saved, result: undefined }),
  ).rejects.toThrow();
});

it("saved original conversation mismatch cannot send under another conversation", async () => {
  const fetch = fetcher(prepared);
  await ready(fetch);
  const next = workflow(fetch, {
    ...f.context,
    conversationId: crypto.randomUUID(),
  });
  await next.load();
  await next.retryPrepare();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(next.getSnapshot().ready).toBe(false);
});

it("temporary account revalidation releases local busy state and retains a late validated proposal only in its original journal", async () => {
  let current = true;
  const started = barrier(),
    release = barrier();
  const fetch = fetcher(async () => {
    started.resolve();
    await release.promise;
    return prepared();
  });
  const life = signal();
  const port = new RoutineWorkflow({
    context: f.context,
    access: createRoutinesAccess("synthetic", life, fetch),
    signal: life,
    isCurrent: () => current,
  });
  await port.load();
  const pending = port.prepare(f.request);
  await started.promise;
  current = false;
  release.resolve();
  await pending;
  expect(port.getSnapshot().busy).toBe(false);
  expect(port.getSnapshot().saved?.proposal).toBeUndefined();
  expect((await journal().load())?.proposal).toEqual(f.prepared.proposal);
  expect(
    await routineRecovery(
      { ...f.context, actorId: "replacement" },
      () => {},
    ).load(),
  ).toBeNull();
  current = true;
  await port.retryPrepare();
  expect(port.getSnapshot().saved?.proposal).toEqual(f.prepared.proposal);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("chat history for another actor never becomes a displayed approvable seed", async () => {
  const fetch = fetcher(prepared),
    life = signal();
  const port = new RoutineWorkflow({
    context: { ...f.context, actorId: "other" },
    seed: {
      requestId: f.prepared.proposal.proposalId,
      context: f.context,
      prepare: { ...f.request, requestId: f.prepared.proposal.proposalId },
      proposal: f.prepared.proposal,
      approving: false,
    },
    access: createRoutinesAccess("synthetic", life, fetch),
    signal: life,
    isCurrent: () => true,
  });
  await port.load();
  expect(port.getSnapshot()).toMatchObject({ ready: false, saved: null });
  await port.approve();
  expect(fetch).not.toHaveBeenCalled();
});

it("public list receiver accepts canonical bounded list and rejects out-of-order rows", async () => {
  const request = { limit: 20, historyLimit: 10, afterScheduleId: null };
  await expect(
    receiveRoutinesResponse("list", 200, JSON.stringify(f.listed), { request }),
  ).resolves.toEqual(f.listed);
  const invalid = wire().listed;
  invalid.page.rows.push(invalid.page.rows[0]);
  await expect(
    receiveRoutinesResponse("list", 200, JSON.stringify(invalid), { request }),
  ).rejects.toThrow();
});

function pagedRoutines() {
  const result = wire().listed;
  result.page.rows = Array.from({ length: 20 }, (_, index) => ({
    ...structuredClone(result.page.rows[0]),
    projection: {
      ...result.page.rows[0].projection,
      scheduleId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    },
  }));
  result.page.hasMore = true;
  result.page.nextAfterScheduleId =
    result.page.rows.at(-1).projection.scheduleId;
  return result;
}

it.each([401, 403])(
  "HTTP %i removes paged content and editor even with a malformed body",
  async (status) => {
    const fetch = fetcher(() => Response.json(pagedRoutines()));
    const port = workflow(fetch);
    await port.load();
    expect(await readWorkspace(port)).toContain(
      f.listed.page.rows[0].projection.destinationId,
    );
    clickRoutine("New routine");
    expect(renderWorkspace(port)).toContain("Unsaved routine editor");
    fetch.mockImplementationOnce(
      async () => new Response("not JSON", { status }),
    );
    const html = await readWorkspace(port, "Show more routines");
    expect(html).toContain("Routine access was denied");
    expect(html).not.toContain(f.listed.page.rows[0].projection.destinationId);
    expect(html).not.toContain("Recent activity");
    expect(html).not.toContain("Unsaved routine editor");
    expect(html).not.toContain("Show more routines");
    await expect(port.list()).rejects.toBeInstanceOf(RoutinesAccessDenied);
    expect(fetch).toHaveBeenCalledTimes(2);
  },
);

it("canonical denial cannot become a generic list failure or revive a saved approval", async () => {
  const admitted = await receiveRoutinesResponse(
    "list",
    403,
    JSON.stringify({ error: { code: "ROUTINES_ACCESS_DENIED" } }),
    { request: { afterScheduleId: null, limit: 20, historyLimit: 10 } },
  );
  const fetch = fetcher(prepared);
  const port = await ready(fetch);
  fetch.mockRejectedValueOnce(new Error("lost approval ACK"));
  await port.approve();
  const saved = await journal().load();
  const next = new RoutineWorkflow({
    context: f.context,
    access: { exchange: vi.fn(async () => admitted) } as RoutinesAccess,
    signal: signal(),
    isCurrent: () => true,
  });
  await next.load();
  expect(renderWorkspace(next)).toContain(f.request.request.taskInstruction);
  await expect(next.list()).rejects.toBeInstanceOf(RoutinesAccessDenied);
  await next.load();
  await next.approve();
  await next.discard();
  expect(next.getSnapshot()).toMatchObject({ accessDenied: true, saved: null });
  expect(renderWorkspace(next)).not.toContain(
    f.request.request.taskInstruction,
  );
  expect(await journal().load()).toEqual(saved);
  const recovered = workflow(fetch);
  await recovered.load();
  expect(recovered.getSnapshot().saved).toEqual(saved);
  expect(fetch).toHaveBeenCalledTimes(2);
  fetch.mockResolvedValueOnce(Response.json(f.reconciled));
  await recovered.reconcile();
  expect(recovered.getSnapshot().saved?.result?.value).toEqual(f.reconciled);
});

it.each(["network", "service"])(
  "transient %s failure preserves current rows and explicit pagination retry",
  async (failure) => {
    const page = pagedRoutines();
    const fetch = fetcher(() => Response.json(page));
    const port = workflow(fetch);
    await port.load();
    await readWorkspace(port);
    fetch.mockImplementationOnce(async () => {
      if (failure === "network") throw new Error("offline");
      return Response.json(
        { error: { code: "ROUTINES_UNAVAILABLE" } },
        { status: 503 },
      );
    });
    const html = await readWorkspace(port, "Show more routines");
    expect(html).toContain(f.listed.page.rows[0].projection.destinationId);
    expect(html).toContain(
      "Previously shown results are not current authority",
    );
    expect(port.getSnapshot().accessDenied).toBe(false);
    fetch.mockResolvedValueOnce(
      Response.json({
        ...f.listed,
        page: {
          ...f.listed.page,
          rows: [],
          hasMore: false,
          nextAfterScheduleId: null,
        },
      }),
    );
    expect(await readWorkspace(port, "Show more routines")).toContain(
      f.listed.page.rows[0].projection.destinationId,
    );
    expect(
      JSON.parse(String(fetch.mock.calls[2]![1]?.body)).afterScheduleId,
    ).toBe(page.page.nextAfterScheduleId);
  },
);

it("replacement connection cannot inherit a page, cursor or unsaved editor", async () => {
  const fetch = fetcher(() => Response.json(pagedRoutines()));
  const original = workflow(fetch);
  await original.load();
  await readWorkspace(original);
  clickRoutine("New routine");
  expect(renderWorkspace(original)).toContain("Unsaved routine editor");
  const replacement = workflow(fetch);
  await replacement.load();
  const html = renderWorkspace(replacement);
  expect(html).not.toContain(f.listed.page.rows[0].projection.destinationId);
  expect(html).not.toContain("Unsaved routine editor");
  expect(html).not.toContain("Show more routines");
  await readWorkspace(replacement);
  expect(
    JSON.parse(String(fetch.mock.calls[1]![1]?.body)).afterScheduleId,
  ).toBeNull();
});

it("denial during a held prepare fences late UI publication but retains the exact journal", async () => {
  const started = barrier(),
    release = barrier();
  const fetch = fetcher(async (route) => {
    if (route === "list")
      return Response.json(
        { error: { code: "ROUTINES_ACCESS_DENIED" } },
        { status: 403 },
      );
    started.resolve();
    await release.promise;
    return prepared();
  });
  const port = workflow(fetch);
  await port.load();
  const pending = port.prepare(f.request);
  await started.promise;
  await expect(port.list()).rejects.toBeInstanceOf(RoutinesAccessDenied);
  release.resolve();
  await pending;
  expect(port.getSnapshot()).toMatchObject({
    accessDenied: true,
    saved: null,
    busy: false,
  });
  expect(renderWorkspace(port)).not.toContain(
    f.request.request.taskInstruction,
  );
  expect((await journal().load())?.proposal).toEqual(f.prepared.proposal);
});

it("a held successful list cannot publish after a concurrent approval denial", async () => {
  const started = barrier(),
    release = barrier();
  const fetch = fetcher(async (route) => {
    if (route === "prepare") return prepared();
    if (route === "approve") return new Response("refused", { status: 401 });
    started.resolve();
    await release.promise;
    return Response.json(f.listed);
  });
  const port = await ready(fetch);
  const pending = port.list();
  await started.promise;
  await port.approve();
  release.resolve();
  await expect(pending).rejects.toBeInstanceOf(RoutinesAccessDenied);
  expect(port.getSnapshot().saved).toBeNull();
  expect((await journal().load())?.approving).toBe(true);
});

it("denial received during identity revalidation remains hidden when availability returns", async () => {
  let current = true;
  const started = barrier(),
    release = barrier();
  const fetch = fetcher(async (route) => {
    if (route === "prepare") return prepared();
    started.resolve();
    await release.promise;
    return new Response("refused", { status: 403 });
  });
  const life = signal();
  const port = new RoutineWorkflow({
    context: f.context,
    signal: life,
    isCurrent: () => current,
    access: createRoutinesAccess("synthetic", life, fetch),
  });
  await port.load();
  await port.prepare(f.request);
  const pending = port.approve();
  await started.promise;
  current = false;
  release.resolve();
  await pending;
  current = true;
  expect(port.getSnapshot()).toMatchObject({ accessDenied: true, saved: null });
  expect(renderWorkspace(port)).not.toContain(
    f.request.request.taskInstruction,
  );
  expect((await journal().load())?.approving).toBe(true);
});

it("chat preparation never automatically approves or calls prepare; an explicit approval uses the original request", async () => {
  const seed: SavedRoutine = {
    requestId: f.prepared.proposal.proposalId,
    context: f.context,
    prepare: { ...f.request, requestId: f.prepared.proposal.proposalId },
    proposal: f.prepared.proposal,
    approving: false,
  };
  const fetch = fetcher((_route, body) => {
    expect(body).toEqual(f.approval);
    return Response.json(f.acknowledged);
  });
  const life = signal();
  const port = new RoutineWorkflow({
    context: f.context,
    seed,
    access: createRoutinesAccess("synthetic", life, fetch),
    signal: life,
    isCurrent: () => true,
  });
  await port.load();
  expect(fetch).not.toHaveBeenCalled();
  await port.approve();
  expect(fetch).toHaveBeenCalledTimes(1);
  await port.finish();
  const replacement = new RoutineWorkflow({
    context: f.context,
    seed,
    access: createRoutinesAccess("synthetic", life, fetch),
    signal: life,
    isCurrent: () => true,
  });
  await replacement.load();
  expect(replacement.getSnapshot()).toMatchObject({
    saved: null,
    settled: true,
  });
});

it("reconnect selects saved conversation without expired run and fresh Core identity is mandatory", async () => {
  await ready(fetcher(prepared));
  const apiFetch = vi.fn<typeof fetch>(async () =>
    Response.json({
      user: { id: f.context.actorId, email: null },
      tenant: { id: f.context.tenantId, name: "Synthetic" },
      role: "standard_user",
    }),
  );
  const api = createApiClient(apiFetch);
  const issue = vi.fn<typeof fetch>(async (_url, init) => {
    expect(JSON.parse(String(init?.body))).toEqual({
      clientId: f.context.selectedClientId,
      conversationId: f.context.conversationId,
    });
    return Response.json({
      credential: "action_session_" + "a".repeat(43),
      expiresAtMs: Date.now() + 30_000,
      context: { ...f.context, runId: crypto.randomUUID() },
    });
  });
  await bootstrapRoutineSession({
    api,
    owner: f.context,
    signal: signal(),
    fetcher: issue,
    resolveGeneral: async () => {
      throw Error("unexpected allocation");
    },
  });
  apiFetch.mockImplementationOnce(async () =>
    Response.json({
      user: { id: "other", email: null },
      tenant: { id: f.context.tenantId, name: "Synthetic" },
      role: "standard_user",
    }),
  );
  await expect(
    bootstrapRoutineSession({
      api,
      owner: f.context,
      signal: signal(),
      fetcher: issue,
      resolveGeneral: async () => "unused",
    }),
  ).rejects.toThrow();
  expect(issue).toHaveBeenCalledTimes(1);
});

it("existing proxy permits only fixed admitted routine paths with current cookie and opaque access", async () => {
  const config = {
    enabled: true,
    baseUrl: "https://meri.synthetic.invalid",
    requestOrigin: "https://frontend.synthetic.invalid",
  };
  const upstream = vi.fn<typeof fetch>(async () => prepared());
  const req = (body: unknown, path = "routine-prepare") =>
    new Request(
      `https://frontend.synthetic.invalid/api/action-followthrough/${path}`,
      {
        method: "POST",
        headers: {
          Origin: "https://frontend.synthetic.invalid",
          "Content-Type": "application/json",
          "x-meri-action-session": "action_session_" + "a".repeat(43),
        },
        body: JSON.stringify(body),
      },
    );
  expect(
    (
      await proxyActionRequest(
        req(f.request),
        "routine-prepare",
        config,
        async () => "native",
        upstream,
      )
    ).status,
  ).toBe(200);
  expect(upstream.mock.calls[0]![0]).toBe(
    "https://meri.synthetic.invalid/api/routines/prepare",
  );
  expect(
    (
      await proxyActionRequest(
        req({ ...f.request, injected: true }),
        "routine-prepare",
        config,
        async () => "native",
        upstream,
      )
    ).status,
  ).toBe(502);
  expect(
    (
      await proxyActionRequest(
        req(f.request),
        "routine-prepare",
        config,
        async () => null,
        upstream,
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await proxyActionRequest(
        req(f.request, "routine-run"),
        "routine-run",
        config,
        async () => "native",
        upstream,
      )
    ).status,
  ).toBe(404);
  expect(upstream).toHaveBeenCalledTimes(1);
});
