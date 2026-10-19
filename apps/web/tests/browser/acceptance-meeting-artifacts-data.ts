import type { Meeting } from "../../src/features/portfolio/calendar/contracts";

export type ArtifactKind = "notes" | "debriefs";
export const originalBody = "Synthetic original authorized artifact body";
export const recoveredBody = "Synthetic newly authorized artifact body";
export const localDraft = "Keep this exact unsaved local artifact intent";
export function acceptanceMeeting(
  clientId: string | null = "client-one",
): Meeting {
  return {
    id: "meeting-one",
    subject: "Synthetic artifact current-read review",
    description: null,
    location: null,
    startsAt: "2026-10-10T14:00:00Z",
    endsAt: "2026-10-10T15:00:00Z",
    status: "scheduled",
    joinLink: null,
    visibility: "private",
    isVirtual: false,
    meri: null,
    client: clientId ? { id: clientId, name: clientId } : null,
    attendees: [],
    preps: [],
  };
}
export function acceptanceArtifact(
  kind: ArtifactKind,
  clientId: string | null = "client-one",
) {
  return {
    id: "artifact-one",
    meetingId: "meeting-one",
    clientId,
    body: originalBody,
    restricted: false,
    confidential: false,
    authorUserId: "user-test",
    status: kind === "notes" ? "draft" : "generated",
    createdAt: "2026-10-10T15:00:00Z",
    updatedAt: "2026-10-10T15:00:00Z",
    ...(kind === "notes"
      ? {
          sharedAt: null,
          sharedByUserId: null,
          approvedAt: null,
          approvedByUserId: null,
        }
      : {}),
  };
}
export function acceptanceMetadata(kind: ArtifactKind) {
  const {
    body: _body,
    restricted: _restricted,
    ...metadata
  } = acceptanceArtifact(kind);
  return { ...metadata, sharedAt: null, sharedByUserId: null };
}
export function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
