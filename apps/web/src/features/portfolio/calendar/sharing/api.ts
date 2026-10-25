import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { readMeetingAttachments } from "../review/api";
import type { ReviewActor, ReviewMeeting } from "../review/contracts";
import type { MeetingChange } from "../commands/recovery";
import { sharingScope, type ShareAction } from "./contracts";
import { sharingTargets, type SharingTarget } from "./targets";

export async function readSharing(
  api: ApiClient,
  meeting: ReviewMeeting,
  actor: ReviewActor,
  admin: boolean,
  signal?: AbortSignal,
) {
  const row = await api.request(
    "core",
    `engagement/meetings/${encodeURIComponent(meeting.id)}`,
    sharingScope(meeting, actor),
    { signal },
  );
  const files = row.attachments.length
    ? await readMeetingAttachments(api, meeting, actor, signal)
    : [];
  return { meeting: row, targets: sharingTargets(row, files, actor, admin) };
}
export function sharingCommand(
  meeting: ReviewMeeting,
  action: ShareAction,
  selected: SharingTarget[],
): MeetingChange {
  const revision = selected[0]?.parentRevision ?? null;
  return {
    operation: action,
    meetingId: meeting.id,
    expectedClientId: meeting.client?.id ?? null,
    expectedRevision: revision,
    meeting: null,
    artifact: null,
    artifacts: selected.map((row) => ({
      type: row.type,
      id: row.id,
      revision: row.revision ?? "",
    })),
  };
}
export async function preflightSharing(
  api: ApiClient,
  meeting: ReviewMeeting,
  actor: ReviewActor,
  admin: boolean,
  action: ShareAction,
  selected: SharingTarget[],
  guard: () => void,
  signal: AbortSignal,
) {
  if (
    !selected.length ||
    selected.length > 50 ||
    new Set(selected.map((row) => `${row.type}:${row.id}`)).size !==
      selected.length
  )
    throw new ApiError(422, "Choose between 1 and 50 distinct artifacts.");
  const revision = selected[0]?.parentRevision;
  if (!revision || selected.some((row) => row.parentRevision !== revision))
    throw new ApiError(
      409,
      "Refresh and review the meeting artifacts together.",
    );
  const command = sharingCommand(meeting, action, selected);
  guard();
  const current = await readSharing(api, meeting, actor, admin, signal);
  guard();
  if (current.meeting.updatedAt !== command.expectedRevision)
    throw new ApiError(
      409,
      "The reviewed meeting changed. Refresh and review sharing.",
    );
  for (const selectedRow of selected) {
    const row = current.targets.find(
      (row) => row.type === selectedRow.type && row.id === selectedRow.id,
    );
    if (
      !row ||
      row.snapshot !== selectedRow.snapshot ||
      (action === "share" ? row.shareReason : row.unshareReason)
    )
      throw new ApiError(
        409,
        "A selected artifact changed or is not eligible. Refresh and review the current artifacts.",
      );
  }
}
