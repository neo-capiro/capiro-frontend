import { z } from "zod";
import {
  parseMemoryDraftFile,
  parseMemoryDraftRead,
  parseMemoryDraftSave,
  parseMemoryDraftSubmit,
  parseMemoryDraftReceipt,
  parseMemoryDraftSubmissionReceipt,
} from "@capiro/shared/settings-memory-drafts";
import { defineOperation } from "../contracts";
import { publicContract } from "../public-contract";
const source =
  "Core settings-drafts/controller.ts @fbdcba3b981d1bba1c2055a8020f726aabce82ac";
const base = "/memory/settings/:type/:slug/drafts";
const target = z
  .object({ type: z.string().min(1).max(64), slug: z.string().min(1).max(128) })
  .strict();
const selected = target.extend({ id: z.string().uuid() }).strict();
const receipt = selected.extend({ requestId: z.string().uuid() }).strict();
const parsed = <T>(parse: (raw: unknown) => T) =>
  publicContract(parse, "Memory draft could not be verified.");
export const memoryDraftOperations = {
  "settings.memory.drafts.file": defineOperation({
    service: "core",
    method: "GET",
    path: base,
    source,
    request: z.object({ params: target }).strict(),
    response: parsed(parseMemoryDraftFile),
  }),
  "settings.memory.drafts.read": defineOperation({
    service: "core",
    method: "GET",
    path: base + "/:id",
    source,
    request: z.object({ params: selected }).strict(),
    response: parsed(parseMemoryDraftRead),
  }),
  "settings.memory.drafts.save": defineOperation({
    service: "core",
    method: "PUT",
    path: base + "/:id",
    source,
    request: z
      .object({ params: selected, body: parsed(parseMemoryDraftSave) })
      .strict(),
    response: parsed(parseMemoryDraftReceipt),
  }),
  "settings.memory.drafts.receipt": defineOperation({
    service: "core",
    method: "GET",
    path: base + "/:id/receipts/:requestId",
    source,
    request: z.object({ params: receipt }).strict(),
    response: parsed(parseMemoryDraftReceipt),
  }),
  "settings.memory.drafts.submit": defineOperation({
    service: "core",
    method: "POST",
    path: base + "/:id/submit",
    source,
    request: z
      .object({ params: selected, body: parsed(parseMemoryDraftSubmit) })
      .strict(),
    response: parsed(parseMemoryDraftSubmissionReceipt),
  }),
  "settings.memory.drafts.submissionReceipt": defineOperation({
    service: "core",
    method: "GET",
    path: base + "/:id/submissions/:requestId",
    source,
    request: z.object({ params: receipt }).strict(),
    response: parsed(parseMemoryDraftSubmissionReceipt),
  }),
} as const;
