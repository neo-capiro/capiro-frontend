"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  readObjectiveCalendarLocation,
  requireObjectiveCalendarOccurrence,
} from "./objective-occurrence";

type Selection = NonNullable<ReturnType<typeof readObjectiveCalendarLocation>>;
function BoundOccurrence({ query, occurrenceKey, taskId }: Selection) {
  const result = useCapiroQuery("planner.objectiveDestination", {
    params: { id: taskId },
    query,
  });
  let current:
      | ReturnType<typeof requireObjectiveCalendarOccurrence>
      | undefined,
    error = result.error;
  try {
    if (result.data)
      current = requireObjectiveCalendarOccurrence(
        result.data,
        occurrenceKey,
        query,
      );
  } catch (cause) {
    error =
      cause instanceof Error
        ? cause
        : new Error("Calendar occurrence unavailable.");
  }
  return (
    <section className="page stack" aria-label="Objective Calendar occurrence">
      <Link
        href={`/portfolio/${query.clientId}/objectives?objective=${query.objectiveId}`}
      >
        Back to current Objective
      </Link>
      <h1>Objective Calendar occurrence</h1>
      <QueryState
        pending={result.loading}
        error={error}
        retry={result.reload}
      />
      {current && !error && !result.loading && (
        <article className="card stack">
          <h2>{current.title}</h2>
          <p>
            {current.key.endsWith(":start")
              ? "Scheduled start"
              : "Due occurrence"}
          </p>
          <p>
            {current.day}
            {current.startAt
              ? ` · ${current.startAt} · source timezone ${current.timeZone}`
              : " · civil date (no instant conversion)"}
          </p>
          <p>{current.provenance}</p>
          <details>
            <summary>Objective and occurrence details</summary>
            <p>Occurrence {current.key}</p>
            <p>
              Current task version {result.data!.destination.destinationVersion}
            </p>
            <p>
              Objective version {query.objectiveVersion} · immutable revision{" "}
              {result.data!.destination.objectiveRevisionId}
            </p>
            <p>Client {query.clientId}</p>
          </details>
          <p>
            This is an observation of one current Planner occurrence. Editing,
            Meetings and general Calendar browsing remain in their existing
            views.
          </p>
        </article>
      )}
      <button
        className="button"
        disabled={result.loading}
        onClick={result.reload}
      >
        Recheck current Calendar occurrence
      </button>
    </section>
  );
}
export function ObjectiveCalendarDestination({
  children,
  expectedClientId,
}: {
  children: ReactNode;
  expectedClientId?: string;
}) {
  const params = useSearchParams();
  if (
    !["objectiveId", "objectiveVersion", "occurrence"].some((key) =>
      params.has(key),
    )
  )
    return children;
  const selected = readObjectiveCalendarLocation(new URLSearchParams(params));
  if (
    !selected ||
    (expectedClientId &&
      selected.query.clientId !== expectedClientId.toLowerCase())
  )
    return (
      <section role="alert">
        <h1>Objective Calendar occurrence unavailable</h1>
        <p>
          An exact saved Objective, client and Planner occurrence are required.
        </p>
      </section>
    );
  return <BoundOccurrence key={selected.occurrenceKey} {...selected} />;
}
