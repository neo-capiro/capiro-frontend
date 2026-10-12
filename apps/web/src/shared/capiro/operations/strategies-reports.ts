import { z } from "zod";
import { binaryDownloadSchema, defineOperation } from "../contracts";
import { strategyId, strategyParams } from "./strategies-schemas";

const source =
  "capirov2@4be13b0 apps/api-strategy/src/strategy/strategy.controller.ts; reports/report.types.ts; reports/dto/report-export.dto.ts; strategy/version.service.ts";
const issue = z.object({ code: z.string(), message: z.string() });
const reportOptions = z
  .object({
    audience: z.enum(["client", "internal"]).optional(),
    format: z.enum(["docx", "pptx", "pdf"]).optional(),
    useClientLogo: z.boolean().optional(),
    includeRoadmap: z.boolean().optional(),
    includeEvidenceAppendix: z.boolean().optional(),
    includeChangeLog: z.boolean().optional(),
    includeInternalNotes: z.boolean().optional(),
    includeAgentHistory: z.boolean().optional(),
    includeNarrative: z.boolean().optional(),
    includeMemberProfiles: z.boolean().optional(),
  })
  .strict();
const nodeRef = z.object({
  id: strategyId,
  title: z.string(),
  kind: z.string(),
  subject: z.string(),
});
export const strategiesReportOperations = {
  "strategies.report.preflight": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/strategies/:id/reports/preflight",
    request: z
      .object({ params: strategyParams, query: reportOptions.optional() })
      .strict(),
    response: z.object({
      report: z.object({
        strategyId,
        title: z.string(),
        type: z.string(),
        ready: z.boolean(),
        asOf: z.string(),
        formats: z.array(z.enum(["docx", "pptx", "pdf"])),
        audience: z.enum(["client", "internal"]),
        format: z.enum(["docx", "pptx", "pdf"]),
        snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
        readiness: z.enum(["ready", "review", "blocked"]),
      }),
      client: z.object({ id: strategyId, name: z.string() }),
      version: z.object({
        id: strategyId.nullable(),
        createdAt: z.string().nullable(),
        note: z.string().nullable(),
      }),
      errors: z.array(issue),
      warnings: z.array(issue),
      narrative: z.object({
        available: z.boolean(),
        reason: z.string().nullable(),
        requested: z.boolean(),
      }),
    }),
    source,
  }),
  "strategies.report.export.docx": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/strategies/:id/reports/export",
    request: z
      .object({
        params: strategyParams,
        body: reportOptions
          .required({ audience: true, format: true })
          .extend({
            format: z.literal("docx"),
            expectedSnapshotHash: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
          })
          .strict(),
      })
      .strict(),
    responseMode: "binary",
    binary: {
      contentTypes: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      maxBytes: 30_000_000,
      filename: "strategy-report.docx",
    },
    response: binaryDownloadSchema,
    timeoutMs: 180000,
    source,
  }),
  "strategies.report.export.pptx": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/strategies/:id/reports/export",
    request: z
      .object({
        params: strategyParams,
        body: reportOptions
          .required({ audience: true, format: true })
          .extend({
            format: z.literal("pptx"),
            expectedSnapshotHash: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
          })
          .strict(),
      })
      .strict(),
    responseMode: "binary",
    binary: {
      contentTypes: [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ],
      maxBytes: 30_000_000,
      filename: "strategy-report.pptx",
    },
    response: binaryDownloadSchema,
    timeoutMs: 180000,
    source,
  }),
  "strategies.report.export.pdf": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/strategies/:id/reports/export",
    request: z
      .object({
        params: strategyParams,
        body: reportOptions
          .required({ audience: true, format: true })
          .extend({
            format: z.literal("pdf"),
            expectedSnapshotHash: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
          })
          .strict(),
      })
      .strict(),
    responseMode: "binary",
    binary: {
      contentTypes: ["application/pdf"],
      maxBytes: 30_000_000,
      filename: "strategy-report.pdf",
    },
    response: binaryDownloadSchema,
    timeoutMs: 180000,
    source,
  }),
  "strategies.version.impact": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/strategies/:id/versions/:versionId/restore-impact",
    request: z
      .object({
        params: strategyParams.extend({ versionId: strategyId }).strict(),
      })
      .strict(),
    response: z.object({
      versionId: strategyId,
      noOp: z.boolean(),
      nodes: z.object({
        added: z.array(nodeRef),
        revived: z.array(nodeRef),
        changed: z.array(
          nodeRef.extend({ changedFields: z.array(z.string()) }),
        ),
        removed: z.array(nodeRef),
        unchangedCount: z.number(),
      }),
      artifacts: z.object({
        workspaceDraftsAffected: z.number(),
        outreachRecordsAffected: z.number(),
        deleted: z.literal(0),
      }),
      runs: z.object({ activeCount: z.number(), historicalCount: z.number() }),
      provenance: z.object({
        nodesArchivedWithProvenance: z.number(),
        snapshotCarriesProvenance: z.boolean(),
        nodesReCreatedWithoutProvenance: z.number(),
      }),
    }),
    source,
  }),
};
