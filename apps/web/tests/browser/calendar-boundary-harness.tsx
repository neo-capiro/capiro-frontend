import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { CalendarPage } from "@/features/portfolio/calendar/CalendarPage";
import type { Meeting } from "@/features/portfolio/calendar/contracts";
import { clientsKey } from "@/features/portfolio/index/public";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

declare global {
  interface Window {
    __calendarBoundary?: {
      refreshFeeds: () => Promise<void>;
      refreshClients: () => Promise<void>;
      refreshMeeting: (id: string) => Promise<void>;
      replaceMeeting: (meeting: Meeting) => void;
      snapshots: () => { status: string; retained: boolean }[];
    };
  }
}

function CalendarBoundaryHarness() {
  const cache = useQueryClient();
  const clientId = new URLSearchParams(location.search).get("workspaceClient");
  useEffect(() => {
    window.__calendarBoundary = {
      refreshFeeds: () => cache.invalidateQueries({ queryKey: ["calendar"] }),
      refreshClients: () => cache.invalidateQueries({ queryKey: clientsKey }),
      refreshMeeting: (id) =>
        cache.invalidateQueries({
          queryKey: ["meeting", id, clientId],
          exact: true,
        }),
      replaceMeeting: (meeting) =>
        cache.setQueryData(["meeting", meeting.id, clientId], meeting),
      snapshots: () =>
        cache
          .getQueryCache()
          .findAll({ queryKey: ["calendar"] })
          .map((query) => ({
            status: query.state.status,
            retained: query.state.data !== undefined,
          })),
    };
    return () => {
      delete window.__calendarBoundary;
    };
  }, [cache, clientId]);
  return (
    <CalendarPage
      clientId={clientId ?? undefined}
      destinations={{ existingApp: "http://127.0.0.1:5191/existing" }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <CalendarBoundaryHarness />
  </DataProvider>,
);
