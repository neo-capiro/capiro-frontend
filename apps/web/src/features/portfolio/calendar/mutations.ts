"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { useDispatchGuard } from "./access/public";
import type { Meeting } from "./contracts";
import {
  meetingInputSchema,
  meetingSaveReceiptSchema,
  type MeetingInput,
} from "./meeting-save";

export function useSaveMeeting(
  meeting: Meeting | undefined,
  onSaved: () => void,
  clientId?: string,
) {
  const api = useApi();
  const cache = useQueryClient();
  const meetingId = meeting?.id;
  const originalClientId = meeting?.client?.id ?? null;
  const identity = useIdentity();
  const userId = identity.data?.user.id;
  const tenantId = identity.data?.tenant?.id;
  const guard = useDispatchGuard(userId, tenantId);
  const busy = useRef(false);
  const uncertain = useRef(false);
  const [isUncertain, setUncertain] = useState(false);
  const lifetime = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [meetingId, originalClientId, clientId, userId, tenantId]);
  const mutation = useMutation({
    mutationFn: async (body: MeetingInput) => {
      const input = meetingInputSchema.parse(body);
      const controller = lifetime.current;
      if (!controller)
        throw new ApiError(409, "Reopen this meeting before saving.");
      const current = () => {
        controller.signal.throwIfAborted();
        guard();
        if (meetingId) {
          const saved = cache.getQueryState<Meeting>(["meeting", meetingId]);
          if (
            saved?.status !== "success" ||
            saved.fetchStatus !== "idle" ||
            saved.isInvalidated ||
            saved.error ||
            saved.data?.id !== meetingId ||
            (saved.data.client?.id ?? null) !== originalClientId
          )
            throw new ApiError(
              409,
              "Refresh the meeting details before saving.",
            );
        }
      };
      current();
      let knownRefusal = false;
      try {
        const receipt = await api
          .request(
            "core",
            `engagement/meetings${meetingId ? `/${encodeURIComponent(meetingId)}` : ""}`,
            meetingSaveReceiptSchema(meetingId, input),
            {
              method: meetingId ? "PUT" : "POST",
              body: input,
              signal: controller.signal,
            },
          )
          .catch((error: unknown) => {
            knownRefusal =
              error instanceof ApiError &&
              [400, 401, 403, 404, 409, 422].includes(error.status);
            throw error;
          });
        current();
        return receipt;
      } catch (error) {
        if (knownRefusal) throw error;
        uncertain.current = true;
        setUncertain(true);
        throw new Error(
          "The meeting save may have completed. Keep this draft and verify the saved meeting before further changes; this attempt cannot be retried here.",
        );
      }
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: ["calendar", "meetings"] });
      void cache.invalidateQueries({ queryKey: ["meeting", meetingId] });
      onSaved();
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  return {
    ...mutation,
    uncertain: isUncertain,
    mutate: (body: MeetingInput) => {
      if (busy.current || uncertain.current) return;
      busy.current = true;
      mutation.mutate(body);
    },
  };
}
