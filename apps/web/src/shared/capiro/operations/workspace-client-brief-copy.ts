import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  briefCopyIdSchema,
  briefCopySourceSchema,
} from "./workspace-brief-copy";

export const clientBriefCopyTimestamp = z.iso
  .datetime()
  .refine((value) => new Date(value).toISOString() === value);
export const clientBriefCopyCommandSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: briefCopyIdSchema,
    prospectId: briefCopyIdSchema,
    clientId: briefCopyIdSchema,
    expectedProspectUpdatedAt: clientBriefCopyTimestamp,
    docTitle: z
      .string()
      .min(1)
      .max(500)
      .refine((value) => value === value.trim()),
    source: briefCopySourceSchema,
  })
  .strict()
  .refine((command) => command.source.prospectId === command.prospectId);
export const clientBriefCopyReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    operation: z.literal("copy_core_brief_to_client"),
    status: z.literal("completed"),
    tenantId: briefCopyIdSchema,
    actorId: z.string().min(1).max(200),
    prospectId: briefCopyIdSchema,
    clientId: briefCopyIdSchema,
    requestId: briefCopyIdSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    draftId: briefCopyIdSchema,
    contextItemId: briefCopyIdSchema,
    createdAt: clientBriefCopyTimestamp,
    available: z.boolean(),
  })
  .strict();
export type ClientBriefCopyCommand = z.infer<
  typeof clientBriefCopyCommandSchema
>;
export type ClientBriefCopyReceipt = z.infer<
  typeof clientBriefCopyReceiptSchema
>;
const params = z
  .object({ prospectId: briefCopyIdSchema, clientId: briefCopyIdSchema })
  .strict();
const source =
  "capirov2@4947fd4402f32f45dc0ee602093f7b4a30ef817f apps/workspace/src/documents/{client-brief-copy,client-brief-copy.controller}.ts";
export const workspaceClientBriefCopyOperations = {
  "workspace.client-brief-copy.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/prospects/:prospectId/clients/:clientId/brief-copies",
    request: z
      .object({ params, body: clientBriefCopyCommandSchema })
      .strict()
      .refine(
        ({ params, body }) =>
          params.prospectId === body.prospectId &&
          params.clientId === body.clientId,
      ),
    response: clientBriefCopyReceiptSchema,
    source,
  }),
  "workspace.client-brief-copy.receipt": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/prospects/:prospectId/clients/:clientId/brief-copies/:requestId",
    request: z
      .object({
        params: params.extend({ requestId: briefCopyIdSchema }).strict(),
      })
      .strict(),
    response: clientBriefCopyReceiptSchema,
    source,
  }),
} as const;
