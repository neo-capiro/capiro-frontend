"use client";
import { useState } from "react";
import { CapabilityAlignment } from "./CapabilityAlignment";
import { CapabilityTracking } from "./CapabilityTracking";
import { CaseForSupport } from "./CaseForSupport";
import { SectorAnchors } from "./SectorAnchors";
import { usePortfolioDepth } from "./depth-api";
import { ProposalEvidence } from "./ProposalEvidence";
import styles from "./depth.module.css";

export function CapabilityDepth({
  clientId,
  capabilityId,
}: {
  clientId: string;
  capabilityId: string;
}) {
  const query = usePortfolioDepth(clientId);
  const [view, setView] = useState("alignment");
  const provenance =
    query.isSuccess && !query.error
      ? query.data.proposals.filter(
          (p) =>
            p.kind === "capability" &&
            p.capabilityId === capabilityId &&
            p.status === "approved",
        )
      : [];
  return (
    <div className={`${styles.section} ${styles.panel}`}>
      {provenance.map((proposal) => (
        <article className={styles.card} key={proposal.id}>
          <h3>Capability source and lifecycle</h3>
          {proposal.kind === "capability" && (
            <p>{proposal.payload.lifecycle.replaceAll("_", " ")}</p>
          )}
          <ProposalEvidence evidence={proposal.evidence} />
        </article>
      ))}
      <label>
        Capability context
        <select value={view} onChange={(event) => setView(event.target.value)}>
          <option value="alignment">Alignment and terms</option>
          <option value="tracking">Tracking feed</option>
          <option value="case">Case for support</option>
          <option value="sector">Funding and policy anchors</option>
        </select>
      </label>
      {view === "alignment" && (
        <CapabilityAlignment clientId={clientId} capabilityId={capabilityId} />
      )}
      {view === "tracking" && (
        <CapabilityTracking clientId={clientId} capabilityId={capabilityId} />
      )}
      {view === "case" && (
        <CaseForSupport clientId={clientId} capabilityId={capabilityId} />
      )}
      {view === "sector" && (
        <SectorAnchors clientId={clientId} capabilityId={capabilityId} />
      )}
    </div>
  );
}
