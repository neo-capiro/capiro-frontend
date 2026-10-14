"use client";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  readObjectiveLocation,
  requireObjectiveBinding,
  type ObjectiveDestinationQuery,
} from "../../../shared/capiro/operations/objective-destination-binding";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ObjectiveDestinationFrame,
  ObjectiveDestinationUnavailable,
  ObjectiveObservation,
} from "../objective-destinations/ObjectiveDestinationFrame";

function SavedTarget({
  query,
  targetId,
}: {
  query: ObjectiveDestinationQuery;
  targetId: string;
}) {
  const result = useCapiroQuery("directory.objectiveDestination", {
    params: { clientId: query.clientId, targetId },
    query,
  });
  let value = result.data,
    error = result.error;
  try {
    if (value) requireObjectiveBinding(value, targetId, query);
  } catch (cause) {
    value = undefined;
    error =
      cause instanceof Error ? cause : new Error("Saved target unavailable.");
  }
  return (
    <ObjectiveDestinationFrame
      title="Objective saved Directory target"
      selected={query}
      loading={result.loading}
      error={error}
      reload={result.reload}
    >
      {value && (
        <article>
          <h2>Saved Directory target</h2>
          <dl>
            <dt>Source directory</dt>
            <dd>{value.target.sourceDirectory}</dd>
            <dt>Stored member identity</dt>
            <dd>{value.target.memberId}</dd>
          </dl>
          <p>This saved target does not include a current Directory profile.</p>
          <ObjectiveObservation destination={value.destination} />
        </article>
      )}
    </ObjectiveDestinationFrame>
  );
}

export function ObjectiveDirectoryDestination({
  children,
}: {
  children: ReactNode;
}) {
  const params = useSearchParams();
  if (
    !["targetId", "objectiveId", "objectiveVersion"].some((key) =>
      params.has(key),
    )
  )
    return children;
  const selected = readObjectiveLocation(params, ["targetId"]);
  if (!selected) return <ObjectiveDestinationUnavailable />;
  return (
    <SavedTarget query={selected.query} targetId={selected.ids.targetId} />
  );
}
