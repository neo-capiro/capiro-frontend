import { z } from "zod";
import { meetingSchema } from "../contracts";
import { artifactMetadataSchema } from "../artifacts/metadata";
import { preparationSchema } from "../preparation/schema";
import { approvalReceiptSchema } from "../review/contracts";
import type { ReviewActor, ReviewMeeting } from "../review/contracts";

const stamps = {
  sharedAt: z.iso.datetime().nullable(),
  sharedByUserId: z.string().nullable(),
};
const sharedPreparationSchema = preparationSchema.extend({
  meetingId: z.string().min(1),
  clientId: z.string().nullable(),
  ...stamps,
});
const sharedAttachmentSchema = approvalReceiptSchema.extend(stamps);
export const sharingMeetingSchema = meetingSchema
  .safeExtend({
    tenantId: z.string().min(1),
    preps: z.array(sharedPreparationSchema),
    notes: z.array(artifactMetadataSchema),
    debriefs: z.array(artifactMetadataSchema),
    attachments: z.array(sharedAttachmentSchema),
  })
  .superRefine((meeting, ctx) => {
    for (const kind of ["preps", "notes", "debriefs", "attachments"] as const) {
      const rows = meeting[kind];
      if (
        new Set(rows.map((row) => row.id)).size !== rows.length ||
        rows.some(
          (row) =>
            row.meetingId !== meeting.id ||
            row.clientId !== (meeting.client?.id ?? null) ||
            ("tenantId" in row && row.tenantId !== meeting.tenantId),
        )
      )
        ctx.addIssue({
          code: "custom",
          path: [kind],
          message: "Artifacts do not match this meeting and client.",
        });
    }
  });
export type SharingMeeting = z.infer<typeof sharingMeetingSchema>;
export type ShareAction = "share" | "unshare";
export type ShareRef = {
  type: "prep" | "note" | "debrief" | "attachment";
  id: string;
};
export const collection = {
  prep: "preps",
  note: "notes",
  debrief: "debriefs",
  attachment: "attachments",
} as const;
export function sharingScope(meeting: ReviewMeeting, actor: ReviewActor) {
  return sharingMeetingSchema.refine(
    (row) =>
      row.id === meeting.id &&
      row.tenantId === actor.tenantId &&
      (row.client?.id ?? null) === (meeting.client?.id ?? null),
    "The meeting, client or organization changed. Reopen the meeting.",
  );
}
export function sharedFeedSchema(clientId: string, tenantId: string) {
  return z
    .array(sharingMeetingSchema)
    .refine(
      (rows) =>
        new Set(rows.map((row) => row.id)).size === rows.length &&
        rows.every(
          (row) =>
            row.tenantId === tenantId &&
            row.client?.id === clientId &&
            row.visibility === "shared" &&
            row.status !== "deleted" &&
            Object.values(collection).every((kind) =>
              row[kind].every((item) => Boolean(item.sharedAt)),
            ),
        ),
      "The shared meeting feed does not match the selected client and organization.",
    );
}
