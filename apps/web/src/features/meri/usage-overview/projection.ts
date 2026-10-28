import type { UsageOverviewResponse } from "@capiro/meri-contracts/conversation-usage";
import type { UsageLimitsView } from "../screens/settings/UsageLimitsScreen";

const dollars = (micro: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(micro / 1_000_000);
const periodLabel = {
  day: "Today · UTC",
  week: "This week · Monday UTC",
  month: "This month · UTC",
};

export function usageSnapshotNotice(value: UsageOverviewResponse, now: number) {
  const age = now - Date.parse(value.observedAt);
  return {
    title:
      age > 60_000
        ? "Usage snapshot may be stale"
        : age < -60_000
          ? "Usage observation clock differs"
          : "Recorded workspace usage",
    detail: `Observed ${value.observedAt}. Refresh to check changes. These are recorded SDK estimates, not provider billing.`,
    tone:
      age > 60_000 || age < -60_000
        ? ("warning" as const)
        : ("neutral" as const),
  };
}

/** Render only received numeric facts; no local policy thresholds or zero-for-unknown. */
export function projectUsageOverview(
  value: UsageOverviewResponse,
  queueHref?: string,
): UsageLimitsView {
  const { policy, monthlyAdmission: admission, queue } = value;
  const unknown =
    value.periods[2].recording.unavailable +
    value.periods[2].recording.notRecorded;
  return {
    heading: {
      title: "Usage and limits",
      description:
        "Tenant usage includes failed, cancelled and retried attempts. Attempts are not complete jobs.",
    },
    metrics: [
      ...value.periods.map((period) => ({
        label: periodLabel[period.kind],
        value: dollars(period.knownChargeMicroUsd),
        caption: `${period.attempts} attempts · known SDK estimate; ${period.recording.unavailable + period.recording.notRecorded} without usable accounting`,
      })),
      {
        label: "Recorded active work",
        value: String(
          queue.states.queued +
            queue.states.starting +
            queue.states.running +
            queue.states["waiting-for-approval"] +
            queue.states.paused,
        ),
        caption: `${queue.states.queued} queued · ${queue.states.running} running · ${queue.states["waiting-for-approval"]} awaiting approval · ${queue.states.paused} paused. Durable states do not prove physical activity.`,
      },
      {
        label: "Available capacity",
        value: "Unavailable",
        caption:
          "Worker availability, provider quotas and fair tenant capacity are not observed by this accounting view.",
      },
    ],
    runUsage: {
      title: "Recorded attempt periods",
      firstColumnLabel: "Period",
      rows: value.periods.map((period) => ({
        id: period.kind,
        run: periodLabel[period.kind],
        outcome: `${period.states.completed} completed · ${period.states.failed} failed · ${period.states.cancelled} cancelled`,
        attempts: `${period.attempts} total · ${period.completedAttemptsWithRecordedUsage} completed with recorded usage`,
        usage: `${dollars(period.knownChargeMicroUsd)} known · ${period.recording.unavailable} unavailable · ${period.recording.notRecorded} not recorded`,
      })),
    },
    configuration: {
      title: "Effective workspace policy",
      fields: [],
      limits:
        policy.status === "configured"
          ? [
              { label: "Policy revision", value: String(policy.revision) },
              {
                label: "Monthly admission cap",
                value: dollars(policy.monthlyCapMicroUsd),
              },
              {
                label: "Maximum SDK turns per attempt",
                value: String(policy.maxTurns),
              },
              {
                label: "Maximum SDK budget per attempt",
                value: dollars(policy.maxBudgetMicroUsd),
              },
            ]
          : [{ label: "Configured policy", value: "Unavailable" }],
      footnote:
        "These limits are read only. Authorized administrators manage policy through the existing workspace policy owner.",
    },
    limitStates: {
      title: "Admission and queue",
      description:
        "The monthly admission ledger counts accounting recorded this month, including earlier-created attempts.",
      notices: [
        {
          title:
            admission.reached === true
              ? "Workspace monthly cap reached"
              : admission.reached === false
                ? "Known spend below the monthly cap"
                : "Monthly cap status unavailable",
          detail: `${dollars(admission.knownChargeMicroUsd)} known recorded this month${admission.remainingKnownMicroUsd === null ? "; remaining amount unavailable" : ` · ${dollars(admission.remainingKnownMicroUsd)} remaining against known spend`}. ${admission.unavailableRecordedAttempts} records have unavailable cost. Concurrent admitted work can exceed the cap.`,
          tone: admission.reached === true ? "warning" : "neutral",
        },
        {
          title: "Accounting coverage",
          detail: `${unknown} attempts created this month lack usable accounting. Complete-job cost and provider bills are unavailable; missing cost is not zero.`,
          tone: unknown ? "warning" : "neutral",
        },
      ],
      queue: {
        label: "View permitted runs",
        ...(queueHref ? { href: queueHref } : {}),
      },
    },
  };
}
