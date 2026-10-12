"use client";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  readObjectiveLocation,
  requireObjectiveBinding,
  type ObjectiveDestinationQuery,
} from "../../../shared/capiro/operations/objective-destination-binding";
import { requireObjectiveWorkspace } from "../../../shared/capiro/operations/objective-work-destinations";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ObjectiveDestinationFrame,
  ObjectiveDestinationUnavailable,
} from "./ObjectiveDestinationFrame";
import {
  ObjectiveStrategyView,
  ObjectivePlannerView,
  ObjectiveWorkspaceView,
} from "./ObjectiveWorkViews";

type Kind = "strategy" | "planner_task" | "workspace_saved_revision";
type Selection = {
  query: ObjectiveDestinationQuery;
  ids: Record<string, string>;
};
function checked<Value>(
  value: Value | undefined,
  validate: (value: Value) => Value,
  error?: Error,
) {
  try {
    return { value: value && validate(value), error };
  } catch (cause) {
    return {
      value: undefined,
      error:
        cause instanceof Error
          ? cause
          : new Error("Objective destination unavailable."),
    };
  }
}
function StrategyDestination({ query, ids }: Selection) {
  const result = useCapiroQuery("strategies.objectiveDestination", {
    params: { id: ids.strategyId! },
    query,
  });
  const current = checked(
    result.data,
    (v) => requireObjectiveBinding(v, ids.strategyId!, query),
    result.error,
  );
  return (
    <ObjectiveDestinationFrame
      title="Objective Strategy destination"
      selected={query}
      loading={result.loading}
      error={current.error}
      reload={result.reload}
    >
      {current.value && <ObjectiveStrategyView value={current.value} />}
    </ObjectiveDestinationFrame>
  );
}
function PlannerDestination({ query, ids }: Selection) {
  const result = useCapiroQuery("planner.objectiveDestination", {
    params: { id: ids.taskId! },
    query,
  });
  const current = checked(
    result.data,
    (v) => requireObjectiveBinding(v, ids.taskId!, query),
    result.error,
  );
  return (
    <ObjectiveDestinationFrame
      title="Objective Planner task destination"
      selected={query}
      loading={result.loading}
      error={current.error}
      reload={result.reload}
    >
      {current.value && <ObjectivePlannerView value={current.value} />}
    </ObjectiveDestinationFrame>
  );
}
function WorkspaceDestination({ query, ids }: Selection) {
  const result = useCapiroQuery("workspace.objectiveDestination", {
    params: { draftId: ids.draftId!, versionId: ids.versionId! },
    query,
  });
  const current = checked(
    result.data,
    (v) => requireObjectiveWorkspace(v, ids.draftId!, ids.versionId!, query),
    result.error,
  );
  return (
    <ObjectiveDestinationFrame
      title="Objective saved Workspace revision"
      selected={query}
      loading={result.loading}
      error={current.error}
      reload={result.reload}
    >
      {current.value && <ObjectiveWorkspaceView value={current.value} />}
    </ObjectiveDestinationFrame>
  );
}
const resourceKeys = {
  strategy: ["strategyId"],
  planner_task: ["taskId"],
  workspace_saved_revision: ["draftId", "versionId"],
} as const;
export function ObjectiveDestinationRoute({
  kind,
  children,
}: {
  kind: Kind;
  children: ReactNode;
}) {
  const params = useSearchParams();
  if (!params.has("objectiveId") && !params.has("objectiveVersion"))
    return children;
  const selected = readObjectiveLocation(params, resourceKeys[kind]);
  if (!selected) return <ObjectiveDestinationUnavailable />;
  // The ordinary editor is not mounted while a bound read is selected.
  if (kind === "strategy") return <StrategyDestination {...selected} />;
  if (kind === "planner_task") return <PlannerDestination {...selected} />;
  return <WorkspaceDestination {...selected} />;
}
