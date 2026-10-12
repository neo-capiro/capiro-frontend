export const sharingActor = { userId: "user-test", tenantId: "tenant-test" };
export const sharingClientId = "10000000-0000-4000-8000-000000000001";
export const sharingTime = "2026-10-12T12:00:00Z";
export const sharingMeetingId = "91000000-0000-4000-8000-000000000001";
const scope = { meetingId: sharingMeetingId, clientId: sharingClientId };
const stamps = { sharedAt: null, sharedByUserId: null };
export const sharingPrep = {
  ...scope,
  ...stamps,
  id: "92000000-0000-4000-8000-000000000001",
  status: "approved",
  summary: "Synthetic approved preparation",
  agenda: [],
  talkingPoints: [],
  risks: [],
  followUps: [],
  emailEvidence: [],
  generatedFrom: null,
  createdAt: sharingTime,
  updatedAt: sharingTime,
};
export const sharingNote = {
  ...scope,
  ...stamps,
  id: "93000000-0000-4000-8000-000000000001",
  status: "approved",
  authorUserId: sharingActor.userId,
  confidential: false,
  createdAt: sharingTime,
  updatedAt: sharingTime,
  approvedAt: sharingTime,
  approvedByUserId: sharingActor.userId,
};
export const sharingDebrief = {
  ...scope,
  ...stamps,
  id: "94000000-0000-4000-8000-000000000001",
  status: "approved",
  authorUserId: sharingActor.userId,
  confidential: false,
  createdAt: sharingTime,
  updatedAt: sharingTime,
};
export const sharingAttachment = {
  ...scope,
  ...stamps,
  id: "95000000-0000-4000-8000-000000000001",
  tenantId: sharingActor.tenantId,
  fileName: "Synthetic questions.pdf",
  contentType: "application/pdf",
  byteSize: 100,
  source: "manual",
  folder: null,
  viewerMode: "all" as const,
  viewerUserIds: [],
  uploadedByUserId: sharingActor.userId,
  createdAt: sharingTime,
  lifecycleStatus: "active",
  scanStatus: "clean",
  extractionStatus: null,
  indexedAt: null,
  s3Key: "synthetic/questions",
  supersededByAttachmentId: null,
  approvedAt: sharingTime,
  approvedByUserId: sharingActor.userId,
};
export const sharingMeeting = {
  id: sharingMeetingId,
  tenantId: sharingActor.tenantId,
  subject: "Synthetic sharing meeting",
  description: null,
  location: "Synthetic meeting room",
  startsAt: "2026-10-13T12:00:00Z",
  endsAt: "2026-10-13T13:00:00Z",
  status: "scheduled",
  joinLink: null,
  visibility: "private" as "private" | "shared",
  isVirtual: false,
  meri: null,
  client: { id: sharingClientId, name: "Test Aerospace" },
  attendees: [],
  preps: [sharingPrep],
  notes: [sharingNote],
  debriefs: [sharingDebrief],
  attachments: [sharingAttachment],
};
export const sharingFile = { ...sharingAttachment, usable: true };
export function sharedMeetingFixture() {
  const row = structuredClone(sharingMeeting);
  row.visibility = "shared";
  for (const kind of ["preps", "notes", "debriefs", "attachments"] as const)
    for (const item of row[kind])
      Object.assign(item, {
        sharedAt: sharingTime,
        sharedByUserId: sharingActor.userId,
      });
  return row;
}
