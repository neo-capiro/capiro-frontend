import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { AlertPreferencesDialog } from "@/features/portfolio/bill-tracker/AlertPreferencesDialog";
import { BillTrackerPage } from "@/features/portfolio/bill-tracker/BillTrackerPage";
import { trackerClientId } from "../tracker-preference-fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function TrackerBoundaryHarness() {
  const cache = useQueryClient();
  const [clientId, setClientId] = useState(trackerClientId);
  const [shown, setShown] = useState(true);
  const [board] = useState(
    () => new URLSearchParams(window.location.search).get("mode") === "board",
  );
  const [backend] = useState<"core" | "intelligence">(() =>
    new URLSearchParams(window.location.search).get("backend") === "core"
      ? "core"
      : "intelligence",
  );
  useEffect(() => {
    const events: Record<string, EventListener> = {
      "tracker-test-identity": (event) =>
        cache.setQueryData(["identity"], (event as CustomEvent).detail),
      "tracker-test-client": (event) =>
        setClientId(String((event as CustomEvent).detail)),
      "tracker-test-unmount": () => setShown(false),
      "tracker-test-open": () => setShown(true),
      "tracker-test-refresh-board": () => {
        void cache.invalidateQueries({ queryKey: ["bill-tracker"] });
      },
      "tracker-test-refresh-preferences": () => {
        void cache.invalidateQueries({ queryKey: ["bill-alert-preferences"] });
      },
      "tracker-test-invalidate-identity": () => {
        void cache.invalidateQueries({
          queryKey: ["identity"],
          refetchType: "none",
        });
      },
    };
    for (const [name, listener] of Object.entries(events))
      window.addEventListener(name, listener);
    return () => {
      for (const [name, listener] of Object.entries(events))
        window.removeEventListener(name, listener);
    };
  }, [cache]);
  return (
    <main style={{ padding: 20 }}>
      <p>Synthetic Tracker checks. All service requests are intercepted.</p>
      {shown ? (
        board ? (
          <BillTrackerPage
            clientId={clientId}
            backend={backend}
            destinations={{ existingApp: "http://127.0.0.1:5191/existing" }}
          />
        ) : (
          <AlertPreferencesDialog
            clientId={clientId}
            backend={backend}
            onClose={() => setShown(false)}
          />
        )
      ) : (
        <p>Tracker view closed.</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <TrackerBoundaryHarness />
  </DataProvider>,
);
