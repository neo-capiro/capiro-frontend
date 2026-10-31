"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import type { EngagementMeeting } from "../../../shared/capiro/operations/engagement";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  agendaSources,
  meetingItems,
  uniqueAgenda,
  type AgendaSource,
} from "./agenda";
import { calendarRange, currentCalendarDate, type CalendarView } from "./range";
import { useAgendaSources } from "./useAgendaSources";
import { calendarSelection } from "./selection";

/** Calendar state lives independently of its month/week/agenda renderers. */
export function useCalendar() {
  const router = useRouter();
  const params = useSearchParams();
  const [fallbackDate] = useState(currentCalendarDate);
  const { date, view } = calendarSelection(params, fallbackDate);
  const changeSelection = (nextDate: string, nextView: CalendarView) => {
    const next = new URLSearchParams(params.toString());
    next.set("date", nextDate);
    next.set("view", nextView);
    router.replace(`/modules/calendar?${next}`);
  };
  const setDate = (nextDate: string) => changeSelection(nextDate, view);
  const setView = (nextView: CalendarView) => changeSelection(date, nextView);
  const scope = useSelectedClient();
  const clientId = scope.state === "authorized-client" ? scope.client.id : "";
  const [newMeeting, setNewMeeting] = useState(false);
  const [selected, setSelected] = useState<EngagementMeeting>();
  const [datePicker, setDatePicker] = useState(false);
  const [search, setSearch] = useState("");
  const [sources, setSources] = useState<Set<AgendaSource>>(
    () => new Set(agendaSources),
  );
  const range = calendarRange(date, view);
  const clients = useCapiroQuery("clients.list", {});
  const identity = useCapiroQuery("me.read", {});
  const meetings = useCapiroQuery("engagement.meetings", {
    query: {
      from: range.from,
      to: range.to,
      ...(clientId ? { clientId } : {}),
    },
  });
  const extras = useAgendaSources(range, !clientId, view !== "agenda");
  const loaded = meetings.data ?? [];
  const allItems = uniqueAgenda([...meetingItems(loaded), ...extras.items]);
  const filtered = allItems.filter(
    (item) =>
      sources.has(item.source) &&
      (!search ||
        `${item.title} ${item.context}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const clientName =
    scope.state === "authorized-client" ? scope.client.name : "Master view";
  const clientOptions = clients.data ?? [];
  // A verified selection remains visible even when the optional picker list fails.
  const scopeOptions =
    scope.state === "authorized-client" &&
    !clientOptions.some((client) => client.id === clientId)
      ? [...clientOptions, scope.client]
      : clientOptions;
  const count = filtered.length;
  const changeScope = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("clientId", value);
    else next.delete("clientId");
    router.push(`/modules/calendar${next.size ? `?${next}` : ""}`);
  };
  const toggle = (source: AgendaSource) =>
    setSources((current) => {
      const next = new Set(current);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  return {
    date,
    setDate,
    view,
    setView,
    clientId,
    newMeeting,
    setNewMeeting,
    selected,
    setSelected,
    datePicker,
    setDatePicker,
    search,
    setSearch,
    sources,
    setSources,
    clients,
    scopeOptions,
    identity,
    meetings,
    extras,
    loaded,
    allItems,
    filtered,
    clientName,
    count,
    changeScope,
    toggle,
    openHearing: (href: string) => router.push(href),
  };
}
export type CalendarModel = ReturnType<typeof useCalendar>;
