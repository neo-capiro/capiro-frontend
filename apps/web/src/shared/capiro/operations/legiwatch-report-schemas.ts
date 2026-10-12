import { z } from "zod";
import { officialDateSchema } from "./legiwatch-calendar-schemas";

export const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  archived: z.boolean(),
  ownerClerkId: z.string().nullable(),
  otherUserAccess: z.string(),
  clientId: z.string().nullable(),
  defaultSession: z.string(),
  jurisdiction: z.string(),
  version: z.number(),
  canEdit: z.boolean(),
  canManage: z.boolean(),
  count: z.number(),
});
export const folderBillSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  sponsor: z.string().nullable(),
  jurisdiction: z.string(),
  sessionKey: z.string(),
  status: z.string().nullable(),
  latestAction: z.string().nullable(),
  latestActionAt: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});
export const reportSettingsSchema = z.object({
  committees: z.enum(["off", "current", "all"]),
  actions: z.enum(["off", "last", "last3", "five_days", "all"]),
  relations: z.enum(["off", "title", "title_action"]),
  summary: z.boolean(),
  order: z.enum(["number", "folder", "last_action"]),
  links: z.enum(["public", "subscribers"]),
  priority: z.boolean(),
  externalComments: z.boolean(),
  internalComments: z.boolean(),
  billNotes: z.boolean(),
  reportComments: z.boolean(),
  priorityOnly: z.boolean(),
  acceptOptionalGaps: z.boolean(),
  includeArchived: z.boolean(),
  actionDateFrom: officialDateSchema.optional(),
  actionDateTo: officialDateSchema.optional(),
});
export type ReportSettings = z.infer<typeof reportSettingsSchema>;
export const defaultReportSettings: ReportSettings = {
  committees: "off",
  actions: "last",
  relations: "off",
  summary: true,
  order: "number",
  links: "subscribers",
  priority: false,
  externalComments: false,
  internalComments: false,
  billNotes: false,
  reportComments: false,
  priorityOnly: false,
  acceptOptionalGaps: false,
  includeArchived: false,
};
export const reportSchema = z.object({
  id: z.string(),
  name: z.string(),
  folderIds: z.array(z.string()),
  jurisdiction: z.string(),
  sessionKey: z.string(),
  settings: reportSettingsSchema,
  version: z.number(),
  archived: z.boolean(),
  canEdit: z.boolean().optional(),
  sourceId: z.string().nullable().optional(),
  lastGeneratedAt: z.string().nullable().optional(),
});
export type LegiWatchReport = z.infer<typeof reportSchema>;
export const reportBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    folderIds: z.array(z.string().min(1).max(200)).min(1).max(100),
    jurisdiction: z.string().regex(/^[A-Z]{2}$/),
    sessionKey: z.string().min(1).max(60),
    settings: reportSettingsSchema.strict(),
  })
  .strict();
export const reportRunSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  definitionVersion: z.number(),
  audience: z.string(),
  cutoff: z.string(),
  contentHash: z.string(),
  complete: z.boolean(),
  generatedAt: z.string(),
});
export const frozenReportRunSchema = reportRunSchema.extend({
  rendered: z.object({ html: z.string(), text: z.string() }),
});
export type FrozenReportRun = z.infer<typeof frozenReportRunSchema>;
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
export const reportCompositionSchema = z.object({
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
export const contactBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z.email().max(254).nullable(),
    verified: z.boolean(),
    active: z.boolean(),
    optedOut: z.boolean(),
  })
  .strict();
export const listBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    contactIds: z.array(z.string().min(1).max(200)).max(1000),
    private: z.boolean(),
    active: z.boolean(),
  })
  .strict();
