import { z } from "zod";
import { binaryDownloadSchema, defineOperation } from "../contracts";
const source =
  "capiro-backend@fba7ed5d1 packages/shared/src/research-portfolios.ts; research-portfolios.controller.ts; research-portfolio-output.service.ts";
const params = z.object({ id: z.uuid() }).strict();
const jobParams = params.extend({ jobId: z.uuid() }).strict();
export const researchOutputJob = z.object({
  id: z.uuid(),
  status: z.string(),
  operationKey: z.string(),
  attemptCount: z.number(),
  lastError: z.string().nullable(),
  updatedAt: z.string(),
  request: z.object({
    portfolioId: z.uuid(),
    snapshotId: z.string().nullable(),
    selectedSections: z.array(z.string()),
    includeSourceAppendix: z.boolean(),
    format: z.literal("csv"),
  }),
  attempts: z.array(
    z.object({
      id: z.uuid(),
      action: z.string(),
      outcome: z.string(),
      errorCode: z.string().nullable(),
      startedAt: z.string(),
    }),
  ),
  artifact: z
    .object({
      id: z.uuid(),
      contentHash: z.string(),
      byteSize: z.number(),
      mediaType: z.literal("text/csv"),
      fileName: z.string(),
    })
    .nullable(),
});
export const researchClientFileReceipt = z.object({
  operationKey: z.string().optional(),
  id: z.uuid(),
  artifactId: z.uuid(),
  clientId: z.uuid(),
  attachmentId: z.uuid(),
  attachmentName: z.string(),
  lifecycleStatus: z.string().nullable(),
  scanStatus: z.string().nullable(),
  indexedAt: z.string().nullable(),
  openPath: z.string(),
  createdAt: z.string(),
});
const jobAction = (action: "cancel" | "retry" | "reconcile") =>
  defineOperation({
    service: "core",
    method: "POST",
    path: `/research-portfolios/:id/output-jobs/:jobId/${action}`,
    request: z.object({ params: jobParams }).strict(),
    response: researchOutputJob,
    source,
  });
export const researchOutputOperations = {
  "research.outputs.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/outputs",
    request: z
      .object({
        params,
        body: z
          .object({
            operationKey: z.string().min(1).max(200),
            snapshotId: z.uuid().nullable().optional(),
            selectedSections: z
              .array(
                z.enum(["analytics", "totals", "contributions", "sources"]),
              )
              .min(1)
              .max(4),
            includeSourceAppendix: z.boolean(),
            format: z.literal("csv"),
          })
          .strict(),
      })
      .strict(),
    response: researchOutputJob,
    source,
  }),
  "research.outputs.job": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/output-jobs/:jobId",
    request: z.object({ params: jobParams }).strict(),
    response: researchOutputJob,
    source,
  }),
  "research.outputs.cancel": jobAction("cancel"),
  "research.outputs.retry": jobAction("retry"),
  "research.outputs.reconcile": jobAction("reconcile"),
  "research.outputs.download": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/outputs/:outputId/download",
    request: z
      .object({ params: params.extend({ outputId: z.uuid() }).strict() })
      .strict(),
    response: binaryDownloadSchema,
    responseMode: "binary",
    binary: {
      contentTypes: ["text/csv"],
      maxBytes: 30_000_000,
      filename: "research-portfolio.csv",
    },
    source,
  }),
  "research.outputs.file": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/outputs/:outputId/client-files",
    request: z
      .object({
        params: params.extend({ outputId: z.uuid() }).strict(),
        body: z
          .object({
            operationKey: z.string().min(1).max(200),
            clientId: z.uuid(),
          })
          .strict(),
      })
      .strict(),
    response: researchClientFileReceipt,
    source,
  }),
};
