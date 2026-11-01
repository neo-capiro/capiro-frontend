import { z } from "zod";

/** Classic catalog projection; system IDs are not UUIDs. Prompts are inert text. */
export const classicOutreachTemplate = z.object({
  id: z.string().min(1),
  source: z.enum(["system", "user"]),
  name: z.string().min(1),
  category: z.string(),
  prompt: z.string(),
  description: z.string().nullable(),
  samplePreview: z.string().nullable(),
  tone: z.string(),
  usageCount: z.number().int().nonnegative(),
});
export type ClassicOutreachTemplate = z.infer<typeof classicOutreachTemplate>;

/** Core DTO/service limits; no caller-supplied actor, tenant, client or request key. */
export const createClassicTemplateInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(50).optional(),
    prompt: z.string().trim().min(1).max(5000),
    description: z.string().trim().max(500).optional(),
    tone: z.string().trim().min(1).max(50).optional(),
  })
  .strict();
export type CreateClassicTemplateInput = z.infer<
  typeof createClassicTemplateInput
>;

/** POST returns a raw row, not GET's source:'user' projection. Retain only its ID. */
export const createdClassicTemplate = z.object({ id: z.uuid() });
