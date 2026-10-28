/**
 * Closed receiving contract for the Meri memory-review notification feed.
 *
 * Mirrors the released Core owner response of GET /memory/review/notifications
 * (Core apps/api/src/memory/memory-review-inbox.service.ts listNotifications):
 * { enabled, items[], nextCursor } with rows
 * { id, reviewRequestId, candidateId, clientId, eventType, title, readAt, createdAt }.
 * Core source is not imported; this decoder fails closed so a changed upstream
 * shape can never be presented as an empty or caught-up Updates page.
 */
export const MEMORY_NOTIFICATION_SCHEMA =
  "meri.memory-notifications/1" as const;
export const MEMORY_NOTIFICATION_PAGE_LIMIT = 20;
export const MEMORY_NOTIFICATION_RESPONSE_BYTES = 262_144;

export const memoryNotificationPaths = Object.freeze({
  list: "/api/meri/notifications",
});

/** Released Core event vocabulary (memory-review-notification.helpers.ts). */
export const MEMORY_REVIEW_NOTIFICATION_EVENTS = [
  "review_assigned",
  "review_revision_assigned",
  "review_reassigned",
  "review_changes_requested",
  "review_approved",
  "review_rejected",
] as const;

export type MemoryReviewNotificationEvent =
  (typeof MEMORY_REVIEW_NOTIFICATION_EVENTS)[number];

export type MemoryReviewNotificationItem = Readonly<{
  id: string;
  reviewRequestId: string;
  candidateId: string;
  clientId: string | null;
  eventType: MemoryReviewNotificationEvent;
  title: string;
  readAt: string | null;
  createdAt: string;
}>;

export type MemoryNotificationPage = Readonly<{
  schemaVersion: typeof MEMORY_NOTIFICATION_SCHEMA;
  /** Core's tenant memory-review switch. False is a real "not enabled", not an empty feed. */
  enabled: boolean;
  items: readonly MemoryReviewNotificationItem[];
  nextCursor: string | null;
}>;

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const events = new Set<string>(MEMORY_REVIEW_NOTIFICATION_EVENTS);
const requiredEvents = new Set<MemoryReviewNotificationEvent>([
  "review_assigned",
  "review_revision_assigned",
  "review_reassigned",
  "review_changes_requested",
]);
const optionalOutcomeEvents = new Set<MemoryReviewNotificationEvent>([
  "review_approved",
  "review_rejected",
]);

/**
 * Assignment, reassignment and changes-requested notices ask the recipient to act,
 * so they are always shown. An approved/rejected outcome is only an optional notice.
 */
export function memoryNotificationDelivery(
  eventType: MemoryReviewNotificationEvent,
): "required" | "optional-outcome" {
  return requiredEvents.has(eventType) ? "required" : "optional-outcome";
}

export function isOptionalMemoryOutcome(
  eventType: MemoryReviewNotificationEvent,
): boolean {
  return optionalOutcomeEvents.has(eventType);
}

function timestamp(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    throw new Error("Invalid memory notification timestamp");
  return value;
}

function cursor(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 4_096 ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new Error("Invalid memory notification cursor");
  return value;
}

function item(value: unknown): MemoryReviewNotificationItem {
  if (!value || typeof value !== "object")
    throw new Error("Invalid memory notification");
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    !uuid.test(row.id) ||
    typeof row.reviewRequestId !== "string" ||
    !uuid.test(row.reviewRequestId) ||
    typeof row.candidateId !== "string" ||
    !uuid.test(row.candidateId) ||
    !(
      row.clientId === null ||
      (typeof row.clientId === "string" && uuid.test(row.clientId))
    ) ||
    typeof row.eventType !== "string" ||
    !events.has(row.eventType) ||
    typeof row.title !== "string" ||
    row.title.length === 0 ||
    row.title.length > 300 ||
    /[\u0000-\u001f\u007f]/.test(row.title) ||
    !(
      row.readAt === null ||
      row.readAt === undefined ||
      typeof row.readAt === "string"
    )
  )
    throw new Error("Invalid memory notification");
  return {
    id: row.id,
    reviewRequestId: row.reviewRequestId,
    candidateId: row.candidateId,
    clientId: (row.clientId ?? null) as string | null,
    eventType: row.eventType as MemoryReviewNotificationEvent,
    title: row.title,
    readAt:
      row.readAt === null || row.readAt === undefined
        ? null
        : timestamp(row.readAt),
    createdAt: timestamp(row.createdAt),
  };
}

/** One closed page. Repeated rows and over-long pages refuse instead of silently trimming. */
export function receiveMemoryNotificationPage(
  value: unknown,
): MemoryNotificationPage {
  if (!value || typeof value !== "object")
    throw new Error("Invalid memory notification page");
  const page = value as Record<string, unknown>;
  if (
    page.schemaVersion !== MEMORY_NOTIFICATION_SCHEMA ||
    typeof page.enabled !== "boolean" ||
    !Array.isArray(page.items) ||
    page.items.length > MEMORY_NOTIFICATION_PAGE_LIMIT
  )
    throw new Error("Invalid memory notification page");
  const items = page.items.map(item);
  if (new Set(items.map((row) => row.id)).size !== items.length)
    throw new Error("Repeated memory notification");
  return {
    schemaVersion: MEMORY_NOTIFICATION_SCHEMA,
    enabled: page.enabled,
    items,
    nextCursor: cursor(page.nextCursor),
  };
}
