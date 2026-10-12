import { z } from "zod";
import { artifactMetadataSchema as metadataSchema } from "./metadata";
import { meetingSchema, type Meeting } from "../contracts";

export type ArtifactKind = "notes" | "debriefs";
export type ArtifactChange =
  | { action: "save"; id?: string; body: string; confidential: boolean }
  | { action: "approve" | "share" | "unshare"; id: string };
export type ArtifactActor = { userId: string; tenantId: string };
export type ArtifactMeeting = Pick<Meeting, "id" | "client">;

export function artifactReceiptSchema(
  meeting: ArtifactMeeting,
  kind: ArtifactKind,
  actor: ArtifactActor,
  change: ArtifactChange,
): z.ZodType {
  const selected = metadataSchema.refine(
    (row) =>
      row.meetingId === meeting.id &&
      row.clientId === (meeting.client?.id ?? null) &&
      (!change.id || row.id === change.id),
    "The artifact receipt does not match this meeting, client and artifact.",
  );
  if (change.action === "save")
    return selected.refine(
      (row) =>
        row.confidential === change.confidential &&
        row.status ===
          (change.id ? "edited" : kind === "notes" ? "draft" : "generated") &&
        (kind === "debriefs" ||
          (row.approvedAt === null && row.approvedByUserId === null)) &&
        (Boolean(change.id) || row.authorUserId === actor.userId) &&
        row.sharedAt === null &&
        row.sharedByUserId === null,
      "The receipt does not confirm the submitted save.",
    );
  if (change.action === "approve")
    return selected.refine(
      (row) =>
        row.status === "approved" &&
        (kind === "debriefs" ||
          (Boolean(row.approvedAt) && row.approvedByUserId === actor.userId)),
      "The receipt does not confirm this approval.",
    );
  // Share/unshare return a decorated meeting. Other artifacts may remain shared,
  // and an idempotent share preserves the original sharer's attribution,
  // which is nullable after that user is deleted.
  return meetingSchema
    .and(z.object({ [kind]: z.array(metadataSchema) }))
    .refine((row) => {
      const entries = row[kind] as z.infer<typeof metadataSchema>[];
      const matches = entries.filter((item) => item.id === change.id);
      const artifact = matches[0];
      return (
        row.id === meeting.id &&
        (row.client?.id ?? null) === (meeting.client?.id ?? null) &&
        matches.length === 1 &&
        artifact !== undefined &&
        selected.safeParse(artifact).success &&
        (change.action === "share"
          ? Boolean(
              artifact.status === "approved" &&
              !artifact.confidential &&
              artifact.sharedAt &&
              row.visibility === "shared",
            )
          : artifact.sharedAt === null && artifact.sharedByUserId === null)
      );
    }, "The meeting receipt does not confirm the selected artifact's sharing state.");
}
