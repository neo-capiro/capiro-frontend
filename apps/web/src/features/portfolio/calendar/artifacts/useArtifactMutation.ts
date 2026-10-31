"use client";
import { useApi } from "@/shared/portfolio/api/provider";
import { useMeetingCommand } from "../commands/useMeetingCommand";
import { artifactCommand, preflightMeetingArtifact } from "./api";
import type {
  ArtifactChange,
  ArtifactKind,
  ArtifactMeeting,
} from "./contracts";

export function useArtifactMutation(
  meeting: ArtifactMeeting,
  kind: ArtifactKind,
  assertReadable?: (change: ArtifactChange) => void,
) {
  const api = useApi();
  const command = useMeetingCommand(meeting.id);
  const input = command.draft?.input;
  const artifact = input?.operation.startsWith(
    kind === "notes" ? "note-" : "debrief-",
  )
    ? input.artifact
    : null;
  const change: ArtifactChange | undefined =
    artifact?.body !== null && artifact?.body !== undefined
      ? {
          action: "save",
          id: artifact.id ?? undefined,
          revision: artifact.revision ?? undefined,
          body: artifact.body,
          confidential: artifact.confidential!,
          // A retained debrief draft keeps its audited context across recovery.
          ...(artifact.generatedFrom !== null &&
          artifact.generatedFrom !== undefined
            ? { generatedFrom: artifact.generatedFrom }
            : {}),
        }
      : undefined;
  const mutate = (value: ArtifactChange) => {
    if (command.blocked) return;
    void command
      .save(artifactCommand(meeting, kind, value), (signal, guard) =>
        preflightMeetingArtifact(api, meeting, guard, signal, () =>
          assertReadable?.(value),
        ),
      )
      .catch(() => {});
  };
  return {
    command,
    mutate,
    attempt: { change },
    isPending: command.busy,
    uncertain: command.blocked,
  };
}
