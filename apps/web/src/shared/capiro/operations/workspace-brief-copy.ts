import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  briefCopyIdSchema,
  briefCopyStateSchema,
  briefCopyDetailSchema,
  briefCopyCreateBodySchema,
  briefCopySaveBodySchema,
  briefCopyResultSchema,
} from "./workspace-brief-copy-schemas";
export * from "./workspace-brief-copy-schemas";
export {
  briefCopyBodySchema,
  type BriefCopyBody,
} from "./workspace-brief-copy-body";

const source =
  "capirov2@e0446e3f865899b03d654657db903cea54dfaf0a docs/prospect-brief-workspace-copy-20261013/RECEIVING-CONTRACT.md; apps/workspace/src/documents/{documents.controller,prospect-brief-copy,prospect-brief-copy-contract}.ts";
const params = z.object({ draftId: briefCopyIdSchema }).strict();
const documentParams = params.extend({ docId: briefCopyIdSchema }).strict();
export const workspaceBriefCopyOperations = {
  "workspace.brief-copy.state": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/documents/brief-copy-state",
    request: z.object({ params }).strict(),
    response: briefCopyStateSchema,
    source,
  }),
  "workspace.brief-copy.detail": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/documents/:docId/brief-copy",
    request: z.object({ params: documentParams }).strict(),
    response: briefCopyDetailSchema,
    source,
  }),
  "workspace.brief-copy.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/documents/core-brief-copy",
    request: z.object({ params, body: briefCopyCreateBodySchema }).strict(),
    response: briefCopyResultSchema.refine(
      ({ receipt }) => receipt.operation === "copy_core_brief",
    ),
    source,
  }),
  "workspace.brief-copy.save": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/documents/:docId/brief-copy-save",
    request: z
      .object({ params: documentParams, body: briefCopySaveBodySchema })
      .strict(),
    response: briefCopyResultSchema.refine(
      ({ receipt }) => receipt.operation === "save_brief_copy",
    ),
    // Complete body plus bounded command metadata and the browser's params envelope.
    requestLimitBytes: 4_010_000,
    source,
  }),
} as const;
