import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { CalendarPage } from "@/features/portfolio/calendar/CalendarPage";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";
function Harness() {
  const cache = useQueryClient();
  useEffect(() => {
    Object.assign(window, {
      __sharingTest: {
        replaceActor: () =>
          cache.setQueryData(["identity"], {
            user: {
              id: "synthetic-replacement",
              email: "replacement@example.test",
            },
            tenant: { id: "tenant-test", name: "Synthetic" },
            role: "user_admin",
          }),
        refresh: () => cache.invalidateQueries({ queryKey: ["calendar"] }),
        refreshMeeting: () =>
          cache.invalidateQueries({ queryKey: ["meeting"] }),
      },
    });
    return () => {
      delete (window as unknown as Record<string, unknown>).__sharingTest;
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
    <Harness />
  </DataProvider>,
);
