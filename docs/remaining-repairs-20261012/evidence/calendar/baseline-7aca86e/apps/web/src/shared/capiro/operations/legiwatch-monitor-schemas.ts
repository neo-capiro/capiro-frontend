import { z } from "zod";
export const monitorId = z.string().min(1).max(180);
export const monitorParams = z.object({ id: monitorId }).strict();
export const monitorVersion = z.number().int().nonnegative();
export const staffRecipient = z
  .object({ userId: monitorId, email: z.boolean(), inApp: z.boolean() })
  .strict();
export const scheduleTime = {
  timezone: z
    .string()
    .min(1)
    .max(100)
    .refine((value) => {
      try {
        if (value !== "UTC" && !value.includes("/")) return false;
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }),
  localMinutes: z.number().int().min(0).max(1439),
};
export const recordRule = z.object({
  id: z.string(),
  name: z.string(),
  ownerClerkId: z.string(),
  family: z.enum(["bill_record", "agenda"]),
  folderIds: z.array(z.string()),
  recipients: z.array(staffRecipient.strip()),
  cadence: z.enum(["realtime", "end_of_day"]),
  timezone: z.string().nullable(),
  localMinutes: z.number().nullable(),
  state: z.string(),
  issues: z.array(z.string()),
  version: monitorVersion,
});
export const recordRuleBody = z
  .object({
    name: z.string().trim().min(1).max(200),
    folderIds: z.array(monitorId).min(1).max(100),
    recipients: z.array(staffRecipient).max(100),
    cadence: z.enum(["realtime", "end_of_day"]),
    ...scheduleTime,
    expectedVersion: monitorVersion,
  })
  .strict();
export const recordReadiness = z.object({
  rule: recordRule,
  ready: z.boolean(),
  issues: z.array(z.string()),
});
export const statuteConfig = z
  .object({
    folderIds: z.array(monitorId).max(35),
    billIds: z.array(monitorId).max(30),
    jurisdiction: z.literal("FL"),
    sessionKey: z.string().min(1).max(60),
    descendants: z.boolean(),
    cadence: z.enum(["manual", "hourly", "daily"]),
    recipients: z.array(staffRecipient).max(50),
  })
  .strict();
export const statuteRule = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  version: monitorVersion,
  state: z.string(),
  config: z.object({
    folderIds: z.array(z.string()),
    billIds: z.array(z.string()).optional(),
    jurisdiction: z.literal("FL").optional(),
    sessionKey: z.string().optional(),
    descendants: z.boolean().optional(),
    cadence: z.enum(["manual", "hourly", "daily"]).nullable().optional(),
    recipients: z.array(staffRecipient.strip()),
    matchActive: z.boolean().optional(),
    deliveryActive: z.boolean().optional(),
  }),
  last_run_at: z.string().nullable().optional(),
});
export const statuteMatch = z.object({
  id: z.string(),
  bill_id: z.string(),
  document_id: z.string(),
  document_revision: z.string(),
  quote: z.string(),
  locator: z.string(),
  relation: z.string(),
});
export const statutePreview = z.object({
  ruleId: z.string(),
  version: monitorVersion,
  previewHash: z.string(),
  targetHash: z.string(),
  gaps: z.array(z.string()),
  matches: z.array(statuteMatch),
  coverage: z.object({
    complete: z.boolean(),
    receiptId: z.string().nullable(),
    qualificationId: z.string().nullable(),
  }),
  deliveryActive: z.literal(false),
});
