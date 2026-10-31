import { z } from "zod";

export const evidenceId = z.string().min(1).max(200);
export const evidenceScope = z
  .object({
    sessionKey: z.string().max(60).optional(),
    folderId: z.string().min(1).max(100).optional(),
    clientId: z.string().min(1).max(100).optional(),
  })
  .strict();
export const evidenceSource = z.object({
  id: evidenceId,
  revision: z.string(),
  title: z.string(),
  sourceUrl: z.string(),
  text: z.string(),
  observedAt: z.string(),
  complete: z.boolean(),
  authority: z.string(),
  rights: z.string(),
  sections: z
    .array(z.object({ locator: z.string(), text: z.string() }))
    .optional(),
});
