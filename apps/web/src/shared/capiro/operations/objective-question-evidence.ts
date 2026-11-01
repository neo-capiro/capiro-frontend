import { z } from "zod";
import { defineOperation } from "../contracts";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const document = { kind: z.literal("document"), attachmentId: z.uuid() };
const news = {
  kind: z.literal("news"),
  articleId: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/),
  observationId: digest,
};
export const questionEvidenceReferenceSchema = z.discriminatedUnion("kind", [
  z.object(document).strict(),
  z.object(news).strict(),
]);
export const questionEvidenceSelectorSchema = z.discriminatedUnion("kind", [
  z.object({ ...document, expectedDigest: digest }).strict(),
  z.object({ ...news, expectedDigest: digest }).strict(),
]);
export const questionEvidenceSelectionsSchema = z
  .array(questionEvidenceSelectorSchema)
  .max(8)
  .refine(
    (rows) =>
      new Set(
        rows.map((row) =>
          row.kind === "document" ? `document:${row.attachmentId}` : `news:${row.articleId}`,
        ),
      ).size === rows.length,
    "Select each source once.",
  );
export const questionEvidenceSnapshotSchema = z
  .object({
    selector: questionEvidenceSelectorSchema,
    version: z.string().min(1).max(320),
    digest,
    provenanceDigest: digest,
    title: z.string().min(1).max(2000),
    sourceSystem: z.enum(["client_document", "retained_news"]),
    sourceUrl: z
      .url()
      .refine((value) => ["http:", "https:"].includes(new URL(value).protocol))
      .nullable(),
    summary: z.string().max(24000).nullable(),
    rights: z.enum(["private_document", "headline_link", "excerpt", "full_text"]),
    complete: z.boolean(),
    observedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict()
  .refine((row) => row.digest === row.selector.expectedDigest);
const params = z.object({ clientId: z.uuid(), objectiveId: z.uuid() }).strict();
const scope = {
  clientId: z.uuid(),
  objectiveId: z.uuid(),
  objectiveVersion: z.number().int().positive(),
};
const source = "Core ObjectiveQuestionsService / canonical ObjectiveEvidenceSourceService";
const path = "/clients/:clientId/objectives/:objectiveId/questions/evidence";
export const questionDocumentHistoryRequestSchema = z.discriminatedUnion("from", [
  z
    .object({
      from: z.literal("preview"),
      selector: z.object({ ...document, expectedDigest: digest }).strict(),
    })
    .strict(),
  z
    .object({
      from: z.literal("question"),
      questionId: z.uuid(),
      questionVersion: z.number().int().positive().max(2147483647),
      digest,
    })
    .strict(),
]);
export const questionEvidenceOperations = {
  "objectives.questions.evidence.documentHistory": defineOperation({
    service: "core",
    method: "POST",
    path: path + "/document-history",
    source,
    request: z.object({ params, body: questionDocumentHistoryRequestSchema }).strict(),
    response: z
      .object({
        ...scope,
        anchor: z
          .object({
            attachmentId: z.uuid(),
            contentHash: digest,
            headId: z.uuid(),
            originalId: z.uuid(),
            versionCount: z.number().int().positive(),
          })
          .strict(),
      })
      .strict(),
  }),
  "objectives.questions.evidence.list": defineOperation({
    service: "core",
    method: "GET",
    path,
    source,
    request: z
      .object({
        params,
        query: z
          .object({
            kind: z.enum(["document", "news"]),
            search: z.string().max(200).optional(),
            cursor: z.string().max(200).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z
      .object({
        ...scope,
        items: z.array(questionEvidenceSnapshotSchema),
        nextCursor: z.string().nullable(),
      })
      .strict(),
  }),
  "objectives.questions.evidence.preview": defineOperation({
    service: "core",
    method: "POST",
    path: path + "/preview",
    source,
    request: z
      .object({ params, body: z.object({ reference: questionEvidenceReferenceSchema }).strict() })
      .strict(),
    response: z.object({ ...scope, snapshot: questionEvidenceSnapshotSchema }).strict(),
  }),
} as const;
export type QuestionEvidenceSelector = z.infer<typeof questionEvidenceSelectorSchema>;
export type QuestionEvidenceSnapshot = z.infer<typeof questionEvidenceSnapshotSchema>;
export function questionEvidenceReference(selector: QuestionEvidenceSelector) {
  return selector.kind === "document"
    ? { kind: selector.kind, attachmentId: selector.attachmentId }
    : { kind: selector.kind, articleId: selector.articleId, observationId: selector.observationId };
}
