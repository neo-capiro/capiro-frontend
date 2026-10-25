import { z } from "zod";
import { defineOperation } from "../contracts";
import { strategyTypes } from "./strategies-schemas";
import {
  governedObjectiveCommandReceipt,
  governedObjectiveGenerationObservation,
  governedObjectiveId as id,
  governedObjectiveVersion as version,
  type GovernedObjectiveGenerationObservation,
} from "./objective-governed-generation";

/** Core PR61's reserved-intake route, not a Strategy output or execution receipt. */
export const governedObjectiveStrategyIntakeSource =
  "capiro-backend@eef7cd1b874549bc2115b313ebb00fe83e2e57da docs/objective-strategy-core-20261017/STRATEGY-INTAKE-CONTRACT.md";

export const governedObjectiveStrategyIntakeCommand = z.strictObject({
  schemaVersion: z.literal(1),
  requestId: id,
  command: z.literal("retry"),
  workAction: z.literal("objective.strategy.draft"),
  expectedObjectiveVersion: version,
  expectedControlVersion: z.literal(0),
  expectedCanonicalBindingVersion: version,
  targetAuthorizationRequestId: z.null(),
});

export const governedObjectiveStrategyIntakeBody = z
  .strictObject({
    schemaVersion: z.literal(2),
    command: governedObjectiveStrategyIntakeCommand,
    selection: z.strictObject({
      type: z.enum(strategyTypes),
      generationRequestId: id,
    }),
  })
  .refine(
    (value) => value.command.requestId !== value.selection.generationRequestId,
    "Command and generation request IDs must differ.",
  );

export const governedObjectiveStrategyIntakeRequest = z.strictObject({
  params: z.strictObject({ clientId: id, objectiveId: id }),
  body: governedObjectiveStrategyIntakeBody,
});

export const governedObjectiveStrategyIntakeResponse = z.strictObject({
  schemaVersion: z.literal(2),
  generationJobId: id,
  commandReceipt: governedObjectiveCommandReceipt,
  selection: z.strictObject({
    type: z.enum(strategyTypes),
    generationRequestId: id,
  }),
});

export type GovernedObjectiveStrategyIntakeRequest = z.infer<
  typeof governedObjectiveStrategyIntakeRequest
>;
export type GovernedObjectiveStrategyIntakeResponse = z.infer<
  typeof governedObjectiveStrategyIntakeResponse
>;

/** Bind the reserved-job receipt to the retained wrapper and the exact prior Core observation. */
export function requireGovernedObjectiveStrategyIntakeReceipt(
  value: unknown,
  request: GovernedObjectiveStrategyIntakeRequest,
  expected: GovernedObjectiveGenerationObservation,
): GovernedObjectiveStrategyIntakeResponse {
  const sent = governedObjectiveStrategyIntakeRequest.parse(request);
  const observed = governedObjectiveGenerationObservation.parse(expected);
  const received = governedObjectiveStrategyIntakeResponse.parse(value);
  const command = sent.body.command;
  const receipt = received.commandReceipt;
  if (
    observed.clientId !== sent.params.clientId ||
    observed.objective.id !== sent.params.objectiveId ||
    observed.workAction !== command.workAction ||
    observed.objective.status !== "ready" ||
    observed.requestedSource.revision.id !== observed.objective.revision.id ||
    observed.requestedSource.revision.version !==
      observed.objective.revision.version ||
    observed.objective.revision.version !== command.expectedObjectiveVersion ||
    observed.requestedSource.canonicalBindingVersion !==
      command.expectedCanonicalBindingVersion ||
    observed.control.version !== command.expectedControlVersion ||
    observed.control.currentAuthorizationRequestId !== null ||
    observed.control.cancelledAt !== null ||
    observed.consent !== null ||
    observed.accounting !== null ||
    observed.commandReceipt !== null ||
    receipt.clientId !== sent.params.clientId ||
    receipt.objectiveId !== sent.params.objectiveId ||
    receipt.requestId !== command.requestId ||
    receipt.command !== command.command ||
    receipt.workAction !== command.workAction ||
    receipt.commandRevision.id !== observed.objective.revision.id ||
    receipt.commandRevision.version !== observed.objective.revision.version ||
    receipt.sourceRevision.id !== observed.requestedSource.revision.id ||
    receipt.sourceRevision.version !==
      observed.requestedSource.revision.version ||
    receipt.controlVersionBefore !== command.expectedControlVersion ||
    receipt.targetAuthorizationRequestId !==
      command.targetAuthorizationRequestId ||
    received.selection.type !== sent.body.selection.type ||
    received.selection.generationRequestId !==
      sent.body.selection.generationRequestId
  )
    throw new Error(
      "The governed Strategy intake receipt does not match the retained request and source.",
    );
  return received;
}

export const governedObjectiveStrategyIntakeOperation = defineOperation({
  service: "core",
  method: "POST",
  path: "/clients/:clientId/objectives/:objectiveId/generation/strategy-commands",
  request: governedObjectiveStrategyIntakeRequest,
  response: governedObjectiveStrategyIntakeResponse,
  source: governedObjectiveStrategyIntakeSource,
  requestLimitBytes: 1024,
});
