import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { CalendarPage } from "@/features/portfolio/calendar/CalendarPage";
import { clientsKey } from "@/features/portfolio/index/public";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

declare global {
  interface Window {
    __calendarBoundary?: {
      refreshFeeds: () => Promise<void>;
      refreshClients: () => Promise<void>;
      snapshots: () => { status: string; retained: boolean }[];
    };
  }
}

function CalendarBoundaryHarness() {
  const cache = useQueryClient();
  useEffect(() => {
    window.__calendarBoundary = {
      refreshFeeds: () => cache.invalidateQueries({ queryKey: ["calendar"] }),
      refreshClients: () => cache.invalidateQueries({ queryKey: clientsKey }),
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
  }, [cache]);
  return (
    <CalendarPage
      destinations={{ existingApp: "http://127.0.0.1:5191/existing" }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <CalendarBoundaryHarness />
  </DataProvider>,
);
