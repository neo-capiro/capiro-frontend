import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { meetingSchema } from "../contracts";
import {
  artifactReceiptSchema,
  type ArtifactActor,
  type ArtifactChange,
  type ArtifactKind,
  type ArtifactMeeting,
} from "./contracts";

export class ArtifactMutationError extends Error {
  constructor(
    message: string,
    public readonly uncertain: boolean,
  ) {
    super(message);
    this.name = "ArtifactMutationError";
  }
}

function operation(base: string, kind: ArtifactKind, change: ArtifactChange) {
  if (change.action === "save")
    return {
      path: `${base}/${kind}${change.id ? `/${encodeURIComponent(change.id)}` : ""}`,
      method: change.id ? "PATCH" : "POST",
      body: { body: change.body, confidential: change.confidential },
    };
  if (change.action === "approve")
    return {
      path: `${base}/${kind}/${encodeURIComponent(change.id)}/approve`,
      method: "POST",
      body: undefined,
    };
  return {
    path: `${base}/artifacts/${change.action}`,
    method: "POST",
    body: {
      artifacts: [
        { type: kind === "notes" ? "note" : "debrief", id: change.id },
      ],
    },
  };
}

export async function changeMeetingArtifact(
  api: ApiClient,
  meeting: ArtifactMeeting,
  kind: ArtifactKind,
  actor: ArtifactActor,
  change: ArtifactChange,
  assertCurrent: () => void,
  signal: AbortSignal,
) {
  let dispatched = false;
  let knownRefusal = false;
  const base = `engagement/meetings/${encodeURIComponent(meeting.id)}`;
  try {
    assertCurrent();
    await api.request(
      "core",
      base,
      meetingSchema.refine(
        (row) =>
          row.id === meeting.id &&
          (row.client?.id ?? null) === (meeting.client?.id ?? null),
        "The meeting or client association changed. Reopen the meeting.",
      ),
      { signal },
    );
    assertCurrent();
    const request = operation(base, kind, change);
    dispatched = true;
    await api
      .request(
        "core",
        request.path,
        artifactReceiptSchema(meeting, kind, actor, change),
        {
          method: request.method,
          body: request.body,
          signal,
        },
      )
      .catch((error: unknown) => {
        knownRefusal =
          error instanceof ApiError &&
          [400, 401, 403, 404, 409, 422].includes(error.status);
        throw error;
      });
    assertCurrent();
  } catch (error) {
    const uncertain = dispatched && !knownRefusal;
    throw new ArtifactMutationError(
      uncertain
        ? `This action may have completed.${change.action === "save" ? " Your draft is retained." : ""} Refresh the saved records and verify the result before further changes; this attempt cannot be retried here.`
        : error instanceof Error
          ? error.message
          : "The artifact could not be changed.",
      uncertain,
    );
  }
}
