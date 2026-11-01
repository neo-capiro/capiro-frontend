"use client";
import {
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  useRef,
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
  const sourceKey = JSON.stringify([actor.tenantId, actor.userId, selection]);
  const verified = useRef<{ key: string; job: ObjectiveGenerationJob } | null>(
    null,
  );
  const read = useCapiroQuery("strategies.objectiveDraftJob", {
    params: { jobId: selection.ids.generatedJobId },
  });
  let job: ObjectiveGenerationJob | undefined;
  if (!read.loading && !read.error && read.data) {
    try {
      job = requireGeneratedStrategy(read.data, selection);
      verified.current = { key: sourceKey, job };
    } catch {
      /* No substituted original journal. */
    }
  }
  const unavailable = read.loading ? (
    <p role="status">
      Verifying the saved Strategy and original Planner recovery.
    </p>
  ) : (
    <section className="card stack">
      <p role="alert">
        The saved Strategy could not be verified. Original Planner recovery and
        new consent remain unavailable.
      </p>
      <button type="button" className="button" onClick={read.reload}>
        Retry saved Strategy read
      </button>
    </section>
  );
  const original =
    job ??
    (verified.current?.key === sourceKey ? verified.current.job : undefined);
  if (!original) return unavailable;
  return (
    <OriginalPlan
      key={sourceKey}
      job={original}
      actor={actor}
      blocked={!job ? unavailable : undefined}
    >
      {children}
    </OriginalPlan>
  );
}
function OriginalPlan({
  job,
  actor,
  children,
  blocked,
}: {
  job: ObjectiveGenerationJob;
  actor: ClientWriter;
  children: ReactNode;
  blocked?: ReactNode;
}) {
  const api = useApi(),
    cache = useQueryClient();
  // The keyed parent owns exact job/source identity. A fresh read of that same
  // immutable identity must not forget a request remembered by this mounted view.
  const originalJob = useRef(job).current;
  const session = useMemo(
    () =>
      new ObjectivePlanSession(
        api,
        originalJob,
        createPlanRecovery(api, cache, actor, originalJob),
      ),
    [api, cache, actor.tenantId, actor.userId, originalJob],
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
  if (blocked) return blocked;
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
