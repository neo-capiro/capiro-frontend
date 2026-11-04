import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DocumentPreviewPanel } from "../../src/features/meri/files/DocumentPreviewPanel";
import { createDocumentLibraryAccess } from "../../src/shared/meri-documents/library-access";
import { syncMeriTabIdentity } from "../../src/shared/meri-conversations/tab-journal";
import { ids, session } from "../meri-document-public-fixtures";
import "../../src/app/globals.css";

// Synthetic in-browser session replacement; the actual document transport and receivers run unchanged.
syncMeriTabIdentity("synthetic-preview-renewal");
function connection() {
  const lifetime = new AbortController();
  const port = createDocumentLibraryAccess({
    credential: session.credential,
    context: session.context,
    lifetime: lifetime.signal,
    onAccessLost() {},
  });
  return { lifetime, port };
}
function Harness() {
  const [current, setCurrent] = useState(connection);
  const [renewals, setRenewals] = useState(0);
  useEffect(() => {
    const dispose = () => current.port.dispose();
    window.addEventListener("pagehide", dispose);
    return () => window.removeEventListener("pagehide", dispose);
  }, [current]);
  return (
    <main style={{ padding: 24 }}>
      <h1>Synthetic file preview renewal</h1>
      <button
        onClick={() => {
          current.lifetime.abort();
          setCurrent(connection());
          setRenewals((value) => value + 1);
        }}
      >
        Renew file access
      </button>
      <output aria-label="Renewal count">{renewals}</output>
      <DocumentPreviewPanel port={current.port} versionId={ids.version} />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
