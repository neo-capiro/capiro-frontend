"use client";
import { PortfolioResearch } from "./PortfolioResearch";

export function CapabilityDiscovery({
  clientId,
  businessUnitId,
}: {
  clientId: string;
  businessUnitId?: string;
}) {
  return (
    <PortfolioResearch
      clientId={clientId}
      scope={{ purpose: "capabilities", businessUnitId }}
    />
  );
}
