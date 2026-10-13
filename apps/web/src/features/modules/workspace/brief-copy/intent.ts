import { z } from "zod";
import {
  briefCopyCreateBodySchema,
  briefCopySaveBodySchema,
  briefCopySourceSchema,
  briefCopyResultSchema,
} from "@/shared/capiro/operations/workspace-brief-copy";
import { sameSource } from "./admission";

const command = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("copy"), body: briefCopyCreateBodySchema }),
  z.strictObject({
    kind: z.literal("save"),
    documentId: z.uuid(),
    body: briefCopySaveBodySchema,
  }),
]);
export const copyIntentSchema = z
  .strictObject({
    command,
    source: briefCopySourceSchema,
    receipt: briefCopyResultSchema.optional(),
    stateConflict: z.literal(true).optional(),
  })
  .refine(
    (intent) =>
      !(intent.receipt && intent.stateConflict) &&
      (intent.command.kind !== "copy" ||
        sameSource(intent.command.body.source, intent.source)),
    "The command must retain exactly one source and outcome.",
  );
export type CopyIntent = z.infer<typeof copyIntentSchema>;
export const copyRecoveryContract = {
  schema: copyIntentSchema,
  requestId: (value: CopyIntent) => value.command.body.requestId,
  validateUpdate(previous: CopyIntent, next: CopyIntent) {
    if (
      JSON.stringify(previous.command) !== JSON.stringify(next.command) ||
      JSON.stringify(previous.source) !== JSON.stringify(next.source) ||
      (previous.receipt &&
        JSON.stringify(previous.receipt) !== JSON.stringify(next.receipt)) ||
      (previous.stateConflict && !next.stateConflict)
    )
      throw new Error(
        "An unresolved Workspace command must retain its exact submitted input.",
      );
  },
};

export function copyIntentScope(
  scope: { tenantId: string; userId: string; ownerId: string },
  draftId: string,
  target: string,
) {
  return JSON.stringify([
    "prospect-brief-copy",
    scope.tenantId,
    scope.userId,
    scope.ownerId,
    draftId,
    target,
  ]);
}
