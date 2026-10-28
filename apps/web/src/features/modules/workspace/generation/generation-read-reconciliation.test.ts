// The MOUNTED read ordering of the WS-22 document-agent panel, exercised with the
// REAL `useGenerationReads` and the REAL `useCapiroQuery` against an in-memory
// Capiro transport. No browser, no server, no network, no DB.
//
// Why this file exists: the status read is the only mounted read that can ADVANCE a
// retained run on the server (it reconciles a definitive native failure, or a body
// the owner has published) and it answers with `{ run }` alone, at the revision that
// run was admitted under. If the panel answers the state and proposal reads BEFORE
// that reconciliation and does not re-issue them afterwards, a user who just used the
// check action keeps seeing the run as still in flight (explicit retry stays
// disabled) and never sees the admitted proposal — until a remount. These cases pin
// that ordering down.
//
// The React runtime is replaced by the same minimal dispatcher the neighbouring
// `use-generation-dispatch-scope.test.ts` uses (a real cell per `useState`/`useRef`,
// dependency-checked effects, and a re-render), because this checkout has no DOM
// renderer installed; the components and hooks under test are the shipped ones, and
// `renderToStaticMarkup` renders the shipped component tree exactly as the existing
// mount harness does. Only the canonical client, the acting-role hook and the
// retained-intent hook are replaced.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { workspaceGenerationOperations } from "../../../../shared/capiro/operations/workspace-generation";
import type {
  AgentProposal,
  AgentRunSummary,
  DocumentAgentState,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";

const draftId = "00000000-0000-4000-8000-000000000001";
const replacementDraftId = "00000000-0000-4000-8000-000000000002";
const retainedRequestId = `wsgen:${"ab".repeat(32)}`;
const replacementRequestId = `wsgen:${"cd".repeat(32)}`;
const retainedRunId = "11111111-1111-4000-8000-0000000000f1";

// ---------------------------------------------------------------------------
// The React runtime: real cells, dependency-checked effects, re-render on update.
// ---------------------------------------------------------------------------
const rt = vi.hoisted(() => ({
  slots: [] as Array<{
    kind: string;
    value?: unknown;
    pending?: (() => unknown) | undefined;
    deps?: unknown[];
    cleanup?: (() => void) | undefined;
  }>,
  cursor: 0,
  dirty: false,
  ran: false,
}));

const sameDeps = (a: unknown[] | undefined, b: unknown[] | undefined) =>
  a !== undefined &&
  b !== undefined &&
  a.length === b.length &&
  a.every((value, index) => Object.is(value, b[index]));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const slot = (index: number, kind: string, value?: unknown) => {
    const existing = rt.slots[index] ?? { kind, value };
    rt.slots[index] = existing;
    return existing;
  };
  return {
    ...actual,
    useState: (initial: unknown) => {
      const cell = slot(rt.cursor++, "state", initial);
      return [
        cell.value,
        (next: unknown) => {
          const value =
            typeof next === "function"
              ? (next as (previous: unknown) => unknown)(cell.value)
              : next;
          if (!Object.is(value, cell.value)) {
            cell.value = value;
            rt.dirty = true;
          }
        },
      ];
    },
    useRef: (initial: unknown) => {
      const cell = slot(rt.cursor++, "ref", { current: initial });
      return cell.value;
    },
    useEffect: (fn: () => unknown, deps?: unknown[]) => {
      const cell = slot(rt.cursor++, "effect", fn);
      if (!sameDeps(cell.deps, deps)) {
        cell.deps = deps;
        cell.pending = fn;
      }
    },
    useCallback: (fn: unknown, deps?: unknown[]) => {
      const cell = slot(rt.cursor++, "callback", fn);
      if (!sameDeps(cell.deps, deps)) {
        cell.deps = deps;
        cell.value = fn;
      }
      return cell.value;
    },
    useMemo: (fn: () => unknown, deps?: unknown[]) => {
      const cell = slot(rt.cursor++, "memo");
      if (!sameDeps(cell.deps, deps)) {
        cell.deps = deps;
        cell.value = fn();
      }
      return cell.value;
    },
    useId: () => ":mock:",
  };
});

// ---------------------------------------------------------------------------
// The in-memory transport. `server` is what Core does; the returned bodies are the
// operations' own response payloads, and every fixture is checked against the
// operation's closed receiving schema before it is served.
// ---------------------------------------------------------------------------
const client = vi.hoisted(() => ({
  requests: [] as Array<{
    key: string;
    draft: string;
    revision: number;
    status: string;
  }>,
  writes: [] as string[],
  open: 0,
  delivered: { state: 0, proposals: 0, status: 0 },
}));

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
/** Held answers, so a case can decide WHEN one scope's read is allowed to land. */
const deferred = vi.hoisted(() => ({ hold: false, gate: false }));

async function until(check: () => boolean): Promise<void> {
  for (let turn = 0; turn < 200; turn += 1) {
    if (check()) return;
    await flush();
  }
  throw new Error("the transport ordering never became satisfiable");
}

type Server = {
  revision: number;
  phase: DocumentAgentState["phase"];
  status: DocumentAgentState["status"];
  pendingProposalId?: string;
  activeRunId?: string;
  lastRunStatus: AgentRunSummary["status"];
  sectionResults?: AgentRunSummary["sectionResults"];
  proposals: AgentProposal[];
  reconcile: () => void;
};

let server: Server;

function runSummary(): AgentRunSummary {
  return {
    runId: retainedRunId,
    requestId:
      server.lastRunStatus === "complete"
        ? replacementRequestId
        : retainedRequestId,
    mode: "standard",
    startedAt: "2026-10-28T10:00:00.000Z",
    status: server.lastRunStatus,
    stages: [],
    expectedRevision: 4,
    ...(server.sectionResults ? { sectionResults: server.sectionResults } : {}),
  };
}

function statePayload(): DocumentAgentState {
  return {
    schemaVersion: 1,
    revision: server.revision,
    phase: server.phase,
    status: server.status,
    documentType: {
      id: "cap-brief",
      label: "Capability brief",
      product: "legislative",
    },
    blueprintPin: null,
    theme: null,
    goal: null,
    brief: { assumptions: [], provenance: {}, objective: "Defend the program" },
    contextPlan: {
      includedItemIds: [],
      excludedItems: [],
      conflicts: [],
      coverage: { plannedClaims: 0, supportedClaims: 0, missingClaims: [] },
    },
    outline: { version: 1, sections: [] },
    generation: {
      mode: "standard",
      ...(server.activeRunId ? { activeRunId: server.activeRunId } : {}),
      lastRun: runSummary(),
    },
    ...(server.pendingProposalId ? { pendingProposalId: server.pendingProposalId } : {}),
  };
}

const transport = {
  request: vi.fn(
    async (
      key: string,
      input: unknown,
      options?: { signal?: AbortSignal },
    ): Promise<unknown> => {
      const params = (input as { params?: { draftId?: string } } | undefined)?.params;
      client.open += 1;
      client.requests.push({
        key,
        draft: params?.draftId ?? draftId,
        revision: server.revision,
        status: server.lastRunStatus,
      });
      try {
        if (key === "workspace.generation.status") {
          // The panel cannot be answered about a reconciliation before the reads it
          // is being reconciled AGAINST were delivered: that is the order Core sees.
          // The baseline is taken when THIS answer is requested, so a later check on
          // the same scope is ordered exactly like the first one.
          // (A case may hold the answer to model a scope that is replaced first.)
          const answeredAfter = { ...client.delivered };
          await until(() =>
            deferred.hold
              ? deferred.gate
              : client.delivered.state > answeredAfter.state &&
                client.delivered.proposals > answeredAfter.proposals,
          );
        } else if (deferred.hold) {
          await until(() => !deferred.hold);
        }
        await flush();
        // A torn-down scope's read is aborted, exactly as the query aborts it, so a
        // late answer can never land in the replacement scope.
        if (options?.signal?.aborted)
          throw new DOMException("aborted", "AbortError");
        if (key === "workspace.generation.status") {
          // Core's own durable effect for this read, then the run ALONE comes back.
          server.reconcile();
          client.delivered.status += 1;
          return { run: runSummary() };
        }
        if (key === "workspace.generation.state") {
          client.delivered.state += 1;
          return { state: statePayload() };
        }
        if (key === "workspace.generation.proposals") {
          client.delivered.proposals += 1;
          return { proposals: server.proposals };
        }
        if (key === "workspace.generation.intake.capability")
          return { enabled: false };
        return {};
      } finally {
        client.open -= 1;
      }
    },
  ),
  upload: vi.fn(),
  download: vi.fn(),
};

const stateResponse =
  workspaceGenerationOperations["workspace.generation.state"].response;
const proposalResponse =
  workspaceGenerationOperations["workspace.generation.proposals"].response;
const statusResponse =
  workspaceGenerationOperations["workspace.generation.status"].response;

vi.mock("../../../../shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => transport,
}));

vi.mock("./use-action-role", () => ({
  useWorkspaceActionRole: () => ({
    role: "owner",
    actor: {
      tenantId: "00000000-0000-4000-8000-0000000000aa",
      userId: "00000000-0000-4000-8000-0000000000bb",
      clerkUserId: "user_clerk_1",
    },
    loading: false,
    error: undefined,
    reload: () => undefined,
  }),
}));

vi.mock("../../../../shared/session/recovery/useRetainedIntent", () => ({
  useRetainedIntent: () => ({
    ready: true,
    loading: false,
    error: undefined,
    record: null,
    retry: vi.fn(),
    verify: vi.fn(),
    guard: vi.fn(),
    signal: () => new AbortController().signal,
    install: vi.fn(),
    block: vi.fn(),
  }),
}));

const { useGenerationReads } = await import("./use-generation-panel");
const { GenerationPanelHost } = await import("./GenerationPanelHost");

type Reads = ReturnType<typeof useGenerationReads>;

// ---------------------------------------------------------------------------
// The driver: run the render, run the effects it scheduled, let the transport
// answer, and repeat until nothing is left in flight.
// ---------------------------------------------------------------------------
function runEffects() {
  for (const cell of rt.slots) {
    if (cell.kind !== "effect" || cell.pending === undefined) continue;
    const fn = cell.pending;
    cell.pending = undefined;
    cell.cleanup?.();
    const cleanup = fn();
    cell.cleanup = typeof cleanup === "function" ? (cleanup as () => void) : undefined;
    rt.ran = true;
  }
}

async function settle(render: () => void): Promise<void> {
  for (let pass = 0; pass < 80; pass += 1) {
    rt.cursor = 0;
    rt.dirty = false;
    rt.ran = false;
    render();
    runEffects();
    const quiet = !rt.dirty && !rt.ran && client.open === 0;
    await flush();
    if (quiet && !rt.dirty) return;
  }
  throw new Error("the mounted reads never settled");
}

/** Run a bounded number of passes, for a scope whose reads are deliberately held. */
async function pump(render: () => void, passes: number): Promise<void> {
  for (let pass = 0; pass < passes; pass += 1) {
    rt.cursor = 0;
    rt.dirty = false;
    rt.ran = false;
    render();
    runEffects();
    await flush();
  }
}

function unmount() {
  for (const cell of rt.slots) {
    cell.cleanup?.();
    cell.cleanup = undefined;
  }
}

function markup(): string {
  rt.cursor = 0;
  return renderToStaticMarkup(createElement(GenerationPanelHost, { draftId }));
}

const freshServer = (over: Partial<Server> = {}): Server => ({
  revision: 4,
  phase: "brief",
  status: "active",
  lastRunStatus: "active",
  proposals: [],
  reconcile: () => undefined,
  ...over,
});

/** Mount the shipped reads for a scope and return what the mounted panel read. */
async function mountReads(target = draftId): Promise<Reads> {
  let reads: Reads | undefined;
  await settle(() => {
    reads = useGenerationReads(target);
  });
  return reads as Reads;
}

const readsFor = (reads: Reads) => reads;

beforeEach(() => {
  rt.slots = [];
  rt.cursor = 0;
  rt.dirty = false;
  rt.ran = false;
  client.requests = [];
  client.writes = [];
  client.open = 0;
  client.delivered = { state: 0, proposals: 0, status: 0 };
  deferred.hold = false;
  deferred.gate = false;
  transport.request.mockClear();
  transport.upload.mockClear();
});

it("shows the CURRENT revision and run after a status read reconciles a definitive failure", async () => {
  // Core's definitive failure: the run becomes truthfully failed, at r+1.
  server = freshServer({
    reconcile: () => {
      server.revision = 5;
      server.lastRunStatus = "failed";
      server.sectionResults = { "sec-design": { status: "failed" } };
    },
  });

  const reads = await mountReads();

  // Every body this case serves is the operation's own closed shape.
  const parsedState = stateResponse.safeParse({ state: statePayload() });
  expect(parsedState.success ? [] : parsedState.error.issues).toEqual([]);
  const parsedStatus = statusResponse.safeParse({ run: runSummary() });
  expect(parsedStatus.success ? [] : parsedStatus.error.issues).toEqual([]);

  // The status answer was produced AFTER both earlier reads were delivered...
  const order = client.requests.map((entry) => `${entry.key}@r${entry.revision}`);
  expect(order[0]).toBe("workspace.generation.state@r4");
  expect(order[1]).toBe("workspace.generation.proposals@r4");
  expect(order[2]).toBe("workspace.generation.status@r4");
  // ...and the authoritative reads were then re-issued for the revision the status
  // read reconciled, so the CURRENT state and run are what the panel shows.
  expect(order.filter((entry) => entry === "workspace.generation.state@r4").length).toBe(1);
  expect(order).toContain("workspace.generation.state@r5");
  expect(order).toContain("workspace.generation.proposals@r5");
  expect(readsFor(reads).agent?.revision).toBe(5);
  expect(readsFor(reads).agent?.generation.lastRun?.status).toBe("failed");
  expect(readsFor(reads).run?.status).toBe("failed");
  // The mounted panel offers the explicit retry instead of "still in flight".
  const html = markup();
  expect(html).toContain("revision 5");
  expect(html).not.toContain("still in flight");
  expect(html).toContain("Retry failed units");
  // Nothing was dispatched: a read never performs paid work.
  expect(client.writes).toEqual([]);
  expect(transport.upload).not.toHaveBeenCalled();
});

it("shows the admitted proposal and CURRENT revision after a status read completes a body", async () => {
  // Core's complete body: admitted as a pending proposal, no run replacement.
  server = freshServer({
    reconcile: () => {
      server.revision = 6;
      server.phase = "generate";
      server.status = "generating";
      server.activeRunId = retainedRunId;
      server.pendingProposalId = "prop-body-1";
      server.proposals = [
        {
          id: "prop-body-1",
          tenantId: "00000000-0000-4000-8000-0000000000aa",
          draftId,
          createdById: "00000000-0000-4000-8000-0000000000bb",
          type: "content_revision",
          status: "pending",
          baseRevision: 4,
          baseHash: "hash-4",
          payload: { revisedContent: { "sec-design": "Budget body" } },
          createdAt: "2026-10-28T10:05:00.000Z",
          decidedAt: null,
          decidedById: null,
        },
      ];
    },
  });

  const reads = await mountReads();

  const parsedProposals = proposalResponse.safeParse({
    proposals: server.proposals,
  });
  expect(parsedProposals.success ? [] : parsedProposals.error.issues).toEqual([]);
  expect(reads.agent?.revision).toBe(6);
  expect(readsFor(reads).agent?.pendingProposalId).toBe("prop-body-1");
  expect(readsFor(reads).proposals.map((proposal: AgentProposal) => proposal.id)).toEqual([
    "prop-body-1",
  ]);
  const html = markup();
  expect(html).toContain("revision 6");
  expect(html).toContain("Proposals");
  expect(html).toContain("content_revision");
  // The run itself is still in flight here: the body was admitted as a proposal, so
  // the panel must NOT offer a retry while it awaits review.
  expect(html).toContain("still in flight");
  // The run keeps its OWN retained identity: a completed read never re-identifies it.
  expect(readsFor(reads).run?.requestId).toBe(retainedRequestId);
  expect(client.writes).toEqual([]);
});

it("keeps the retained identity and issues no paid work while the answer stays UNKNOWN", async () => {
  // UNKNOWN: Core writes nothing and answers with the run it already had.
  server = freshServer();

  const reads = await mountReads();

  expect(readsFor(reads).run?.requestId).toBe(retainedRequestId);
  expect(readsFor(reads).run?.status).toBe("active");
  expect(readsFor(reads).agent?.generation.lastRun?.requestId).toBe(retainedRequestId);
  expect(readsFor(reads).agent?.generation.lastRun?.status).toBe("active");
  // One status read, one bounded pair of authoritative re-reads, no replay and no
  // polling: the mount never issues a paid request, and no read is repeated forever.
  const statusReads = client.requests.filter(
    (entry) => entry.key === "workspace.generation.status",
  );
  const stateReads = client.requests.filter(
    (entry) => entry.key === "workspace.generation.state",
  );
  expect(statusReads).toHaveLength(1);
  expect(stateReads.length).toBeLessThanOrEqual(2);
  expect(client.writes).toEqual([]);
  expect(transport.upload).not.toHaveBeenCalled();
});

it("does not carry one scope's reconciliation into the replacement scope", async () => {
  // The first scope's status answer is held until AFTER that scope has been replaced,
  // so nothing it says may reach the replacement's reads.
  server = freshServer({
    reconcile: () => {
      server.revision = 5;
      server.lastRunStatus = "failed";
    },
  });
  deferred.hold = true;

  let reads: Reads | undefined;
  await pump(() => {
    reads = useGenerationReads(draftId);
  }, 3);
  // The first scope has its reads in flight and no answer yet.
  expect(client.requests.map((entry) => entry.key).slice(0, 3)).toEqual([
    "workspace.generation.state",
    "workspace.generation.proposals",
    "workspace.generation.status",
  ]);

  // The route moves on: this panel's reads are torn down (aborting what was in
  // flight), and the replacement scope mounts with its own settled retained run.
  unmount();
  rt.slots = [];
  deferred.hold = false;
  server = freshServer({
    lastRunStatus: "complete",
    status: "complete",
    phase: "complete",
  });
  await settle(() => {
    reads = useGenerationReads(replacementDraftId);
  });
  const parsedReplacementState = stateResponse.safeParse({
    state: statePayload(),
  });
  expect(
    parsedReplacementState.success ? [] : parsedReplacementState.error.issues,
  ).toEqual([]);

  const replacement = reads as Reads;
  expect(replacement.agent?.revision).toBe(4);
  expect(replacement.agent?.generation.lastRun?.status).toBe("complete");
  const forReplacement = client.requests.filter(
    (entry) => entry.draft === replacementDraftId,
  );
  expect(forReplacement.map((entry) => entry.key).slice(0, 3)).toEqual([
    "workspace.generation.state",
    "workspace.generation.proposals",
    "workspace.generation.status",
  ]);
  expect(forReplacement.every((entry) => entry.revision === 4)).toBe(true);

  // The replaced scope's late answer lands now: its signal was aborted with the old
  // scope, so it neither refreshes nor invalidates the replacement's reads.
  deferred.gate = true;
  await flush();
  await flush();
  await flush();
  const after = reads as Reads;
  expect(after.agent?.revision).toBe(4);
  expect(after.agent?.generation.lastRun?.status).toBe("complete");
  expect(after.proposals).toEqual([]);
  expect(
    client.requests.filter((entry) => entry.draft === replacementDraftId),
  ).toHaveLength(forReplacement.length);
  expect(client.writes).toEqual([]);
});

it("reconciles a later check whose run summary is IDENTICAL to the one it already answered", async () => {
  // Round one: a real check whose answer is still UNKNOWN. Core writes nothing and
  // answers with exactly the run this draft already retains.
  server = freshServer();
  let reads: Reads | undefined;
  await settle(() => {
    reads = useGenerationReads(draftId);
  });
  const mounted = reads as Reads;
  expect(mounted.agent?.revision).toBe(4);
  expect(mounted.proposals).toEqual([]);
  expect(mounted.run?.status).toBe("active");
  expect(client.requests.slice(0, 3).map((entry) => entry.key)).toEqual([
    "workspace.generation.state",
    "workspace.generation.proposals",
    "workspace.generation.status",
  ]);
  // Round one is settled: one check, one bounded reconciliation of its own.
  expect(
    client.requests.filter((entry) => entry.key === "workspace.generation.status"),
  ).toHaveLength(1);
  const roundTwoStart = client.requests.length;

  // Round two, on the SAME mounted scope: the panel's own reload. Core's body is
  // admitted on THAT read, and the answer still reports the run exactly as before:
  // the same requestId, the same `active` status and the same expectedRevision. Only
  // the authoritative state and proposal reads can show what changed.
  server.reconcile = () => {
    server.revision = 6;
    server.phase = "generate";
    server.status = "generating";
    server.activeRunId = retainedRunId;
    server.pendingProposalId = "prop-body-1";
    server.proposals = [
      {
        id: "prop-body-1",
        tenantId: "00000000-0000-4000-8000-0000000000aa",
        draftId,
        createdById: "00000000-0000-4000-8000-0000000000bb",
        type: "content_revision",
        status: "pending",
        baseRevision: 4,
        baseHash: "hash-4",
        payload: { revisedContent: { "sec-design": "Budget body" } },
        createdAt: "2026-10-28T10:05:00.000Z",
        decidedAt: null,
        decidedById: null,
      },
    ];
  };
  mounted.reload();
  await settle(() => {
    reads = useGenerationReads(draftId);
  });
  const after = reads as Reads;

  // The second answer is indistinguishable from the first by its run summary...
  expect(after.run?.requestId).toBe(retainedRequestId);
  expect(after.run?.status).toBe("active");
  expect(after.run?.expectedRevision).toBe(4);
  // ...so the round's own reads have to carry the reconciliation: the authoritative
  // reads were answered for r4 BEFORE the status read acted, and were re-issued for
  // the r6 the body was admitted at.
  const secondRound = client.requests.slice(roundTwoStart);
  expect(
    secondRound
      .filter((entry) => entry.key === "workspace.generation.state")
      .map((entry) => entry.revision),
  ).toEqual([4, 6]);
  expect(
    secondRound
      .filter((entry) => entry.key === "workspace.generation.proposals")
      .map((entry) => entry.revision),
  ).toEqual([4, 6]);
  expect(after.agent?.revision).toBe(6);
  expect(after.agent?.pendingProposalId).toBe("prop-body-1");
  expect(after.proposals.map((proposal: AgentProposal) => proposal.id)).toEqual([
    "prop-body-1",
  ]);
  const html = markup();
  expect(html).toContain("revision 6");
  expect(html).toContain("Proposals");
  // No remount, no replay, no poll: two checks, two bounded reconciliations.
  expect(
    client.requests.filter((entry) => entry.key === "workspace.generation.status"),
  ).toHaveLength(2);
  expect(
    client.requests.filter((entry) => entry.key === "workspace.generation.state").length,
  ).toBeLessThanOrEqual(4);
  expect(client.writes).toEqual([]);
  expect(transport.upload).not.toHaveBeenCalled();
});
