import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { CapabilityReview } from "@/features/portfolio/capabilities/CapabilityReview";
import { CapabilityAlignment } from "@/features/portfolio/capabilities/CapabilityAlignment";
import { CapabilityTracking } from "@/features/portfolio/capabilities/CapabilityTracking";
import { SectorAnchors } from "@/features/portfolio/capabilities/SectorAnchors";
import { CaseForSupport } from "@/features/portfolio/capabilities/CaseForSupport";
import { LocationResolution } from "@/features/portfolio/client-profile/LocationResolution";
import { OfficeRelationships } from "@/features/portfolio/relationships/OfficeRelationships";
import { TargetRecommendations } from "@/features/portfolio/relationships/TargetRecommendations";
import { capabilityId, clientId } from "./fixtures";
import { facility } from "../facility-map-fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

function PortfolioDepthHarness() {
  const [view, setView] = useState("alignment");
  const cache = useQueryClient();
  return (
    <main className="page stack">
      <h1>Synthetic Portfolio depth verification</h1>
      <button
        className="button"
        onClick={() =>
          void cache.invalidateQueries({
            queryKey: ["portfolio-depth", "client", clientId],
          })
        }
      >
        Refresh verification data
      </button>
      <label>
        Verification view
        <select value={view} onChange={(event) => setView(event.target.value)}>
          {[
            "alignment",
            "discovery",
            "tracking",
            "locations",
            "offices",
            "case",
            "sectors",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {view === "discovery" && <CapabilityReview clientId={clientId} />}
      {view === "alignment" && (
        <CapabilityAlignment clientId={clientId} capabilityId={capabilityId} />
      )}
      {view === "tracking" && (
        <CapabilityTracking clientId={clientId} capabilityId={capabilityId} />
      )}
      {view === "sectors" && (
        <SectorAnchors clientId={clientId} capabilityId={capabilityId} />
      )}
      {view === "case" && (
        <CaseForSupport clientId={clientId} capabilityId={capabilityId} />
      )}
      {view === "locations" &&
        (
          [
            "resolved",
            "needs_address",
            "ambiguous",
            "source_unavailable",
            "not_applicable",
            "stale_boundary",
          ] as const
        ).map((status) => (
          <LocationResolution
            key={status}
            facility={{
              ...facility,
              siteRole: "research",
              siteStatus: "operating",
              country: status === "not_applicable" ? "GB" : "US",
              siteVerificationStatus:
                status === "resolved" ? "proposed" : "verified",
              geographicResolution: {
                status,
                districts: [],
                requiresReview: status === "stale_boundary",
              },
            }}
          />
        ))}
      {view === "offices" && (
        <>
          <OfficeRelationships
            clientId={clientId}
            targets={[]}
            onOpen={() => undefined}
          />
          <TargetRecommendations clientId={clientId} targets={[]} />
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <PortfolioDepthHarness />
  </DataProvider>,
);
