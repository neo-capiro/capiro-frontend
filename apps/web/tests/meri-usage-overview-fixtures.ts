import type { UsageOverviewResponse2 } from "@capiro/meri-contracts/conversation-usage";

// Synthetic meri.usage-overview/2 display bodies. Every long coverage string is the published
// contract's own literal (packages/contracts/dist/usage-overview-v2.schema.json and
// conversation-usage/overview-protocol.mjs), and each body is proved through the real /2 public
// receiver in the adjacent tests before any display code sees it.
type Response2 = UsageOverviewResponse2;
type Period2 = Response2["periods"][number];

const lineageBasis: Period2["lineage"]["basis"] =
  "sdk_usage.parentRunId plus the run binding writerFence: absent parent = root thread start; writerFence 1 = fork into a separate logical thread; writerFence 2 or more = resume continuation of the same thread";
const jobStates: Response2["jobIdentity"]["states"] = [
  "successful",
  "partial",
  "failed",
  "cancelled",
  "unclosed",
];
const denominators: Response2["denominators"] = {
  attempts:
    "run rows in the ledger; one run is one attempt or turn, never a job",
  conversationThreads:
    "distinct conversation_id with at least one run created in the period; a thread may host several attempts",
  sustainedJobs:
    "canonical ROOT Work/Delegate objectives: the run whose stored request carries request.work with entry start-work|delegate, together with every run that continues it through the persisted continuation custody. A child assignment, conversation thread, SDK attempt or one completed run is never a job",
};
const costCategories: Response2["categories"] = {
  inputTokens: "measured",
  outputTokens: "measured",
  reasoningTokens: "inside-another-counter",
  cacheReadInputTokens: "measured",
  cacheCreationInputTokens: "measured",
  webSearchRequests: "measured",
  toolInvocations: "measured",
  toolOutcomes: "measured",
  cost: "estimated",
  providerBilledMicroUsd: "unresolved",
  subagentCost: "inside-another-counter",
  compactionCost: "inside-another-counter",
  verificationCost: "unresolved",
  infrastructureCost: "unresolved",
  retryCost: "unresolved",
  fallbackCost: "unresolved",
  extractionCost: "unresolved",
  activityCapacity: "unresolved",
};

const periodStates = () => ({
  queued: 0,
  starting: 0,
  running: 0,
  "waiting-for-approval": 0,
  paused: 0,
  completed: 2,
  failed: 1,
  cancelled: 1,
});

const recordedStates = () => ({
  queued: 0,
  starting: 0,
  running: 0,
  "waiting-for-approval": 0,
  paused: 0,
  completed: 2,
  failed: 0,
  cancelled: 0,
});

const counterTotals = () => ({
  inputTokens: 300,
  outputTokens: 150,
  cacheReadInputTokens: 20,
  cacheCreationInputTokens: 10,
  webSearchRequests: 0,
  toolInvocations: 6,
  toolFailures: 1,
});

const period = (kind: Period2["kind"], index: 0 | 1 | 2): Period2 => ({
  kind,
  startInclusive: [
    "2026-10-27T00:00:00.000Z",
    "2026-10-26T00:00:00.000Z",
    "2026-10-01T00:00:00.000Z",
  ][index]!,
  endExclusive: [
    "2026-10-28T00:00:00.000Z",
    "2026-11-02T00:00:00.000Z",
    "2026-11-01T00:00:00.000Z",
  ][index]!,
  attempts: 4,
  states: periodStates(),
  recording: { recorded: 2, unavailable: 1, notRecorded: 1 },
  knownChargeMicroUsd: [0, 250_000, 750_000][index]!,
  recorded: recordedStates(),
  conversationThreads: {
    status: "measured",
    basis: "distinct-conversation-id-by-run-created-at",
    threads: [1, 2, 3][index]!,
    attempts: 4,
  },
  completedAttempts: {
    status: "estimated",
    chargeBasis: "sdk-list-estimate",
    jobIdentity: "not-a-job-denominator",
    attempts: 2,
    knownChargeMicroUsd: [0, 250_000, 750_000][index]!,
    microUsdPerCompletedAttempt: [0, 125_000, 375_000][index]!,
    attemptsWithoutRecordedUsage: 0,
  },
  partialOrFailed: {
    status: "unavailable",
    chargeBasis: "sdk-list-estimate",
    failedAttempts: 1,
    cancelledAttempts: 1,
    recordedAttempts: 0,
    knownChargeMicroUsd: 0,
    microUsdPerRecordedAttempt: null,
  },
  liability: {
    chargeBasis: "sdk-list-estimate",
    recordedAttempts: 2,
    knownChargeMicroUsd: [0, 250_000, 750_000][index]!,
    microUsdPerRecordedAttempt: [0, 125_000, 375_000][index]!,
    unavailableAttempts: 1,
    notRecordedAttempts: 1,
  },
  lineage: {
    basis: lineageBasis,
    root: { attempts: 2, chargeMicroUsd: [0, 250_000, 750_000][index]! },
    fork: { attempts: 1, chargeMicroUsd: 0 },
    resume: { attempts: 1, chargeMicroUsd: 0 },
    "unknown-lineage": { attempts: 0, chargeMicroUsd: 0 },
  },
  counters: counterTotals(),
});

const wholeJobCoverage = (
  recorded: number,
  unavailable: number,
  outsideWindow: number,
): Response2["wholeJobs"]["coverage"] => ({
  jobsWithRecordedUsage: recorded,
  jobsWithUnavailableUsage: unavailable,
  revisionsWithRootOutsideWindow: outsideWindow,
  chargeAttribution: "whole-job-lineage-at-root-revision-window",
  windowEdge:
    "a revision created after the window is not read, so a job whose continuation falls outside the window is reported from the revisions inside it only, and a continuation whose root revision is outside the window is excluded and counted",
  providerBilledMicroUsd: null,
  completeJobCost: "estimated",
});

const wholeJobs = (
  states: Response2["wholeJobs"]["states"],
  jobs: number,
  attempts: number,
  knownChargeMicroUsd: number,
  microUsdPerSuccessfulJob: number | null,
  coverage: Response2["wholeJobs"]["coverage"],
): Response2["wholeJobs"] => ({
  basis:
    "canonical ROOT Work/Delegate objectives: the run whose stored request carries request.work with entry start-work|delegate, together with every run that continues it through the persisted continuation custody. A child assignment, conversation thread, SDK attempt or one completed run is never a job",
  window: "root revision created within the admitted month window",
  states,
  jobs,
  attempts,
  revisions: attempts,
  steerRevisions: jobs === 0 ? 0 : 2,
  tails: jobs,
  settledRevisions: jobs,
  closurePending: jobs === 0 ? 0 : 1,
  unresolvedSuccessors: jobs === 0 ? 0 : 1,
  unsettledChildren: jobs === 0 ? 0 : 1,
  knownChargeMicroUsd,
  microUsdPerSuccessfulJob,
  coverage,
});

const body = (jobs: Response2["wholeJobs"]): Response2 => ({
  schemaVersion: "meri.usage-overview/2",
  observedAt: "2026-10-27T12:00:00.000Z",
  timezone: "UTC",
  currency: "USD",
  countersCoverage: "recorded-runs-only",
  policy: {
    status: "configured",
    revision: 3,
    monthlyCapMicroUsd: 100_000_000,
    maxTurns: 12,
    maxBudgetMicroUsd: 5_000_000,
  },
  periods: [period("day", 0), period("week", 1), period("month", 2)],
  monthlyAdmission: {
    startInclusive: "2026-10-01T00:00:00.000Z",
    knownChargeMicroUsd: 1_500_000,
    unavailableRecordedAttempts: 1,
    remainingKnownMicroUsd: 98_500_000,
    reached: false,
  },
  queue: {
    basis: "recorded-run-state",
    states: {
      queued: 2,
      starting: 1,
      running: 1,
      "waiting-for-approval": 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    },
    physicalConcurrency: null,
    availableCapacity: null,
    capacityStatus: "unavailable",
  },
  coverage: {
    attemptPeriodBasis: "run-created-at",
    admissionPeriodBasis: "sdk-usage-recorded-at",
    chargeBasis: "sdk-list-estimate",
    providerBilledMicroUsd: null,
    completeJobCost: "estimated",
  },
  denominators,
  jobIdentity: {
    status: "measured",
    definition:
      "one whole job is the canonical ROOT Work/Delegate objective across its continuations and current goal revision; it is never a child assignment, conversation thread, SDK attempt or one completed run",
    lineage:
      "a run continues another objective only when the canonical continuation owner verifies that run stored continuation envelope in the same transaction and that envelope is a resume naming that source run stored request, so its source request digest equals the source run request_sha256; a fork and a run without that verified custody each start a new objective, because the canonical prompt identity owner makes a fork and a next prompt new logical prompts",
    closure:
      "the existing completion producer decides. successful = every current revision is completed and carries a PUBLISHED native-session completion capture whose identity pins that revision, with no unresolved successor and no unsettled child receipt; failed = every current revision reached failed; cancelled = every current revision reached cancelled; partial = a current revision is still in flight, or terminal revisions carry mixed outcomes; unclosed = a current revision is terminal without that closure proof, or a continuation control is unresolved (not APPLIED, or its successor revision is outside this read window), or a child receipt is unresolved",
    owner:
      "the existing lifecycle completion producer (meri_conversations.completion_checkpoints) read over the existing run and control lineage; no second store, ledger, scheduler or table is created",
    states: jobStates,
  },
  wholeJobs: jobs,
  categories: costCategories,
  occupiedCapacity: {
    status: "unavailable",
    reason:
      "recorded durable run states cannot prove physical worker concurrency or fair tenant capacity",
  },
});

/** Recorded whole-job economics inside the admitted month window, with honest unknowns. */
export function usageOverviewFixture(): Response2 {
  return body(
    wholeJobs(
      {
        successful: { jobs: 3, attempts: 5, knownChargeMicroUsd: 450_000 },
        partial: { jobs: 1, attempts: 2, knownChargeMicroUsd: 120_000 },
        failed: { jobs: 1, attempts: 1, knownChargeMicroUsd: 0 },
        cancelled: { jobs: 0, attempts: 0, knownChargeMicroUsd: 0 },
        unclosed: { jobs: 1, attempts: 1, knownChargeMicroUsd: 30_000 },
      },
      6,
      9,
      600_000,
      150_000,
      wholeJobCoverage(5, 1, 1),
    ),
  );
}

/** The same read when no whole job closed successfully: the per-job cost has no denominator. */
export function usageOverviewFixtureWithoutSuccessfulJobs(): Response2 {
  return body(
    wholeJobs(
      {
        successful: { jobs: 0, attempts: 0, knownChargeMicroUsd: 0 },
        partial: { jobs: 0, attempts: 0, knownChargeMicroUsd: 0 },
        failed: { jobs: 0, attempts: 0, knownChargeMicroUsd: 0 },
        cancelled: { jobs: 0, attempts: 0, knownChargeMicroUsd: 0 },
        unclosed: { jobs: 0, attempts: 0, knownChargeMicroUsd: 0 },
      },
      0,
      0,
      0,
      null,
      wholeJobCoverage(0, 0, 0),
    ),
  );
}

/**
 * The same read with genuinely mixed completed accounting: the month has more completed attempts than
 * completed attempts with recorded usage, and the day has none recorded at all. The observed clock,
 * windows, policy, admission and whole-job facts stay the recorded fixture's, so only the period
 * accounting a reader compares differs. The adjacent tests put this body through the real /2 receiver
 * before any display code sees it, because a body the receiver would refuse proves nothing.
 */
export function usageOverviewFixtureMixedCompletedAccounting(): Response2 {
  const base = usageOverviewFixture(),
    day = base.periods[0]!,
    month = base.periods[2]!;
  return {
    ...base,
    periods: [
      {
        ...day,
        attempts: 3,
        states: { ...day.states, completed: 1 },
        recording: { recorded: 0, unavailable: 2, notRecorded: 1 },
        recorded: { ...day.recorded, completed: 0 },
        conversationThreads: { ...day.conversationThreads, attempts: 3 },
        completedAttempts: {
          ...day.completedAttempts,
          status: "unavailable",
          attempts: 0,
          microUsdPerCompletedAttempt: null,
          attemptsWithoutRecordedUsage: 1,
        },
        liability: {
          ...day.liability,
          recordedAttempts: 0,
          microUsdPerRecordedAttempt: null,
          unavailableAttempts: 2,
          notRecordedAttempts: 1,
        },
        lineage: { ...day.lineage, resume: { attempts: 0, chargeMicroUsd: 0 } },
      },
      base.periods[1]!,
      {
        ...month,
        attempts: 5,
        states: { ...month.states, completed: 3 },
        recording: { recorded: 1, unavailable: 2, notRecorded: 2 },
        recorded: { ...month.recorded, completed: 1 },
        conversationThreads: {
          ...month.conversationThreads,
          threads: 3,
          attempts: 5,
        },
        completedAttempts: {
          ...month.completedAttempts,
          attempts: 1,
          microUsdPerCompletedAttempt: 750_000,
          attemptsWithoutRecordedUsage: 2,
        },
        liability: {
          ...month.liability,
          recordedAttempts: 1,
          microUsdPerRecordedAttempt: 750_000,
          unavailableAttempts: 2,
          notRecordedAttempts: 2,
        },
        lineage: {
          ...month.lineage,
          resume: { attempts: 2, chargeMicroUsd: 0 },
        },
      },
    ],
  };
}
