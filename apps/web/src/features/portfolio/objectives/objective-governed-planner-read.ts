import type { CapiroApi } from "@/shared/capiro/http";
import {
  governedObjectiveGenerationReadRequest,
  requireGovernedObjectiveGenerationObservation,
  type GovernedObjectiveGenerationObservation,
} from "@/shared/capiro/operations/objective-governed-generation";
import {
  receiveCurrentGovernedObjectiveOutputs,
  selectCurrentGovernedObjectiveOutputs,
} from "@/shared/capiro/operations/objective-governed-outputs";
import { capiroOperations } from "@/shared/capiro/registry";
import type { Client } from "@/shared/session/client-contract";
import type { Objective } from "./contracts";

export type GovernedPlannerObjective = Pick<
  Objective,
  "clientId" | "id" | "status" | "version"
>;
export type GovernedPlannerClient = Pick<Client, "id" | "status">;
type ReadApi = Pick<CapiroApi<typeof capiroOperations>, "request">;

/** The Portfolio record and selected client are a scope fence, not work authority. */
export function currentGovernedPlannerRequest(
  objective: GovernedPlannerObjective,
  client: GovernedPlannerClient,
) {
  if (
    client.id !== objective.clientId ||
    client.status !== "active" ||
    objective.status !== "ready" ||
    !Number.isInteger(objective.version) ||
    objective.version < 1
  )
    throw new Error("This Objective is not current in the selected client.");
  return governedObjectiveGenerationReadRequest.parse({
    params: { clientId: objective.clientId, objectiveId: objective.id },
    query: { workAction: "objective.plan.prepare" },
  });
}

export function requireCurrentGovernedPlannerGeneration(
  value: unknown,
  objective: GovernedPlannerObjective,
  client: GovernedPlannerClient,
): GovernedObjectiveGenerationObservation {
  const request = currentGovernedPlannerRequest(objective, client);
  const generation = requireGovernedObjectiveGenerationObservation(
    value,
    request,
  );
  if (
    generation.objective.revision.version !== objective.version ||
    generation.objective.status !== objective.status
  )
    throw new Error(
      "The saved Objective changed. Refresh it before opening work.",
    );
  return generation;
}

export function receiveCurrentGovernedPlannerRead(
  outputValue: unknown,
  generationValue: unknown,
  objective: GovernedPlannerObjective,
  client: GovernedPlannerClient,
) {
  const request = currentGovernedPlannerRequest(objective, client);
  const generation = requireCurrentGovernedPlannerGeneration(
    generationValue,
    objective,
    client,
  );
  return receiveCurrentGovernedObjectiveOutputs(
    outputValue,
    generation,
    request,
  );
}

/** Two fresh authorized GETs must agree before navigating to Planner's own current ACL recheck. */
export async function reverifyCurrentGovernedPlannerProject(
  api: ReadApi,
  objective: GovernedPlannerObjective,
  client: GovernedPlannerClient,
  previouslySelectedProjectId: string,
  signal: AbortSignal,
) {
  const request = currentGovernedPlannerRequest(objective, client);
  signal.throwIfAborted();
  const generationValue = await api.request(
    "objectives.governedGeneration.read",
    request,
    { signal },
  );
  signal.throwIfAborted();
  const generation = requireCurrentGovernedPlannerGeneration(
    generationValue,
    objective,
    client,
  );
  const outputRequest = selectCurrentGovernedObjectiveOutputs(
    generation,
    request,
  );
  const outputValue = await api.request(
    "objectives.governedOutputs.read",
    outputRequest,
    { signal },
  );
  signal.throwIfAborted();
  const received = receiveCurrentGovernedPlannerRead(
    outputValue,
    generation,
    objective,
    client,
  );
  const selected = received.currentProject?.selection;
  if (
    !selected ||
    selected.kind !== "planner_project" ||
    selected.id !== previouslySelectedProjectId
  )
    throw new Error("The current Planner project is unavailable.");
  return `/modules/planner?${new URLSearchParams({
    view: "projects",
    clientId: request.params.clientId,
    project: selected.id,
  })}`;
}
