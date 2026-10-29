import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  ordinaryDraftState,
  ordinarySaveResponse,
} from "./workspace-documents";
import { prospectWorkspaceDraft } from "./workspace-prospects";
const id = z.uuid(),
  hash = z.string().regex(/^[a-f0-9]{64}$/);
export const prospectManualInput = z
  .strictObject({
    title: z
      .string()
      .min(1)
      .max(500)
      .refine((value) => !!value.trim()),
    names: z
      .array(
        z
          .string()
          .min(1)
          .max(300)
          .refine(
            (value) =>
              !!value.trim() &&
              !["__proto__", "constructor", "prototype"].includes(value),
          ),
      )
      .min(1)
      .max(100),
    sections: z.record(z.string(), z.string().max(100000)),
  })
  .refine(
    (value) =>
      new Set(value.names).size === value.names.length &&
      Object.keys(value.sections).length === value.names.length &&
      value.names.every((name) => typeof value.sections[name] === "string"),
  );
export const prospectSaveBody = z
  .strictObject({
    requestId: id,
    expectedProspectId: id,
    expectedStateHash: hash,
    ...prospectManualInput.shape,
  })
  .refine(
    (value) =>
      prospectManualInput.safeParse({
        title: value.title,
        names: value.names,
        sections: value.sections,
      }).success &&
      new TextEncoder().encode(JSON.stringify(value)).byteLength <= 1000000,
  );
export const prospectAtomicState = ordinaryDraftState.extend({
  prospectId: id,
  clientId: z.null(),
  hashFormat: z.literal("workspace-prospect-draft-state-v1"),
  draft: prospectWorkspaceDraft,
});
export const prospectSaveResponse = ordinarySaveResponse.extend({
  receipt: ordinarySaveResponse.shape.receipt.extend({
    operation: z.literal("save_prospect_draft"),
    prospectId: id,
    clientId: z.null(),
  }),
});
export type ProspectAtomicState = z.infer<typeof prospectAtomicState>;
export type ProspectSaveBody = z.infer<typeof prospectSaveBody>;
export type ProspectSaveResponse = z.infer<typeof prospectSaveResponse>;
const source =
  "capiro-backend apps/workspace/src/drafts: atomic-draft-save.ts, prospect-draft-save.ts and drafts.controller.ts";
export const workspaceProspectSaveOperations = {
  "workspace.prospect.state": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:id/prospect-state",
    request: z.strictObject({
      params: z.strictObject({ id }),
      query: z.strictObject({ prospectId: id }),
    }),
    response: prospectAtomicState,
    source,
  }),
  "workspace.prospect.save": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:id/prospect-save",
    request: z.strictObject({
      params: z.strictObject({ id }),
      body: prospectSaveBody,
    }),
    response: prospectSaveResponse,
    source,
  }),
};
