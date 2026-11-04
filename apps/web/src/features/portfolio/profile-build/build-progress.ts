/** Presentation of a durable run. No inferred completion, timers, requests or authorization. */
export type ProfileBuildStatus =
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled";
export type ProfileTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";
export interface ProfileBuildTask {
  id: string;
  label: string;
  status: ProfileTaskStatus;
  attempt: number;
  maxAttempts: number;
  reportedError: boolean;
  retryAllowed: boolean;
}
export const buildProgressCopy: Record<
  ProfileBuildStatus,
  { title: string; description: string }
> = {
  running: {
    title: "Building your profile",
    description:
      "Review available findings while the remaining sources are researched.",
  },
  partial: {
    title: "Some sources are unavailable",
    description:
      "Your saved findings are ready to review. Retry only the unavailable source.",
  },
  completed: {
    title: "Profile research complete",
    description:
      "Review proposed facts and keep the sources with every decision.",
  },
  failed: {
    title: "Research could not complete",
    description:
      "Saved findings remain available. Review the source statuses before retrying.",
  },
  cancelled: {
    title: "Research cancelled",
    description:
      "Saved findings remain available. No new research has been started.",
  },
};
