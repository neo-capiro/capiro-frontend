"use client";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { fetchEffectiveDates } from "./effective-feed";
import { fetchFundingDeadlines } from "./funding-feed";
import {
  fetchMeetings,
  fetchHearings,
  fetchPlanner,
  fetchUpcomingDeadlines,
} from "./feeds";
import { meetingArtifactListSchema, parseMeeting } from "./contracts";
export function useCalendarFeeds(
  range: { from: string; to: string; startDay: string; endDay: string },
  zone: string,
  clientId?: string,
  mixed = false,
) {
  const api = useApi();
  const meetings = useQuery({
    queryKey: [
      "calendar",
      "meetings",
      range.from,
      range.to,
      clientId ?? null,
      zone,
    ],
    queryFn: ({ signal }) =>
      fetchMeetings(api, range.from, range.to, zone, clientId, signal),
  });
  const hearings = useQuery({
    queryKey: ["calendar", "hearings", range.startDay, range.endDay],
    enabled: mixed,
    queryFn: ({ signal }) =>
      fetchHearings(api, range.startDay, range.endDay, signal),
  });
  const planner = useQuery({
    queryKey: ["calendar", "planner", range.startDay, range.endDay],
    enabled: mixed,
    queryFn: ({ signal }) =>
      fetchPlanner(api, range.startDay, range.endDay, signal),
  });
  const deadlines = useQuery({
    queryKey: ["calendar", "deadlines", range.startDay, range.endDay],
    enabled: mixed,
    queryFn: ({ signal }) =>
      fetchUpcomingDeadlines(api, range.startDay, range.endDay, signal),
  });
  const government = useQuery({
    queryKey: ["calendar", "government", range.startDay, range.endDay],
    enabled: mixed,
    queryFn: ({ signal }) =>
      fetchEffectiveDates(api, range.startDay, range.endDay, signal),
  });
  const funding = useQuery({
    queryKey: ["calendar", "funding", range.startDay, range.endDay, zone],
    enabled: mixed,
    queryFn: ({ signal }) =>
      fetchFundingDeadlines(api, range.startDay, range.endDay, zone, signal),
  });
  return { meetings, hearings, planner, deadlines, government, funding };
}
export function useMeeting(id: string | null, clientId?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["meeting", id, clientId ?? null],
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      const payload = await api.request(
        "core",
        `engagement/meetings/${encodeURIComponent(id ?? "")}${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`,
        z.unknown(),
        { signal },
      );
      // A prep that fails its meeting/client binding degrades to the Preparation
      // panel; it does not blank the drawer (B0).
      const read = parseMeeting(payload);
      if (read.meeting.id !== id)
        throw new Error(
          "Meeting response does not match the requested meeting",
        );
      return read;
    },
  });
}
export function useMeetingNotes(
  id: string | null,
  kind: "notes" | "debriefs",
  scope?: { tenantId: string; userId: string; clientId: string | null },
) {
  const api = useApi();
  const queryKey = [
    "meeting",
    id,
    kind,
    scope?.tenantId ?? null,
    scope?.userId ?? null,
    scope?.clientId ?? null,
  ];
  const query = useQuery({
    queryKey,
    enabled: Boolean(id),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `engagement/meetings/${encodeURIComponent(id ?? "")}/${kind}${scope?.clientId ? `?clientId=${encodeURIComponent(scope.clientId)}` : ""}`,
        meetingArtifactListSchema(id, scope?.clientId),
        { signal },
      ),
  });
  return { ...query, queryKey };
}
