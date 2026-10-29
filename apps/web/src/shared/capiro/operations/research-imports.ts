import { z } from "zod";
import { defineOperation } from "../contracts";
const source =
  "capiro-backend@fba7ed5d1 packages/shared/src/research-portfolios.ts; research-portfolios.controller.ts; research-portfolio-import.service.ts";
const params = z.object({ id: z.uuid() }).strict();
export const researchWorksheetKinds = [
  "membership",
  "rules",
  "reviews",
] as const;
export const researchImportActions = [
  "preview",
  "apply",
  "pause",
  "resume",
  "cancel",
  "retry",
  "reconcile",
  "compensate",
] as const;
const record = z.record(z.string(), z.unknown());
const job = z.object({
  id: z.uuid(),
  portfolioId: z.uuid(),
  operationKey: z.string(),
  worksheetKind: z.enum(researchWorksheetKinds),
  status: z.string(),
  fileName: z.string(),
  originalHash: z.string(),
  originalSize: z.number(),
  targetRevision: z.number(),
  rowCount: z.number(),
  appliedCount: z.number(),
  updatedAt: z.string(),
});
export const researchImportDetail = job.extend({
  rows: z.array(
    z.object({
      id: z.uuid(),
      rowNumber: z.number(),
      rowIdentity: z.string(),
      rawCells: record,
      parsedData: record,
      repairs: record,
      validationIssues: z.array(z.string()),
      selected: z.boolean(),
      previewClassification: z.string().nullable(),
      previewReason: z.string().nullable(),
      finalOutcome: z.string().nullable(),
      finalReason: z.string().nullable(),
      targetKind: z.string().nullable(),
      targetId: z.string().nullable(),
    }),
  ),
  mappings: z.array(
    z.object({
      id: z.uuid(),
      version: z.number(),
      mapping: record,
      schemaVersion: z.string(),
      createdAt: z.string(),
    }),
  ),
  attempts: z.array(
    z.object({
      id: z.uuid(),
      action: z.string(),
      operationKey: z.string(),
      outcome: z.string(),
      errorCode: z.string().nullable(),
      receipt: record,
      createdAt: z.string(),
    }),
  ),
  compensationReceipts: z.array(
    z.object({
      id: z.uuid(),
      operationKey: z.string(),
      previewHash: z.string(),
      status: z.string(),
      effects: z.array(record),
      createdAt: z.string(),
    }),
  ),
});
export const researchImportOperations = {
  "research.imports.create": defineOperation({
    service: "core",
    requestLimitBytes: 7_100_000,
    method: "POST",
    path: "/research-portfolios/:id/imports",
    request: z
      .object({
        params,
        body: z
          .object({
            operationKey: z.string().min(1).max(200),
            expectedRevision: z.number().int().nonnegative(),
            worksheetKind: z.enum(researchWorksheetKinds),
            fileName: z.string().min(1).max(500),
            mediaType: z.enum(["text/csv", "application/vnd.ms-excel"]),
            contentBase64: z.string().min(1).max(6990508),
            schemaVersion: z.string().max(100),
            mapping: z.record(z.string(), z.string()),
          })
          .strict(),
      })
      .strict(),
    response: job,
    source,
  }),
  "research.imports.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/imports/:jobId",
    request: z
      .object({ params: params.extend({ jobId: z.uuid() }).strict() })
      .strict(),
    response: researchImportDetail,
    source,
  }),
  "research.imports.action": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/imports/:jobId/:action",
    request: z
      .object({
        params: params
          .extend({ jobId: z.uuid(), action: z.enum(researchImportActions) })
          .strict(),
        body: z
          .object({
            operationKey: z.string().min(1).max(200),
            expectedRevision: z.number().int().nonnegative().optional(),
            selectedRowIds: z.array(z.uuid()).optional(),
            repairs: z.record(z.string(), record).optional(),
            compensationPreviewHash: z.string().optional(),
          })
          .strict(),
      })
      .strict(),
    response: researchImportDetail,
    source,
  }),
};
