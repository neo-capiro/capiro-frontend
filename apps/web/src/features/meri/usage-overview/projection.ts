import type { UsageOverviewResponse2 } from "@capiro/meri-contracts/conversation-usage";
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
const jobStateLabel = {
  successful: "Successful jobs",
  partial: "Partial jobs",
  failed: "Failed jobs",
  cancelled: "Cancelled jobs",
  unclosed: "Unclosed jobs",
};

export function usageSnapshotNotice(
  value: UsageOverviewResponse2,
  now: number,
) {
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
  value: UsageOverviewResponse2,
  queueHref?: string,
): UsageLimitsView {
  const { policy, monthlyAdmission: admission, queue } = value;
  const whole = value.wholeJobs;
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
        // completedAttempts.attempts IS the recorded completed count: the canonical receiver ties it to
        // recorded.completed and ties attemptsWithoutRecordedUsage to states.completed - recorded.completed,
        // so subtracting that gap again would undercount and can drive this row negative.
        attempts: `${period.attempts} total · ${period.recorded.completed} completed with recorded usage`,
        usage: `${dollars(period.knownChargeMicroUsd)} known · ${period.recording.unavailable} unavailable · ${period.recording.notRecorded} not recorded`,
      })),
    },
    wholeJobs: {
      // The month label comes from the received month period; the window start is the received
      // admission start, so the UI states no window it did not receive.
      title: `Whole jobs · ${periodLabel.month}`,
      description: `One whole job is a root objective together with every continuation of it; a single attempt, conversation thread or child assignment is never a job. Counted when the objective's root revision was created in the admitted month window from ${admission.startInclusive}.`,
      facts: [
        ...(Object.keys(jobStateLabel) as (keyof typeof jobStateLabel)[]).map(
          (state) => ({
            label: jobStateLabel[state],
            value: `${whole.states[state].jobs} jobs · ${whole.states[state].attempts} attempts · ${dollars(whole.states[state].knownChargeMicroUsd)} known SDK estimate`,
          }),
        ),
        {
          label: "Jobs with usable accounting",
          value: `${whole.coverage.jobsWithRecordedUsage} recorded · ${whole.coverage.jobsWithUnavailableUsage} without usable accounting`,
        },
        {
          label: "Continuations outside this month",
          value: `${whole.coverage.revisionsWithRootOutsideWindow} excluded and counted`,
        },
      ],
      cost: {
        label: "Cost per successful job",
        value:
          whole.microUsdPerSuccessfulJob === null
            ? "Unavailable"
            : dollars(whole.microUsdPerSuccessfulJob),
        caption: `SDK list-price estimate attributed to each objective from its root revision, and it is never a provider bill; provider billing stays unavailable. ${whole.coverage.jobsWithUnavailableUsage} jobs without usable accounting leave the known charge partial, so a missing cost is not zero.`,
      },
      footnote: `A job stays unclosed while ${whole.unsettledChildren} child receipts are unsettled, ${whole.unresolvedSuccessors} successor continuations are unresolved, or ${whole.closurePending} revisions still need their completion proof. A revision created after the window is not read, so a job whose continuation falls outside the window is reported from the revisions inside it only; a continuation whose root revision is outside the window is excluded and counted.`,
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
          detail: `${unknown} attempts created this month lack usable accounting. Whole-job cost is an SDK list-price estimate and provider billing remains unavailable; missing cost is not zero.`,
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
