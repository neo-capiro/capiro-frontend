import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { readMeetingAttachments } from "../review/api";
import type { ReviewActor, ReviewMeeting } from "../review/contracts";
import { ArtifactMutationError } from "../artifacts/api";
import { sharingScope, sharingReceipt, type ShareAction } from "./contracts";
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
export async function changeSharing(
  api: ApiClient,
  meeting: ReviewMeeting,
  actor: ReviewActor,
  admin: boolean,
  action: ShareAction,
  selected: SharingTarget[],
  assertCurrent: () => void,
  signal: AbortSignal,
) {
  let dispatched = false;
  let refused = false;
  try {
    assertCurrent();
    if (
      !selected.length ||
      selected.length > 50 ||
      new Set(selected.map((row) => `${row.type}:${row.id}`)).size !==
        selected.length
    )
      throw new ApiError(422, "Choose between 1 and 50 distinct artifacts.");
    const current = await readSharing(api, meeting, actor, admin, signal);
    assertCurrent();
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
    const refs = selected.map(({ type, id }) => ({ type, id }));
    assertCurrent();
    dispatched = true;
    await api
      .request(
        "core",
        `engagement/meetings/${encodeURIComponent(meeting.id)}/artifacts/${action}`,
        sharingReceipt(meeting, actor, action, refs),
        { method: "POST", body: { artifacts: refs }, signal },
      )
      .catch((error: unknown) => {
        refused =
          error instanceof ApiError &&
          [400, 401, 403, 404, 409, 422].includes(error.status);
        throw error;
      });
    assertCurrent();
  } catch (error) {
    const uncertain = dispatched && !refused;
    throw new ArtifactMutationError(
      uncertain
        ? "Sharing may have changed. Refresh the saved artifacts and verify the result before further changes; this attempt cannot be retried here."
        : error instanceof Error
          ? error.message
          : "Sharing could not be changed.",
      uncertain,
    );
  }
}
