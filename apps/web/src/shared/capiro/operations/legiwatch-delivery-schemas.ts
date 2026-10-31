import { z } from "zod";

export const deliveryRunSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  definitionVersion: z.number(),
  audience: z.string(),
  cutoff: z.string(),
  contentHash: z.string(),
  complete: z.boolean(),
  generatedAt: z.string(),
});
export const frozenDeliveryRunSchema = deliveryRunSchema.extend({
  rendered: z.object({ html: z.string(), text: z.string() }),
});
export type FrozenDeliveryRun = z.infer<typeof frozenDeliveryRunSchema>;
export const contactSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  verified: z.boolean(),
  active: z.boolean(),
  optedOut: z.boolean(),
  version: z.number(),
});
export const listSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactIds: z.array(z.string()),
  private: z.boolean(),
  active: z.boolean(),
  version: z.number(),
});
export const recipientSelectionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("contact"),
      id: z.string(),
      role: z.enum(["to", "bcc"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("list"),
      id: z.string(),
      role: z.enum(["to", "bcc"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("manual"),
      email: z.email().max(254),
      role: z.enum(["to", "bcc"]),
    })
    .strict(),
]);
export const recipientSchema = z.object({
  email: z.string(),
  role: z.enum(["to", "bcc"]),
  name: z.string(),
  contacts: z.array(z.object({ id: z.string(), version: z.number() })),
  lists: z.array(z.object({ id: z.string(), version: z.number() })),
  manual: z.boolean(),
});
export const compositionBodySchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine((value) => !/[\r\n]/.test(value), "Subject must be one line."),
    introduction: z.string().max(20000),
    selection: z.array(recipientSelectionSchema).min(1).max(500),
  })
  .strict();
export const deliveryCompositionSchema = z.object({
  approvalHash: z.string(),
  complete: z.boolean(),
  composition: z.object({
    kind: z.literal("editorial_brief").optional(),
    runId: z.string(),
    contentHash: z.string(),
    subject: z.string(),
    introduction: z.string(),
    recipients: z.array(recipientSchema),
    html: z.string(),
    plainText: z.string(),
    envelopePolicy: z.literal("isolated_recipients"),
  }),
});
