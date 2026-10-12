import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { ObjectivesPage } from "@/features/portfolio/objectives/ObjectivesPage";
import { ObjectiveSummary } from "@/features/portfolio/objectives/ObjectiveSummary";
import { clientId as initialClient } from "./fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function CurrentReadProbe() {
  const cache = useQueryClient();
  useIdentity();
  const [clientId, setClientId] = useState(initialClient);
  const [summary] = useState(() =>
    new URLSearchParams(location.search).has("summary"),
  );
  useEffect(() => {
    const refresh = () =>
      void cache.invalidateQueries({ queryKey: ["objectives", clientId] });
    const replace = (event: Event) =>
      setClientId(String((event as CustomEvent).detail));
    window.addEventListener("objective-current-read-refresh", refresh);
    window.addEventListener("objective-current-read-client", replace);
    return () => {
      window.removeEventListener("objective-current-read-refresh", refresh);
      window.removeEventListener("objective-current-read-client", replace);
    };
  }, [cache, clientId]);
  return (
    <main>
      <p>Synthetic current-read checks. Service requests are intercepted.</p>
      {summary ? (
        <ObjectiveSummary clientId={clientId} />
      ) : (
        <ObjectivesPage clientId={clientId} />
      )}
    </main>
  );
}

function ScopeProbe() {
  const [session, setSession] = useState(0);
  useEffect(() => {
    const replace = () => setSession((value) => value + 1);
    window.addEventListener("objective-current-read-session", replace);
    return () =>
      window.removeEventListener("objective-current-read-session", replace);
  }, []);
  return (
    <DataProvider key={session}>
      <CurrentReadProbe />
    </DataProvider>
  );
}

createRoot(document.getElementById("root")!).render(<ScopeProbe />);
