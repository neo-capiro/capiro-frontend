import type { PlanStep } from "../../ui/RunPlanCard";

/**
 * The meeting-brief run's four-step plan shared by 02.01 and 02.03: scope and
 * client-signal analysis are done; research is working and the brief is queued.
 */
export function meetingBriefPlan(scopeDetail: string) {
  const steps: readonly PlanStep[] = [
    { id: "scope", title: "Confirm scope", detail: scopeDetail, done: true },
    {
      id: "research",
      title: "Research developments",
      detail: "Research specialist · Working",
      done: false,
    },
    {
      id: "signals",
      title: "Analyze client signals",
      detail: "Data specialist · Complete",
      done: true,
    },
    {
      id: "brief",
      title: "Create and verify brief",
      detail: "Document specialist · Queued",
      done: false,
    },
  ];
  return { title: "Meeting brief · 4 steps", steps };
}
