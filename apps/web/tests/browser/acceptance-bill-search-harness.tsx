import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BillTrackerPage } from "@/features/portfolio/bill-tracker/BillTrackerPage";
import { clientId as initialClient } from "./fixtures";

/** Test stimuli only; the real query, selection and tracker own all behavior. */
export function AcceptanceBillSearchHarness() {
  const cache = useQueryClient();
  const [clientId, setClientId] = useState(initialClient);
  const [settled, setSettled] = useState(0);
  useEffect(() => {
    const refresh = () => {
      void cache
        .invalidateQueries({ queryKey: ["bill-search"] })
        .finally(() => setSettled((count) => count + 1));
    };
    const replace = (event: Event) =>
      setClientId(String((event as CustomEvent).detail));
    window.addEventListener("acceptance-bill-search-refresh", refresh);
    window.addEventListener("acceptance-bill-search-client", replace);
    return () => {
      window.removeEventListener("acceptance-bill-search-refresh", refresh);
      window.removeEventListener("acceptance-bill-search-client", replace);
    };
  }, [cache]);
  return (
    <main>
      <p>Synthetic Bill search checks. All service requests are intercepted.</p>
      <output data-testid="acceptance-bill-search-settled">{settled}</output>
      <BillTrackerPage
        clientId={clientId}
        backend="intelligence"
        destinations={{}}
      />
    </main>
  );
}
