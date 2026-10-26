import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CapiroDataProvider } from "../../../src/shared/capiro/CapiroBoundary";
import { WorkspaceScreen } from "../../../src/features/modules/workspace/WorkspaceScreen";
import "../../../src/app/globals.css";
import "../font.css";

function Scope({ onExpired }: { onExpired: () => void }) {
  const [queries] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queries}>
      <CapiroDataProvider onSessionExpired={onExpired}>
        <WorkspaceScreen />
      </CapiroDataProvider>
    </QueryClientProvider>
  );
}

function Fixture() {
  const [scope, setScope] = useState(0);
  const [shown, setShown] = useState(true);
  return (
    <main style={{ padding: 24 }}>
      <p>Synthetic local Workspace host composition</p>
      <button onClick={() => setScope((value) => value + 1)}>
        Replace session scope
      </button>
      {shown && <Scope key={scope} onExpired={() => setShown(false)} />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
