import { useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { notifyManager, useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { CapabilitiesPage } from "@/features/portfolio/capabilities/CapabilitiesPage";
import {
  capabilitiesKey,
  fitKey,
} from "@/features/portfolio/capabilities/queries";
import { clientId } from "./fixtures";
import { clientKey } from "@/features/portfolio/index/public";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

export const secondClientId = "10000000-0000-4000-8000-000000000002";

/** Only cache/session transitions are synthetic; the mounted feature is real. */
function CapabilityBoundaryHarness() {
  const cache = useQueryClient();
  const [currentClient, setCurrentClient] = useState(clientId);
  const [shown, setShown] = useState(true);
  const fit = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe(notifyManager.batchCalls(notify)),
    () => JSON.stringify(cache.getQueryData(fitKey(clientId)) ?? null),
  );
  const pending = useSyncExternalStore(
    (notify) =>
      cache.getMutationCache().subscribe(notifyManager.batchCalls(notify)),
    () =>
      cache
        .getMutationCache()
        .getAll()
        .filter((mutation) => mutation.state.status === "pending").length,
  );
  const currentClientState = useSyncExternalStore(
    // Mounting the real registration view creates its query during render.
    // Use the library's observer scheduler for these synthetic cache probes.
    (notify) =>
      cache.getQueryCache().subscribe(notifyManager.batchCalls(notify)),
    () => JSON.stringify(cache.getQueryState(clientKey(clientId)) ?? null),
  );
  useEffect(() => {
    const events = {
      "capability-boundary-refetch": () =>
        void cache.refetchQueries({ queryKey: capabilitiesKey(clientId) }),
      "capability-boundary-refetch-fit": () =>
        void cache.refetchQueries({ queryKey: fitKey(clientId) }),
      "capability-boundary-refetch-identity": () =>
        void cache.refetchQueries({ queryKey: ["identity"] }),
      "capability-boundary-refetch-client": () =>
        void cache.refetchQueries({ queryKey: clientKey(clientId) }),
      "capability-boundary-standard-role": () =>
        cache.setQueryData(["identity"], {
          user: { id: "user-test", email: "test@example.test" },
          tenant: { id: "tenant-test", name: "Synthetic tenant" },
          role: "standard_user",
        }),
      "capability-boundary-actor": () =>
        cache.setQueryData(["identity"], {
          user: { id: "another-user", email: "another@example.test" },
          tenant: { id: "another-tenant", name: "Another synthetic tenant" },
          role: "standard_user",
        }),
      "capability-boundary-role": () =>
        cache.setQueryData(["identity"], {
          user: { id: "user-test", email: "test@example.test" },
          tenant: { id: "tenant-test", name: "Synthetic tenant" },
          role: "client_portal_user",
        }),
      "capability-boundary-invalidate": () =>
        void cache.invalidateQueries({
          queryKey: ["identity"],
          refetchType: "none",
        }),
      "capability-boundary-client": () => setCurrentClient(secondClientId),
      "capability-boundary-unmount": () => setShown(false),
    };
    for (const [name, handler] of Object.entries(events))
      window.addEventListener(name, handler);
    return () => {
      for (const [name, handler] of Object.entries(events))
        window.removeEventListener(name, handler);
    };
  }, [cache]);
  return (
    <>
      {shown ? (
        <CapabilitiesPage
          clientId={currentClient}
          destinations={{ existingApp: "http://127.0.0.1:5191/existing" }}
        />
      ) : (
        <p>Capability view unmounted</p>
      )}
      <output hidden aria-label="Synthetic original fit cache">
        {fit}
      </output>
      <output hidden aria-label="Synthetic pending capability writes">
        {pending}
      </output>
      <output hidden aria-label="Synthetic original client cache">
        {currentClientState}
      </output>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <CapabilityBoundaryHarness />
  </DataProvider>,
);
