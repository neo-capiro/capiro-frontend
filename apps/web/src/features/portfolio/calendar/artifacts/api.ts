import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { meetingSchema } from "../contracts";
import type { MeetingChange } from "../commands/recovery";
import type {
  ArtifactChange,
  ArtifactKind,
  ArtifactMeeting,
} from "./contracts";

export function artifactCommand(
  meeting: ArtifactMeeting,
  kind: ArtifactKind,
  change: ArtifactChange,
): MeetingChange {
  const type = kind === "notes" ? "note" : "debrief";
  const sharing = change.action === "share" || change.action === "unshare";
  return {
    operation: sharing
      ? (change.action as "share" | "unshare")
      : `${type}-${change.action === "save" ? (change.id ? "update" : "create") : "approve"}`,
    meetingId: meeting.id,
    expectedClientId: meeting.client?.id ?? null,
    expectedRevision: meeting.updatedAt ?? null,
    meeting: null,
    artifact: sharing
      ? null
      : {
          id: change.id ?? null,
          revision: change.revision ?? null,
          body: change.action === "save" ? change.body : null,
          confidential: change.action === "save" ? change.confidential : null,
        },
    artifacts: sharing
      ? [{ type, id: change.id!, revision: change.revision ?? "" }]
      : [],
  };
}
export async function preflightMeetingArtifact(
  api: ApiClient,
  meeting: ArtifactMeeting,
  assertCurrent: () => void,
  signal: AbortSignal,
  assertReadable?: () => void,
) {
  assertCurrent();
  if (!meeting.updatedAt)
    throw new ApiError(409, "Refresh the meeting before changing artifacts.");
  await api.request(
    "core",
    `engagement/meetings/${encodeURIComponent(meeting.id)}`,
    meetingSchema.refine(
      (row) =>
        row.id === meeting.id &&
        (row.client?.id ?? null) === (meeting.client?.id ?? null) &&
        row.updatedAt === meeting.updatedAt,
      "The meeting changed. Refresh and review this action.",
    ),
    { signal },
  );
  assertCurrent();
  assertReadable?.();
}
