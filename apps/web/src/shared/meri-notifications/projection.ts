import type { UserPreferences } from "@capiro/meri-client/user-preferences";
import type { RunIndexSummary } from "@capiro/meri-contracts/conversation-history";
import { memoryNotificationDelivery } from "./memory-contract";
import type { MemoryNotificationPage } from "./memory-contract";

/**
 * The joined Updates projection.
 *
 * Every row is observed from an existing durable owner: Core's participant-scoped
 * memory-review notification feed, or the existing run-index read. This layer only
 * decides the in-app *presentation* of optional notices from the saved personal
 * preferences. It never suppresses a durable obligation, an approval requirement,
 * an event log row, or a security/broadcast message, and it never invents an unread
 * count or a complete delivery history.
 */
export type NotificationCategoryId =
  | "run-outcomes"
  | "decisions"
  | "memory-review"
  | "connections";

export type NotificationPreferenceKey = keyof UserPreferences["notifications"];

export type NotificationCategory = Readonly<{
  id: NotificationCategoryId;
  label: string;
  description: string;
  /** Canonical key that governs optional in-app notices for this category, or null. */
  key: NotificationPreferenceKey | null;
  /**
   * revisioned  — a saved toggle governs the optional notices of this category;
   * unavailable — no proven optional notice producer exists, so no toggle is offered;
   * unsupported — no canonical preference key exists for this category.
   */
  control: "revisioned" | "unavailable" | "unsupported";
  reason: string;
}>;

/**
 * The three designed categories that map to a real, observed in-app producer.
 * "Connections" stays unsupported: there is no canonical key for connection
 * changes and it is never mapped onto memoryReviewed.
 */
export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] =
  Object.freeze([
    {
      id: "run-outcomes",
      label: "Completed runs",
      description:
        "Optional in-app notices for runs that have reached a completed state.",
      key: "runCompleted",
      control: "revisioned",
      reason: "governs only the in-app presentation of observed completed runs",
    },
    {
      id: "decisions",
      label: "Approval requests",
      description:
        "Optional in-app notices for visible runs currently waiting for approval.",
      key: "approvalRequested",
      control: "revisioned",
      reason:
        "governs only observed waiting-for-approval run notices; mandatory assignment notices and approval actions remain available",
    },
    {
      id: "memory-review",
      label: "Memory review outcomes",
      description:
        "Optional in-app notices when a memory proposal you submitted is approved or rejected.",
      key: "memoryReviewed",
      control: "revisioned",
      reason:
        "governs only the optional approved/rejected outcome rows, never assignments or changes requested",
    },
    {
      id: "connections",
      label: "Connection changes",
      description: "Not connected to a notification preference.",
      key: null,
      control: "unsupported",
      reason:
        "no canonical notification key exists for connection changes and this category is never mapped to memoryReviewed",
    },
  ]);

/**
 * Message classes that no personal toggle can suppress. ST-20 broadcast already
 * has its own mandatory-recipient owner and is not part of personal preferences.
 */
export const MANDATORY_NOTIFICATION_CLASSES = Object.freeze([
  "approval-obligation",
  "security",
  "broadcast",
] as const);

export function notificationCategory(
  id: NotificationCategoryId,
): NotificationCategory {
  const found = NOTIFICATION_CATEGORIES.find((category) => category.id === id);
  if (!found) throw new Error("Unknown notification category");
  return found;
}

/**
 * Whether an optional notice of this category is presented under the saved
 * preferences. Mandatory classes are absent from this function by construction:
 * they are never routed through a personal preference. Unverified preferences
 * never present an optional notice, and they are never reported as a saved false.
 */
export function optionalNoticePresented(
  category: NotificationCategoryId,
  preferences: UserPreferences | null,
): boolean {
  const category_ = notificationCategory(category);
  if (!category_.key || category_.control !== "revisioned") return false;
  if (!preferences) return false;
  return preferences.notifications[category_.key] === true;
}

/** Single-key update of the complete canonical document; unrelated values stay intact. */
export function applyNotificationPreference(
  preferences: UserPreferences,
  key: NotificationPreferenceKey,
  value: boolean,
): UserPreferences {
  return Object.freeze({
    ...preferences,
    notifications: Object.freeze({
      ...preferences.notifications,
      [key]: value,
    }),
  });
}

export type NoticeSource = "memory-review" | "run-outcome" | "run-approval";
/** "observed" means the owner answered; it is never a claim about completeness. */
export type FeedObservation = "observed" | "unavailable";

/**
 * Why observed optional rows are not shown. `preferences-unverified` is not a
 * saved false toggle: nothing has been read back yet, so the surface must say so
 * instead of claiming a stored preference withheld the rows.
 */
export type WithheldReason =
  | "saved-preference"
  | "preferences-unverified"
  | null;

export type UpdatesState =
  /** A first read is still in flight. */
  | "loading"
  /** No source answered; this is not an empty page. */
  | "unavailable"
  /** Rows are shown, but at least one source or the saved preferences are unverified. */
  | "partial"
  /** No row is shown and optional rows are pending preference verification. */
  | "unverified"
  /** Every observed optional row is withheld by a saved preference. */
  | "suppressed"
  /** Every source answered and nothing was observed or withheld. */
  | "empty"
  /** Rows are shown and every source and the saved preferences are verified. */
  | "ready";

export type ProjectedNotice = Readonly<{
  id: string;
  source: NoticeSource;
  title: string;
  detail: string;
  occurredAt: string;
  /** null: this source has no per-row read record (run outcomes). */
  read: boolean | null;
  delivery: "required" | "optional";
  governedBy: NotificationPreferenceKey | null;
  run: Readonly<{ conversationId: string; runId: string }> | null;
  reviewRequestId: string | null;
}>;

export type UpdatesProjection = Readonly<{
  state: UpdatesState;
  notices: readonly ProjectedNotice[];
  /** Observed optional rows that are not presented, with the reason recorded below. */
  withheldOptional: number;
  withheldReason: WithheldReason;
  nextCursor: string | null;
  memoryNotifications: FeedObservation | "not-enabled";
  runOutcomes: FeedObservation;
  preferences: "verified" | "unverified";
  /** The run source is one recent permitted page, not complete delivery history. */
  runCoverage: "recent-page";
}>;

export function projectUpdates(input: {
  /** null while the first read is still in flight. */
  notifications: {
    state: "loading" | FeedObservation;
    page: MemoryNotificationPage | null;
  };
  runs: {
    state: "loading" | FeedObservation;
    runs: readonly RunIndexSummary[];
  };
  preferences: UserPreferences | null;
}): UpdatesProjection {
  const loading =
    input.notifications.state === "loading" || input.runs.state === "loading";
  const verified = input.preferences !== null;
  const memoryUnavailable = input.notifications.state === "unavailable";
  const runsUnavailable = input.runs.state === "unavailable";

  const rows: ProjectedNotice[] = [];
  let withheldByPreference = 0;
  let withheldUnverified = 0;
  if (!loading) {
    for (const row of input.notifications.page?.items ?? []) {
      const delivery = memoryNotificationDelivery(row.eventType);
      const governed =
        delivery === "optional-outcome" ? "memoryReviewed" : null;
      if (
        delivery === "required" ||
        optionalNoticePresented("memory-review", input.preferences)
      ) {
        rows.push({
          id: `memory-review:${row.id}`,
          source: "memory-review",
          title: row.title,
          detail:
            delivery === "optional-outcome"
              ? "A memory proposal you submitted was reviewed. This outcome notice does not require another action."
              : "A memory review assignment or requested change. Open the current review to check available actions; these notices are always delivered.",
          occurredAt: row.createdAt,
          read: row.readAt !== null,
          delivery: delivery === "required" ? "required" : "optional",
          governedBy: governed,
          run: null,
          reviewRequestId: row.reviewRequestId,
        });
      } else if (verified) withheldByPreference += 1;
      else withheldUnverified += 1;
    }
    if (input.runs.state === "observed") {
      for (const run of input.runs.runs) {
        const waiting = run.state === "waiting-for-approval";
        if (!waiting && run.state !== "completed") continue;
        const category = waiting ? "decisions" : "run-outcomes";
        const source = waiting ? "run-approval" : "run-outcome";
        if (optionalNoticePresented(category, input.preferences)) {
          rows.push({
            id: `${source}:${run.conversationId}:${run.runId}`,
            source,
            title: waiting ? "Run waiting for approval" : "Run completed",
            detail: waiting
              ? "A visible run is waiting for approval. This notice does not establish that you can approve it; approval actions check current authority. It has no per-row read record."
              : "A run you can see reached a completed state. This optional notice has no per-row read record.",
            occurredAt: run.statusAt,
            read: null,
            delivery: "optional",
            governedBy: waiting ? "approvalRequested" : "runCompleted",
            run: { conversationId: run.conversationId, runId: run.runId },
            reviewRequestId: null,
          });
        } else if (verified) withheldByPreference += 1;
        else withheldUnverified += 1;
      }
    }
    rows.sort((left, right) => {
      const delta = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
      return delta !== 0 ? delta : left.id.localeCompare(right.id);
    });
  }

  const withheldOptional = withheldByPreference + withheldUnverified;
  const withheldReason: WithheldReason =
    withheldUnverified > 0
      ? "preferences-unverified"
      : withheldByPreference > 0
        ? "saved-preference"
        : null;
  const missingSource = memoryUnavailable || runsUnavailable;
  const state: UpdatesState = loading
    ? "loading"
    : memoryUnavailable && runsUnavailable
      ? "unavailable"
      : rows.length > 0
        ? missingSource || !verified
          ? "partial"
          : "ready"
        : withheldUnverified > 0
          ? "unverified"
          : withheldByPreference > 0
            ? "suppressed"
            : missingSource
              ? "partial"
              : "empty";

  return Object.freeze({
    state,
    notices: Object.freeze(rows),
    withheldOptional,
    withheldReason,
    nextCursor: input.notifications.page?.nextCursor ?? null,
    memoryNotifications:
      input.notifications.page?.enabled === false
        ? "not-enabled"
        : memoryUnavailable
          ? "unavailable"
          : "observed",
    runOutcomes: runsUnavailable ? "unavailable" : "observed",
    preferences: verified ? "verified" : "unverified",
    runCoverage: "recent-page",
  });
}
