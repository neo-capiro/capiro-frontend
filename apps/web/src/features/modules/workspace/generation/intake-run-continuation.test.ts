// The async scope guarantee of the explicit run continuation.
//
// `continueIntakeRun` (use-intake-attempt.ts) awaits the send, then reads the run
// and publishes the retry notice. Both of those land AFTER that await, while the
// command lock only re-checks the journal's own lifetime afterwards — so an
// account/scope disposal during the send could publish a stale reply into the
// scope that replaced this one, on a component that is still mounted.
//
// This case drives the REAL `continueIntakeRun` through the REAL command lock
// (`withRecoveryCommandLock`) with the journal's real lifetime semantics —
// `useRetainedIntent`'s guard, which throws `AbortError` once the scope or
// revision it was rendered for is gone — and pins both directions:
//   * disposed during the send  -> no notice and no run read are published;
//   * still current             -> the correlated notice and the run read happen.
//
// The only substituted seam is the journal's storage read (`indexedDB` does not
// exist in this node environment); the plan leaf, the reply correlation, the
// wording and the disposal semantics are the shipped ones.
import { expect, it, vi } from "vitest";
import { intakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import type { IntakeRunView } from "./intake";
import { intakeScopeOf } from "./intake";
import {
  intakeDigest,
  intakeIdempotencyKey,
  type IntakeActor,
  type IntakeRecoveryRecord,
} from "./intake-recovery";
import { planRunRetry } from "./run-retry";
import {
  scopeIsCurrent,
  type GenerationDispatchOutcome,
} from "./use-generation-panel";

const recovery = vi.hoisted(() => ({ record: null as unknown, reads: 0 }));

vi.mock(
  "../../../../shared/session/recovery/journal",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../../../shared/session/recovery/journal")
      >();
    return {
      ...actual,
      // Exactly the shipped read, without its storage: it still honours the caller's
      // lifetime assertion first, as the real one's own lock does.
      readRecovery: async (
        _scope: string,
        _contract: unknown,
        assert: () => void,
      ) => {
        assert();
        recovery.reads += 1;
        return recovery.record;
      },
    };
  },
);

vi.mock("../../../../shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({ request: async () => ({}) }),
}));

import { continueIntakeRun } from "./use-intake-attempt";

const actor: IntakeActor = {
  tenantId: "00000000-0000-4000-8000-0000000000aa",
  userId: "00000000-0000-4000-8000-0000000000bb",
  clerkUserId: "user_clerk_1",
};

const runId = "00000000-0000-4000-8000-0000000000e1";
const otherRunId = "00000000-0000-4000-8000-0000000000e2";

/** The attempt this surface confirmed, retained under its own scope. */
const retained = (): IntakeRecoveryRecord => {
  const body = intakeBody.parse({
    goal: "Defend the 2027 program",
    blueprintVersionId: "bp-1",
    factualAttachmentIds: ["att-1"],
    sampleAttachmentIds: [],
    priorWorkspaceDraftIds: [],
  });
  const digest = intakeDigest(body);
  return {
    fence: "00000000-0000-4000-8000-0000000000cc",
    key: intakeIdempotencyKey(actor, digest),
    digest,
    body,
    receipt: {
      draftId: "00000000-0000-4000-8000-0000000000d1",
      runId,
      agentRevision: 2,
    },
  };
};

const run = (status: string): IntakeRunView => ({
  runId,
  status,
  stage: "drafting",
  stages: [],
  sections: [],
});

/** The real plan the panel builds for this attempt's own receipt. */
const plan = () => {
  const planned = planRunRetry({
    activated: true,
    capability: { enabled: true },
    record: retained(),
    run: run("active"),
  });
  if (planned.kind !== "request")
    throw new Error("expected the continuation to be a request");
  return planned;
};

type Runtime = { busy: boolean; hold: string; message: string };

/**
 * The context `useIntakeAttempt` builds, with the journal's real lifetime
 * semantics: after disposal its guard throws exactly what `useRetainedIntent`'s
 * guard throws, and `install` refuses like the shipped one does.
 */
function harness(options: {
  disposeDuringSend: boolean;
  outcome: GenerationDispatchOutcome;
}) {
  let disposed = false;
  const published: string[] = [];
  const events: string[] = [];
  let runtime: Runtime = { busy: false, hold: "", message: "" };
  let handedGuard: (() => void) | undefined;
  let currentAtSend: boolean | undefined;
  const guard = () => {
    if (disposed)
      throw new DOMException("The recovery context changed.", "AbortError");
  };
  const context = {
    server: { request: async () => ({}) },
    scope: intakeScopeOf(actor),
    journal: {
      ready: true,
      error: undefined,
      record: null,
      retry: () => {},
      guard,
      signal: () => new AbortController().signal,
      install: () => {
        guard();
        events.push("install");
      },
      block: () => events.push("block"),
    },
    working: { current: false },
    setRuntime: (update: unknown) => {
      const next = (
        typeof update === "function"
          ? (update as (state: Runtime) => Runtime)(runtime)
          : update
      ) as Runtime;
      if (next.message !== "" && next.message !== runtime.message)
        published.push(next.message);
      runtime = next;
    },
    dispatch: async (_plan: unknown, _label: string, handed?: () => void) => {
      events.push("dispatch");
      // What the panel's dispatch was handed, and whether it was still current at
      // the moment the request went out.
      handedGuard = handed;
      currentAtSend = scopeIsCurrent(handed);
      // The account/scope switch that happens while the reply is in flight.
      if (options.disposeDuringSend) disposed = true;
      return options.outcome;
    },
    readRun: () => {
      events.push("readRun");
    },
    settle: () => events.push("settle"),
  };
  return {
    context: context as never,
    published,
    events,
    runtime: () => runtime,
    handedGuard: () => handedGuard,
    currentAtSend: () => currentAtSend,
    journalGuard: () => context.journal.guard,
  };
}

it("publishes nothing when the scope is disposed during the continuation's send", async () => {
  recovery.record = retained();
  const h = harness({
    disposeDuringSend: true,
    outcome: { kind: "applied", result: { runId, status: "complete" } },
  });

  await continueIntakeRun(h.context, plan());

  // The send had already gone out — that cannot be undone here — but nothing of
  // its outcome may be released into the scope that replaced this one.
  expect(h.events).toContain("dispatch");
  expect(h.published).toEqual([]);
  expect(h.events).not.toContain("readRun");
});

it("keeps the correlated notice and the run read while the attempt is still current", async () => {
  recovery.record = retained();
  const h = harness({
    disposeDuringSend: false,
    outcome: { kind: "applied", result: { runId, status: "complete" } },
  });

  await continueIntakeRun(h.context, plan());

  expect(h.events).toContain("readRun");
  expect(h.published).toHaveLength(1);
  expect(h.published[0]).toContain(`Run ${runId} is reported complete now`);
});

it("never reports another run's reply against this one", async () => {
  recovery.record = retained();
  const h = harness({
    disposeDuringSend: false,
    outcome: {
      kind: "applied",
      result: { runId: otherRunId, status: "complete" },
    },
  });

  await continueIntakeRun(h.context, plan());

  expect(h.events).toContain("readRun");
  expect(h.published).toHaveLength(1);
  expect(h.published[0]).toContain(`named run ${otherRunId}, not run ${runId}`);
  expect(h.published[0]).toContain("nothing was applied to this run");
});

it("hands the panel's dispatch this attempt's own lifetime check, which refuses a replaced scope", async () => {
  recovery.record = retained();
  const h = harness({
    disposeDuringSend: true,
    outcome: { kind: "applied", result: { runId, status: "complete" } },
  });

  await continueIntakeRun(h.context, plan());

  // Still current when the request went out, gone when the reply landed: the very
  // check the hook publishes through now refuses, so the generic notice/failure
  // and the reload of this attempt reach the scope that replaced it in neither
  // direction.
  expect(h.currentAtSend()).toBe(true);
  expect(scopeIsCurrent(h.handedGuard())).toBe(false);
});

it("keeps the panel's dispatch publication open while the attempt is still current", async () => {
  recovery.record = retained();
  const h = harness({
    disposeDuringSend: false,
    outcome: { kind: "applied", result: { runId, status: "complete" } },
  });

  await continueIntakeRun(h.context, plan());

  expect(h.currentAtSend()).toBe(true);
  expect(scopeIsCurrent(h.handedGuard())).toBe(true);
});

it("hands over the journal's own guard rather than a second identity owner", async () => {
  recovery.record = retained();
  const h = harness({
    disposeDuringSend: false,
    outcome: { kind: "applied", result: { runId, status: "complete" } },
  });

  await continueIntakeRun(h.context, plan());

  expect(h.handedGuard()).toBe(h.journalGuard());
});

it("leaves a caller with no lifetime to check publishing unchanged", () => {
  const published: string[] = [];
  if (scopeIsCurrent(undefined)) published.push("notice");
  expect(published).toEqual(["notice"]);

  const disposed = () => {
    throw new DOMException("The recovery context changed.", "AbortError");
  };
  expect(scopeIsCurrent(disposed)).toBe(false);
  expect(() => scopeIsCurrent(disposed)).not.toThrow();
});
