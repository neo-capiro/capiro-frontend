"use client";
import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useApi } from "@/shared/portfolio/api/provider";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  objectiveGenerationHref,
  type ObjectiveGenerationJob,
} from "@/shared/capiro/operations/objective-generation";
import { ObjectivePlanSession } from "./objective-plan-session";
import { createPlanRecovery } from "./objective-plan-recovery";
import { ObjectivePlanOutcome } from "./ObjectivePlanOutcome";

/** Renders only the current validated job selected by the governed intake owner. */
export function ObjectiveGenerationOutcome({
  job,
  actor,
}: {
  job: ObjectiveGenerationJob;
  actor: ClientWriter;
}) {
  const receipt = job.objectiveGeneration;
  return (
    <div className="stack" aria-label="Strategy generation result">
      <p role="status">Generation {job.status}.</p>
      {job.progressText && <p>{job.progressText}</p>}
      <p>Context coverage: {receipt.context.state}.</p>
      {receipt.context.compiledAt && (
        <p>Compiled: {receipt.context.compiledAt}</p>
      )}
      {receipt.context.reobservedAt && (
        <p>
          Rechecked: {receipt.context.reobservedAt}. History reflects these
          observations.
        </p>
      )}
      {!!receipt.context.issues.length && (
        <ul>
          {receipt.context.issues.map((issue, index) => (
            <li key={index}>
              {issue.group}: {issue.message}
            </li>
          ))}
        </ul>
      )}
      {receipt.failure && <p role="alert">{receipt.failure.message}</p>}
      {job.status === "completed" && (
        <>
          <Link
            className="button primary"
            href={objectiveGenerationHref({
              jobId: job.jobId,
              status: job.status,
              objectiveGeneration: job.objectiveGeneration,
            })}
          >
            Open generated Strategy receipt
          </Link>
          <PreparedPlan key={job.jobId} job={job} actor={actor} />
        </>
      )}
    </div>
  );
}
function PreparedPlan({
  job,
  actor,
}: {
  job: ObjectiveGenerationJob;
  actor: ClientWriter;
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
    [api, cache, actor, job],
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
  return (
    <ObjectivePlanOutcome
      state={state}
      locked={state.busy}
      onContinue={() => void session.execute()}
      onRefresh={() => void session.refresh()}
    />
  );
}
