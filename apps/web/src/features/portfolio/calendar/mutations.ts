"use client";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import type { Meeting, parseMeeting } from "./contracts";
import { meetingInputSchema, type MeetingInput } from "./meeting-save";
import { useMeetingCommand } from "./commands/useMeetingCommand";

export function useSaveMeeting(
  meeting: Meeting | undefined,
  onSaved: () => void,
  clientId?: string,
  readClientId?: string,
) {
  const cache = useQueryClient();
  const command = useMeetingCommand(meeting?.id ?? null);
  const originalClientId = meeting?.client?.id ?? null;
  const mutate = (body: MeetingInput) => {
    if (command.blocked) return;
    const input = meetingInputSchema.parse(body);
    void command
      .save(
        {
          operation: meeting ? "update" : "create",
          meetingId: meeting?.id ?? null,
          expectedClientId: originalClientId,
          expectedRevision: meeting ? (input.expectedRevision ?? null) : null,
          meeting: {
            subject: input.subject,
            description: input.description ?? null,
            location: input.location ?? null,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            assignClient: !meeting || "clientId" in input,
            clientId:
              !meeting || "clientId" in input
                ? input.clientId !== undefined
                  ? input.clientId
                  : (clientId ?? null)
                : null,
          },
          artifact: null,
          artifacts: [],
        },
        async (_signal, guard) => {
          guard();
          if (!meeting) return;
          const saved = cache.getQueryState<ReturnType<typeof parseMeeting>>([
            "meeting",
            meeting.id,
            readClientId ?? null,
          ]);
          if (
            saved?.status !== "success" ||
            saved.fetchStatus !== "idle" ||
            saved.isInvalidated ||
            saved.error ||
            saved.data?.meeting?.id !== meeting.id ||
            (saved.data.meeting.client?.id ?? null) !== originalClientId ||
            saved.data.meeting.updatedAt !== meeting.updatedAt
          )
            throw new ApiError(
              409,
              "Refresh the meeting details before saving.",
            );
        },
      )
      .catch(() => {});
  };
  return {
    command,
    mutate,
    onSaved,
    isPending: command.busy,
    uncertain: command.blocked,
    error: command.error ? new Error(command.error) : null,
  };
}
