import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { QuickLog } from "@/features/portfolio/client-profile/QuickLog";
import { commandClientId } from "../activity-command-fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function Harness() {
  const cache = useQueryClient();
  const identity = useIdentity();
  const [clientId, setClientId] = useState(commandClientId);
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const listeners: Record<string, EventListener> = {
      "command-test-close": () => setShown(false),
      "command-test-open": () => setShown(true),
      "command-test-client": (event) =>
        setClientId(String((event as CustomEvent).detail)),
      "command-test-identity": (event) =>
        cache.setQueryData(["identity"], (event as CustomEvent).detail),
    };
    for (const [name, handler] of Object.entries(listeners))
      window.addEventListener(name, handler);
    return () => {
      for (const [name, handler] of Object.entries(listeners))
        window.removeEventListener(name, handler);
    };
  }, [cache]);
  return (
    <main>
      <p>Synthetic command checks. All service requests are intercepted.</p>
      <QuickLog
        key={`${identity.data?.tenant?.id}:${identity.data?.user.id}:${clientId}`}
        clientId={clientId}
        clientName="Synthetic client"
        open={shown}
        onOpenChange={setShown}
      />
      {!shown && <p>Quick log view closed.</p>}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <Harness />
  </DataProvider>,
);
