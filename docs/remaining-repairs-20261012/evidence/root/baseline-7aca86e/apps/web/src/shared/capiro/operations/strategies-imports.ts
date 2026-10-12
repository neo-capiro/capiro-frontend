import { z } from "zod";
import { defineOperation } from "../contracts";
import { strategyId } from "./strategies-schemas";

const source =
  "capirov2@4be13b0 apps/api/src/engagement/engagement.controller.ts:651,2857; engagement.service.ts:7479; apps/api-strategy/src/context/context-import.{controller,service,types}.ts and DTO";
const fileMetadata = z
  .object({
    clientId: strategyId.optional(),
    fileName: z.string().min(1).max(240),
    contentType: z.string().min(1).max(160),
  })
  .strict();
export const contextAttachment = z.object({
  id: strategyId,
  clientId: strategyId.nullable(),
  fileName: z.string(),
  contentType: z.string(),
  lifecycleStatus: z.string(),
  scanStatus: z.string(),
  byteSize: z.number().nullable(),
  s3Key: z.string(),
});
const importSource = z.object({
  attachmentId: strategyId,
  fileName: z.string(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export const importedContextDocument = z.object({
  id: z.string(),
  documentType: z.string(),
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
      evidence: z.array(z.object({ sourceRef: z.string(), quote: z.string() })),
    }),
  ),
});
const analysis = z.object({
  token: z.string().nullable(),
  source: importSource,
  documents: z.array(importedContextDocument),
  warnings: z.array(z.string()),
});
export const strategiesImportOperations = {
  "strategies.context.file.ticket": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/attachments/upload-url",
    request: z
      .object({
        body: fileMetadata
          .extend({
            contentLength: z
              .number()
              .int()
              .min(1)
              .max(25 * 1024 * 1024),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      url: z.string().url(),
      fields: z.record(z.string(), z.string()),
      s3Key: z.string(),
    }),
    source,
  }),
  "strategies.context.file.confirm": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/attachments/confirm",
    request: z
      .object({
        body: fileMetadata
          .extend({
            s3Key: z.string().min(1).max(1000),
            source: z.literal("strategy_context").optional(),
          })
          .strict(),
      })
      .strict(),
    response: contextAttachment,
    source,
  }),
  "strategies.context.files": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/attachments",
    request: z
      .object({ query: z.object({ clientId: strategyId }).strict() })
      .strict(),
    response: z.array(contextAttachment),
    source,
  }),
  "strategies.context.import.resolve": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/imports/resolve",
    request: z
      .object({
        body: z
          .object({
            clientId: strategyId,
            strategyId: strategyId.optional(),
            attachmentId: strategyId,
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      source: importSource,
      chunks: z.array(z.object({ index: z.number().int(), token: z.string() })),
      warnings: z.array(z.string()),
    }),
    timeoutMs: 180000,
    source,
  }),
  "strategies.context.import.analyze": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/imports/analyze",
    request: z
      .object({
        body: z.object({ token: z.string().min(1).max(700000) }).strict(),
      })
      .strict(),
    response: analysis,
    requestLimitBytes: 1000000,
    timeoutMs: 180000,
    source,
  }),
  "strategies.context.import.save": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/context/imports/save",
    request: z
      .object({
        body: z
          .object({
            token: z.string().min(1).max(700000),
            selectedDocumentIds: z
              .array(z.string().min(1).max(100))
              .min(1)
              .max(14),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      documents: z.array(
        z.object({
          id: strategyId,
          title: z.string(),
          templateKey: z.string(),
        }),
      ),
      warnings: z.array(z.string()),
    }),
    requestLimitBytes: 1000000,
    timeoutMs: 180000,
    source,
  }),
};
export type ContextImportDocument = z.infer<typeof importedContextDocument>;
export type ContextImportAnalysis = z.infer<typeof analysis>;
