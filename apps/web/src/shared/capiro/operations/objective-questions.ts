import { z } from "zod";
import { defineOperation } from "../contracts";

const id = z.uuid();
const version = z.number().int().min(1).max(2147483647);
const common = {
  requestId: id,
  questionId: id,
  expectedVersion: z.number().int().min(0).max(2147483647),
  expectedObjectiveVersion: version,
};
export const questionCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      ...common,
      action: z.literal("create"),
      expectedVersion: z.literal(0),
      title: z.string().trim().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      ...common,
      action: z.literal("answer"),
      expectedVersion: version,
      answer: z.string().trim().min(1).max(8000),
      evidenceNote: z.string().trim().min(1).max(4000),
    })
    .strict(),
  z.object({ ...common, action: z.literal("close"), expectedVersion: version }).strict(),
  z.object({ ...common, action: z.literal("reopen"), expectedVersion: version }).strict(),
]);
export const questionSchema = z
  .object({
    id,
    version,
    title: z.string().min(1).max(2000),
    status: z.enum(["open", "answered", "closed"]),
    answer: z.string().min(1).max(8000).nullable(),
    evidenceNote: z.string().min(1).max(4000).nullable(),
    sourceObjectiveVersion: version,
    sourceRevisionId: id,
    evidenceKind: z.literal("objective_context"),
    stale: z.boolean(),
  })
  .strict()
  .refine((row) =>
    row.status === "open"
      ? row.answer === null && row.evidenceNote === null
      : row.answer !== null && row.evidenceNote !== null,
  );
export const questionReceiptSchema = z
  .object({
    requestId: id,
    actorUserId: id,
    action: z.enum(["create", "answer", "close", "reopen"]),
    committedAt: z.iso.datetime(),
    question: questionSchema,
  })
  .strict();
const params = z.object({ clientId: id, objectiveId: id }).strict();
const scope = { clientId: id, objectiveId: id, objectiveVersion: version };
export const questionListSchema = z
  .object({
    ...scope,
    total: z.number().int().nonnegative(),
    openCount: z.number().int().nonnegative(),
    items: z.array(questionSchema),
    nextCursor: id.nullable(),
  })
  .strict();
const source =
  "Core ObjectiveQuestionsController / ObjectiveQuestionsService, objective-context evidence v1";
const path = "/clients/:clientId/objectives/:objectiveId/questions";
export const questionOperations = {
  "objectives.questions.list": defineOperation({
    service: "core",
    method: "GET",
    path,
    source,
    request: z
      .object({
        params,
        query: z
          .object({
            after: id.optional(),
            status: z.enum(["open", "answered", "closed"]).optional(),
          })
          .strict(),
      })
      .strict(),
    response: questionListSchema,
  }),
  "objectives.questions.command": defineOperation({
    service: "core",
    method: "POST",
    path,
    source,
    request: z.object({ params, body: questionCommandSchema }).strict(),
    response: questionReceiptSchema,
  }),
  "objectives.questions.receipt": defineOperation({
    service: "core",
    method: "GET",
    path: path + "/receipts/:requestId",
    source,
    request: z.object({ params: params.extend({ requestId: id }) }).strict(),
    response: questionReceiptSchema,
  }),
  "objectives.questions.history": defineOperation({
    service: "core",
    method: "GET",
    path: path + "/history/:questionId",
    source,
    request: z
      .object({
        params: params.extend({ questionId: id }),
        query: z.object({ before: version.optional() }).strict(),
      })
      .strict(),
    response: z
      .object({ ...scope, items: z.array(questionReceiptSchema), nextCursor: version.nullable() })
      .strict(),
  }),
} as const;
export type Question = z.infer<typeof questionSchema>;
export type QuestionCommand = z.infer<typeof questionCommandSchema>;
export type QuestionReceipt = z.infer<typeof questionReceiptSchema>;
export function requireQuestionReceipt(
  value: unknown,
  command: QuestionCommand,
  actorUserId: string,
): QuestionReceipt {
  const receipt = questionReceiptSchema.parse(value);
  if (
    receipt.requestId !== command.requestId ||
    receipt.actorUserId !== actorUserId ||
    receipt.action !== command.action ||
    receipt.question.id !== command.questionId ||
    receipt.question.version !== command.expectedVersion + 1 ||
    receipt.question.sourceObjectiveVersion !== command.expectedObjectiveVersion
  )
    throw Error("The Question receipt does not match the original command.");
  if (command.action === "create" && receipt.question.title !== command.title)
    throw Error("Question title mismatch.");
  if (
    command.action === "answer" &&
    (receipt.question.answer !== command.answer ||
      receipt.question.evidenceNote !== command.evidenceNote ||
      receipt.question.sourceObjectiveVersion !== command.expectedObjectiveVersion)
  )
    throw Error("Question answer mismatch.");
  if (
    receipt.question.status !==
    ({ create: "open", answer: "answered", close: "closed", reopen: "open" } as const)[
      command.action
    ]
  )
    throw Error("Question status mismatch.");
  return receipt;
}
