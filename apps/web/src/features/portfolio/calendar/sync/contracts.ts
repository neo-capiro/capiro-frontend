import { z } from "zod";

export const syncProviderSchema = z.enum(["microsoft_365", "google_workspace"]);
export const calendarConnectionSchema = z.object({
  id: z.uuid(),
  provider: z.enum([
    "microsoft_365",
    "google_workspace",
    "imap_caldav",
    "manual",
  ]),
  accountEmail: z.string().nullable(),
  displayName: z.string().nullable(),
  status: z.enum(["connected", "error", "needs_configuration", "disabled"]),
  createdByUserId: z.string().nullable(),
  lastSyncAt: z.string().nullable(),
});
export const calendarConnectionsSchema = z.array(calendarConnectionSchema);
export type CalendarConnection = z.infer<typeof calendarConnectionSchema>;
export const syncStatsSchema = z.object({
  scanned: z.number().int().nonnegative(),
  matched: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  pages: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export const syncRangeSchema = z
  .object({
    from: z.iso
      .datetime({ offset: true })
      .transform((value) => new Date(value).toISOString()),
    to: z.iso
      .datetime({ offset: true })
      .transform((value) => new Date(value).toISOString()),
  })
  .refine(
    (range) =>
      Date.parse(range.to) > Date.parse(range.from) &&
      Date.parse(range.to) - Date.parse(range.from) <= 732 * 86_400_000,
    {
      message: "The end must be after the start.",
    },
  );
export type CalendarSyncRange = z.infer<typeof syncRangeSchema>;
export const syncIntentSchema = z
  .object({
    connectionId: z.uuid().transform((value) => value.toLowerCase()),
    provider: syncProviderSchema,
    range: syncRangeSchema.optional(),
  })
  .refine((intent) => !intent.range || intent.provider === "microsoft_365", {
    message: "Google sync does not accept a date range.",
  });
export type CalendarSyncIntent = z.infer<typeof syncIntentSchema>;
export const calendarReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: z.uuid(),
    connectionId: z.uuid(),
    provider: syncProviderSchema,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    range: syncRangeSchema.nullable(),
    window: syncRangeSchema,
    status: z.enum(["pending", "completed"]),
    calendar: syncStatsSchema,
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine(
    (value) =>
      value.status !== "completed" ||
      (!value.calendar.hasMore && value.calendar.failed === 0),
  );
export type CalendarSyncReceipt = z.infer<typeof calendarReceiptSchema>;
export type CalendarSyncAttempt =
  | { status: "idle" }
  | { status: "pending" | "unknown"; intent: CalendarSyncIntent }
  | {
      status: "partial" | "completed";
      intent: CalendarSyncIntent;
      receipt: CalendarSyncReceipt;
    };
