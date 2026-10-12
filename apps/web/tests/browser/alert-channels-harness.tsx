import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { AlertPreferencesDialog } from "@/features/portfolio/bill-tracker/AlertPreferencesDialog";
import { trackerClientId } from "../alert-channel-fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function AlertChannelsHarness() {
  const cache = useQueryClient();
  const [clientId, setClientId] = useState(trackerClientId);
  const [backend, setBackend] = useState<"core" | "intelligence">(() =>
    new URLSearchParams(location.search).get("backend") === "core"
      ? "core"
      : "intelligence",
  );
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const events: Record<string, EventListener> = {
      "alert-test-client": (event) =>
        setClientId(String((event as CustomEvent).detail)),
      "alert-test-owner": (event) => setBackend((event as CustomEvent).detail),
      "alert-test-identity": (event) =>
        cache.setQueryData(["identity"], (event as CustomEvent).detail),
      "alert-test-close": () => setShown(false),
      "alert-test-open": () => setShown(true),
      "alert-test-refresh-preferences": () => {
        void cache.invalidateQueries({ queryKey: ["bill-alert-preferences"] });
      },
      "alert-test-refresh-client": () => {
        void cache.invalidateQueries({
          queryKey: ["client-profile", clientId, "saved-client"],
        });
      },
      "alert-test-flap": (event) => {
        const target = (event as CustomEvent).detail as
          | "identity"
          | "client"
          | "preferences";
        const prefix =
          target === "identity"
            ? ["identity"]
            : target === "client"
              ? ["client-profile", clientId, "saved-client"]
              : ["bill-alert-preferences"];
        for (const query of cache
          .getQueryCache()
          .findAll({ queryKey: prefix })) {
          const pristine = query.state;
          query.setState({
            status: "error",
            error: new ApiError(403, "Synthetic interrupted read"),
          });
          // Restore the exact data/revision before React observes either state.
          query.setState(pristine);
        }
      },
    };
    for (const [name, listener] of Object.entries(events))
      window.addEventListener(name, listener);
    return () => {
      for (const [name, listener] of Object.entries(events))
        window.removeEventListener(name, listener);
    };
  }, [cache, clientId]);
  return (
    <main style={{ padding: 20 }}>
      <p>All preference and channel requests in this harness are synthetic.</p>
      {shown ? (
        <AlertPreferencesDialog
          backend={backend}
          clientId={clientId}
          onClose={() => setShown(false)}
        />
      ) : (
        <p>Alert view closed.</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <AlertChannelsHarness />
  </DataProvider>,
);
