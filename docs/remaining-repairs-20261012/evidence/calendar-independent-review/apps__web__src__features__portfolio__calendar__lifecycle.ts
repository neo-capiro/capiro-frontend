import type { Meeting } from "./contracts";

export type MeetingStage =
  | "upcoming"
  | "live"
  | "completed"
  | "cancelled"
  | "unknown";
export type MeetingTab = "information" | "preparation" | "notes" | "debriefs";
export type MeetingFilter = "all" | "needs-prep" | "needs-debrief";

/** Time describes the meeting lifecycle; artifact existence never implies approval. */
export function meetingStage(
  meeting: Pick<Meeting, "status" | "startsAt" | "endsAt">,
  now: number,
): MeetingStage {
  if (
    ["cancelled", "canceled", "deleted"].includes(
      meeting.status.trim().toLowerCase(),
    )
  )
    return "cancelled";
  const start = Date.parse(meeting.startsAt);
  const end = Date.parse(meeting.endsAt);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    !Number.isFinite(now)
  )
    return "unknown";
  return now >= end ? "completed" : now >= start ? "live" : "upcoming";
}
export function initialMeetingTab(meeting: Meeting, now: number): MeetingTab {
  const stage = meetingStage(meeting, now);
  return stage === "upcoming"
    ? "preparation"
    : stage === "live"
      ? "notes"
      : stage === "completed"
        ? "debriefs"
        : "information";
}
export function matchesMeetingFilter(
  meeting: Meeting,
  filter: MeetingFilter,
  now: number,
) {
  if (filter === "all") return true;
  const stage = meetingStage(meeting, now);
  if (filter === "needs-prep")
    return (
      stage === "upcoming" &&
      (!meeting.preps.length || meeting.preps[0]?.status === "failed")
    );
  return (
    stage === "completed" &&
    meeting.debriefs !== undefined &&
    meeting.debriefs.length === 0
  );
}
export function meetingMaterials(meeting: Meeting) {
  const label = (status: string | undefined) => {
    const labels: Record<string, string> = {
      generated: "Generated",
      draft: "Draft",
      edited: "Edited",
      approved: "Approved",
      stale: "Stale",
      failed: "Failed",
    };
    return status
      ? (labels[status] ?? "Status unavailable")
      : "Status unavailable";
  };
  return {
    prep: meeting.preps.length
      ? label(meeting.preps[0]?.status)
      : "Not started",
    notes:
      meeting.notes === undefined
        ? "Status unavailable"
        : meeting.notes.length
          ? label(meeting.notes[0]?.status)
          : "Not captured",
    debrief:
      meeting.debriefs === undefined
        ? "Status unavailable"
        : meeting.debriefs.length
          ? label(meeting.debriefs[0]?.status)
          : "Not started",
  };
}
