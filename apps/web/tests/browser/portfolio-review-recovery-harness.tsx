import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { CapabilityReview } from "@/features/portfolio/capabilities/CapabilityReview";
import { ProspectEditor } from "@/features/portfolio/prospects/ProspectEditor";
import { ProfileFacts } from "@/features/portfolio/profile-build/ProfileFacts";
import { clientId, prospect } from "./fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function RecoveryHarness() {
  const cache = useQueryClient();
  const identity = useIdentity();
  const [refreshes, setRefreshes] = useState(0);
  const [saved, setSaved] = useState("");
  const mode = new URLSearchParams(location.search).get("mode");
  useEffect(() => {
    const refresh = () => {
      void Promise.all([
        cache.invalidateQueries({ queryKey: ["portfolio-depth"] }),
        cache.invalidateQueries({ queryKey: ["capability-discovery"] }),
      ]).then(() => setRefreshes((count) => count + 1));
    };
    window.addEventListener("recovery-refresh", refresh);
    return () => window.removeEventListener("recovery-refresh", refresh);
  }, [cache]);
  return (
    <main className="page stack">
      <h1>Synthetic Portfolio review recovery</h1>
      <p data-testid="refreshes">{refreshes}</p>
      {saved ? <p data-testid="saved">Saved prospect: {saved}</p> : null}
      {identity.isSuccess &&
        !identity.error &&
        !saved &&
        (mode === "discovery" ? (
          <CapabilityReview clientId={clientId} />
        ) : mode === "facts" ? (
          <ProfileFacts subject={{ kind: "client", id: clientId }} />
        ) : (
          <ProspectEditor
            record={mode === "existing" ? prospect : undefined}
            onClose={() => setSaved("cancelled")}
            onSaved={(record) => setSaved(record.id)}
          />
        ))}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <RecoveryHarness />
  </DataProvider>,
);
