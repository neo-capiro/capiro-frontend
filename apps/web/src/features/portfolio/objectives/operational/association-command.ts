import { z } from "zod";
import {
  operationalAssociationCommandSchema,
  operationalAssociationPayloadDigest,
  operationalAssociationReceiptSchema,
  operationalFailureSchema,
  operationalReadSchema,
  requireOperationalAssociationReceipt,
  type OperationalAssociationCommand,
  type OperationalCurrentObjective,
  type OperationalCycle,
  type OperationalProvenance,
  type OperationalRead,
} from "@/shared/capiro/operations/objective-operational";
import { canonicalOperationalJSON } from "@/shared/capiro/operations/objective-operational-semantics";

export const associationKinds = [
  "strategy",
  "planner_project",
  "planner_task",
  "outreach_session",
  "meeting",
] as const;
export type AssociationKind = (typeof associationKinds)[number];
export const associationLabels: Record<AssociationKind, string> = {
  strategy: "Strategy",
  planner_project: "Planner project",
  planner_task: "Planner task",
  outreach_session: "Outreach session",
  meeting: "Meeting",
};
// A retained review snapshot, never an authority token or a replacement owner DTO.
export const associationSourceSchema = z
  .object({
    clientId: z.uuid(),
    kind: z.enum(associationKinds),
    id: z.uuid(),
    title: z.string(),
    revision: z.string().min(1),
  })
  .strict();
export type AssociationSource = z.infer<typeof associationSourceSchema>;
const revision = z
  .object({ id: z.uuid(), version: z.number().int().positive() })
  .strict();
export const retainedAssociationSchema = z
  .object({
    command: operationalAssociationCommandSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    source: associationSourceSchema.optional(),
    linkedRevision: revision.optional(),
    receipt: operationalAssociationReceiptSchema.optional(),
    refusal: operationalFailureSchema.optional(),
  })
  .strict();
export type RetainedAssociation = z.infer<typeof retainedAssociationSchema>;

export function requireAssociationReview(
  read: OperationalRead,
  objective: OperationalCurrentObjective,
) {
  const current = operationalReadSchema.parse(read);
  if (
    current.scope.clientId !== objective.clientId ||
    current.scope.objectiveId !== objective.id ||
    current.scope.objectiveVersion !== objective.version ||
    current.scope.objectiveStatus !== objective.status ||
    current.associationSetVersion === null
  )
    throw new Error(
      "Refresh this Objective and its linked work before reviewing a change.",
    );
  return current;
}

export async function captureAssociation(
  read: OperationalRead,
  objective: OperationalCurrentObjective,
  choice:
    | { action: "link"; source: AssociationSource; cycles: OperationalCycle[] }
    | {
        action: "unlink";
        provenance: Extract<OperationalProvenance, { kind: "manual" }>;
      },
  requestId = crypto.randomUUID(),
): Promise<RetainedAssociation> {
  const current = requireAssociationReview(read, objective);
  const base = {
    schemaVersion: 1,
    requestId,
    clientId: objective.clientId,
    objectiveId: objective.id,
    expectedObjectiveVersion: objective.version,
    expectedAssociationSetVersion: current.associationSetVersion,
  };
  let command: OperationalAssociationCommand;
  if (choice.action === "link") {
    const source = associationSourceSchema.parse(choice.source);
    if (source.clientId !== objective.clientId)
      throw new Error("This source belongs to another client.");
    command = operationalAssociationCommandSchema.parse({
      ...base,
      action: "link",
      resource: { kind: source.kind, id: source.id },
      cycles: choice.cycles,
    });
    return {
      command,
      payloadDigest: await operationalAssociationPayloadDigest(command),
      source,
    };
  }
  command = operationalAssociationCommandSchema.parse({
    ...base,
    action: "unlink",
    associationId: choice.provenance.associationId,
  });
  return {
    command,
    payloadDigest: await operationalAssociationPayloadDigest(command),
    linkedRevision: revision.parse(choice.provenance.linkedRevision),
  };
}

export function requireUnchangedAssociationSource(
  reviewed: AssociationSource,
  current: AssociationSource,
) {
  if (
    canonicalOperationalJSON(associationSourceSchema.parse(reviewed)) !==
    canonicalOperationalJSON(associationSourceSchema.parse(current))
  )
    throw new Error(
      "The selected work changed or moved. Review it again before linking.",
    );
}

export async function requireRetainedAssociation(
  value: unknown,
  clientId: string,
  objectiveId: string,
) {
  const retained = retainedAssociationSchema.parse(value);
  const command = retained.command;
  if (
    command.clientId !== clientId ||
    command.objectiveId !== objectiveId ||
    (await operationalAssociationPayloadDigest(command)) !==
      retained.payloadDigest ||
    (command.action === "link" &&
      (!retained.source ||
        retained.source.clientId !== clientId ||
        retained.source.kind !== command.resource.kind ||
        retained.source.id !== command.resource.id)) ||
    (command.action === "unlink" && !retained.linkedRevision) ||
    (retained.refusal &&
      (retained.refusal.requestId !== command.requestId ||
        retained.refusal.outcome !== "rejected")) ||
    (retained.receipt && retained.refusal)
  )
    throw new Error(
      "The saved association command does not match this review.",
    );
  if (retained.receipt)
    await requireOperationalAssociationReceipt(
      retained.receipt,
      retained,
      retained.linkedRevision,
    );
  return retained;
}
