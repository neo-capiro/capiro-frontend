"use client";
import {
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { useCapiroQuery } from "@/shared/capiro/queries";
import {
  requireGeneratedStrategy,
  type ObjectiveGenerationJob,
} from "@/shared/capiro/operations/objective-generation";
import type { SavedStrategySelection } from "@/shared/capiro/operations/objective-saved-review";
import { ObjectivePlanSession } from "./objective-plan-session";
import { createPlanRecovery } from "./objective-plan-recovery";
import { ObjectivePlanOutcome } from "./ObjectivePlanOutcome";

export function ObjectiveLegacyPlanBoundary({
  selection,
  actor,
  children,
}: {
  selection: SavedStrategySelection;
  actor: ClientWriter;
  children: ReactNode;
}) {
  const read = useCapiroQuery("strategies.objectiveDraftJob", {
    params: { jobId: selection.ids.generatedJobId },
  });
  let job: ObjectiveGenerationJob | undefined;
  if (!read.loading && !read.error && read.data) {
    try {
      job = requireGeneratedStrategy(read.data, selection);
    } catch {
      /* No substituted original journal. */
    }
  }
  if (!job)
    return (
      <p role="status">
        Verifying the saved Strategy and original Planner recovery.
      </p>
    );
  return (
    <OriginalPlan
      key={JSON.stringify([actor.tenantId, actor.userId, selection])}
      job={job}
      actor={actor}
    >
      {children}
    </OriginalPlan>
  );
}
function OriginalPlan({
  job,
  actor,
  children,
}: {
  job: ObjectiveGenerationJob;
  actor: ClientWriter;
  children: ReactNode;
}) {
  const api = useApi(),
    cache = useQueryClient();
  const session = useMemo(
    () =>
      new ObjectivePlanSession(
        api,
        job,
        createPlanRecovery(api, cache, actor, job),
      ),
    [api, cache, actor.tenantId, actor.userId, job],
  );
  const state = useSyncExternalStore(
    session.subscribe,
    session.snapshot,
    session.snapshot,
  );
  useLayoutEffect(() => {
    let current = true;
    queueMicrotask(() => {
      if (current) void session.refresh();
    });
    return () => {
      current = false;
      session.suspend();
    };
  }, [session]);
  if (state.request)
    return (
      <section
        className="card stack"
        aria-label="Original Planner attempt recovery"
      >
        <p>
          An original Planner attempt is retained for this saved Strategy.
          Reconcile that result before authorizing another plan.
        </p>
        <ObjectivePlanOutcome
          state={state}
          locked={state.busy}
          onContinue={() => void session.refresh()}
          onRefresh={() => void session.refresh()}
        />
      </section>
    );
  if (!state.ready || state.busy || state.error)
    return (
      <section className="card stack">
        <p role={state.error ? "alert" : "status"}>
          {state.error ??
            "Checking original Planner recovery before new consent."}
        </p>
        <button
          className="button"
          type="button"
          disabled={state.busy}
          onClick={() => void session.refresh()}
        >
          Recheck original Planner recovery
        </button>
      </section>
    );
  return children;
}
