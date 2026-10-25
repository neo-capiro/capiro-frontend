import { sharingMeeting, sharingFile } from "../calendar-sharing-fixtures";
export const commandActor = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
};
export const commandMeeting = {
  ...sharingMeeting,
  tenantId: commandActor.tenantId,
  notes: sharingMeeting.notes.map((row) => ({
    ...row,
    authorUserId: commandActor.userId,
    approvedByUserId: commandActor.userId,
    body: "Synthetic saved note",
    restricted: false,
    capabilities: { edit: true, approve: true, share: true, unshare: true },
  })),
  debriefs: sharingMeeting.debriefs.map((row) => ({
    ...row,
    authorUserId: commandActor.userId,
  })),
  attachments: sharingMeeting.attachments.map((row) => ({
    ...row,
    tenantId: commandActor.tenantId,
    uploadedByUserId: commandActor.userId,
    approvedByUserId: commandActor.userId,
  })),
};
export const commandFile = {
  ...sharingFile,
  tenantId: commandActor.tenantId,
  uploadedByUserId: commandActor.userId,
  approvedByUserId: commandActor.userId,
};
