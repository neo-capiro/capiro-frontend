import {
  governedObjectiveGenerationReadRequest,
  requireGovernedObjectiveGenerationObservation,
  type GovernedObjectiveGenerationObservation,
} from "@/shared/capiro/operations/objective-governed-generation";
import type { Client } from "@/shared/session/client-contract";
import type { Objective } from "./contracts";

export type StrategyIntakeObjective = Pick<
  Objective,
  "clientId" | "id" | "status" | "version"
>;
export type StrategyIntakeClient = Pick<Client, "id" | "status">;

export function strategyIntakeReadRequest(
  objective: StrategyIntakeObjective,
  client: StrategyIntakeClient,
) {
  if (
    client.id !== objective.clientId ||
    client.status === "archived" ||
    objective.status !== "ready" ||
    !Number.isInteger(objective.version) ||
    objective.version < 1
  )
    throw new Error("Select a current client and save a ready Objective.");
  return governedObjectiveGenerationReadRequest.parse({
    params: { clientId: objective.clientId, objectiveId: objective.id },
    query: { workAction: "objective.strategy.draft" },
  });
}

/** A read supplies current scope and CAS fields. Only Core can authorize intake. */
export function requireInitialStrategyIntakeSource(
  value: unknown,
  objective: StrategyIntakeObjective,
  client: StrategyIntakeClient,
): GovernedObjectiveGenerationObservation {
  const request = strategyIntakeReadRequest(objective, client);
  const read = requireGovernedObjectiveGenerationObservation(value, request);
  if (
    read.objective.status !== "ready" ||
    read.objective.revision.version !== objective.version ||
    read.requestedSource.revision.id !== read.objective.revision.id ||
    read.requestedSource.revision.version !== read.objective.revision.version ||
    read.control.version !== 0 ||
    read.control.currentAuthorizationRequestId !== null ||
    read.control.cancelledAt !== null ||
    read.consent !== null ||
    read.accounting !== null ||
    read.commandReceipt !== null
  )
    throw new Error(
      "Current Strategy intake is unavailable. Refresh the saved Objective and work status.",
    );
  // A normal Core read can report outcome_unconfirmed without write-side
  // absence proof. This local guard is never a substitute for Core admission.
  return read;
}
