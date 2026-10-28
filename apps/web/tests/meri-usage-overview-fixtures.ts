import type { UsageOverviewResponse } from "@capiro/meri-contracts/conversation-usage";

export function usageOverviewFixture(): UsageOverviewResponse {
  const states = () => ({
    queued: 0,
    starting: 0,
    running: 0,
    "waiting-for-approval": 0,
    paused: 0,
    completed: 2,
    failed: 1,
    cancelled: 1,
  });
  const period = (
    kind: "day" | "week" | "month",
    index: number,
  ): UsageOverviewResponse["periods"][number] => ({
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
    states: states(),
    recording: { recorded: 2, unavailable: 1, notRecorded: 1 },
    knownChargeMicroUsd: [0, 250_000, 750_000][index]!,
    completedAttemptsWithRecordedUsage: 2,
    completedAttemptKnownChargeMicroUsd: [0, 250_000, 750_000][index]!,
  });
  return {
    schemaVersion: "meri.usage-overview/1",
    observedAt: "2026-10-27T12:00:00.000Z",
    timezone: "UTC",
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
        ...states(),
        queued: 2,
        starting: 1,
        running: 1,
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
      chargeBasis: "recorded-sdk-estimate",
      providerBilledMicroUsd: null,
      completeJobCost: "unavailable",
    },
  };
}
