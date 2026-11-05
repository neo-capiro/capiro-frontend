"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { ProfileBuildPanel } from "@/features/portfolio/profile-build/public";
import { portfolioDepthKey, discoveryResultsKey } from "./depth-api";

type ResearchScope =
  | { purpose: "capabilities"; capabilityId?: string; businessUnitId?: string }
  | { purpose: "alignment"; capabilityId: string }
  | { purpose: "business_units" };

export function PortfolioResearch({
  clientId,
  disabled = false,
  scope,
}: {
  clientId: string;
  disabled?: boolean;
  scope: ResearchScope;
}) {
  const [open, setOpen] = useState(false);
  const cache = useQueryClient();
  const capabilityId = "capabilityId" in scope ? scope.capabilityId : undefined;
  const businessUnitId =
    "businessUnitId" in scope ? scope.businessUnitId : undefined;
  const label =
    scope.purpose === "alignment"
      ? "Suggest alignment"
      : scope.purpose === "business_units"
        ? "Discover business units"
        : capabilityId
          ? "Read documents"
          : "Research capabilities";
  const description =
    scope.purpose === "alignment"
      ? "Research the capability’s text and selected documents for supported keywords, tags, classifications and program lines. Review every suggestion before it affects tracking."
      : scope.purpose === "business_units"
        ? "Read dated annual reports and 10-K filings to propose the company’s business units. Review their evidence before choosing a unit for program discovery."
        : capabilityId
          ? "Choose ready capability documents to propose a sourced update to this capability. Saved content changes only after approval."
          : "Read company navigation, product pages and selected documents. Named products and services arrive as sourced proposals for review.";
  function changeOpen(value: boolean) {
    setOpen(value);
    if (!value) {
      void cache.invalidateQueries({ queryKey: portfolioDepthKey(clientId) });
      void cache.invalidateQueries({ queryKey: discoveryResultsKey(clientId) });
    }
  }
  return (
    <>
      <button
        className="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <Dialog
        open={open}
        onOpenChange={changeOpen}
        title={label}
        description={description}
      >
        {businessUnitId && (
          <p className="muted">
            Research uses the selected approved business unit and its
            annual-report evidence.
          </p>
        )}
        {open && (
          <ProfileBuildPanel
            subject={{ kind: "client", id: clientId }}
            purpose={scope.purpose}
            capabilityId={capabilityId}
            businessUnitId={businessUnitId}
          />
        )}
        <p className="muted">
          Progress comes from the saved research tasks. You can return to the
          review while research continues.
        </p>
        <button className="button" onClick={() => changeOpen(false)}>
          Return to review
        </button>
      </Dialog>
    </>
  );
}
