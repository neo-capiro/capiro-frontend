import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { NotesDialog } from "@/features/portfolio/client-profile/NotesDialog";
import { TeamDialog } from "@/features/portfolio/client-profile/TeamDialog";
import { FacilitiesCard } from "@/features/portfolio/client-profile/FacilitiesCard";
import { profileClientId } from "../profile-current-state-fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function ProfileCurrentStateHarness() {
  const cache = useQueryClient();
  useIdentity();
  const [clientId, setClientId] = useState(profileClientId);
  const [shown, setShown] = useState(true);
  const [closures, setClosures] = useState(0);
  const [mode] = useState(
    () => new URLSearchParams(window.location.search).get("mode") ?? "notes",
  );
  useEffect(() => {
    const events: Record<string, EventListener> = {
      "profile-test-identity": (event) =>
        cache.setQueryData(["identity"], (event as CustomEvent).detail),
      "profile-test-client": (event) =>
        setClientId(String((event as CustomEvent).detail)),
      "profile-test-unmount": () => setShown(false),
      "profile-test-open": () => setShown(true),
      "profile-test-refresh": () => {
        for (const queryKey of [
          ["client-profile"],
          ["member-options"],
          ["portfolio", "client"],
        ])
          void cache.invalidateQueries({ queryKey });
      },
      "profile-test-invalidate-identity": () =>
        void cache.invalidateQueries({
          queryKey: ["identity"],
          refetchType: "none",
        }),
    };
    for (const [name, listener] of Object.entries(events))
      window.addEventListener(name, listener);
    return () => {
      for (const [name, listener] of Object.entries(events))
        window.removeEventListener(name, listener);
    };
  }, [cache]);
  const close = (open: boolean) => {
    setShown(open);
    if (!open) setClosures((count) => count + 1);
  };
  return (
    <main style={{ padding: 20 }}>
      <p>Synthetic profile checks. All service requests are intercepted.</p>
      <p data-testid="profile-closures">Closures: {closures}</p>
      {shown ? (
        mode === "team" ? (
          <TeamDialog clientId={clientId} open onOpenChange={close} />
        ) : mode === "facilities" ? (
          <FacilitiesCard
            clientId={clientId}
            clientName="Synthetic profile client"
          />
        ) : (
          <NotesDialog clientId={clientId} open onOpenChange={close} />
        )
      ) : (
        <p>Profile view closed.</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <ProfileCurrentStateHarness />
  </DataProvider>,
);
