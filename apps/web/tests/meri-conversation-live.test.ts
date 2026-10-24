import { describe, expect, it, vi } from "vitest";
import type { ConversationObservationSnapshot } from "@capiro/meri-client/conversation";
import { observeUntilSettled } from "../src/features/meri/conversation/observation-loop";
import { sessionHistoryState } from "../src/features/meri/conversation/saved-turns";
import {
  conversationArtifacts,
  isSettled,
  isTerminal,
  turnFromObservation,
  currentTurnView,
} from "../src/features/meri/conversation/conversation-view";

const binding = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  conversationId: "30000000-0000-4000-8000-000000000003",
  runId: "40000000-0000-4000-8000-000000000004",
  attemptId: "50000000-0000-4000-8000-000000000005",
  workerId: "60000000-0000-4000-8000-000000000006",
  writerFence: 1,
};
const scopes = [
  {
    tenantId: binding.tenantId,
    kind: "client" as const,
    resourceId: "10000000-0000-4000-8000-000000000001",
    policyRevision: "policy1",
  },
];
let sequence = 0;
const event = <T extends string, D>(type: T, data: D) => ({
  contractVersion: "0.1.0" as const,
  eventId: `70000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
  binding,
  sequence,
  createdAt: "2026-10-16T00:00:00Z",
  scopes,
  type,
  data,
});
const observation = (
  events: unknown[],
  patch: Partial<ConversationObservationSnapshot> = {},
) =>
  ({
    after: events.length,
    omittedPrefix: false,
    hasMore: false,
    events,
    runState: "running",
    prompt: "Synthetic request",
    ...patch,
  }) as unknown as ConversationObservationSnapshot;

describe("synthetic saved-current display completeness", () => {
  const empty = () => turnFromObservation(observation([]), binding.runId);
  it("uses original run-local progress to show a more complete saved segment without altering the SDK snapshot", () => {
    const observed = {
      ...empty(),
      throughSequence: 100,
      incompleteHistory: true,
    };
    const saved = {
      ...empty(),
      throughSequence: 105,
      incompleteHistory: false,
    };
    expect(currentTurnView(observed, saved)).toBe(saved);
    expect(observed.throughSequence).toBe(100);
  });
  it("retains a newer observed segment and refuses a different saved run", () => {
    const observed = { ...empty(), throughSequence: 106 };
    expect(
      currentTurnView(observed, { ...empty(), throughSequence: 105 }),
    ).toBe(observed);
    expect(
      currentTurnView(observed, {
        ...empty(),
        runId: "another-run",
        throughSequence: 999,
      }),
    ).toBe(observed);
  });
  it("recovers an omitted prefix only at equal progress, and preserves absence when neither owner returned data", () => {
    const observed = { ...empty(), throughSequence: 100, omittedPrefix: true };
    const saved = { ...empty(), throughSequence: 100, omittedPrefix: false };
    expect(currentTurnView(observed, saved)).toBe(saved);
    expect(currentTurnView(null, undefined)).toBeNull();
  });
});

describe("synthetic accepted-history versus reserved-session ordering", () => {
  // Already-admitted UI state only; byte receiver controls live in the public artifact/proxy suites.
  const segment = (runId: string, sequenceBase: number) => ({
    run: { binding: { ...binding, runId }, state: "completed" },
    sequenceBase,
    request: { prompt: "Synthetic request" },
    promptLineage: { logicalRequestId: runId },
    lastSequence: 2,
  });
  const page = (turns: ReturnType<typeof segment>[]) =>
    ({
      turns,
      latestRun: turns.at(-1)!.run,
      pendingTurn: null,
      events: [],
    }) as unknown as NonNullable<
      Parameters<typeof sessionHistoryState>[0]["current"]
    >;

  it("never redirects a newly reserved target backwards to the last accepted source", () => {
    const source = segment(binding.runId, 0);
    const state = sessionHistoryState(
      { current: page([source]) },
      "reserved-target",
      [],
      undefined,
      false,
    );
    expect(state.latestTarget).toBeUndefined();
    expect(state.source).toBeUndefined();
  });

  it("offers the exact newer accepted binding only when the current accepted segment precedes it", () => {
    const source = segment(binding.runId, 0),
      successor = segment("accepted-successor", 2);
    const state = sessionHistoryState(
      { current: page([source, successor]) },
      binding.runId,
      [],
      undefined,
      false,
    );
    expect(state.latestTarget).toEqual(successor.run.binding);
    expect(state.source).toBeUndefined();
  });
});

describe("observeUntilSettled", () => {
  const instant = () => Promise.resolve();
  it("stops as settled without subscribing when the run already settled", async () => {
    const attempt = vi.fn(async () => {});
    const outcome = await observeUntilSettled({
      attempt,
      settled: () => true,
      progress: () => 0,
      signal: new AbortController().signal,
      wait: instant,
    });
    expect(outcome).toBe("settled");
    expect(attempt).not.toHaveBeenCalled();
  });

  it("resumes after a stream ends without a terminal status and reports the phases", async () => {
    let cursor = 0;
    const phases: string[] = [];
    const firsts: boolean[] = [];
    const outcome = await observeUntilSettled({
      attempt: async (first) => {
        firsts.push(first);
        cursor += 2;
      },
      settled: () => cursor >= 6,
      progress: () => cursor,
      signal: new AbortController().signal,
      onPhase: (phase) => phases.push(phase),
      wait: instant,
    });
    expect(outcome).toBe("settled");
    expect(firsts).toEqual([true, false, false]);
    // Windows that admitted events and then ended are ordinary rollovers, not interruptions.
    expect(phases).toEqual(["live", "live", "live"]);
  });

  it("reads as reconnecting only after an attempt that failed without progress", async () => {
    let cursor = 0,
      calls = 0;
    const phases: string[] = [];
    const outcome = await observeUntilSettled({
      attempt: async () => {
        calls++;
        // Progress, a failed attempt, then progress to settled.
        if (calls === 1) cursor = 2;
        else if (calls === 3) cursor = 6;
        else throw new Error("subscription-unavailable");
      },
      settled: () => cursor >= 6,
      progress: () => cursor,
      signal: new AbortController().signal,
      onPhase: (phase) => phases.push(phase),
      wait: instant,
    });
    expect(outcome).toBe("settled");
    expect(phases).toEqual(["live", "live", "reconnecting", "reconnecting"]);
  });

  it("backs off on attempts without progress and stalls after the budget", async () => {
    const waits: number[] = [];
    const attempt = vi.fn(async () => {
      throw new Error("subscription-unavailable");
    });
    const outcome = await observeUntilSettled({
      attempt,
      settled: () => false,
      progress: () => 3,
      signal: new AbortController().signal,
      delays: [10, 20, 40],
      wait: async (ms) => {
        waits.push(ms);
      },
    });
    expect(outcome).toBe("stalled");
    expect(attempt).toHaveBeenCalledTimes(4);
    expect(waits).toEqual([10, 20, 40]);
  });

  it("resets the failure budget whenever an attempt admits new events", async () => {
    let cursor = 0,
      calls = 0;
    const waits: number[] = [];
    const outcome = await observeUntilSettled({
      attempt: async () => {
        calls++;
        // Fail twice, progress, fail twice, then settle.
        if (calls === 3) cursor++;
        else if (calls === 6) cursor = 99;
        else throw new Error("subscription-unavailable");
      },
      settled: () => cursor === 99,
      progress: () => cursor,
      signal: new AbortController().signal,
      delays: [1, 2, 3],
      wait: async (ms) => {
        waits.push(ms);
      },
    });
    expect(outcome).toBe("settled");
    expect(waits).toEqual([1, 2, 1, 2]);
  });

  it("keeps watching through clean empty windows before the run starts, without stalling", async () => {
    let calls = 0,
      cursor = 0;
    const phases: string[] = [],
      waits: number[] = [];
    const outcome = await observeUntilSettled({
      attempt: async () => {
        calls++;
        // Eight clean 30 s windows with no event (about four minutes before `starting`), then the run's events.
        if (calls === 9) cursor = 5;
        if (calls === 10) cursor = 9;
      },
      settled: () => cursor === 9,
      progress: () => cursor,
      signal: new AbortController().signal,
      onPhase: (phase) => phases.push(phase),
      delays: [10, 20, 40],
      wait: async (ms) => {
        waits.push(ms);
      },
    });
    expect(outcome).toBe("settled");
    expect(calls).toBe(10);
    expect(phases.every((phase) => phase === "live")).toBe(true);
    expect(waits).toEqual(Array(8).fill(10));
  });

  it("aborting stops observation without another attempt", async () => {
    const controller = new AbortController();
    const attempt = vi.fn(async () => controller.abort());
    const outcome = await observeUntilSettled({
      attempt,
      settled: () => false,
      progress: () => 0,
      signal: controller.signal,
      wait: instant,
    });
    expect(outcome).toBe("stopped");
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("a clean empty recovery clears the warning and resets consecutive failures without advancing the cursor", async () => {
    let calls = 0;
    let phase = "live";
    const waits: Array<[number, string]> = [];
    const firsts: boolean[] = [];
    const outcome = await observeUntilSettled({
      attempt: async (first) => {
        firsts.push(first);
        calls++;
        // Two failures, a successful empty window, then four failures.
        if (calls !== 3) throw new Error("synthetic unavailable");
      },
      settled: () => false,
      progress: () => 7,
      signal: new AbortController().signal,
      onPhase: (value) => {
        phase = value;
      },
      delays: [1, 2, 4],
      wait: async (ms) => {
        waits.push([ms, phase]);
      },
    });
    expect(outcome).toBe("stalled");
    expect(calls).toBe(7);
    expect(firsts).toEqual([true, false, false, false, false, false, false]);
    expect(waits).toEqual([
      [1, "reconnecting"],
      [2, "reconnecting"],
      [1, "live"],
      [1, "reconnecting"],
      [2, "reconnecting"],
      [4, "reconnecting"],
    ]);
  });
});

describe("conversation view", () => {
  it("classifies terminal and settled run states", () => {
    expect(
      ["completed", "failed", "cancelled"].map((s) => isTerminal(s as never)),
    ).toEqual([true, true, true]);
    expect(isTerminal("running")).toBe(false);
    expect(isTerminal(undefined)).toBe(false);
    expect(isSettled("paused")).toBe(true);
    expect(isSettled("waiting-for-approval")).toBe(true);
    expect(isSettled("queued")).toBe(false);
  });

  it("folds admitted events into one turn with prompt, text, tools, approvals and artifacts", () => {
    const events = [
      event("run.status", { state: "running", reasonCode: null }),
      event("message.delta", { messageId: "m1", text: "Hello" }),
      event("message.delta", { messageId: "m1", text: " world" }),
      event("tool.started", { requestId: "t1", tool: "search" }),
      event("tool.completed", { requestId: "t1", resultReference: "r1" }),
      event("approval.required", {
        proposalId: "p1",
        commandSha256: "a".repeat(64),
        expiresAt: "2026-10-16T01:00:00Z",
      }),
      event("artifact.available", {
        artifactId: "44444444-4444-4444-8444-444444444444",
        versionId: "55555555-5555-4555-8555-555555555555",
      }),
      event("run.status", { state: "completed", reasonCode: null }),
    ];
    const turn = turnFromObservation(
      observation(events, { runState: "completed" }),
      binding.runId,
    );
    expect(turn.prompt).toBe("Synthetic request");
    expect(turn.runState).toBe("completed");
    expect(turn.messages).toEqual([{ messageId: "m1", text: "Hello world" }]);
    expect(turn.tools).toEqual([
      { requestId: "t1", name: "search", resultReference: "r1" },
    ]);
    expect(turn.approvals.map((item) => item.proposalId)).toEqual(["p1"]);
    expect(turn.artifacts).toHaveLength(1);
  });

  it("an empty observation is a turn with no invented content", () => {
    const turn = turnFromObservation(observation([], { prompt: null }), "run");
    expect(turn).toMatchObject({
      prompt: null,
      messages: [],
      tools: [],
      artifacts: [],
      errors: [],
    });
  });

  it("lists each artifact version once in first-appearance order", () => {
    const a = { artifactId: "a", versionId: "v1" };
    const b = { artifactId: "a", versionId: "v2" };
    const turn = (artifacts: (typeof a)[]) =>
      ({ artifacts }) as unknown as Parameters<
        typeof conversationArtifacts
      >[0][number];
    expect(
      conversationArtifacts([turn([a, b]), turn([b, a])]).map(
        (item) => item.versionId,
      ),
    ).toEqual(["v1", "v2"]);
  });
});
