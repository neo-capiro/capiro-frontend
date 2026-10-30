import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { createApiClient } from "@/shared/portfolio/api/http";
import { ProspectWatch } from "@/features/portfolio/prospects/watch/ProspectWatch";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

declare global {
  interface Window {
    __prospectWatch?: {
      setProspect: (prospectId: string) => void;
      prospect: () => string;
    };
  }
}

const api = createApiClient();

function Harness() {
  const [prospectId, setProspect] = useState(
    new URLSearchParams(location.search).get("prospect") ??
      "11111111-2222-3333-4444-555555555555",
  );
  return (
    <main style={{ padding: 20 }}>
      <p>Synthetic prospect watch checks. Service requests are intercepted.</p>
      <output hidden aria-label="Current prospect">
        {prospectId}
      </output>
      <ProspectWatch prospectId={prospectId} />
      <HarnessBridge setProspect={setProspect} prospectId={prospectId} />
    </main>
  );
}

function HarnessBridge({
  setProspect,
  prospectId,
}: {
  setProspect: (id: string) => void;
  prospectId: string;
}) {
  window.__prospectWatch = { setProspect, prospect: () => prospectId };
  return null;
}

createRoot(document.getElementById("root")!).render(
  <DataProvider api={api}>
    <Harness />
  </DataProvider>,
);
