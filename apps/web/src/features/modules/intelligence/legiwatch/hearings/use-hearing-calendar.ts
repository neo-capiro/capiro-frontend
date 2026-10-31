"use client";
import { useEffect, useState } from "react";
import { useCapiro } from "../../../../../shared/capiro/CapiroBoundary";
import {
  loadHearingCalendar,
  type HearingCalendarFeed,
  type HearingCalendarQuery,
} from "../../../../../shared/capiro/operations/legiwatch-calendar-feed";

export function useHearingCalendar(
  query: HearingCalendarQuery,
  enabled: boolean,
) {
  const api = useCapiro();
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify(query);
  const requestId = `${key}:${revision}`;
  const [state, setState] = useState<{
    requestId?: string;
    data?: HearingCalendarFeed;
    error?: Error;
    loading: boolean;
  }>({ loading: enabled });
  const [previous, setPrevious] = useState({ api, requestId, enabled });
  if (
    previous.api !== api ||
    previous.requestId !== requestId ||
    previous.enabled !== enabled
  ) {
    setPrevious({ api, requestId, enabled });
    setState({ requestId, loading: enabled });
  }
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    loadHearingCalendar(
      (input) =>
        api.request(
          "legiwatch.calendar",
          { query: input },
          { signal: controller.signal },
        ),
      (input) =>
        api.request(
          "legiwatch.calendarCoverage",
          { query: input },
          { signal: controller.signal },
        ),
      JSON.parse(key) as HearingCalendarQuery,
    ).then(
      (data) => {
        if (!controller.signal.aborted)
          setState({ requestId, data, loading: false });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            requestId,
            error:
              error instanceof Error
                ? error
                : new Error("Hearing calendar unavailable."),
            loading: false,
          });
      },
    );
    return () => controller.abort();
  }, [api, key, requestId, enabled]);
  return {
    ...(enabled && state.requestId === requestId
      ? state
      : { loading: enabled }),
    reload: () => setRevision((value) => value + 1),
  };
}
