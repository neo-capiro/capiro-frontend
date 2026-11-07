import {
  governedObjectiveGenerationReadRequest,
  requireGovernedObjectiveGenerationObservation,
  type GovernedObjectiveGenerationObservation,
} from "@/shared/capiro/operations/objective-governed-generation";
import type { Client } from "@/shared/session/client-contract";
import type { Objective } from "./contracts";
import type { GovernedObjectiveStrategyIntakeResponse } from "@/shared/capiro/operations/objective-governed-strategy-intake";
import type { ObjectiveGenerationJob } from "@/shared/capiro/operations/objective-generation";

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
export function requireStrategyIntakeSource(
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
    read.control.cancelledAt !== null ||
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

export function requireInitialStrategyIntakeSource(
  value: unknown,
  objective: StrategyIntakeObjective,
  client: StrategyIntakeClient,
) {
  const read = requireStrategyIntakeSource(value, objective, client);
  if (read.control.version !== 0 || read.consent !== null)
    throw new Error(
      "Current Strategy intake is unavailable. Refresh the saved Objective and work status.",
    );
  return read;
}

/** This only offers explicit consent. Core proves all prior work stopped before
 * publication under its write locks; expiry or a GET is never absence proof. */
export function requireRetryStrategyIntakeSource(
  value: unknown,
  objective: StrategyIntakeObjective,
  client: StrategyIntakeClient,
  accepted?: GovernedObjectiveStrategyIntakeResponse,
  job?: ObjectiveGenerationJob,
) {
  const read = requireStrategyIntakeSource(value, objective, client);
  const consent = read.consent;
  // Another browser may have advanced consent while this journal still names
  // its earlier accepted job. Offer explicit consent only after the current
  // consent expires; Core must still prove all prior work stopped atomically.
  const laterExpiredConsent =
    accepted &&
    consent?.expired &&
    consent.id !== accepted.commandReceipt.authorizationRequestId &&
    read.control.version > accepted.commandReceipt.controlVersionAfter;
  if (
    !consent ||
    read.control.version < 1 ||
    (accepted &&
      ((!laterExpiredConsent &&
        (accepted.commandReceipt.authorizationRequestId !== consent.id ||
          accepted.commandReceipt.controlVersionAfter !== read.control.version)) ||
        accepted.commandReceipt.sourceRevision.id !==
          read.requestedSource.revision.id ||
        !job ||
        job.jobId !== accepted.generationJobId))
  )
    throw new Error(
      "Refresh the previous generation attempt before requesting another.",
    );
  const expired = consent.expired && (!job || job.status === "queued");
  const failed =
    accepted &&
    job?.status === "failed" &&
    job.objectiveGeneration.failure?.code === "OBJECTIVE_CONTEXT_INCOMPLETE" &&
    job.objectiveGeneration.context.state === "incomplete";
  if (job?.objectiveGeneration.result || (!expired && !failed))
    throw new Error(
      "The previous generation must be expired or confirmed failed before requesting another.",
    );
  return read;
}
