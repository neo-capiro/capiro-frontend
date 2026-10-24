import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "./navigation";
import { DataProvider } from "../../src/shared/portfolio/api/provider";
import { SelectedClientProvider } from "../../src/shared/session/SelectedClient";
import { MeriCapabilitiesProvider } from "../../src/shared/meri-resources/CapabilityContext";
import { resolveMeriCapabilities } from "../../src/shared/meri-resources/capabilities";
import { useMeriTabSession } from "../../src/shared/meri-conversations/MeriTabSession";
import { ClientMeriHandoffDialog } from "../../src/features/portfolio/client-profile/ClientMeriHandoffDialog";
function RefreshIdentity() {
  const cache = useQueryClient();
  return (
    <button
      onClick={() => void cache.invalidateQueries({ queryKey: ["identity"] })}
    >
      Revalidate current session
    </button>
  );
}
export function ClientHandoffProbe() {
  const params = useSearchParams(),
    path = usePathname();
  const [open, setOpen] = useState(true);
  const session = useMeriTabSession("profile-session");
  const clientId =
    params.get("clientId") ?? "00000005-0000-4000-8000-000000000000";
  if (session.status !== "ready") return null;
  if (path === "/meri") return <p>Meri received the client selector</p>;
  return (
    <DataProvider key={clientId}>
      <RefreshIdentity />
      <SelectedClientProvider requestedId={clientId}>
        <MeriCapabilitiesProvider
          value={resolveMeriCapabilities(
            params.has("held")
              ? {}
              : { conversations: true, newConversation: true },
          )}
        >
          <button onClick={() => setOpen(true)}>Ask again</button>
          {open && (
            <ClientMeriHandoffDialog
              client={{
                id: clientId,
                name: "Synthetic client",
                status: "active",
                profileStatus: "ready",
              }}
              onClose={() => setOpen(false)}
            />
          )}
        </MeriCapabilitiesProvider>
      </SelectedClientProvider>
    </DataProvider>
  );
}
