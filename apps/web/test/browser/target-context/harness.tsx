import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { CapiroDataProvider } from "../../../src/shared/capiro/CapiroBoundary";
import { TargetContext } from "../../../src/features/portfolio/relationships/TargetContext";
import { contextIds } from "../../../tests/target-context-fixtures";
import "../../../src/app/globals.css";
function Harness() {
  const [targetId, setTarget] = useState(contextIds.targetId);
  const [scope, setScope] = useState(0);
  const [expired, setExpired] = useState(false);
  return (
    <main style={{ padding: 24 }}>
      <button onClick={() => setTarget(contextIds.otherTargetId)}>
        Change target
      </button>
      <button onClick={() => setScope((value) => value + 1)}>
        Change account
      </button>
      <CapiroDataProvider key={scope} onSessionExpired={() => setExpired(true)}>
        {expired ? (
          <p role="alert">Session expired</p>
        ) : (
          <TargetContext clientId={contextIds.clientId} targetId={targetId} />
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
