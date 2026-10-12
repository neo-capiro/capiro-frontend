import { useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { createApiClient, type ApiClient } from "@/shared/portfolio/api/http";
import { ActivityTimeline } from "@/features/portfolio/client-profile/ActivityTimeline";
import { FilesPage } from "@/features/portfolio/files/FilesPage";
import { filesKey } from "@/features/portfolio/files/queries";
import { clientId } from "./fixtures";
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

/** The real producer/destination render; only routing props and lifetime events are synthetic. */
function LinkedFileArrivalHarness() {
  const cache = useQueryClient();
  const pathname = usePathname();
  const params = useSearchParams();
  const [clientOverride, setClientOverride] = useState<string>();
  const [shown, setShown] = useState(true);
  const currentClient = clientOverride ?? clientId;
  const fileValues = params.getAll("file");
  const linkedFileId =
    fileValues.length === 1 && fileValues[0] ? fileValues[0] : undefined;
  const pendingCount = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    () => pending,
  );
  useEffect(() => {
    const identity = (userId = "user-test", tenantId = "tenant-test") =>
      cache.setQueryData(["identity"], {
        user: { id: userId, email: "synthetic@example.test" },
        tenant: { id: tenantId, name: "Synthetic tenant" },
        role: "standard_user",
      });
    const events = {
      "linked-file-actor": () => identity("replacement-reader"),
      "linked-file-tenant": () => identity("user-test", "replacement-tenant"),
      "linked-file-revoke": () =>
        void cache.invalidateQueries({
          queryKey: ["identity"],
          refetchType: "none",
        }),
      "linked-file-restore": () => identity(),
      "linked-file-client": () =>
        setClientOverride("10000000-0000-4000-8000-000000000002"),
      "linked-file-files": () =>
        void cache.refetchQueries({
          queryKey: filesKey(currentClient),
          type: "active",
        }),
      "linked-file-unmount": () => setShown(false),
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
      <p>Isolated synthetic activity attachment arrival</p>
      {shown ? (
        pathname === "/linked-file-arrival.html" && params.has("activity") ? (
          <ActivityTimeline clientId={currentClient} />
        ) : (
          <FilesPage
            {...{
              clientId: currentClient,
              destinations: {},
              linkedFileId,
            }}
          />
        )
      ) : (
        <p>File arrival view unmounted</p>
      )}
      <output hidden aria-label="Synthetic file arrival requests pending">
        {pendingCount}
      </output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider api={api}>
    <LinkedFileArrivalHarness />
  </DataProvider>,
);
