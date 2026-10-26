import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  templateBase,
  templateCreationReceipt,
  templateDetail,
  templateId,
  templateScope,
  templateSpec,
  templateSummary,
  templateUseReceipt,
  templateVersion,
  templateApplicationReceipt,
} from "./outreach-template-schemas";

const source =
  "capirov2@4be13b0 apps/api/src/outreach-v3/templates/outreach-template.controller.ts, contract.ts, service.ts and repository projection";
const path = "/engagement/outreach-v3/templates";
const params = z.object({ templateId }).strict();
const read = z.object({ params }).strict();
const metadata = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().max(1000).optional(),
    campaignType: z.string().max(60).optional(),
    scope: templateScope,
    clientId: templateId.optional(),
  })
  .strict();
export const outreachTemplateOperations = {
  "workspace.templates": defineOperation({
    service: "core",
    method: "GET",
    path,
    request: z
      .object({
        query: z
          .object({
            includeArchived: z.boolean().optional(),
            clientId: templateId.optional(),
            search: z.string().max(160).optional(),
            campaignType: z.string().max(60).optional(),
            mineOnly: z.boolean().optional(),
            sort: z.enum(["updated", "name", "usage", "last_used"]).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(templateSummary),
    source,
  }),
  "workspace.template": defineOperation({
    service: "core",
    method: "GET",
    path: `${path}/:templateId`,
    request: z
      .object({
        params,
        query: z
          .object({ clientId: templateId.optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: templateDetail,
    source,
  }),
  "workspace.template.create": defineOperation({
    service: "core",
    method: "POST",
    path: `${path}/from-scratch`,
    request: z
      .object({
        body: metadata
          .omit({ scope: true, clientId: true })
          .extend({ spec: templateSpec })
          .strict(),
      })
      .strict(),
    response: templateCreationReceipt,
    source,
  }),
  "workspace.template.from-campaign": defineOperation({
    service: "core",
    method: "POST",
    path: `${path}/from-session`,
    request: z
      .object({ body: metadata.extend({ sessionId: templateId }).strict() })
      .strict(),
    response: templateCreationReceipt,
    source,
  }),
  "workspace.template.metadata": defineOperation({
    service: "core",
    method: "PATCH",
    path: `${path}/:templateId`,
    request: z.object({ params, body: metadata }).strict(),
    response: templateBase,
    source,
  }),
  "workspace.template.draft": defineOperation({
    service: "core",
    method: "PATCH",
    path: `${path}/:templateId/draft`,
    request: z
      .object({ params, body: z.object({ spec: templateSpec }).strict() })
      .strict(),
    response: z.object({
      templateId,
      version: templateVersion,
      published: z.literal(false),
    }),
    source,
  }),
  "workspace.template.publish": defineOperation({
    service: "core",
    method: "POST",
    path: `${path}/:templateId/publish`,
    request: z
      .object({
        params,
        body: z.object({ expectedDraftVersionId: templateId }).strict(),
      })
      .strict(),
    response: z.object({
      templateId,
      version: templateVersion,
      published: z.literal(true),
      replayed: z.boolean(),
    }),
    source,
  }),
  "workspace.template.archive": defineOperation({
    service: "core",
    method: "POST",
    path: `${path}/:templateId/archive`,
    request: read,
    response: z.object({ id: templateId, status: z.literal("archived") }),
    source,
  }),
  "workspace.template.duplicate": defineOperation({
    service: "core",
    method: "POST",
    path: `${path}/:templateId/duplicate`,
    request: z
      .object({
        params,
        body: z.object({ clientId: templateId.optional() }).strict(),
      })
      .strict(),
    response: templateCreationReceipt,
    source,
  }),
  "workspace.template.use": defineOperation({
    service: "core",
    method: "POST",
    path: `${path}/:templateId/use`,
    request: z
      .object({
        params,
        body: z
          .object({
            requestKey: templateId,
            title: z.string().max(240).optional(),
            clientId: templateId.optional(),
            variableValues: z
              .record(
                z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
                z.string().max(500),
              )
              .optional(),
          })
          .strict(),
      })
      .strict(),
    response: templateUseReceipt,
    source,
  }),
  "workspace.template.provenance": defineOperation({
    service: "core",
    method: "GET",
    path: `${path}/provenance/:sessionId`,
    request: z
      .object({ params: z.object({ sessionId: templateId }).strict() })
      .strict(),
    response: z
      .object({
        sessionId: templateId,
        templateId,
        templateName: z.string(),
        templateVersionId: templateId,
        versionNumber: z.number().int(),
        contentHash: z.string(),
        applicationId: templateId,
        appliedByUserId: z.string(),
        appliedAt: z.string(),
        receiptJsonb: templateApplicationReceipt,
      })
      .nullable(),
    source:
      "capiro-backend@caa7cc04b6 outreach-template.service.ts getProvenance; canonical current client access",
  }),
};
