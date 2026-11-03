import { useState } from "react";
import { useSearchParams } from "./navigation";
import { DataProvider } from "../../src/shared/portfolio/api/provider";
import { SelectedClientProvider } from "../../src/shared/session/SelectedClient";
import { ClientMeriHandoffDialog } from "../../src/features/portfolio/client-profile/ClientMeriHandoffDialog";

/**
 * The real client-profile handoff producer on the harness's own tab session. The dialog writes the
 * unsent draft record and soft-navigates to /meri; the destination route is the harness's real Meri
 * home, so the tab identity `ApplicationBoundary` resolved survives the navigation (a nested tab
 * session here would retire the record it just wrote).
 */
export function Vqa029HandoffProfile() {
  const params = useSearchParams();
  const clientId = params.get("clientId") ?? "";
  const [open, setOpen] = useState(true);
  return (
    <DataProvider key={clientId}>
      <SelectedClientProvider requestedId={clientId}>
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
      </SelectedClientProvider>
    </DataProvider>
  );
}
