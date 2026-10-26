import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { CapiroDataProvider } from "../../../src/shared/capiro/CapiroBoundary";
import { WorkspaceCollaboratorsPanel } from "../../../src/features/modules/workspace/collaboration/WorkspaceCollaboratorsPanel";
import { WorkspaceScreen } from "../../../src/features/modules/workspace/WorkspaceScreen";
import "../../../src/app/globals.css";
import "../font.css";

const firstDraft = "d3000000-0000-4000-8000-000000000001";
function Fixture() {
  const [scope, setScope] = useState(0);
  const [draftId, setDraft] = useState(firstDraft);
  const [shown, setShown] = useState(true);
  const screen = new URLSearchParams(window.location.search).has("screen");
  return (
    <main style={{ padding: 24 }}>
      <p>Synthetic local fixture</p>
      <button onClick={() => setScope((value) => value + 1)}>
        Replace session scope
      </button>
      <button
        onClick={() =>
          setDraft((value) =>
            value === firstDraft
              ? "d3000000-0000-4000-8000-000000000099"
              : firstDraft,
          )
        }
      >
        Replace document
      </button>
      <button onClick={() => setShown((value) => !value)}>Toggle view</button>
      <CapiroDataProvider key={scope} onSessionExpired={() => setShown(false)}>
        {shown &&
          (screen ? (
            <WorkspaceScreen />
          ) : (
            <WorkspaceCollaboratorsPanel draftId={draftId} />
          ))}
      </CapiroDataProvider>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
