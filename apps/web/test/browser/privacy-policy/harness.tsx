import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { CapiroDataProvider } from "../../../src/shared/capiro/CapiroBoundary";
import { MeriPreferencesPanel } from "../../../src/features/meri/screens/settings/MeriPreferencesPanel";
import "../../../src/app/globals.css";
function Harness() {
  const [scope, setScope] = useState(0);
  const [expired, setExpired] = useState(false);
  return (
    <main style={{ padding: 24 }}>
      <button onClick={() => setScope((value) => value + 1)}>
        Change account
      </button>
      <CapiroDataProvider key={scope} onSessionExpired={() => setExpired(true)}>
        {expired ? (
          <p role="alert">Session expired</p>
        ) : (
          <MeriPreferencesPanel />
        )}
      </CapiroDataProvider>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
