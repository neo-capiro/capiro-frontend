import { parseWorkspaceBlueprintList } from "@capiro/shared/workspace-template-studio";
import { z } from "zod";
import { defineOperation } from "../contracts";
import { workspaceId } from "./workspace-schemas";

const source =
  "capiro-backend@4ea710ea5db3ad8f13cdf2403ee6a5f8cadc82c0; TemplateStudioController; public workspace-template-studio receivers";
const params = z.object({ blueprintId: workspaceId }).strict();
// Detail/version/compare receivers need the captured request identity. Their
// feature boundary calls the public parser; raw data is never self-bound.
export const workspaceDocumentTemplateOperations = {
  "workspace.blueprints.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/template-studio/blueprints",
    request: z.object({}).strict(),
    response: z.unknown().transform((value, context) => {
      const result = parseWorkspaceBlueprintList(value);
      if (result.ok) return result.value;
      context.addIssue({
        code: "custom",
        message: "Invalid document blueprint catalog",
      });
      return z.NEVER;
    }),
    source,
  }),
  "workspace.blueprints.detail": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/template-studio/blueprints/:blueprintId",
    request: z.object({ params }).strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.blueprints.version": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/template-studio/blueprints/:blueprintId/versions/:versionId",
    request: z
      .object({ params: params.extend({ versionId: workspaceId }).strict() })
      .strict(),
    response: z.unknown(),
    source,
  }),
  "workspace.blueprints.compare": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/template-studio/blueprints/:blueprintId/compare",
    request: z.object({ params }).strict(),
    response: z.unknown(),
    source,
  }),
} as const;
