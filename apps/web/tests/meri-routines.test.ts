import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// The platform module registers the mocked recovery storage, so it is imported before anything that
// reaches the journal at runtime: the routine host and cards below import the workflow, which does.
import {
  installPlatform,
  db,
  local,
  barrier,
} from "./command-recovery-platform";
import { RoutinesWorkspace } from "../src/features/meri/routines/RoutinesWorkspace";
import { MeriRoutinesHost } from "../src/features/meri/routines/MeriRoutinesHost";
import { RoutineReview } from "../src/features/meri/routines/RoutineReview";
import { ConversationRoutine } from "../src/features/meri/routines/ConversationRoutine";
import { ConversationHostController } from "../src/shared/meri-conversations/host-controller";
import type { IntentsAccess } from "../src/shared/meri-intents/access";
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
import { receiveRoutinesResponse as receiveCanonical } from "../src/shared/meri-routines/canonical-receiver";
import { receiveIntentsResponse } from "@capiro/meri-contracts/intents-application";

installPlatform();
// Retain the workspace's hook state between static renders and invoke its actual button handlers.
const view = vi.hoisted(() => ({
  values: [] as unknown[],
  index: 0,
  changed: false,
  captureEffects: false,
  effects: [] as Array<() => void | (() => void)>,
  buttons: [] as ComponentProps<typeof import("@capiro/ui/button").Button>[],
}));
// The static render harness has no providers: the routine host reads these four, nothing else.
const providers = vi.hoisted(() => ({
  identity: undefined as unknown,
  selected: undefined as unknown,
  api: undefined as unknown,
  capiro: undefined as unknown,
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
  // One cached value per hook slot, exactly as useState above: the production dependency lists are stable.
  const useMemo = (factory: () => unknown) => {
    const index = view.index++;
    if (index === view.values.length) view.values.push(factory());
    return view.values[index];
  };
  // A static render never runs effects; only a test that asks for them drives this one.
  const useEffect = (effect: () => void | (() => void)) => {
    if (view.captureEffects) view.effects.push(effect);
  };
  return {
    ...actual,
    useState,
    useMemo,
    useEffect,
    useRef: (initial: unknown) => useState({ current: initial })[0],
    useLayoutEffect: (effect: () => void) => effect(),
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) =>
      snapshot(),
  };
});
// MeriRoutinesHost's four providers; every other routine path is exercised for real.
vi.mock("../src/shared/portfolio/auth/identity", async (original) => {
  const actual =
    await original<typeof import("../src/shared/portfolio/auth/identity")>();
  return {
    ...actual,
    useIdentity: () =>
      providers.identity as unknown as ReturnType<typeof actual.useIdentity>,
  };
});
vi.mock("../src/shared/session/SelectedClient", async (original) => {
  const actual =
    await original<typeof import("../src/shared/session/SelectedClient")>();
  return {
    ...actual,
    useSelectedClient: () =>
      providers.selected as unknown as ReturnType<
        typeof actual.useSelectedClient
      >,
  };
});
vi.mock("../src/shared/portfolio/api/provider", async (original) => {
  const actual =
    await original<typeof import("../src/shared/portfolio/api/provider")>();
  return {
    ...actual,
    useApi: () => providers.api as unknown as ReturnType<typeof actual.useApi>,
  };
});
vi.mock("../src/shared/capiro/CapiroBoundary", async (original) => {
  const actual =
    await original<typeof import("../src/shared/capiro/CapiroBoundary")>();
  return {
    ...actual,
    useCapiro: () =>
      providers.capiro as unknown as ReturnType<typeof actual.useCapiro>,
  };
});
// These retained lifecycle fixtures use non-UUID tenant/actor aliases. Mock the
// unchanged Core bootstrap resolver here; cold session binding is covered separately.
vi.mock("../src/shared/meri-conversations/first-chat-bootstrap", () => ({
  resolveFirstChatConversation: async () => ({
    conversationId: f.context.conversationId,
    clientId: f.context.selectedClientId,
  }),
}));
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
/**
 * MR-04 SOURCE-STAGE QUALIFICATION. This suite qualifies the canonical receiving boundary the observation opt-in, the
 * facet and the two renewal routes belong to. The installed `@capiro/meri-contracts@0.1.26` is immutable until the new
 * cohort and can admit none of them, so the frontend resolves that boundary in exactly one module and the suite points
 * that module at the source-stage bundle named by MERI_SOURCE_STAGE_ROUTINES_RECEIVER. Production keeps the published
 * package; no private path is imported and no package, lockfile or vendor directory is written.
 */
const sourceStage = vi.hoisted(
  () => process.env.MERI_SOURCE_STAGE_ROUTINES_RECEIVER ?? "",
);
vi.mock("../src/shared/meri-routines/canonical-receiver", async () => {
  if (!sourceStage)
    throw new Error(
      "MERI_SOURCE_STAGE_ROUTINES_RECEIVER must name the source-stage routines receiver bundle",
    );
  return await import(/* @vite-ignore */ sourceStage);
});
beforeEach(() => {
  view.values = [];
  view.buttons = [];
  view.captureEffects = false;
  view.effects = [];
});
/** Runs the effects a test captured, once, at the point the real renderer would have. */
function runEffects() {
  const effects = view.effects;
  view.effects = [];
  for (const effect of effects) effect();
}
function renderWorkspace(
  port: RoutineWorkflow,
  options: Partial<ComponentProps<typeof RoutinesWorkspace>> = {},
) {
  let html = "";
  for (let render = 0; render < 5; render++) {
    view.index = 0;
    view.buttons = [];
    view.changed = false;
    html = renderToStaticMarkup(
      createElement(RoutinesWorkspace, { port, ...options }),
    );
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
  expect(next.getSnapshot().saved?.context).toMatchObject({
    runId: f.context.runId,
  });
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

it("the installed receiver still admits the legacy list shape and the canonical boundary admits the observed one", async () => {
  const request = { limit: 20, historyLimit: 10, afterScheduleId: null };
  // The installed published receiver admits the exact legacy shape: the facet is a requested answer, never a default.
  const legacy = wire().listed;
  for (const row of legacy.page.rows) delete row.consent;
  await expect(
    receiveRoutinesResponse("list", 200, JSON.stringify(legacy), { request }),
  ).resolves.toEqual(legacy);
  // The canonical boundary admits the same rows with the observation this read asks for, and refuses a facet nobody
  // asked for or an out-of-order page.
  const observed = { ...request, observation: "consent" as const };
  await expect(
    receiveCanonical("list", 200, JSON.stringify(f.listed), { request: observed }),
  ).resolves.toEqual(f.listed);
  await expect(
    receiveCanonical("list", 200, JSON.stringify(f.listed), { request }),
  ).rejects.toThrow();
  const invalid = wire().listed;
  invalid.page.rows.push(invalid.page.rows[0]);
  await expect(
    receiveCanonical("list", 200, JSON.stringify(invalid), { request: observed }),
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
    const html = await readWorkspace(port, "Load more");
    expect(html).toContain("Routine access was denied");
    expect(html).not.toContain(f.listed.page.rows[0].projection.destinationId);
    expect(html).not.toContain("Recent activity");
    expect(html).not.toContain("Unsaved routine editor");
    expect(html).not.toContain("Load more");
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
    const html = await readWorkspace(port, "Load more");
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
    expect(await readWorkspace(port, "Load more")).toContain(
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
  expect(html).not.toContain("Load more");
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
    resolveConversation: async () => {
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
      resolveConversation: async () => "unused",
    }),
  ).rejects.toThrow();
  expect(issue).toHaveBeenCalledTimes(1);
});

/**
 * One conversation session lifetime, two real routine consumers and the real host. Everything except
 * the four React providers above is the production path: transport, workflow, journal and views.
 */
function conversationReceipt() {
  return {
    credential: "action_session_" + "a".repeat(43),
    expiresAtMs: Date.now() + 60_000,
    context: f.context,
  };
}
/** ConversationRoutine.tsx:34-38 composes exactly this from the shared connection it is handed. */
function conversationConsumer(
  connection: NonNullable<IntentsAccess["routines"]>,
  proposalId: string,
) {
  return new RoutineWorkflow({
    ...connection,
    seed: {
      requestId: proposalId,
      context: {
        ...f.context,
        selectedClientId: connection.context.selectedClientId,
      },
      prepare: { ...f.request, requestId: proposalId },
      proposal: { ...f.prepared.proposal, proposalId },
      approving: false,
    },
    isCurrent: () => !connection.signal.aborted,
  });
}
function renderReview(port: RoutineWorkflow) {
  view.index = 0;
  view.buttons = [];
  view.changed = false;
  return renderToStaticMarkup(createElement(RoutineReview, { port }));
}
function scheduleItem(proposalId: string) {
  return {
    deliveryId: "sdk:" + "b".repeat(64),
    createdAt: f.prepared.proposal.projection.createdAt,
    operation: { id: "schedule_task", version: "0.2.0" } as const,
    state: "prepared" as const,
    kind: "schedule_proposal" as const,
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
    proposal: { ...f.prepared.proposal, proposalId },
  };
}
const account = () => ({
  user: { id: f.context.actorId, email: null },
  tenant: { id: f.context.tenantId, name: "Synthetic" },
  role: "standard_user",
});
function conversationHost(fetcher: typeof fetch) {
  return new ConversationHostController({
    hints: { clientId: f.context.selectedClientId },
    account: { tenantId: f.context.tenantId, actorId: f.context.actorId },
    fetcher,
  });
}
function readyConnection(host: ConversationHostController) {
  const snapshot = host.getSnapshot();
  if (snapshot.status !== "ready") throw new Error(snapshot.status);
  const connection = snapshot.port.intents.routines;
  if (!connection) throw new Error("Routine connection is missing");
  return connection;
}
/** The actual standalone host: its own composition, its own issuance, no test-local port factory. */
function routineAccount() {
  return account();
}
type HostHarness = {
  calls: { path: string; body: unknown }[];
  setReply: (reply: (route: string, body: unknown) => Response) => void;
};
function hostHarness(): HostHarness {
  const calls: { path: string; body: unknown }[] = [];
  vi.stubGlobal("window", { sessionStorage: localStorage });
  providers.api = createApiClient(
    vi.fn(async () =>
      Response.json(routineAccount()),
    ) as unknown as typeof fetch,
  );
  providers.selected = {
    state: "authorized-client",
    requestedId: f.context.selectedClientId,
    client: { name: "Synthetic client" },
  };
  providers.identity = {
    data: routineAccount(),
    error: null,
    isFetching: false,
  };
  providers.capiro = {
    request: async () => {
      throw new Error("The general routine context is not enabled.");
    },
  };
  let reply: (route: string, body: unknown) => Response = () =>
    new Response("refused", { status: 403 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url);
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ path, body });
      if (path === "/api/action-followthrough/session")
        return Response.json(conversationReceipt());
      if (path === "/api/action-followthrough/routine-session")
        return Response.json({
          kind: "routine-management",
          credential: `routine_session_${"m".repeat(43)}`,
          expiresAtMs: Date.now() + 30_000,
          context: {
            tenantId: f.context.tenantId,
            actorId: f.context.actorId,
            selectedClientId: body.clientId,
          },
        });
      return reply(
        path.replace("/api/action-followthrough/routine-", ""),
        body,
      );
    }),
  );
  return { calls, setReply: (next) => (reply = next) };
}
const issuances = (h: HostHarness) =>
  h.calls.filter(
    (call) => call.path === "/api/action-followthrough/routine-session",
  ).length;
const routineCalls = (h: HostHarness) =>
  h.calls.filter(
    (call) =>
      call.path.includes("/routine-") &&
      !call.path.endsWith("/routine-session"),
  );
function renderHost() {
  view.index = 0;
  view.buttons = [];
  view.changed = false;
  return renderToStaticMarkup(
    createElement(MeriRoutinesHost, { enabled: true, generalEnabled: false }),
  );
}
/** The host settles its visible workspace from state it derives during a render pass. */
function hostMarkup(passes = 3) {
  let html = "";
  for (let pass = 0; pass < passes; pass++) html = renderHost();
  return html;
}
function hostButton(label: string) {
  return view.buttons.find((props) => props.children === label);
}
function clickHost(label: string) {
  const button = hostButton(label);
  expect(button, label).toBeDefined();
  expect(button!.disabled).not.toBe(true);
  button!.onClick!({} as never);
}

it("cold General management connects without entering first chat even when General execution is disabled", async () => {
  const h = hostHarness();
  providers.selected = { state: "no-selection" };
  view.captureEffects = true;
  renderHost();
  runEffects();
  clickHost("Connect routines");
  await vi.waitFor(() => {
    hostMarkup();
    expect(hostButton("Connect routines")).toBeUndefined();
  });
  expect(h.calls).toEqual([
    {
      path: "/api/action-followthrough/routine-session",
      body: { clientId: null },
    },
  ]);
});

it("management editing affordances explicitly request the existing execution connection and do not prepare work", async () => {
  const context = {
      kind: "routine-management",
      tenantId: f.context.tenantId,
      actorId: f.context.actorId,
      selectedClientId: f.context.selectedClientId,
    },
    fetch = fetcher(() => Response.json(f.listed)),
    port = workflow(fetch, context),
    requestEditing = vi.fn();
  await port.load();
  await readWorkspace(port);
  const html = renderWorkspace(port, { onRequestExecution: requestEditing });
  expect(html).toContain("Create or edit routines");
  clickRoutine("Create or edit routines");
  expect(requestEditing).toHaveBeenCalledWith();
  expect(fetch).toHaveBeenCalledOnce();
  expect(port.getSnapshot().saved).toBeNull();
  renderWorkspace(port, { onRequestExecution: requestEditing });
  clickRoutine("Open routine");
  expect(requestEditing).toHaveBeenLastCalledWith(
    f.listed.page.rows[0].projection.scheduleId,
  );
  expect(fetch).toHaveBeenCalledOnce();
});

it("a refused routine action retires the exact standalone connection so explicit Connect issues fresh access without reposting the saved approval", async () => {
  const harness = hostHarness();
  view.captureEffects = true;
  renderHost();
  runEffects();
  clickHost("Connect routines");
  await vi.waitFor(() => {
    hostMarkup();
    expect(hostButton("Connect routines")).toBeUndefined();
  });
  expect(issuances(harness)).toBe(1);
  expect(routineCalls(harness)).toHaveLength(0);
  // The exact pending approval this connection retained, which a reconnect must never resend from.
  await journal().reserve({
    requestId: f.request.requestId,
    context: f.context,
    prepare: f.request,
    proposal: f.prepared.proposal,
    approving: true,
  } satisfies SavedRoutine);
  harness.setReply(() => new Response("not JSON", { status: 403 }));
  clickHost("Refresh routines");
  await vi.waitFor(() =>
    expect(hostMarkup()).toContain("Routine access was denied"),
  );
  // The refusal retires the exact lifetime: the promised reconnect is available and issues again.
  expect(hostButton("Connect routines")?.disabled).toBe(false);
  expect(issuances(harness)).toBe(1);
  clickHost("Connect routines");
  await vi.waitFor(() => expect(issuances(harness)).toBe(2));
  // Fresh access is issued by the explicit click only; the refused action and the saved approval are not replayed.
  expect(routineCalls(harness)).toHaveLength(1);
  expect(routineCalls(harness)[0]!.path).toBe(
    "/api/action-followthrough/routine-list",
  );
  const retained = (await journal().load()) satisfies SavedRoutine | null;
  expect(retained?.approving).toBe(true);
  expect(retained?.proposal?.proposalId).toBe(f.prepared.proposal.proposalId);
});

it("a transient read failure and a paused client keep the connected routine session and its current-owner rows", async () => {
  const harness = hostHarness();
  view.captureEffects = true;
  renderHost();
  runEffects();
  clickHost("Connect routines");
  await vi.waitFor(() => {
    hostMarkup();
    expect(hostButton("Connect routines")).toBeUndefined();
  });
  harness.setReply(() => Response.json(pagedRoutines()));
  clickHost("Refresh routines");
  await vi.waitFor(() =>
    expect(hostMarkup()).toContain(
      f.listed.page.rows[0].projection.destinationId,
    ),
  );
  harness.setReply(() =>
    Response.json({ error: { code: "ROUTINES_UNAVAILABLE" } }, { status: 503 }),
  );
  clickHost("Refresh routines");
  await vi.waitFor(() =>
    expect(hostMarkup()).toContain(
      "Previously shown results are not current authority",
    ),
  );
  expect(hostMarkup()).toContain(
    f.listed.page.rows[0].projection.destinationId,
  );
  expect(hostButton("Connect routines")).toBeUndefined();
  expect(issuances(harness)).toBe(1);
  // A paused client hides current rows and admits no new action without retiring the session.
  providers.identity = {
    data: routineAccount(),
    error: null,
    isFetching: true,
  };
  const paused = hostMarkup();
  expect(paused).toContain("Verifying current account and client access");
  expect(paused).toContain(f.listed.page.rows[0].projection.destinationId);
  expect(hostButton("Connect routines")).toBeUndefined();
  providers.identity = {
    data: routineAccount(),
    error: null,
    isFetching: false,
  };
  expect(hostMarkup()).toContain(
    f.listed.page.rows[0].projection.destinationId,
  );
  expect(issuances(harness)).toBe(1);
});

it("one refused routine card retires the shared conversation lifetime so its sibling loses saved content immediately, held reply included", async () => {
  const refused = "22222222-2222-4222-8222-222222222221";
  const held = "22222222-2222-4222-8222-222222222222";
  const started = barrier();
  const release = barrier();
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const path = String(url);
    if (path === "/api/action-followthrough/session")
      return Response.json(conversationReceipt());
    const body = JSON.parse(String(init?.body));
    if (path.endsWith("/routine-approve") && body.proposalId === held) {
      started.resolve();
      await release.promise;
      return Response.json(f.acknowledged);
    }
    return new Response("refused", { status: 403 });
  });
  const host = conversationHost(fetcher);
  const detach = host.attach();
  try {
    await host.connect();
    const connection = readyConnection(host);
    expect(typeof connection.onAccessLost).toBe("function");
    const first = conversationConsumer(connection, refused);
    const sibling = conversationConsumer(connection, held);
    await first.load();
    await sibling.load();
    expect(renderReview(first)).toContain(f.request.request.taskInstruction);
    expect(renderReview(sibling)).toContain(f.request.request.taskInstruction);
    // The sibling's approval is already dispatched on the still-valid token when the refusal arrives.
    const pending = sibling.approve();
    await started.promise;
    expect(sibling.getSnapshot().saved?.approving).toBe(true);
    await first.approve();
    expect(first.getSnapshot()).toMatchObject({
      accessDenied: true,
      saved: null,
    });
    // The definitive refusal retires the one shared lifetime, taking the sibling's view with it.
    expect(sibling.getSnapshot().saved).toBeNull();
    expect(renderReview(sibling)).not.toContain(
      f.request.request.taskInstruction,
    );
    expect(host.getSnapshot().status).toBe("expired");
    expect(host.getExpirationReason()).toBe("access-lost");
    // The refused transport keeps its typed denial without repeating the refused call.
    const sent = fetcher.mock.calls.length;
    const list = { afterScheduleId: null, limit: 20, historyLimit: 10 };
    await expect(
      connection.access.exchange(
        "list",
        list,
        { request: list },
        connection.signal,
      ),
    ).rejects.toBeInstanceOf(RoutinesAccessDenied);
    expect(fetcher).toHaveBeenCalledTimes(sent);
    // Both exact pending commands are still retained.
    expect(
      (await routineRecovery(f.context, () => {}, refused).load())?.approving,
    ).toBe(true);
    expect(
      (await routineRecovery(f.context, () => {}, held).load())?.approving,
    ).toBe(true);
    release.resolve();
    await pending;
    // A late admitted answer cannot restore the retired view or change the retained command.
    expect(sibling.getSnapshot().saved).toBeNull();
    expect(renderReview(sibling)).not.toContain(
      f.request.request.taskInstruction,
    );
    expect(
      (await routineRecovery(f.context, () => {}, held).load())?.proposal
        ?.proposalId,
    ).toBe(held);
  } finally {
    detach();
  }
});

it("the production conversation card retires its saved content when the shared session deny ends the same lifetime", async () => {
  const refused = "22222222-2222-4222-8222-222222222223";
  const card = "22222222-2222-4222-8222-222222222224";
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    String(url) === "/api/action-followthrough/session"
      ? Response.json(conversationReceipt())
      : new Response("refused", { status: 403 }),
  );
  const host = conversationHost(fetcher);
  const detach = host.attach();
  try {
    await host.connect();
    const connection = readyConnection(host);
    view.captureEffects = true;
    const renderCard = () => {
      view.index = 0;
      view.buttons = [];
      view.changed = false;
      return renderToStaticMarkup(
        createElement(ConversationRoutine, {
          item: scheduleItem(card),
          connection,
        }),
      );
    };
    renderCard();
    runEffects();
    await vi.waitFor(() =>
      expect(renderCard()).toContain(f.request.request.taskInstruction),
    );
    const denier = conversationConsumer(connection, refused);
    await denier.load();
    await denier.approve();
    expect(denier.getSnapshot().accessDenied).toBe(true);
    // The card's own port observes the same shared lifetime, so its view ends with it.
    expect(renderCard()).not.toContain(f.request.request.taskInstruction);
    expect(host.getSnapshot().status).toBe("expired");
    expect(renderCard()).not.toContain("Approve routine change");
  } finally {
    detach();
  }
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

/**
 * MR-04 CONSENT OBSERVATION AND RENEWAL. Every assertion below runs through the real workflow owner, the real access
 * owner, the real mounted workspace and the real same-origin adapter; only the external Meri transport is synthetic.
 */
async function settle(port: RoutineWorkflow, label: string) {
  renderWorkspace(port);
  clickRoutine(label);
  await vi.waitFor(() => expect(port.getSnapshot().busy).toBe(false));
  return renderWorkspace(port);
}
const consent = () => f.consent;
const scheduleId = () => f.listed.page.rows[0].projection.scheduleId;

it("the routines read asks for the observation explicitly and shows it apart from the schedule state", async () => {
  const calls: { route: string; body: unknown }[] = [];
  const fetch = fetcher((route, body) => {
    calls.push({ route, body });
    return Response.json(f.listed);
  });
  const port = workflow(fetch);
  await port.load();
  const html = await readWorkspace(port);
  expect(calls.map((call) => call.route)).toEqual(["list"]);
  expect(calls[0]!.body).toEqual({
    afterScheduleId: null,
    limit: 20,
    historyLimit: 10,
    observation: "consent",
  });
  // Two separate facts: the schedule's own status and the consent Core actually holds for these exact pins.
  expect(html).toContain("Read consent: Expired");
  expect(html).toContain("Active");
  expect(html).not.toContain("Read consent: Not observable");
});

it("the renewal review is read-only until the owner explicitly confirms it, and confirming records one window", async () => {
  const calls: { route: string; body: unknown }[] = [];
  const fetch = fetcher((route, body) => {
    calls.push({ route, body });
    if (route === "consentReview") return Response.json(consent().review);
    if (route === "consentApprove") return Response.json(consent().window);
    return Response.json(f.listed);
  });
  const port = workflow(fetch);
  await port.load();
  await readWorkspace(port);
  const reviewed = await settle(port, "Review renewal");
  // Read-only: the review names the exact schedule and sends no approval, no preparation and no execution.
  expect(calls.map((call) => call.route)).toEqual(["list", "consentReview"]);
  expect(calls[1]!.body).toEqual({ scheduleId: scheduleId() });
  // The review shows the ORIGINAL intent: its own digest, destination, scopes and effective limits, with the current
  // observation. The stored intent carries the instruction digest, never its text.
  expect(reviewed).toContain(
    consent().review.intent.taskInstructionSha256.slice(0, 16),
  );
  expect(reviewed).toContain(
    `Destination: ${consent().review.intent.projection.destinationId}`,
  );
  expect(reviewed).toContain(
    "Effective per run: $0.001000, 60 seconds, 0 retries.",
  );
  expect(reviewed).toContain("Reviewed consent: Expired");
  expect(reviewed).toContain("Renew consent now");
  expect(reviewed).not.toContain("Renewal recorded");
  const renewed = await settle(port, "Renew consent now");
  const approval = calls.find((call) => call.route === "consentApprove")!
    .body as Record<string, unknown>;
  expect(Object.keys(approval).sort()).toEqual([
    "decision",
    "requestId",
    "reviewSha256",
    "scheduleId",
  ]);
  expect(approval).toMatchObject({
    scheduleId: scheduleId(),
    reviewSha256: consent().review.reviewSha256,
    decision: "approved",
  });
  expect(String(approval.requestId)).toMatch(/^[0-9a-f-]{36}$/u);
  // The outcome shown is Core's own window re-read canonically, and no routine operation was dispatched.
  expect(renewed).toContain("Renewal recorded and current for generation 1");
  expect(renewed).toContain(
    "does not resume, start or re-enable the routine",
  );
  expect(calls.map((call) => call.route)).toEqual([
    "list",
    "consentReview",
    "consentApprove",
    "consentReview",
  ]);
});

it("a lost acknowledgement keeps ONE decision and re-presents it instead of minting another", async () => {
  const bodies: Record<string, unknown>[] = [];
  let lost = true;
  const fetch = fetcher((route, body) => {
    if (route === "list") return Response.json(f.listed);
    if (route === "consentReview") return Response.json(consent().review);
    bodies.push(body as Record<string, unknown>);
    if (lost) throw new Error("lost approval acknowledgement");
    return Response.json(consent().window);
  });
  const port = workflow(fetch);
  await port.load();
  await readWorkspace(port);
  await settle(port, "Review renewal");
  const unconfirmed = await settle(port, "Renew consent now");
  // Unproven, not refused: the review stays and the same decision is retained for an exact retry.
  expect(unconfirmed).toContain(
    "The outcome of this approval is not confirmed",
  );
  expect(unconfirmed).toContain("Retry this exact approval");
  expect(port.getSnapshot().consent?.unknown).toBe(true);
  expect(port.getSnapshot().consent?.window).toBeNull();
  lost = false;
  await settle(port, "Retry this exact approval");
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(port.getSnapshot().consent?.window).toEqual(consent().window);
});

it("an uncertain answer stays unproven while a definite refusal is reported and a new review mints a new decision", async () => {
  const bodies: Record<string, unknown>[] = [];
  let answer: "unknown" | "refused" | "renewed" = "unknown";
  const fetch = fetcher((route, body) => {
    if (route === "list") return Response.json(f.listed);
    if (route === "consentReview") return Response.json(consent().review);
    bodies.push(body as Record<string, unknown>);
    if (answer === "unknown")
      return Response.json(
        { error: { code: "ROUTINES_CORE_UNAVAILABLE", outcome: "UNKNOWN" } },
        { status: 503 },
      );
    if (answer === "refused")
      return Response.json(
        { error: { code: "ROUTINES_STALE", outcome: "NOT_DISPATCHED" } },
        { status: 409 },
      );
    return Response.json(consent().window);
  });
  const port = workflow(fetch);
  await port.load();
  await readWorkspace(port);
  await settle(port, "Review renewal");
  const uncertain = await settle(port, "Renew consent now");
  expect(uncertain).toContain(
    "The outcome of this approval is not confirmed",
  );
  expect(port.getSnapshot().consent?.unknown).toBe(true);
  answer = "refused";
  const refused = await settle(port, "Retry this exact approval");
  expect(refused).toContain(
    "The routine renewal was refused (ROUTINES_STALE)",
  );
  expect(port.getSnapshot().consent?.unknown).toBe(false);
  expect(port.getSnapshot().consent?.window).toBeNull();
  // A fresh review after a refusal is a NEW decision; the refused one is never reused.
  answer = "renewed";
  await settle(port, "Review renewal");
  await settle(port, "Renew consent now");
  expect(bodies).toHaveLength(3);
  expect(new Set(bodies.map((body) => body.requestId)).size).toBe(2);
  expect(port.getSnapshot().consent?.window).toEqual(consent().window);
});

it("retiring the routine session retires the shown renewal review and a late answer cannot restore it", async () => {
  const started = barrier();
  const release = barrier();
  const fetch = fetcher(async (route) => {
    if (route === "list") return Response.json(f.listed);
    started.resolve();
    await release.promise;
    return Response.json(consent().review);
  });
  const controller = new AbortController();
  const life = controller.signal;
  const port = new RoutineWorkflow({
    context: f.context,
    access: createRoutinesAccess("synthetic", life, fetch),
    signal: life,
    isCurrent: () => true,
  });
  await port.load();
  await readWorkspace(port);
  renderWorkspace(port);
  clickRoutine("Review renewal");
  await started.promise;
  controller.abort();
  release.resolve();
  await vi.waitFor(() => expect(port.getSnapshot().busy).toBe(false));
  expect(port.getSnapshot().consent).toBeNull();
  expect(renderWorkspace(port)).not.toContain(
    consent().review.intent.taskInstructionSha256.slice(0, 16),
  );
});

it("the existing same-origin adapter admits both renewal routes and addresses the canonical upstream paths", async () => {
  const config = {
    enabled: true,
    baseUrl: "https://meri.synthetic.invalid",
    requestOrigin: "https://frontend.synthetic.invalid",
  };
  const upstream = vi.fn<typeof fetch>(async () => Response.json(consent().review));
  const req = (body: unknown, path: string) =>
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
        req({ scheduleId: scheduleId() }, "routine-consentReview"),
        "routine-consentReview",
        config,
        async () => "native",
        upstream,
      )
    ).status,
  ).toBe(200);
  expect(upstream.mock.calls[0]![0]).toBe(
    "https://meri.synthetic.invalid/api/routines/consent/review",
  );
  expect(
    (
      await proxyActionRequest(
        req(consent().decision, "routine-consentApprove"),
        "routine-consentApprove",
        config,
        async () => "native",
        upstream,
      )
    ).status,
  ).toBe(200);
  expect(upstream.mock.calls[1]![0]).toBe(
    "https://meri.synthetic.invalid/api/routines/consent/approve",
  );
  // A decision carrying anything a browser might try to mint is refused before any upstream call.
  const before = upstream.mock.calls.length;
  expect(
    (
      await proxyActionRequest(
        req({ ...consent().decision, decidedAtMs: Date.now() }, "routine-consentApprove"),
        "routine-consentApprove",
        config,
        async () => "native",
        upstream,
      )
    ).status,
  ).toBe(502);
  expect(upstream).toHaveBeenCalledTimes(before);
});
