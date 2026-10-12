import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { AdvocacyHistory } from "@/features/portfolio/advocacy/AdvocacyHistory";
import { advocacyClientId } from "../advocacy-history-fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function AdvocacyHistoryHarness() {
  const cache = useQueryClient();
  const [clientId, setClientId] = useState(advocacyClientId);
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const events: Record<string, EventListener> = {
      "advocacy-test-identity": (event) =>
        cache.setQueryData(["identity"], (event as CustomEvent).detail),
      "advocacy-test-invalidate-identity": () =>
        void cache.invalidateQueries({
          queryKey: ["identity"],
          refetchType: "none",
        }),
      "advocacy-test-interrupt-identity": (event) => {
        const previous = cache.getQueryData<Record<string, unknown>>([
          "identity",
        ]);
        if ((event as CustomEvent).detail === "role")
          cache.setQueryData(["identity"], {
            ...previous,
            role: "client_portal_user",
          });
        else
          void cache.invalidateQueries({
            queryKey: ["identity"],
            refetchType: "none",
          });
        cache.setQueryData(["identity"], previous);
      },
      "advocacy-test-refresh": (event) =>
        void cache.invalidateQueries({
          queryKey: [
            "advocacy",
            clientId,
            ...((event as CustomEvent).detail
              ? [(event as CustomEvent).detail]
              : []),
          ],
        }),
      "advocacy-test-invalidate": (event) =>
        void cache.invalidateQueries({
          queryKey: ["advocacy", clientId, (event as CustomEvent).detail],
          refetchType: "none",
        }),
      "advocacy-test-client": (event) =>
        setClientId(String((event as CustomEvent).detail)),
      "advocacy-test-unmount": () => setShown(false),
      "advocacy-test-open": () => setShown(true),
    };
    for (const [name, listener] of Object.entries(events))
      window.addEventListener(name, listener);
    return () => {
      for (const [name, listener] of Object.entries(events))
        window.removeEventListener(name, listener);
    };
  }, [cache, clientId]);
  return (
    <main style={{ padding: 16 }}>
      <div style={{ width: 360, maxWidth: "100%" }}>
        {shown ? (
          <AdvocacyHistory clientId={clientId} />
        ) : (
          <p>Advocacy view closed.</p>
        )}
      </div>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <AdvocacyHistoryHarness />
  </DataProvider>,
);
