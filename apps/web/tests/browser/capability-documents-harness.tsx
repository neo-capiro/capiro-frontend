import { useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { notifyManager, useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { createApiClient, type ApiClient } from "@/shared/portfolio/api/http";
import { CapabilityEditor } from "@/features/portfolio/capabilities/CapabilityEditor";
import { FilesPage } from "@/features/portfolio/files/FilesPage";
import { filesKey } from "@/features/portfolio/files/queries";
import { capability, capabilityId, clientId } from "./fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

const listeners = new Set<() => void>();
let pending = 0;
const nativeApi = createApiClient();
const api: ApiClient = {
  async request(...args) {
    pending += 1;
    for (const notify of listeners) notify();
    try {
      return await nativeApi.request(...args);
    } finally {
      pending -= 1;
      for (const notify of listeners) notify();
    }
  },
};

/** Only actor/client/view changes and request counters are synthetic. The editor and Files components are real. */
function CapabilityDocumentsHarness() {
  const cache = useQueryClient();
  const [currentClient, setClient] = useState(clientId);
  const [currentCapability, setCapability] = useState(capabilityId);
  const [shown, setShown] = useState(true);
  const pendingCount = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    () => pending,
  );
  const state = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe(notifyManager.batchCalls(notify)),
    () =>
      JSON.stringify(
        cache
          .getQueryCache()
          .findAll({ queryKey: filesKey(clientId) })
          .map((query) => ({
            key: query.queryKey,
            data: query.state.data,
            isInvalidated: query.state.isInvalidated,
            dataUpdateCount: query.state.dataUpdateCount,
            status: query.state.status,
            fetchStatus: query.state.fetchStatus,
          })),
      ),
  );
  useEffect(() => {
    const identity = (
      userId = "user-test",
      role = "standard_user",
      tenantId = "tenant-test",
    ) =>
      cache.setQueryData(["identity"], {
        user: { id: userId, email: "synthetic@example.test" },
        tenant: { id: tenantId, name: "Synthetic tenant" },
        role,
      });
    const events = {
      "file-documents-actor": () => identity("another-user"),
      "file-documents-restore-actor": () => identity(),
      "file-documents-tenant": () =>
        identity("user-test", "standard_user", "another-tenant"),
      "file-documents-role": () => identity("user-test", "client_portal_user"),
      "file-documents-invalidate": () =>
        void cache.invalidateQueries({
          queryKey: ["identity"],
          refetchType: "none",
        }),
      "file-documents-files": () =>
        void cache.refetchQueries({
          queryKey: filesKey(currentClient),
          type: "active",
        }),
      "file-documents-client": () =>
        setClient("10000000-0000-4000-8000-000000000002"),
      "file-documents-source": () =>
        setCapability("40000000-0000-4000-8000-000000000002"),
      "file-documents-unmount": () => setShown(false),
    };
    for (const [name, handler] of Object.entries(events))
      window.addEventListener(name, handler);
    return () => {
      for (const [name, handler] of Object.entries(events))
        window.removeEventListener(name, handler);
    };
  }, [cache, currentClient]);
  return (
    <>
      <p>Isolated synthetic capability documents</p>
      {shown ? (
        new URLSearchParams(window.location.search).has("files") ? (
          <FilesPage clientId={currentClient} destinations={{}} />
        ) : (
          <CapabilityEditor
            clientId={currentClient}
            capability={{ ...capability, id: currentCapability }}
            open
            onClose={() => setShown(false)}
          />
        )
      ) : (
        <p>Document view unmounted</p>
      )}
      <output hidden aria-label="Synthetic document requests pending">
        {pendingCount}
      </output>
      <output hidden aria-label="Synthetic original document cache">
        {state}
      </output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider api={api}>
    <CapabilityDocumentsHarness />
  </DataProvider>,
);
