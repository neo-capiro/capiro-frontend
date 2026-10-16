"use client";
import Link from "next/link";
import { planHref } from "@/shared/capiro/operations/strategy-materialization";
import type { PlanState } from "./objective-plan-session";
import type { ObjectivePlanFlow } from "./objective-plan-flow";

export function ObjectivePlanOutcome({
  state,
  flow,
  locked,
}: {
  state: PlanState;
  flow: ObjectivePlanFlow;
  locked: boolean;
}) {
  const value = state.verified && !locked ? state.response : undefined;
  return (
    <section className="stack" aria-label="Generated Planner plan">
      <h4>Planner plan</h4>
      <p>
        The Strategy is saved. Plan preparation is a separate saved operation.
      </p>
      {state.busy && (
        <p role="status">Verifying and preparing the Planner plan.</p>
      )}
      {state.error && <p role="alert">{state.error}</p>}
      {state.failure && !!state.failure.issues.length && (
        <ul>
          {state.failure.issues.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      )}
      {state.request && (
        <small>
          Plan request: {state.request.requestId}. Closing this view does not
          cancel saved work.
        </small>
      )}
      {value && (
        <>
          <p role="status">
            {value.status === "prepared"
              ? "Plan prepared."
              : value.status === "prepared_with_issues"
                ? "Plan prepared; review the reported issues."
                : "Plan was saved, but some outputs are currently unavailable."}
          </p>
          <p>
            {value.counts.createdProjects} generated projects;{" "}
            {value.counts.createdTasks} generated tasks. Current human edits are
            preserved.
          </p>
          {!!value.issues.length && (
            <ul>
              {value.issues.map((issue, i) => (
                <li key={i}>{issue.message}</li>
              ))}
            </ul>
          )}
          {value.status !== "partial" && (
            <Link className="button primary" href={planHref(value)}>
              Review generated Planner plan
            </Link>
          )}
        </>
      )}
      {!value && !state.busy && (
        <button
          className="button primary"
          type="button"
          disabled={locked}
          onClick={() => void flow.resume()}
        >
          {state.request
            ? "Recover same plan request"
            : "Continue plan preparation"}
        </button>
      )}
      {state.request && (
        <button
          className="button"
          type="button"
          disabled={locked || state.busy}
          onClick={() => void flow.refresh()}
        >
          Refresh plan receipt
        </button>
      )}
      <p>
        Generated plans use normal Planner defaults. No outreach, background
        workflow or external action is activated by this step.
      </p>
    </section>
  );
}
