import { z } from "zod";
import { binaryDownloadSchema, defineOperation } from "../contracts";
import { documentParams, workspaceId } from "./workspace-schemas";

const source =
  "capirov2@4be13b0 apps/workspace/src/hillday/hillday-export.service.ts and hillday-file.controller.ts";
const exportReceipt = z.object({
  exportId: workspaceId,
  documentId: workspaceId,
  status: z.enum(["queued", "ready", "failed"]),
  format: z.literal("pdf"),
  pageSize: z.enum(["letter", "a4"]),
  filename: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  url: z
    .string()
    .regex(
      /^\/workspace-api\/hillday\/files\/[a-f0-9-]+\/[a-f0-9-]+\?exp=\d+&sig=[a-f0-9]{64}$/i,
    )
    .nullable(),
  expiresAt: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
});
export const workspaceExportOperations = {
  "workspace.hillday.export": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/hillday/documents/:id/exports",
    request: z
      .object({
        params: documentParams,
        body: z
          .object({ pageSize: z.enum(["letter", "a4"]).optional() })
          .strict(),
      })
      .strict(),
    response: exportReceipt,
    source,
  }),
  "workspace.hillday.export.status": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/documents/:id/exports/:exportId",
    request: z
      .object({
        params: documentParams.extend({ exportId: workspaceId }).strict(),
      })
      .strict(),
    response: exportReceipt,
    source,
  }),
  "workspace.hillday.download": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/hillday/files/:id/:exportId",
    request: z
      .object({
        params: documentParams.extend({ exportId: workspaceId }).strict(),
        query: z
          .object({
            exp: z.string().regex(/^\d{10,16}$/),
            sig: z.string().regex(/^[a-f0-9]{64}$/i),
          })
          .strict(),
      })
      .strict(),
    responseMode: "binary",
    binary: {
      contentTypes: ["application/pdf"],
      maxBytes: 30_000_000,
      filename: "hill-day-schedule.pdf",
    },
    response: binaryDownloadSchema,
    source,
  }),
  "workspace.draft.pdf": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/export/pdf",
    request: z
      .object({
        params: z.object({ draftId: workspaceId }).strict(),
        query: z
          .object({
            part: z
              .union([z.literal("all"), z.literal("main"), workspaceId])
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    responseMode: "binary",
    binary: {
      contentTypes: ["application/pdf"],
      maxBytes: 30_000_000,
      filename: "workspace-document.pdf",
    },
    response: binaryDownloadSchema,
    source: "capirov2@4be13b0 apps/workspace/src/export/export.controller.ts",
  }),
  "workspace.draft.docx": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/export/docx",
    request: z
      .object({
        params: z.object({ draftId: workspaceId }).strict(),
        query: z
          .object({
            part: z
              .union([z.literal("all"), z.literal("main"), workspaceId])
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    responseMode: "binary",
    binary: {
      contentTypes: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      maxBytes: 30_000_000,
      filename: "workspace-document.docx",
    },
    response: binaryDownloadSchema,
    source: "capirov2@4be13b0 apps/workspace/src/export/export.controller.ts",
  }),
};
