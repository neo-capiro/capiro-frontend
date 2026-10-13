import type { ReviewActor, ReviewMeeting } from "../review/contracts";
export type SharingAttempt = {
  status: "idle" | "pending" | "uncertain" | "refused";
  error?: Error;
};
export const idleSharing: SharingAttempt = { status: "idle" };
export const sharingAttemptKey = (
  meeting: ReviewMeeting,
  actor: Partial<ReviewActor>,
) =>
  [
    "meeting-sharing-attempt",
    actor.tenantId ?? null,
    actor.userId ?? null,
    meeting.id,
    meeting.client?.id ?? null,
  ] as const;
