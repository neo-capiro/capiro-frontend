"use client";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { canAdminister } from "@/shared/portfolio/auth/identity";
import { useReviewActor } from "../review/useReviewActor";
import type { ReviewMeeting } from "../review/contracts";
import { useMeetingCommand } from "../commands/useMeetingCommand";
import { readSharing, sharingCommand, preflightSharing } from "./api";
import type { ShareAction } from "./contracts";
import type { SharingTarget } from "./targets";

export function useSharing(meeting: ReviewMeeting) {
  const api = useApi();
  const access = useReviewActor();
  const command = useMeetingCommand(meeting.id);
  const admin = canAdminister(access.identity.data?.role);
  const query = useQuery({
    queryKey: [
      "calendar",
      "sharing",
      access.actor?.tenantId,
      access.actor?.userId,
      meeting.id,
      meeting.client?.id ?? null,
    ],
    enabled: access.allowed && Boolean(access.actor),
    staleTime: 0,
    queryFn: async ({ signal }) => {
      access.guard();
      const current = await readSharing(
        api,
        meeting,
        access.actor!,
        admin,
        signal,
      );
      access.guard();
      return current;
    },
  });
  function submit(action: ShareAction, selected: SharingTarget[]) {
    if (
      command.blocked ||
      !access.actor ||
      !access.allowed ||
      !query.isSuccess ||
      query.isFetching ||
      query.error
    )
      return;
    const actor = access.actor;
    // Shape/revision errors are reported by the same mutation as transport errors.
    void command
      .save(sharingCommand(meeting, action, selected), (signal, guard) =>
        preflightSharing(
          api,
          meeting,
          actor,
          admin,
          action,
          selected,
          () => {
            guard();
            access.guard();
          },
          signal,
        ),
      )
      .catch(() => {});
  }
  return {
    ...access,
    query,
    command,
    submit,
    attempt: {
      status: command.busy ? "pending" : command.blocked ? "uncertain" : "idle",
    },
  };
}
