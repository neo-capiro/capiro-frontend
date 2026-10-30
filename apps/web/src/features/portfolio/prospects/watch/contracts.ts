import { z } from "zod";

/**
 * Prospect watch / alert contracts — the exact shapes Core303 returns from
 * `apps/api/src/business-development/business-development.controller.ts` (:440-:503) and
 * `bizdev-watch.service.ts` (`BizDevWatchResponse`, `BizDevAlertRow`, page/receipt returns).
 *
 * Nothing here invents a field: activation takes optional categories/owner, the update takes the
 * service's own status/mute/category/owner fields, and alert actions return only their timestamps.
 */

const nullableText = z.string().nullable();

export const watchSourceSchema = z.object({
  source: z.string(),
  health: z.string(),
  lastCheckedAt: nullableText,
  detail: nullableText,
});

export const watchSchema = z.object({
  status: z.string(),
  categories: z.array(z.string()),
  ownerUserId: nullableText,
  mutedUntil: nullableText,
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** GET/POST/PATCH …/prospects/:prospectId/watch */
export const watchResponseSchema = z.object({
  watch: watchSchema.nullable(),
  sources: z.array(watchSourceSchema),
  lastCompletedCheckAt: nullableText,
});

/** One row of GET …/prospects/:prospectId/alerts (bizdev-watch.service BizDevAlertRow). */
export const alertSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: nullableText,
  materiality: nullableText,
  materialityLevel: nullableText,
  company: nullableText,
  sourceFamily: nullableText,
  category: nullableText,
  eventAt: nullableText,
  effectiveAt: nullableText,
  publishedAt: nullableText,
  firstObservedAt: nullableText,
  sourceLocator: nullableText,
  implication: nullableText,
  readAt: nullableText,
  dismissedAt: nullableText,
  prospectId: nullableText,
});

/** GET …/prospects/:prospectId/alerts → { items, nextCursor, unreadCount } */
export const alertsPageSchema = z.object({
  items: z.array(alertSchema),
  nextCursor: nullableText,
  unreadCount: z.number().int().nonnegative(),
});

export const readReceiptSchema = z.object({ readAt: z.string() });
export const dismissReceiptSchema = z.object({
  readAt: z.string(),
  dismissedAt: z.string(),
});

export type WatchResponse = z.infer<typeof watchResponseSchema>;
export type Watch = z.infer<typeof watchSchema>;
export type WatchSource = z.infer<typeof watchSourceSchema>;
export type WatchAlert = z.infer<typeof alertSchema>;
export type AlertsPage = z.infer<typeof alertsPageSchema>;

/** The closed alert-category vocabulary the Core DTO validates (business-development.dto.ts:36-46). */
export const WATCH_CATEGORIES = [
  "contract_award",
  "assistance_award",
  "opportunity",
  "lobbying",
  "acquisition",
  "entity_change",
  "other",
] as const;

export const categoryLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (first) => first.toUpperCase());
