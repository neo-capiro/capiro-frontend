"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Temporal } from "temporal-polyfill";
import { useClients } from "@/features/portfolio/index/public";
import { calendarRange, validDay, zones, type CalendarView } from "./range";
import { useCalendarFeeds } from "./queries";
import { matchesMeetingFilter, type MeetingFilter } from "./lifecycle";
import { deduplicate } from "./feeds";
import type { CalendarItem, CalendarKind } from "./contracts";
import { useMeetingClock } from "./useMeetingClock";

function readSelection(
  params: ReturnType<typeof useSearchParams>,
  clientId?: string,
) {
  const zone =
    zones.find((zone) => zone === params.get("zone")) ?? "America/New_York";
  const date =
    validDay(params.get("date")) ?? Temporal.Now.plainDateISO(zone).toString();
  const view: CalendarView =
    params.get("view") === "week"
      ? "week"
      : params.get("view") === "day"
        ? "day"
        : params.get("view") === "agenda"
          ? "agenda"
          : "month";
  const scope = clientId ?? params.get("clientId") ?? undefined;
  const meetingFilter: MeetingFilter =
    params.get("meetingFilter") === "needs-prep"
      ? "needs-prep"
      : params.get("meetingFilter") === "needs-debrief"
        ? "needs-debrief"
        : "all";
  return { zone, date, view, scope, meetingFilter };
}

function visibleItems(
  all: CalendarItem[],
  hidden: CalendarKind[],
  scope: string | undefined,
  view: CalendarView,
  meetingFilter: MeetingFilter,
  now: number,
  search: string,
) {
  return all.filter(
    (item) =>
      !hidden.includes(item.kind) &&
      (!scope ||
        view !== "agenda" ||
        meetingFilter === "all" ||
        Boolean(
          item.meeting &&
          matchesMeetingFilter(item.meeting, meetingFilter, now),
        )) &&
      (!search ||
        item.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
  );
}

export function useCalendarPageState(clientId?: string) {
  const now = useMeetingClock();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const clients = useClients();
  const currentClients = clients.isSuccess ? clients.data : [];
  const { zone, date, view, scope, meetingFilter } = readSelection(
    params,
    clientId,
  );
  const meetingScopeAvailable =
    Boolean(clientId) ||
    (clients.isSuccess &&
      !clients.isFetching &&
      (!scope || currentClients.some((client) => client.id === scope)));
  const mixed = !scope && view === "agenda";
  const range = calendarRange(date, view, zone, clientId ? 1 : 7);
  const feeds = useCalendarFeeds(range, zone, scope, mixed);
  const [creating, setCreating] = useState(false);
  const [syncReview, setSyncReview] = useState<string | null>(null);
  const syncScope = JSON.stringify([scope, view, date, zone]);
  const [search, setSearch] = useState("");
  const [hidden, setHidden] = useState<CalendarKind[]>([]);
  function update(values: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(values))
      if (value) next.set(key, value);
      else next.delete(key);
    router.replace(`${path}?${next}`, { scroll: false });
  }
  const activeFeeds = mixed
    ? Object.entries(feeds)
    : [["meetings", feeds.meetings] as const];
  const all = deduplicate(
    activeFeeds.flatMap(([, feed]) =>
      feed.isSuccess && !feed.isFetching && !feed.error ? feed.data.items : [],
    ),
  );
  const items = visibleItems(
    all,
    hidden,
    scope,
    view,
    meetingFilter,
    now,
    search,
  );
  return {
    params,
    clients,
    currentClients,
    zone,
    date,
    view,
    scope,
    meetingScopeAvailable,
    mixed,
    range,
    creating,
    setCreating,
    syncReview,
    setSyncReview,
    syncScope,
    search,
    setSearch,
    hidden,
    setHidden,
    meetingFilter,
    update,
    activeFeeds,
    items,
  };
}

export type CalendarPageState = ReturnType<typeof useCalendarPageState>;
