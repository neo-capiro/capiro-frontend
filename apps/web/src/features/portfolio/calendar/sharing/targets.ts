import type { MeetingAttachment, ReviewActor } from "../review/contracts";
import { canReviewAttachment, attachmentSnapshot } from "../review/contracts";
import { collection, type ShareRef, type SharingMeeting } from "./contracts";

export type SharingTarget = ShareRef & {
  label: string;
  shared: boolean;
  shareReason?: string;
  unshareReason?: string;
  snapshot: string;
};
export function sharingTargets(
  meeting: SharingMeeting,
  files: MeetingAttachment[],
  actor: ReviewActor,
  admin: boolean,
): SharingTarget[] {
  return (Object.keys(collection) as ShareRef["type"][]).flatMap((type) =>
    meeting[collection[type]].map((row) => {
      const institutional =
        "generatedFrom" in row &&
        row.generatedFrom?.schemaVersion ===
          "research_portfolio_institutional_v1";
      const confidential = "confidential" in row && row.confidential;
      const file =
        type === "attachment"
          ? files.find((file) => file.id === row.id)
          : undefined;
      const approved =
        type === "attachment"
          ? "approvedAt" in row && Boolean(row.approvedAt)
          : "status" in row && row.status === "approved";
      const shareReason = !meeting.client
        ? "Associate a client first"
        : institutional
          ? "Private Research Portfolio preparation"
          : confidential
            ? "Confidential artifact"
            : !approved
              ? "Approval required"
              : type === "attachment" &&
                  (!file || !canReviewAttachment(file, actor.userId))
                ? "Current file readiness is unavailable"
                : undefined;
      const mayUnshare =
        admin ||
        row.sharedByUserId === actor.userId ||
        ("authorUserId" in row && row.authorUserId === actor.userId);
      return {
        type,
        id: row.id,
        label:
          type === "attachment" && "fileName" in row
            ? row.fileName
            : `${type === "prep" ? "Meeting prep" : type === "note" ? "Meeting notes" : "Debrief"} · ${new Date(row.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}`,
        shared: Boolean(row.sharedAt),
        shareReason,
        unshareReason: institutional
          ? "Private Research Portfolio preparation"
          : !row.sharedAt
            ? "Not shared"
            : !mayUnshare
              ? "Only the sharer, author or an administrator can unshare"
              : undefined,
        snapshot: JSON.stringify([
          row,
          file
            ? [
                attachmentSnapshot(file),
                file.approvedAt,
                file.approvedByUserId,
                file.sharedAt,
                file.sharedByUserId,
                file.usable,
              ]
            : null,
        ]),
      };
    }),
  );
}
