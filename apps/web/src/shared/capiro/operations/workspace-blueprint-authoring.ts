import { parseWorkspaceBlueprintDefinition } from "@capiro/shared/workspace-template-studio";
import { z } from "zod";
import { defineOperation } from "../contracts";
import { workspaceId } from "./workspace-schemas";

const source =
  "Core TemplateStudioController; canonical public workspace-template-studio authoring receivers";
const params = z.object({ blueprintId: workspaceId }).strict();
const versionParams = params.extend({ versionId: workspaceId }).strict();
export const studioVersionHash = z.string().regex(/^[a-f0-9]{64}$/);
const expected = z
  .object({ expectedDefinitionHash: studioVersionHash })
  .strict();
const definition = z.unknown().transform((value, context) => {
  const result = parseWorkspaceBlueprintDefinition(value);
  if (result.ok) return result.value;
  context.addIssue({
    code: "custom",
    message: "Complete the blueprint definition before saving.",
  });
  return z.NEVER;
});
// Receipts are refined by the public receivers against the captured request
// identity in the feature. A response never supplies its own expectation.
export const workspaceBlueprintAuthoringOperations = {
  "workspace.blueprints.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/blueprints",
    request: z
      .object({
        body: z
          .object({
            slug: z.string().trim().min(1),
            name: z.string().trim().min(1),
            product: z.string().trim().min(1),
            description: z.string().optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.blueprints.createVersion": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/blueprints/:blueprintId/versions",
    request: z.object({ params, body: z.object({}).strict() }).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.blueprints.cloneVersion": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/blueprints/:blueprintId/clone",
    request: z
      .object({
        params,
        body: expected.extend({ fromVersionId: workspaceId }).strict(),
      })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.blueprints.save": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/template-studio/blueprints/:blueprintId/versions/:versionId",
    request: z
      .object({
        params: versionParams,
        body: expected.extend({ definition }).strict(),
      })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.blueprints.test": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/blueprints/:blueprintId/versions/:versionId/test",
    request: z
      .object({
        params: versionParams,
        body: z.object({ answers: z.record(z.string(), z.unknown()) }).strict(),
      })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.blueprints.publish": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/blueprints/:blueprintId/versions/:versionId/publish",
    request: z.object({ params: versionParams, body: expected }).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.blueprints.retire": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/template-studio/blueprints/:blueprintId/versions/:versionId/retire",
    request: z.object({ params: versionParams, body: expected }).strict(),
    response: z.unknown(),
    source,
  }),
} as const;
