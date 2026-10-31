import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { DataProvider } from "../../../src/shared/portfolio/api/provider";
import { CapiroDataProvider } from "../../../src/shared/capiro/CapiroBoundary";
import { ImpersonationBoundary } from "../../../src/shared/impersonation/ImpersonationBoundary";
import { useImpersonationEntry } from "../../../src/shared/impersonation/context";
import "../../../src/app/globals.css";
function Home({ realm }: { realm: string }) {
  const entry = useImpersonationEntry();
  const [draft, setDraft] = useState("");
  return (
    <main data-realm={realm}>
      <h1>Your own account</h1>
      <label>
        Private draft
        <input value={draft} onChange={(e) => setDraft(e.target.value)} />
      </label>
      <button
        disabled={!entry?.ready || entry.busy}
        onClick={() =>
          void entry?.start(
            "20000000-0000-4000-8000-000000000002",
            "Investigating a synthetic support ticket",
          )
        }
      >
        Start support
      </button>
      {entry?.error && <p role="alert">{entry.error}</p>}
    </main>
  );
}
function Harness() {
  const [scope, setScope] = useState<string | null>(null);
  // A replacement identity disposes and recreates the whole authenticated
  // provider chain, exactly like ApplicationBoundary's SessionData key.
  const [realm, setRealm] = useState<"a" | "b">("a");
  const onScope = useCallback((id: string | null) => setScope(id), []);
  return (
    <>
      <button onClick={() => setRealm((value) => (value === "a" ? "b" : "a"))}>
        Switch identity
      </button>
      <DataProvider key={JSON.stringify([realm, scope])}>
        <CapiroDataProvider onSessionExpired={() => {}}>
          <ImpersonationBoundary
            identity={`synthetic-account-${realm}`}
            onScope={onScope}
          >
            <Home realm={realm} />
          </ImpersonationBoundary>
        </CapiroDataProvider>
      </DataProvider>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
