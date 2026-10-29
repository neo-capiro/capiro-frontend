import { z } from "zod";
import {
  objectiveFieldsSchema,
  objectiveStatus,
} from "@/shared/capiro/operations/objective-fields";
export {
  objectiveFieldsSchema,
  askTypes,
  objectiveStatusLabels as statusLabels,
} from "@/shared/capiro/operations/objective-fields";
export type ObjectiveFields = z.infer<typeof objectiveFieldsSchema>;
export const readinessFields = [
  ["outcome", "Outcome"],
  ["governmentProblem", "Government problem"],
  ["askType", "Type of ask"],
  ["minimumWin", "Minimum win"],
] as const;

// This is the confirmed four-field form rule, not semantic quality scoring.
// Persisted readiness is still supplied by the server and checked at the boundary.
export function objectiveReadiness(fields: ObjectiveFields) {
  const checklist = {
    outcome: Boolean(fields.outcome.trim()),
    governmentProblem: Boolean(fields.governmentProblem.trim()),
    askType: fields.askType !== null,
    minimumWin: Boolean(fields.minimumWin.trim()),
  };
  const completedFields = readinessFields.filter(
    ([key]) => checklist[key],
  ).length;
  return {
    checklist,
    completedFields,
    requiredFields: 4 as const,
    isReady: completedFields === 4,
  };
}

export const objectiveSchema = objectiveFieldsSchema
  .extend({
    id: z.string().uuid(),
    clientId: z.string().uuid(),
    requestId: z.string().uuid(),
    ownerUserId: z.string().nullable(),
    status: objectiveStatus,
    version: z.number().int().positive(),
    readyAt: z.string().nullable(),
    reviewRequestedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    readiness: z.object({
      isReady: z.boolean(),
      completedFields: z.number().int().min(0).max(4),
      requiredFields: z.literal(4),
      checklist: z.object({
        outcome: z.boolean(),
        governmentProblem: z.boolean(),
        askType: z.boolean(),
        minimumWin: z.boolean(),
      }),
    }),
  })
  .refine((record) => {
    const expected = objectiveReadiness(record);
    return (
      record.readiness.isReady === expected.isReady &&
      record.readiness.completedFields === expected.completedFields &&
      readinessFields.every(
        ([key]) => record.readiness.checklist[key] === expected.checklist[key],
      ) &&
      (record.status === "draft" || expected.isReady)
    );
  }, "Objective readiness does not match its four required fields");
export type Objective = z.infer<typeof objectiveSchema>;
export const scopedObjectivesSchema = (clientId: string) =>
  z
    .array(objectiveSchema)
    .refine(
      (records) =>
        records.every((record) => record.clientId === clientId) &&
        new Set(records.map((record) => record.id)).size === records.length,
      "Objectives do not identify the selected client uniquely",
    );
export const emptyFields: ObjectiveFields = {
  outcome: "",
  governmentProblem: "",
  askType: null,
  minimumWin: "",
  limits: "",
};
