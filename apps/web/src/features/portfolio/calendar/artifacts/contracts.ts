import type { Meeting } from "../contracts";

export type ArtifactKind = "notes" | "debriefs";
export type ArtifactChange =
  | {
      action: "save";
      id?: string;
      revision?: string;
      body: string;
      confidential: boolean;
      /** D2: the audited context summary of the debrief this body came from. */
      generatedFrom?: unknown;
    }
  | { action: "approve" | "share" | "unshare"; id: string; revision?: string };
export type ArtifactActor = { userId: string; tenantId: string };
export type ArtifactMeeting = Pick<Meeting, "id" | "client" | "updatedAt">;
