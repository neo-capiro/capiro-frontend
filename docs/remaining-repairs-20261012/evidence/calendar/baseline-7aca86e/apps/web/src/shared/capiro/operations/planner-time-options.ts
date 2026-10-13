import { z } from "zod";
export const timeOptions = z
  .object({
    budgetCurrency: z.string().optional(),
    timeTrackingEnabled: z.boolean(),
    billableEnabled: z.boolean(),
    billableDefault: z.boolean(),
    generalWorkEnabled: z.boolean(),
    approvalProcess: z.enum(["simple", "full"]),
    categories: z.array(z.string()).max(100),
    pastLockWeeks: z.number().int().nullable(),
    futureWeeks: z.number().int().nullable(),
    timeZone: z.string(),
    submissionReminder: z
      .object({
        weekday: z.number().int().min(1).max(7),
        time: z.string(),
        week: z.enum(["current", "previous"]),
      })
      .nullable()
      .optional(),
  })
  .strict();
