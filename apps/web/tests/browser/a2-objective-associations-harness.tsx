import { createRoot } from "react-dom/client";
import { useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ObjectiveOperationalPage } from "@/features/portfolio/objectives/operational/ObjectiveOperationalPage";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import { objective } from "./a2-association-fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function Harness() {
  const cache = useQueryClient();
  useLayoutEffect(() => {
    cache.setQueryData(["identity"], {
      user: { id: "synthetic-actor", email: "synthetic@example.test" },
      tenant: { id: "synthetic-tenant", name: "Synthetic" },
      role: "standard_user",
    });
    const revoke = () => {
      void cache.invalidateQueries({
        queryKey: ["identity"],
        refetchType: "none",
      });
    };
    window.addEventListener("association-revoke", revoke);
    return () => window.removeEventListener("association-revoke", revoke);
  }, [cache]);
  return (
    <main className="page" data-portfolio-root>
      <ObjectiveOperationalPage
        objective={objective}
        onBack={() => undefined}
        onEdit={() => undefined}
        onReloadObjective={() =>
          window.dispatchEvent(new Event("association-refreshed"))
        }
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    <Harness />
  </PortfolioHarnessProviders>,
);
