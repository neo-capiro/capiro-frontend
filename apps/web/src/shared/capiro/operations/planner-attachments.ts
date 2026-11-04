import { z } from "zod";
import { binaryDownloadSchema, defineOperation } from "../contracts";
import { identity, plannerId } from "./planner-schemas";
const source =
  "capirov2@4be13b0 planner-attachments.controller.ts + planner-attachments.service.ts";
const attachment = z.object({
  id: plannerId,
  taskId: plannerId,
  fileName: z.string(),
  sizeBytes: z.number().int().positive(),
  uploadedBy: identity,
  archived: z.boolean(),
  createdAt: z.string(),
});
const taskParams = z.object({ taskId: plannerId }).strict();
const attachmentParams = taskParams.extend({ id: plannerId }).strict();
const limit = 25 * 1024 * 1024;
export const plannerAttachmentOperations = {
  "planner.task.attachments": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/tasks/:taskId/attachments",
    request: z.object({ params: taskParams }).strict(),
    response: z.array(attachment),
    source,
  }),
  "planner.task.attachment.upload": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/tasks/:taskId/attachments",
    request: z.object({ params: taskParams }).strict(),
    response: attachment,
    encoding: "multipart",
    multipart: {
      files: [{ field: "file", minCount: 1, maxCount: 1, maxBytes: limit }],
      bodyFields: {},
      maxFileBytes: limit,
      maxMetadataBytes: 1000,
      maxTotalBytes: 28000000,
    },
    source,
  }),
  "planner.task.attachment.archive": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/tasks/:taskId/attachments/:id",
    request: z
      .object({
        params: attachmentParams,
        body: z.object({ archived: z.boolean() }).strict(),
      })
      .strict(),
    response: attachment,
    source,
  }),
  "planner.task.attachment.download": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/tasks/:taskId/attachments/:id/download",
    request: z.object({ params: attachmentParams }).strict(),
    response: binaryDownloadSchema,
    responseMode: "binary",
    binary: {
      contentTypes: ["application/octet-stream"],
      maxBytes: limit,
      filename: "attachment.bin",
    },
    source,
  }),
};
