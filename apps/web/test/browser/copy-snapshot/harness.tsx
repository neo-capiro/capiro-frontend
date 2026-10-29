import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { CapiroDataProvider } from "../../../src/shared/capiro/CapiroBoundary";
import { CopyHistory } from "../../../src/features/modules/workspace/brief-copy/CopyHistory";
import {
  copyDetail,
  copyIds,
} from "../../../tests/workspace-brief-copy-fixtures";
import "../../../src/app/globals.css";
function Harness() {
  const [scope, setScope] = useState(0),
    [expired, setExpired] = useState(false);
  const detail = {
    ...copyDetail,
    clientId: copyIds.other,
    document: {
      ...copyDetail.document,
      body: {
        blocks: [
          {
            id: "current",
            type: "section" as const,
            content: "Current draft replacement",
          },
        ],
      },
    },
  };
  return (
    <main style={{ padding: 24 }}>
      <button onClick={() => setScope((value) => value + 1)}>
        Change account
      </button>
      <CapiroDataProvider key={scope} onSessionExpired={() => setExpired(true)}>
        {expired ? (
          <p role="alert">Session expired</p>
        ) : (
          <CopyHistory detail={detail} />
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
